import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { createInterface } from "node:readline";
import type { DailyUsageRecord, UsageOverviewResponse, UsageTokens } from "../../shared/usageOverview.js";
import { normalizeRequestCwd, cwdPathsEqual } from "../workingDirectory.js";
import { isNodeErrorWithCode } from "../workspaces/pathSafety.js";
import { SessionDirResolver } from "./piSessionManagerGateway.js";
import { defaultSessionArchiveFilePath, SessionArchiveStore } from "./sessionArchiveStore.js";
import { isRecord, tryParseEntry } from "./sessionFileFormat.js";
import { readSessionHeaderSummary } from "./sessionFileHeader.js";

interface UsageOverviewServiceOptions {
  agentDir: () => Promise<string>;
  env?: Readonly<NodeJS.ProcessEnv>;
  now?: () => Date;
  archiveStore?: Pick<SessionArchiveStore, "list">;
}

interface MeteredEvent {
  key: string;
  timestamp: number;
  model: string;
  tokens: UsageTokens;
  messages: number;
}

interface SessionIdentity {
  id: string;
  cwd: string;
  timestamp: number;
}

interface ParseIssues {
  malformedLines: number;
  invalidDates: number;
  invalidUsage: number;
  missingIds: number;
}

interface FileSnapshot {
  signature: string;
  session: SessionIdentity | undefined;
  foreignWorkspace: boolean;
  events: readonly MeteredEvent[];
  issues: ParseIssues;
}

interface SessionFile {
  path: string;
  id?: string;
  archived: boolean;
}

const MAX_FILE_BYTES = 128 * 1024 * 1024;
const MAX_CACHED_FILES = 128;
const MAX_CACHED_EVENTS = 100_000;

/** Read-only, workspace-scoped metering; never creates or resumes a Pi runtime. */
export class UsageOverviewService {
  private readonly env: Readonly<NodeJS.ProcessEnv>;
  private readonly now: () => Date;
  private readonly archiveStore: Pick<SessionArchiveStore, "list">;
  private readonly snapshots = new Map<string, FileSnapshot>();
  private cachedEvents = 0;
  private readonly pendingFiles = new Map<string, Promise<FileSnapshot>>();
  private readonly pendingReads = new Map<string, Promise<UsageOverviewResponse>>();

  constructor(private readonly options: UsageOverviewServiceOptions) {
    this.env = options.env ?? process.env;
    this.now = options.now ?? (() => new Date());
    this.archiveStore = options.archiveStore ?? new SessionArchiveStore(defaultSessionArchiveFilePath({ ...this.env }));
  }

  read(cwd: string, timeZone: string): Promise<UsageOverviewResponse> {
    const workspace = normalizeRequestCwd(cwd);
    // Validate the timezone before looking at any files. The route translates
    // RangeError to a request error instead of returning an invented UTC day.
    const formatter = dateFormatter(timeZone);
    return this.options.agentDir().then((agentDir) => {
      // Profiles can change while an earlier request is in flight. A read
      // from the newly active profile must never reuse that earlier result.
      const key = JSON.stringify([agentDir, workspace, timeZone]);
      const pending = this.pendingReads.get(key);
      if (pending !== undefined) return pending;
      const read = this.readOverview(agentDir, workspace, timeZone, formatter)
        .finally(() => { this.pendingReads.delete(key); });
      this.pendingReads.set(key, read);
      return read;
    });
  }

  private async readOverview(agentDir: string, cwd: string, timeZone: string, formatter: Intl.DateTimeFormat): Promise<UsageOverviewResponse> {
    const resolver = new SessionDirResolver({ agentDir, env: this.env });
    const sessionDir = resolver.resolve(cwd).sessionDir;
    // The existing listing intentionally treats unreadable directories as
    // empty. Metering must distinguish that failure from genuine zero usage.
    let fileNames: string[] = [];
    try {
      fileNames = await readdir(sessionDir);
    } catch (error: unknown) {
      if (!isNodeErrorWithCode(error, "ENOENT")) throw error;
    }
    const archived = await this.archiveStore.list();
    const files = new Map<string, SessionFile>(fileNames.filter((name) => name.endsWith(".jsonl")).map((name) => {
      const path = join(sessionDir, name);
      return [path, { path, archived: false }];
    }));
    let unlistedHistory = 0;
    let missingArchives = 0;
    let unscopedArchives = 0;
    for (const session of archived) {
      if (!cwdPathsEqual(session.cwd, cwd)) continue;
      // The archive index is shared across agent profiles. Its original path
      // is the only persisted indication of which session store owned it.
      if (session.originalPath === undefined || !isAbsolute(session.originalPath)) {
        unscopedArchives += 1;
        continue;
      }
      if (!cwdPathsEqual(dirname(session.originalPath), sessionDir)) continue;
      if (session.archivePath === undefined) {
        missingArchives += 1;
        continue;
      }
      files.set(session.archivePath, { path: session.archivePath, id: session.sessionId, archived: true });
    }

    const now = this.now();
    const latestTimestamp = now.getTime();
    const records = new Map<string, DailyUsageRecord>();
    const seenSessions = new Set<string>();
    const seenEvents = new Set<string>();
    const issues = emptyIssues();
    let unreadableFiles = 0;
    let oversizedFiles = 0;
    let mismatchedFiles = 0;
    const queue = [...files.values()];
    let nextFile = 0;
    const readNext = async (): Promise<void> => {
      for (;;) {
        const file = queue[nextFile++];
        if (file === undefined) return;
        let snapshot: FileSnapshot;
        try {
          const info = await stat(file.path);
          if (!info.isFile() || info.size > MAX_FILE_BYTES) {
            oversizedFiles += 1;
            continue;
          }
          const signature = [info.dev, info.ino, info.size, info.mtimeMs, info.ctimeMs].join(":");
          snapshot = await this.readSnapshot(file.path, signature, info.size, cwd);
        } catch (error: unknown) {
          if (isNodeErrorWithCode(error, "ENOENT") && !file.archived) continue;
          unreadableFiles += 1;
          continue;
        }
        if (snapshot.foreignWorkspace && !file.archived) continue;
        const session = snapshot.session;
        if (session === undefined && !file.archived) {
          unlistedHistory += 1;
          continue;
        }
        if (session === undefined || (file.id !== undefined && session.id !== file.id) || !cwdPathsEqual(session.cwd, cwd)) {
          mismatchedFiles += 1;
          continue;
        }
        addIssues(issues, snapshot.issues);
        if (!seenSessions.has(session.id) && session.timestamp <= latestTimestamp) {
          seenSessions.add(session.id);
          recordFor(records, localDateAndHour(formatter, session.timestamp).date, "").sessions += 1;
        }
        for (const event of snapshot.events) {
          if (event.timestamp > latestTimestamp || seenEvents.has(event.key)) continue;
          seenEvents.add(event.key);
          const { date, hour } = localDateAndHour(formatter, event.timestamp);
          const record = recordFor(records, date, event.model);
          record.messages += event.messages;
          addTokens(record.tokens, event.tokens);
          if (record.hourCounts !== undefined) {
            // A fresh mutable array is owned only by this response's record.
            const counts = [...record.hourCounts];
            counts[hour] = (counts[hour] ?? 0) + event.messages;
            record.hourCounts = counts;
          }
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, readNext));
    const warnings = issueWarnings(issues);
    if (unlistedHistory > 0) warnings.push(`Usage history may be incomplete: ${String(unlistedHistory)} session files could not be listed or scoped to a workspace.`);
    if (unscopedArchives > 0) warnings.push(`Usage history may be incomplete: ${String(unscopedArchives)} archived sessions cannot be assigned to the active profile.`);
    if (missingArchives > 0) warnings.push(`Usage history is incomplete: ${String(missingArchives)} archived sessions have no stored transcript.`);
    if (unreadableFiles > 0) warnings.push(`Usage history is incomplete: ${String(unreadableFiles)} session files could not be read.`);
    if (oversizedFiles > 0) warnings.push(`Usage history may be incomplete: ${String(oversizedFiles)} session files exceed the 128 MiB read limit or are not regular files.`);
    if (mismatchedFiles > 0) warnings.push(`Usage history is incomplete: ${String(mismatchedFiles)} session files failed identity validation.`);
    return {
      scope: "workspace",
      records: [...records.values()].sort((a, b) => a.date.localeCompare(b.date) || a.model.localeCompare(b.model)),
      today: localDateAndHour(formatter, latestTimestamp).date,
      timeZone,
      warnings,
    };
  }

  private readSnapshot(path: string, signature: string, size: number, cwd: string): Promise<FileSnapshot> {
    // Shared configured stores may contain several workspaces. Cache the
    // bounded foreign-header result too, without treating it as parsed usage
    // when the same file is later requested for its own workspace.
    const cacheKey = JSON.stringify([path, cwd]);
    const cached = this.snapshots.get(cacheKey);
    if (cached?.signature === signature) {
      this.snapshots.delete(cacheKey);
      this.snapshots.set(cacheKey, cached);
      return Promise.resolve(cached);
    }
    const key = JSON.stringify([path, signature, cwd]);
    const pending = this.pendingFiles.get(key);
    if (pending !== undefined) return pending;
    const read = parseSessionFile(path, signature, size, cwd)
      .then((snapshot) => {
        const previous = this.snapshots.get(cacheKey);
        if (previous !== undefined) this.cachedEvents -= previous.events.length;
        this.snapshots.delete(cacheKey);
        if (snapshot.events.length <= MAX_CACHED_EVENTS) {
          this.snapshots.set(cacheKey, snapshot);
          this.cachedEvents += snapshot.events.length;
        }
        while (this.snapshots.size > MAX_CACHED_FILES || this.cachedEvents > MAX_CACHED_EVENTS) {
          const oldest = this.snapshots.entries().next().value;
          if (oldest === undefined) break;
          this.snapshots.delete(oldest[0]);
          this.cachedEvents -= oldest[1].events.length;
        }
        return snapshot;
      })
      .finally(() => { this.pendingFiles.delete(key); });
    this.pendingFiles.set(key, read);
    return read;
  }
}

async function parseSessionFile(path: string, signature: string, size: number, cwd: string): Promise<FileSnapshot> {
  const issues = emptyIssues();
  const snapshot: FileSnapshot = { signature, session: undefined, foreignWorkspace: false, events: [], issues };
  if (size === 0) return snapshot;
  // Stat and the size cap run before this bounded header read. Do not perform
  // a second, uncached full-transcript listing before metering the same file.
  const header = await readSessionHeaderSummary(path);
  if (header?.cwd === undefined || !isAbsolute(header.cwd)) return snapshot;
  if (!cwdPathsEqual(header.cwd, cwd)) return { ...snapshot, foreignWorkspace: true };
  const events: MeteredEvent[] = [];
  const stream = createReadStream(path, { encoding: "utf8", end: size - 1 });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  let lineNumber = 0;
  try {
    for await (const line of lines) {
      lineNumber += 1;
      if (line.trim() === "") continue;
      const entry = tryParseEntry(line);
      if (entry === undefined) {
        issues.malformedLines += 1;
        continue;
      }
      if (entry["type"] === "session") {
        const timestamp = entryTimestamp(entry["timestamp"]);
        if (typeof entry["id"] === "string" && typeof entry["cwd"] === "string" && isAbsolute(entry["cwd"]) && timestamp !== undefined) {
          snapshot.session ??= { id: entry["id"], cwd: entry["cwd"], timestamp };
        } else {
          issues.invalidDates += 1;
        }
        continue;
      }
      const event = meteredEvent(entry, path, lineNumber, issues);
      if (event !== undefined) events.push(event);
    }
  } finally {
    lines.close();
    stream.destroy();
  }
  return { ...snapshot, events };
}

function meteredEvent(entry: Record<string, unknown>, path: string, lineNumber: number, issues: ParseIssues): MeteredEvent | undefined {
  const type = entry["type"];
  const message = isRecord(entry["message"]) ? entry["message"] : undefined;
  const isMessage = type === "message" && message !== undefined;
  if (type === "message" && !isMessage) {
    issues.malformedLines += 1;
    return undefined;
  }
  let rawUsage: unknown;
  let model = "";
  let expectsUsage = false;
  if (isMessage && message["role"] === "assistant") {
    expectsUsage = true;
    rawUsage = message["usage"];
    model = modelKey(message["provider"], message["responseModel"] ?? message["model"]);
  } else if (type === "usage") {
    expectsUsage = true;
    rawUsage = entry["usage"];
    model = modelKey(entry["provider"], entry["model"]);
  } else if ((isMessage && message["role"] === "toolResult") || type === "compaction" || type === "branch_summary") {
    rawUsage = isMessage ? message["usage"] : entry["usage"];
    if (rawUsage !== undefined) model = "Tools/summaries";
  }
  if (!isMessage && rawUsage === undefined && !expectsUsage) return undefined;
  const timestamp = entryTimestamp(entry["timestamp"]);
  if (timestamp === undefined) {
    issues.invalidDates += 1;
    return undefined;
  }
  let tokens = emptyTokens();
  if (rawUsage !== undefined || expectsUsage) {
    const parsed = parseTokens(rawUsage);
    if (parsed === undefined) issues.invalidUsage += 1;
    else tokens = parsed;
    if (model === "") issues.invalidUsage += 1;
  }
  const id = entry["id"];
  if (typeof id !== "string" || id === "") issues.missingIds += 1;
  // Forked files may re-chain parentId/firstKeptEntryId. Those pointers must
  // not make an already-billed event new. A content digest distinguishes
  // unrelated short-id collisions without retaining transcript text.
  const contentHash = createHash("sha256").update(JSON.stringify(isMessage ? message : entry["summary"] ?? entry["kind"] ?? "")).digest("hex");
  const key = JSON.stringify([
    typeof id === "string" && id !== "" ? id : `${path}:${String(lineNumber)}`,
    timestamp, type, message?.["role"], model, tokens, contentHash,
  ]);
  return { key, timestamp, model, tokens, messages: isMessage ? 1 : 0 };
}

function modelKey(provider: unknown, model: unknown): string {
  return typeof provider === "string" && provider !== "" && typeof model === "string" && model !== "" ? `${provider}/${model}` : "";
}

function parseTokens(value: unknown): UsageTokens | undefined {
  if (!isRecord(value)) return undefined;
  const fields = ["input", "output", "cacheRead", "cacheWrite"] as const;
  for (const field of fields) {
    const count = value[field];
    if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) return undefined;
  }
  return { input: Number(value["input"]), output: Number(value["output"]), cacheRead: Number(value["cacheRead"]), cacheWrite: Number(value["cacheWrite"]) };
}

function entryTimestamp(value: unknown): number | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) return undefined;
  const day = value.slice(0, 10);
  const midnight = new Date(`${day}T00:00:00.000Z`);
  // Date.parse normalizes impossible dates such as February 31; reject them
  // rather than silently assigning their usage to a different calendar day.
  if (!Number.isFinite(midnight.getTime()) || midnight.toISOString().slice(0, 10) !== day) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function dateFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
}

function localDateAndHour(formatter: Intl.DateTimeFormat, timestamp: number): { date: string; hour: number } {
  const parts = formatter.formatToParts(timestamp);
  const get = (type: Intl.DateTimeFormatPartTypes): string => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

function recordFor(records: Map<string, DailyUsageRecord>, date: string, model: string): DailyUsageRecord {
  const key = JSON.stringify([date, model]);
  let record = records.get(key);
  if (record === undefined) {
    record = { date, model, tokens: emptyTokens(), sessions: 0, messages: 0, hourCounts: Array.from({ length: 24 }, () => 0) };
    records.set(key, record);
  }
  return record;
}

function emptyTokens(): UsageTokens { return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }; }
function addTokens(target: UsageTokens, source: UsageTokens): void {
  target.input += source.input;
  target.output += source.output;
  target.cacheRead += source.cacheRead;
  target.cacheWrite += source.cacheWrite;
}
function emptyIssues(): ParseIssues { return { malformedLines: 0, invalidDates: 0, invalidUsage: 0, missingIds: 0 }; }
function addIssues(target: ParseIssues, source: ParseIssues): void {
  target.malformedLines += source.malformedLines;
  target.invalidDates += source.invalidDates;
  target.invalidUsage += source.invalidUsage;
  target.missingIds += source.missingIds;
}
function issueWarnings(issues: ParseIssues): string[] {
  const warnings: string[] = [];
  if (issues.malformedLines > 0) warnings.push(`Skipped ${String(issues.malformedLines)} malformed or incomplete session lines.`);
  if (issues.invalidDates > 0) warnings.push(`Skipped ${String(issues.invalidDates)} entries with invalid timestamps or session headers.`);
  if (issues.invalidUsage > 0) warnings.push(`Usage history is incomplete: ${String(issues.invalidUsage)} entries have invalid usage or missing model attribution.`);
  if (issues.missingIds > 0) warnings.push(`${String(issues.missingIds)} entries lack stable IDs and cannot be deduplicated across forked files.`);
  return warnings;
}
