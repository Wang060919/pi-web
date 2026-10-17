import type { SessionRef } from "../../../shared/apiTypes";
import type { SessionHistoryEntry, SessionSearchHit, SessionSearchResponse } from "../../../shared/sessionHistory";
import { resolveAppUrl } from "../appUrl";
import { request } from "./http";
import { parseSessionInfo } from "./parsers";

export type { SessionHistoryEntry, SessionSearchHit, SessionSearchResponse } from "../../../shared/sessionHistory";

export function sessionSearchPath(query: string, machineId = "local", cwd?: string): string {
  const params = new URLSearchParams({ q: query });
  if (cwd !== undefined) params.set("cwd", cwd);
  return `api/machines/${encodeURIComponent(machineId)}/sessions/search?${params.toString()}`;
}

export function sessionExportPath(session: SessionRef, machineId = "local"): string {
  return `api/machines/${encodeURIComponent(machineId)}/sessions/${encodeURIComponent(session.id)}/export?${new URLSearchParams({ cwd: session.cwd }).toString()}`;
}

export function sessionHistoryEntryPath(session: SessionRef, entryId: string, machineId = "local"): string {
  return `api/machines/${encodeURIComponent(machineId)}/sessions/${encodeURIComponent(session.id)}/history-entry?${new URLSearchParams({ cwd: session.cwd, entryId }).toString()}`;
}

/** Browser-ready download link, preserving nested deployments and the machine boundary. */
export function sessionExportUrl(session: SessionRef, machineId = "local"): string {
  return resolveAppUrl(sessionExportPath(session, machineId));
}

export function parseSessionSearchResponse(value: unknown): SessionSearchResponse {
  if (!isRecord(value) || !Array.isArray(value["results"]) || typeof value["truncated"] !== "boolean"
    || typeof value["scannedSessions"] !== "number" || !Number.isSafeInteger(value["scannedSessions"]) || value["scannedSessions"] < 0) {
    throw new Error("Invalid session search response");
  }
  return { results: value["results"].map(parseSearchHit), truncated: value["truncated"], scannedSessions: value["scannedSessions"] };
}

function parseSearchHit(value: unknown): SessionSearchHit {
  if (!isRecord(value) || typeof value["entryId"] !== "string" || value["entryId"] === "" || typeof value["before"] !== "string"
    || typeof value["match"] !== "string" || typeof value["after"] !== "string") {
    throw new Error("Invalid session search result");
  }
  return { session: parseSessionInfo(value["session"]), entryId: value["entryId"], before: value["before"], match: value["match"], after: value["after"] };
}

export function parseSessionHistoryEntry(value: unknown): SessionHistoryEntry {
  if (!isRecord(value) || typeof value["entryId"] !== "string" || value["entryId"] === "" || typeof value["role"] !== "string" || typeof value["text"] !== "string") {
    throw new Error("Invalid session history entry");
  }
  return { session: parseSessionInfo(value["session"]), entryId: value["entryId"], role: value["role"], text: value["text"] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const sessionHistoryApi = {
  search: (query: string, options: { machineId?: string; cwd?: string; signal?: AbortSignal } = {}): Promise<SessionSearchResponse> =>
    request(sessionSearchPath(query, options.machineId, options.cwd), parseSessionSearchResponse, { cache: "no-store", ...(options.signal === undefined ? {} : { signal: options.signal }) }),
  entry: (session: SessionRef, entryId: string, options: { machineId?: string; signal?: AbortSignal } = {}): Promise<SessionHistoryEntry> =>
    request(sessionHistoryEntryPath(session, entryId, options.machineId), parseSessionHistoryEntry, { cache: "no-store", ...(options.signal === undefined ? {} : { signal: options.signal }) }),
};
