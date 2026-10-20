export interface UsageTokens {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

/** Daily counts from persisted history, with copied branch events deduplicated. */
export interface DailyUsageRecord {
  date: string;
  /** Empty for session creation and messages without model-attributed usage. */
  model: string;
  tokens: UsageTokens;
  /** Sessions created on this date; each persisted session is counted once. */
  sessions: number;
  /** All persisted message entries, including tool results. */
  messages: number;
  hourCounts?: readonly number[];
}

export interface UsageOverviewResponse {
  records: DailyUsageRecord[];
  today: string;
  timeZone: string;
  scope: "workspace" | "machine";
  /** Non-sensitive summaries indicating incomplete persisted history. */
  warnings: string[];
}
