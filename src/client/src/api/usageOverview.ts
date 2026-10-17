import type { DailyUsageRecord, UsageOverviewResponse, UsageTokens } from "../../../shared/usageOverview";
import { request } from "./http";

/** Unresolved application reference; request() resolves the browser URL once. */
export function usageOverviewPath(cwd: string, timeZone: string, machineId = "local"): string {
  return `api/machines/${encodeURIComponent(machineId)}/usage-overview?${new URLSearchParams({ cwd, timeZone }).toString()}`;
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error("Invalid usage overview response");
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function date(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid usage overview date");
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) throw new Error("Invalid usage overview date");
  return value;
}

function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("Invalid usage overview count");
  return value;
}

function tokens(value: unknown): UsageTokens {
  const fields = record(value);
  return { input: count(fields["input"]), output: count(fields["output"]), cacheRead: count(fields["cacheRead"]), cacheWrite: count(fields["cacheWrite"]) };
}

function dailyRecord(value: unknown): DailyUsageRecord {
  const fields = record(value);
  const model = fields["model"];
  const hourCounts = fields["hourCounts"];
  if (typeof model !== "string") throw new Error("Invalid usage overview model");
  if (hourCounts !== undefined && (!Array.isArray(hourCounts) || hourCounts.length !== 24)) throw new Error("Invalid usage overview hours");
  return {
    date: date(fields["date"]), model, tokens: tokens(fields["tokens"]),
    sessions: count(fields["sessions"]), messages: count(fields["messages"]),
    ...(hourCounts === undefined ? {} : { hourCounts: hourCounts.map(count) }),
  };
}

export function parseUsageOverviewResponse(value: unknown): UsageOverviewResponse {
  const fields = record(value);
  const records = fields["records"];
  const warnings = fields["warnings"];
  const timeZone = fields["timeZone"];
  if (!Array.isArray(records) || !Array.isArray(warnings) || !warnings.every((warning): warning is string => typeof warning === "string")
    || fields["scope"] !== "workspace" || typeof timeZone !== "string" || timeZone.trim() === "") {
    throw new Error("Invalid usage overview response");
  }
  // A malformed reporting zone must not silently label otherwise valid totals.
  new Intl.DateTimeFormat("en", { timeZone }).format();
  return { records: records.map(dailyRecord), today: date(fields["today"]), timeZone, scope: "workspace", warnings: [...warnings] };
}

export const usageOverviewApi = {
  get: (cwd: string, timeZone: string, machineId = "local", options: { signal?: AbortSignal } = {}): Promise<UsageOverviewResponse> =>
    request(usageOverviewPath(cwd, timeZone, machineId), parseUsageOverviewResponse, { cache: "no-store", ...options }),
};
