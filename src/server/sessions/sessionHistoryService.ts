import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import type { SessionInfo, SessionRef } from "../../shared/apiTypes.js";
import type { SessionHistoryEntry, SessionSearchResponse } from "../../shared/sessionHistory.js";
import { cwdPathsEqual, normalizeRequestCwd } from "../workingDirectory.js";

interface SessionHistoryDependencies {
  listSessions: (cwd: string) => Promise<SessionInfo[]>;
  listCwds: () => Promise<string[]>;
  resolveTranscriptPath?: (session: SessionInfo) => Promise<string>;
  now?: () => number;
}

const SEARCH_FILE_LIMIT = 500;
const SEARCH_RESULT_LIMIT = 30;
const SEARCH_BYTES = 16 * 1024 * 1024;
const EXPORT_BYTES = 64 * 1024 * 1024;
const SEARCH_BUDGET_MS = 3000;

/** Reads durable transcripts only; never opens an agent runtime or follows a supplied file path. */
export class SessionHistoryService {
  constructor(private readonly dependencies: SessionHistoryDependencies) {}

  async search(query: string, cwd?: string, signal?: AbortSignal): Promise<SessionSearchResponse> {
    const needle = query.trim();
    if (!needle || needle.length > 200) throw new Error("Search text must contain 1–200 characters");
    const now = this.dependencies.now ?? Date.now;
    const deadline = now() + SEARCH_BUDGET_MS;
    const response: SessionSearchResponse = { results: [], truncated: false, scannedSessions: 0 };
    const cwds = cwd === undefined ? await this.dependencies.listCwds() : [normalizeRequestCwd(cwd)];
    const catalog = new Map<string, SessionInfo>();
    for (const root of new Set(cwds)) {
      if (isAborted(signal) || now() >= deadline) { response.truncated = true; break; }
      try {
        for (const session of await this.dependencies.listSessions(root)) {
          if (session.path && session.persisted !== false) catalog.set(session.path, session);
        }
      } catch { response.truncated = true; }
    }
    const matcher = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const candidates = [...catalog.values()].sort((a, b) => b.modified.localeCompare(a.modified));
    for (const session of candidates) {
      if (response.scannedSessions >= SEARCH_FILE_LIMIT || response.results.length >= SEARCH_RESULT_LIMIT || isAborted(signal) || now() >= deadline) {
        response.truncated = true;
        break;
      }
      response.scannedSessions++;
      try {
        const snapshot = await readTranscript(session, SEARCH_BYTES, true, await this.dependencies.resolveTranscriptPath?.(session));
        response.truncated ||= snapshot.truncated;
        for (const line of snapshot.lines) {
          if (isAborted(signal) || now() >= deadline) { response.truncated = true; break; }
          const entry = parseEntry(line);
          if (entry === undefined) { response.truncated = true; continue; }
          const message = record(entry["message"]);
          if (entry["type"] !== "message" || typeof entry["id"] !== "string" || !message || !["user", "assistant"].includes(String(message["role"]))) continue;
          const text = textContent(message["content"]);
          const match = matcher.exec(text);
          if (!match) continue;
          const start = match.index;
          const end = start + match[0].length;
          response.results.push({ session, entryId: entry["id"], before: text.slice(Math.max(0, start - 90), start), match: match[0], after: text.slice(end, end + 90) });
          break;
        }
      } catch { response.truncated = true; }
    }
    return response;
  }

  async exportHtml(ref: SessionRef): Promise<{ html: string; filename: string }> {
    const cwd = normalizeRequestCwd(ref.cwd);
    const session = (await this.dependencies.listSessions(cwd)).find((item) => item.id === ref.id && item.persisted !== false);
    if ((session?.path === undefined || session.path === "")) throw new Error("Saved session not found");
    const snapshot = await readTranscript(session, EXPORT_BYTES, false, await this.dependencies.resolveTranscriptPath?.(session));
    const entries = snapshot.lines.map((line) => {
      const entry = parseEntry(line);
      if (!entry) throw new Error("The session contains an invalid record; export was not truncated");
      return entry;
    });
    return { html: sessionHtml(session, entries), filename: `${safeFilename(session.name ?? session.id)}.html` };
  }

  async entry(ref: SessionRef, entryId: string): Promise<SessionHistoryEntry> {
    if (!entryId || entryId.length > 1024) throw new Error("Invalid entry id");
    const session = (await this.dependencies.listSessions(normalizeRequestCwd(ref.cwd))).find((item) => item.id === ref.id && item.persisted !== false);
    if ((session?.path === undefined || session.path === "")) throw new Error("Saved session not found");
    const snapshot = await readTranscript(session, EXPORT_BYTES, false, await this.dependencies.resolveTranscriptPath?.(session));
    for (const line of snapshot.lines) {
      const entry = parseEntry(line);
      const message = record(entry?.["message"]);
      if (entry?.["id"] === entryId && message) return { session, entryId, role: scalarText(message["role"]) || "message", text: textContent(message["content"]) };
    }
    throw new Error("Message not found; the saved session may have changed");
  }
}

async function readTranscript(session: SessionInfo, maxBytes: number, allowPartial: boolean, resolvedPath = session.path): Promise<{ lines: string[]; truncated: boolean }> {
  const before = await lstat(resolvedPath);
  if (!before.isFile()) throw new Error("Session transcript must be a regular file");
  const noFollow = process.platform === "win32" ? 0 : constants.O_NOFOLLOW;
  const nonBlocking = process.platform === "win32" ? 0 : constants.O_NONBLOCK;
  const file = await open(resolvedPath, constants.O_RDONLY | noFollow | nonBlocking);
  try {
    const metadata = await file.stat();
    const current = await lstat(resolvedPath);
    if (!metadata.isFile() || !current.isFile()) throw new Error("Session transcript must be a regular file");
    if (metadata.dev !== before.dev || metadata.ino !== before.ino || current.dev !== metadata.dev || current.ino !== metadata.ino) {
      throw new Error("Session transcript changed while opening");
    }
    if (!allowPartial && metadata.size > maxBytes) throw new Error("Session is too large to export (64 MiB limit)");
    const chunks: Buffer[] = [];
    let bytes = 0;
    while (bytes <= maxBytes) {
      const buffer = Buffer.alloc(Math.min(64 * 1024, maxBytes + 1 - bytes));
      const read = await file.read(buffer, 0, buffer.length, bytes);
      if (!read.bytesRead) break;
      chunks.push(buffer.subarray(0, read.bytesRead));
      bytes += read.bytesRead;
    }
    const truncated = bytes > maxBytes;
    if (truncated && !allowPartial) throw new Error("Session grew beyond the export size limit");
    const text = Buffer.concat(chunks).subarray(0, maxBytes).toString("utf8");
    const lines = text.split(/\r?\n/);
    // A bounded search must not parse a partial last record as a complete entry.
    if (truncated) lines.pop();
    const nonempty = lines.filter((line) => line.trim() !== "");
    const header = parseEntry(nonempty.shift() ?? "");
    if (header?.["type"] !== "session" || header["id"] !== session.id || typeof header["cwd"] !== "string" || !cwdPathsEqual(header["cwd"], session.cwd)) {
      throw new Error("Session identity changed; refresh and try again");
    }
    return { lines: nonempty, truncated };
  } finally { await file.close(); }
}

function isAborted(signal?: AbortSignal): boolean { return signal?.aborted === true; }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function parseEntry(line: string): Record<string, unknown> | undefined {
  try { return record(JSON.parse(line)); } catch { return undefined; }
}

function textContent(content: unknown): string {
  if (typeof content === "string") return content;
  return Array.isArray(content) ? content.flatMap((part: unknown) => {
    const value = record(part);
    return value?.["type"] === "text" && typeof value["text"] === "string" ? [value["text"]] : [];
  }).join("\n") : "";
}

function scalarText(value: unknown): string {
  return typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : "";
}

function escape(value: unknown): string {
  return scalarText(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function safeFilename(value: string): string { return value.replace(/[^\p{L}\p{N} ._-]/gu, "_").slice(0, 120) || "session"; }

/** Self-contained HTML: escaped content, no scripts, remote assets, or live agent operations. */
export function sessionHtml(session: SessionInfo, entries: readonly Record<string, unknown>[]): string {
  const blocks = entries.map((entry, index) => {
    const message = record(entry["message"]);
    const role = scalarText(message?.["role"] ?? entry["type"]) || "entry";
    const id = `entry-${String(index)}`;
    const content = message?.["content"];
    const parts = typeof content === "string" ? [{ type: "text", text: content }] : Array.isArray(content) ? content : [];
    const body = parts.map((part: unknown) => {
      const value = record(part);
      if (!value) return "";
      if (value["type"] === "image" && typeof value["data"] === "string" && /^(image\/(png|jpeg|gif|webp))$/.test(String(value["mimeType"]))) {
        return `<img alt="Session image" src="data:${escape(value["mimeType"])};base64,${escape(value["data"])}">`;
      }
      if (value["type"] === "text") return `<pre>${escape(value["text"])}</pre>`;
      if (value["type"] === "thinking") return `<details><summary>Thinking</summary><pre>${escape(value["thinking"] ?? value["text"])}</pre></details>`;
      return `<details><summary>${escape(value["type"])} ${escape(value["name"])}</summary><pre>${escape(JSON.stringify(value, null, 2))}</pre></details>`;
    }).join("");
    const raw = `<details><summary>Full record · ${escape(entry["id"])} · parent ${escape(entry["parentId"])}</summary><pre>${escape(JSON.stringify(entry, null, 2))}</pre></details>`;
    return `<article id="${id}"><header><a href="#${id}">${escape(role)}</a><time>${escape(entry["timestamp"])}</time></header>${body}${raw}</article>`;
  }).join("\n");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(session.name ?? session.id)} · PI WEB</title><style>html{color-scheme:light dark;font:15px/1.6 system-ui;background:light-dark(#fafaf9,#171717);color:light-dark(#222,#eee)}body{max-width:980px;margin:32px auto;padding:0 20px}h1{font-size:24px}article{margin:18px 0;padding:18px;border:1px solid #8885;border-radius:12px}header{display:flex;justify-content:space-between;gap:16px}a{color:inherit}time,small,summary{color:light-dark(#666,#aaa)}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.65 ui-monospace,monospace}summary{cursor:pointer}img{max-width:100%;height:auto}details{margin:10px 0}code{overflow-wrap:anywhere}</style><h1>${escape(session.name ?? "PI WEB session")}</h1><p><code>${escape(session.cwd)}</code><br><small>${escape(session.id)} · ${String(entries.length)} records · complete saved history, including branches</small></p>${blocks}</html>`;
}
