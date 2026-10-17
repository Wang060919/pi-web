import { mkdtemp, readFile, rm, symlink, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionInfo } from "../../shared/apiTypes.js";
import { SessionHistoryService } from "./sessionHistoryService.js";

// History browsing must never load or instantiate the agent SDK.
vi.mock("@earendil-works/pi-coding-agent", () => { throw new Error("History must not load the agent SDK"); });

const cwd = "/workspace/current";
const otherCwd = "/workspace/other";
const timestamp = "2026-10-17T08:00:00.000Z";
let temp: string;

beforeEach(async () => { temp = await mkdtemp(join(tmpdir(), "pi-web-history-")); });
afterEach(async () => { await rm(temp, { recursive: true, force: true }); });

function message(id: string, text: string, role = "assistant", parentId: string | null = null): Record<string, unknown> {
  return { type: "message", id, parentId, timestamp, message: { role, content: [{ type: "text", text }] } };
}

async function saved(id: string, entries: Record<string, unknown>[], options: { root?: string; headerId?: string; headerCwd?: string; archived?: boolean } = {}): Promise<SessionInfo> {
  const root = options.root ?? cwd;
  const path = join(temp, `${id}.jsonl`);
  const header = { type: "session", version: 3, id: options.headerId ?? id, cwd: options.headerCwd ?? root, timestamp };
  await writeFile(path, [header, ...entries].map((entry) => JSON.stringify(entry)).join("\n") + "\n");
  return { id, path, cwd: root, created: timestamp, modified: timestamp, messageCount: entries.length, firstMessage: "fixture", ...(options.archived === true ? { archived: true } : {}) };
}

function reader(sessions: readonly SessionInfo[]): SessionHistoryService {
  return new SessionHistoryService({ listSessions: (root) => Promise.resolve(sessions.filter((session) => session.cwd === root)), listCwds: () => Promise.resolve([cwd, otherCwd]) });
}

describe("read-only session history", () => {
  it("searches literal query text within the requested workspace and matches session IDs exactly", async () => {
    const own = await saved("own", [message("literal", "Use a[b].*? here"), message("ignored-later", "later match")]);
    const foreign = await saved("foreign", [message("foreign-match", "Use a[b].*? elsewhere")], { root: otherCwd });
    const service = reader([own, foreign]);
    const scoped = await service.search("a[b].*?", `${cwd}/`);
    expect(scoped.results.map((hit) => [hit.session.id, hit.entryId, hit.match])).toEqual([["own", "literal", "a[b].*?"]]);
    expect(scoped.scannedSessions).toBe(1);
    expect((await service.search("a[b].*?")).results.map((hit) => hit.session.id)).toEqual(["own", "foreign"]);
    await expect(service.exportHtml({ id: "ow", cwd })).rejects.toThrow("Saved session not found");
    await expect(service.entry({ id: "foreign", cwd }, "foreign-match")).rejects.toThrow("Saved session not found");
    await expect(service.search("needle", "relative/path")).rejects.toThrow("absolute");
  });

  it("rejects changed header identities and ignores non-message/image/tool-only matches", async () => {
    const wrongId = await saved("wrong-id", [message("a", "needle")], { headerId: "different" });
    const wrongCwd = await saved("wrong-cwd", [message("b", "needle")], { headerCwd: otherCwd });
    const real = await saved("real", [
      { type: "message", id: "tool", message: { role: "toolResult", content: "needle" } },
      { type: "message", id: "image", message: { role: "assistant", content: [{ type: "image", data: "needle", mimeType: "image/png" }, { type: "thinking", thinking: "needle" }] } },
      message("real-match", "A NEEDLE appears"),
    ]);
    const service = reader([wrongId, wrongCwd, real]);
    const result = await service.search("needle", cwd);
    expect(result.results.map((hit) => hit.entryId)).toEqual(["real-match"]);
    expect(result.truncated).toBe(true);
    await expect(service.exportHtml(wrongId)).rejects.toThrow("identity changed");
    await expect(service.entry(wrongCwd, "b")).rejects.toThrow("identity changed");
  });

  it("reports malformed and missing history without hiding valid matches", async () => {
    const broken = await saved("broken", []);
    await writeFile(broken.path, `${JSON.stringify({ type: "session", id: broken.id, cwd })}\nnot json\n${JSON.stringify(message("surviving", "needle"))}\n`);
    const missing = { ...broken, id: "missing", path: join(temp, "missing.jsonl") };
    const result = await reader([broken, missing]).search("needle", cwd);
    expect(result.results.map((hit) => hit.entryId)).toEqual(["surviving"]);
    expect(result.truncated).toBe(true);
    await expect(reader([broken]).exportHtml(broken)).rejects.toThrow("invalid record");
  });

  it("reads archived bytes through the trusted resolver while retaining the original UI identity", async () => {
    const archive = await saved("archived", [message("archived-entry", "archived needle")], { archived: true });
    const row = { ...archive, path: join(temp, "original-no-longer-exists.jsonl") };
    const resolveTranscriptPath = vi.fn((session: SessionInfo) => {
      if (session.id !== row.id || session.cwd !== row.cwd) throw new Error("Unexpected archive identity");
      return Promise.resolve(archive.path);
    });
    const service = new SessionHistoryService({ listSessions: () => Promise.resolve([row]), listCwds: () => Promise.resolve([cwd]), resolveTranscriptPath });
    const result = await service.search("needle", cwd);
    expect(result.results[0]?.session).toEqual(row);
    expect((await service.entry(row, "archived-entry")).text).toBe("archived needle");
    expect((await service.exportHtml(row)).html).toContain("archived needle");
    expect(resolveTranscriptPath).toHaveBeenCalledTimes(3);
  });

  it("bounds results, oversized history and elapsed search time without silently claiming completeness", async () => {
    const many = await Promise.all(Array.from({ length: 31 }, (_, index) => saved(`many-${String(index).padStart(2, "0")}`, [message(`entry-${String(index)}`, "needle")])));
    const limited = await reader(many).search("needle", cwd);
    expect(limited.results).toHaveLength(30);
    expect(limited.truncated).toBe(true);
    const huge = await saved("huge", [message("early", "needle")]);
    await truncate(huge.path, 16 * 1024 * 1024 + 1);
    const partial = await reader([huge]).search("needle", cwd);
    expect(partial.results[0]?.entryId).toBe("early");
    expect(partial.truncated).toBe(true);
    await truncate(huge.path, 64 * 1024 * 1024 + 1);
    await expect(reader([huge]).exportHtml(huge)).rejects.toThrow("64 MiB");
    let time = 0;
    const timed = new SessionHistoryService({ now: () => time, listCwds: () => Promise.resolve([cwd]), listSessions: () => { time = 5000; return Promise.resolve(many); } });
    expect(await timed.search("needle", cwd)).toEqual({ results: [], truncated: true, scannedSessions: 0 });
  });

  it("does not follow transcript symlinks and cooperatively stops cancelled searches", async () => {
    const target = await saved("target", [message("target-entry", "needle")]);
    const linked = { ...target, path: join(temp, "link.jsonl") };
    await symlink(target.path, linked.path);
    const service = reader([linked]);
    expect(await service.search("needle", cwd)).toEqual({ results: [], truncated: true, scannedSessions: 1 });
    await expect(service.exportHtml(linked)).rejects.toThrow();
    const controller = new AbortController();
    controller.abort();
    expect(await reader([target]).search("needle", cwd, controller.signal)).toEqual({ results: [], truncated: true, scannedSessions: 0 });
  });

  it("exports every saved branch with escaped text and structured records as a self-contained artifact", async () => {
    const attack = '</pre><script>alert("bad")</script><img src="https://external.test/track">&';
    const session = await saved("branches", [message("root", "request", "user"), message("left", attack, "assistant", "root"), message("right", "other branch", "assistant", "root"), { type: "branch_summary", id: "summary", parentId: "root", summary: "branch metadata" }]);
    session.name = '<img onerror="bad">';
    const before = await readFile(session.path, "utf8");
    const result = await reader([session]).exportHtml(session);
    expect(result.html).toContain("other branch");
    expect(result.html).toContain("branch metadata");
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.html).not.toContain("<script>");
    expect(result.html).not.toContain('<img src="https://external.test');
    expect(result.html).toContain("Content-Security-Policy");
    expect(result.html).toContain("default-src 'none'");
    expect(result.filename).not.toMatch(/[<>"/\\]/);
    expect(await readFile(session.path, "utf8")).toBe(before);
  });

  it("previews an off-branch message without opening or mutating the session", async () => {
    const session = await saved("off-branch", [message("root", "start", "user"), message("left", "original left reply", "assistant", "root"), message("right", "active right reply", "assistant", "root")]);
    const before = await readFile(session.path, "utf8");
    expect(await reader([session]).entry(session, "left")).toEqual({ session, entryId: "left", role: "assistant", text: "original left reply" });
    expect(await readFile(session.path, "utf8")).toBe(before);
    await expect(reader([session]).entry(session, "lef")).rejects.toThrow("Message not found");
  });
});
