import type { SessionInfo } from "./apiTypes.js";

export interface SessionSearchHit {
  session: SessionInfo;
  entryId: string;
  before: string;
  match: string;
  after: string;
}

export interface SessionSearchResponse {
  results: SessionSearchHit[];
  truncated: boolean;
  scannedSessions: number;
}

export interface SessionHistoryEntry {
  session: SessionInfo;
  entryId: string;
  role: string;
  text: string;
}
