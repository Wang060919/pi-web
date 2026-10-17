import { createReadStream } from "node:fs";
import { appendFile, mkdir, mkdtemp, open, rm, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UsageOverviewResponse } from "../../shared/usageOverview.js";
import { defaultPiSessionDir } from "./piSessionManagerGateway.js";
import { UsageOverviewService } from "./usageOverviewService.js";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, createReadStream: vi.fn(actual.createReadStream) };
});

// Observe real opens as well as metering streams: a second, hidden listing
// pass must not reread unchanged transcripts outside the snapshot cache.
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, open: vi.fn(actual.open) };
});

const CWD = "/srv/usage-workspace";
const DAY_ONE = "2026-10-14T10:00:00.000Z";
const DAY_TWO = "2026-10-15T10:00:00.000Z";
const USAGE = { input: 100, output: 20, cacheRead: 30, cacheWrite: 40, totalTokens: 190, cost: { total: 0.1 } };
let temp: string;
let store: string;

beforeEach(async () => {
  temp = await mkdtemp(join(tmpdir(), "pi-web-usage-overview-"));
  store = join(temp, "sessions");
  await mkdir(store);
});

afterEach(async () => {
  vi.clearAllMocks();
  await rm(temp, { recursive: true, force: true });
});

function header(id: string, timestamp = DAY_ONE, cwd = CWD): Record<string, unknown> {
  return { type: "session", version: 3, id, timestamp, cwd };
}

function message(id: string, role: string, timestamp = DAY_ONE, extras: Record<string, unknown> = {}): Record<string, unknown> {
  return { type: "message", id, parentId: null, timestamp, message: { role, content: "Synthetic test message", ...extras } };
}

function assistant(id: string, timestamp = DAY_ONE, extras: Record<string, unknown> = {}): Record<string, unknown> {
  return message(id, "assistant", timestamp, { provider: "test", model: "configured", responseModel: "actual", usage: USAGE, ...extras });
}

async function session(name: string, entries: readonly Record<string, unknown>[]): Promise<string> {
  const path = join(store, `${name}.jsonl`);
  await writeFile(path, `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`);
  return path;
}

function service(options: { now?: string; archives?: ConstructorParameters<typeof UsageOverviewService>[0]["archiveStore"] } = {}): UsageOverviewService {
  return new UsageOverviewService({
    agentDir: () => Promise.resolve(join(temp, "agent")),
    env: { PI_CODING_AGENT_SESSION_DIR: store, PI_WEB_DATA_DIR: join(temp, "web-data") },
    now: () => new Date(options.now ?? "2026-10-17T12:00:00.000Z"),
    archiveStore: options.archives ?? { list: () => Promise.resolve([]) },
  });
}

function totals(result: UsageOverviewResponse): { input: number; output: number; cacheRead: number; cacheWrite: number; messages: number; sessions: number } {
  return result.records.reduce((sum, record) => ({
    input: sum.input + record.tokens.input,
    output: sum.output + record.tokens.output,
    cacheRead: sum.cacheRead + record.tokens.cacheRead,
    cacheWrite: sum.cacheWrite + record.tokens.cacheWrite,
    messages: sum.messages + record.messages,
    sessions: sum.sessions + record.sessions,
  }), { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, messages: 0, sessions: 0 });
}

describe("UsageOverviewService", () => {
  it("sums every SDK usage source without double-adding totalTokens", async () => {
    await session("metering", [
      header("metering"), message("user", "user"), assistant("reply"),
      { type: "usage", id: "standalone", timestamp: DAY_ONE, provider: "test", model: "background", kind: "cache_warm", usage: USAGE },
      message("tool", "toolResult", DAY_ONE, { usage: USAGE }),
      { type: "compaction", id: "compact", timestamp: DAY_ONE, summary: "Synthetic summary", usage: USAGE },
      { type: "branch_summary", id: "branch", timestamp: DAY_ONE, summary: "Another summary", usage: USAGE },
      message("custom", "custom"),
    ]);
    const result = await service().read(CWD, "UTC");
    expect(totals(result)).toEqual({ input: 500, output: 100, cacheRead: 150, cacheWrite: 200, messages: 4, sessions: 1 });
    expect(result.records.find((record) => record.model === "test/actual")?.tokens.input).toBe(100);
    expect(result.records.find((record) => record.model === "Tools/summaries")?.tokens.input).toBe(300);
    expect(result.records.reduce((sum, record) => sum + (record.hourCounts?.[10] ?? 0), 0)).toBe(4);
    expect(result.warnings).toEqual([]);
  });

  it("deduplicates copied fork events despite changed parent pointers and distinguishes independent short IDs", async () => {
    const copied = assistant("abc12345");
    await session("parent", [header("parent"), copied]);
    await session("fork", [header("fork", DAY_TWO), { ...copied, parentId: "new-parent" }, assistant("new", DAY_TWO)]);
    await session("independent", [header("independent"), assistant("abc12345", "2026-10-14T11:00:00.000Z")]);
    await session("collision", [header("collision"), assistant("abc12345", DAY_ONE, { content: "Different independent event" })]);
    const result = await service().read(CWD, "UTC");
    expect(totals(result)).toMatchObject({ input: 400, messages: 4, sessions: 4 });
  });

  it("deduplicates session headers copied into multiple files while counting a new empty session", async () => {
    await session("first", [header("same"), assistant("original")]);
    await session("copy", [header("same"), assistant("original")]);
    await session("empty", [header("empty", DAY_TWO)]);
    const result = await service().read(CWD, "UTC");
    expect(totals(result)).toMatchObject({ input: 100, messages: 1, sessions: 2 });
    expect(result.records.find((record) => record.date === "2026-10-15")).toMatchObject({ model: "", sessions: 1, messages: 0 });
  });

  it("uses each event timestamp and the requested timezone independently of session creation and file mtime", async () => {
    await session("midnight", [
      header("midnight", "2026-10-13T15:59:00.000Z"),
      assistant("before", "2026-10-14T15:59:00.000Z"),
      assistant("after", "2026-10-14T16:01:00.000Z"),
    ]);
    const result = await service({ now: "2026-10-15T16:10:00.000Z" }).read(CWD, "Asia/Shanghai");
    expect(result.today).toBe("2026-10-16");
    expect(result.records.find((record) => record.sessions > 0)?.date).toBe("2026-10-13");
    expect(result.records.find((record) => record.date === "2026-10-14")?.hourCounts?.[23]).toBe(1);
    expect(result.records.find((record) => record.date === "2026-10-15")?.hourCounts?.[0]).toBe(1);
  });

  it("refreshes after append and reuses unchanged metering snapshots", async () => {
    const file = await session("growing", [header("growing"), assistant("first")]);
    const reader = service();
    const initial = await reader.read(CWD, "UTC");
    const reads = vi.mocked(createReadStream).mock.calls.length;
    const opens = vi.mocked(open).mock.calls.length;
    expect(totals(await reader.read(CWD, "UTC"))).toEqual(totals(initial));
    expect(vi.mocked(createReadStream)).toHaveBeenCalledTimes(reads);
    expect(vi.mocked(open)).toHaveBeenCalledTimes(opens);
    await appendFile(file, `${JSON.stringify(assistant("second", DAY_TWO))}\n`);
    expect(totals(await reader.read(CWD, "UTC"))).toMatchObject({ input: 200, messages: 2, sessions: 1 });
    expect(vi.mocked(createReadStream)).toHaveBeenCalledTimes(reads + 1);
  });

  it.each([false, true])("checks the size limit before any listing, header or metering read (archived=%s)", async (archived) => {
    const oversized = await session("oversized", [header("oversized"), assistant("must-not-read")]);
    await truncate(oversized, 128 * 1024 * 1024 + 1);
    vi.mocked(open).mockClear();
    vi.mocked(createReadStream).mockClear();

    const result = await service({ ...(archived ? { archives: { list: () => Promise.resolve([{ sessionId: "oversized", cwd: CWD, archivedAt: DAY_TWO, originalPath: oversized, archivePath: oversized }]) } } : {}) }).read(CWD, "UTC");

    expect(result.records).toEqual([]);
    expect(result.warnings.join(" ")).toContain("128 MiB");
    expect(vi.mocked(open).mock.calls.some(([path]) => path === oversized)).toBe(false);
    expect(vi.mocked(createReadStream).mock.calls.some(([path]) => path === oversized)).toBe(false);
  });

  it("caches bounded foreign-workspace headers without hiding their usage in their own workspace", async () => {
    const own = await session("own", [header("own"), assistant("own-event")]);
    const otherCwd = "/srv/another-workspace";
    const foreign = await session("foreign", [header("foreign", DAY_ONE, otherCwd), assistant("foreign-event")]);
    const reader = service();

    expect(totals(await reader.read(CWD, "UTC"))).toMatchObject({ input: 100, sessions: 1 });
    expect(vi.mocked(createReadStream).mock.calls.map(([path]) => path)).toEqual([own]);
    const opens = vi.mocked(open).mock.calls.length;
    expect(totals(await reader.read(CWD, "UTC"))).toMatchObject({ input: 100, sessions: 1 });
    expect(vi.mocked(open)).toHaveBeenCalledTimes(opens);
    expect(vi.mocked(createReadStream)).toHaveBeenCalledTimes(1);

    expect(totals(await reader.read(otherCwd, "UTC"))).toMatchObject({ input: 100, sessions: 1 });
    expect(vi.mocked(createReadStream).mock.calls.map(([path]) => path)).toEqual([own, foreign]);
  });

  it("coalesces concurrent requests and never includes another workspace", async () => {
    await session("same", [header("same"), assistant("ours")]);
    await session("other", [header("other", DAY_ONE, "/srv/another-workspace"), assistant("theirs")]);
    const reader = service();
    const first = reader.read(CWD, "UTC");
    const second = reader.read(CWD, "UTC");
    expect(totals(await first)).toMatchObject({ input: 100, sessions: 1 });
    expect(totals(await second)).toMatchObject({ input: 100, sessions: 1 });
    expect(vi.mocked(createReadStream)).toHaveBeenCalledTimes(1);
  });

  it("isolates an in-flight response when the active agent profile changes", async () => {
    const firstProfile = join(temp, "profile-one");
    const secondProfile = join(temp, "profile-two");
    for (const [agentDir, input] of [[firstProfile, 111], [secondProfile, 222]] as const) {
      const directory = defaultPiSessionDir(CWD, agentDir);
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, "history.jsonl"), [
        header(agentDir), assistant("same-short-id", DAY_ONE, { usage: { ...USAGE, input } }),
      ].map((entry) => JSON.stringify(entry)).join("\n"));
    }
    let activeProfile = firstProfile;
    let reportStarted = (): void => undefined;
    const firstStarted = new Promise<void>((resolve) => { reportStarted = resolve; });
    let releaseFirst = (): void => undefined;
    const firstBlocked = new Promise<void>((resolve) => { releaseFirst = resolve; });
    let archiveReads = 0;
    const reader = new UsageOverviewService({
      agentDir: () => Promise.resolve(activeProfile), env: {},
      now: () => new Date("2026-10-17T12:00:00.000Z"),
      archiveStore: { list: async () => {
        archiveReads += 1;
        if (archiveReads === 1) {
          reportStarted();
          await firstBlocked;
        }
        return [];
      } },
    });
    const first = reader.read(CWD, "UTC");
    await firstStarted;
    activeProfile = secondProfile;
    const second = reader.read(CWD, "UTC");
    const secondResult = await second;
    releaseFirst();
    expect(totals(await first).input).toBe(111);
    expect(totals(secondResult).input).toBe(222);
    expect(archiveReads).toBe(2);
  });

  it("reports corrupt lines, invalid dates and incomplete usage without exposing the original text", async () => {
    const file = await session("partial", [
      header("partial"), assistant("valid"), assistant("bad-date", "not-a-date"),
      assistant("impossible-date", "2026-02-31T12:00:00.000Z"),
      assistant("implicit-local-time", "2026-10-14T12:00:00.000"),
      assistant("bad-usage", DAY_TWO, { usage: { input: -50, output: 1, cacheRead: 0, cacheWrite: 0 } }),
      assistant("partial-usage", DAY_TWO, { usage: { input: 999 } }),
    ]);
    await appendFile(file, 'private-synthetic-invalid-line\n{"type":"message","unfinished":');
    const result = await service().read(CWD, "UTC");
    expect(totals(result)).toMatchObject({ input: 100, messages: 3 });
    expect(result.warnings.join(" ")).toContain("2 malformed or incomplete");
    expect(result.warnings.join(" ")).toContain("invalid timestamps");
    expect(result.warnings.join(" ")).toContain("2 entries have invalid usage");
    expect(result.warnings.join(" ")).not.toContain("private-synthetic");
    expect(JSON.stringify(result)).not.toContain(temp);
  });

  it("reads available archive history, deduplicates copied active events and reports missing archives", async () => {
    await session("active", [header("active"), assistant("copied")]);
    const archivePath = join(temp, "archived.jsonl");
    await writeFile(archivePath, `${JSON.stringify(header("archived"))}\n${JSON.stringify(assistant("copied"))}\n${JSON.stringify(assistant("archive-only", DAY_TWO))}\n`);
    const archives = { list: () => Promise.resolve([
      { sessionId: "archived", cwd: CWD, archivedAt: DAY_TWO, archivePath, originalPath: join(store, "archived.jsonl") },
      { sessionId: "missing", cwd: CWD, archivedAt: DAY_TWO, originalPath: join(store, "old.jsonl") },
      { sessionId: "deleted", cwd: CWD, archivedAt: DAY_TWO, archivePath: join(temp, "missing.jsonl"), originalPath: join(store, "deleted.jsonl") },
      { sessionId: "outside", cwd: "/srv/other", archivedAt: DAY_TWO, archivePath, originalPath: join(store, "outside.jsonl") },
    ]) };
    const result = await service({ archives }).read(CWD, "UTC");
    expect(totals(result)).toMatchObject({ input: 200, messages: 2, sessions: 2 });
    expect(result.warnings).toHaveLength(2);
  });

  it("rejects archive files whose persisted header does not match the scoped record", async () => {
    const archivePath = join(temp, "wrong-archive.jsonl");
    await writeFile(archivePath, `${JSON.stringify(header("different", DAY_ONE, "/srv/other"))}\n${JSON.stringify(assistant("outside"))}\n`);
    const result = await service({ archives: { list: () => Promise.resolve([{ sessionId: "requested", cwd: CWD, archivedAt: DAY_TWO, archivePath, originalPath: join(store, "requested.jsonl") }]) } }).read(CWD, "UTC");
    expect(result.records).toEqual([]);
    expect(result.warnings.join(" ")).toContain("identity validation");
  });

  it("excludes another profile's same-workspace archives and warns when old archives have no owner path", async () => {
    const ownArchive = join(temp, "own-archive.jsonl");
    const otherArchive = join(temp, "other-profile-archive.jsonl");
    await writeFile(ownArchive, `${JSON.stringify(header("own"))}\n${JSON.stringify(assistant("own-event"))}\n`);
    await writeFile(otherArchive, `${JSON.stringify(header("other"))}\n${JSON.stringify(assistant("other-event", DAY_ONE, { usage: { ...USAGE, input: 999 } }))}\n`);
    const archives = { list: () => Promise.resolve([
      { sessionId: "own", cwd: CWD, archivedAt: DAY_TWO, archivePath: ownArchive, originalPath: join(store, "folder", "..", "own.jsonl") },
      { sessionId: "other", cwd: CWD, archivedAt: DAY_TWO, archivePath: otherArchive, originalPath: join(temp, "other-profile-sessions", "other.jsonl") },
      { sessionId: "legacy", cwd: CWD, archivedAt: DAY_TWO, archivePath: otherArchive },
      { sessionId: "relative", cwd: CWD, archivedAt: DAY_TWO, archivePath: otherArchive, originalPath: "relative/other.jsonl" },
    ]) };
    const result = await service({ archives }).read(CWD, "UTC");
    expect(totals(result)).toMatchObject({ input: 100, messages: 1, sessions: 1 });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("2 archived sessions cannot be assigned to the active profile");
  });

  it.each(["", "src"])("rejects a non-absolute persisted header cwd (%j)", async (invalidCwd) => {
    await session("invalid-cwd", [header("invalid-cwd", DAY_ONE, invalidCwd), assistant("must-not-count")]);
    const result = await service().read(join(process.cwd(), invalidCwd), "UTC");
    expect(result.records).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("session files");
  });

  it("reports partial history when a listed file cannot be read", async () => {
    await session("unreadable", [header("unreadable"), assistant("present")]);
    vi.mocked(createReadStream).mockImplementationOnce(() => { throw Object.assign(new Error("synthetic-private-path"), { code: "EACCES" }); });
    const result = await service().read(CWD, "UTC");
    expect(result.records).toEqual([]);
    expect(result.warnings.join(" ")).toContain("1 session files could not be read");
    expect(result.warnings.join(" ")).not.toContain("synthetic-private-path");
  });

  it("warns when the existing listing silently skips an unusable transcript", async () => {
    await writeFile(join(store, "broken.jsonl"), "synthetic-invalid-header\n");
    const result = await service().read(CWD, "UTC");
    expect(result.records).toEqual([]);
    expect(result.warnings.join(" ")).toContain("1 session files could not be listed");
    expect(result.warnings.join(" ")).not.toContain("synthetic-invalid-header");
  });

  it("rejects invalid timezone and relative cwd before reading any session data", () => {
    const reader = service();
    expect(() => reader.read(CWD, "Invalid/Timezone")).toThrow(RangeError);
    expect(() => reader.read("relative", "UTC")).toThrow("absolute path");
  });

  it("returns genuine empty history for a missing session directory and excludes future events", async () => {
    await session("future", [header("future", "2027-01-01T00:00:00.000Z"), assistant("future-message", "2027-01-01T00:00:00.000Z")]);
    expect((await service().read(CWD, "UTC")).records).toEqual([]);
    await rm(store, { recursive: true });
    const result = await service().read(CWD, "UTC");
    expect(result.records).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});
