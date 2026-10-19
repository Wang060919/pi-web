import type { DailyUsageRecord, UsageTokens } from "../../shared/usageOverview";
export type { DailyUsageRecord, UsageTokens } from "../../shared/usageOverview";

export type UsageOverviewRange = "all" | "30" | "7";

export interface UsageDay {
  date: string;
  tokens: UsageTokens;
  totalTokens: number;
  sessions: number;
  messages: number;
  inRange: boolean;
  future: boolean;
}

export interface UsageOverviewData {
  sessions: number;
  messages: number;
  totalTokens: number;
  activeDays: number;
  peakHour: number | undefined;
  favoriteModel: string | undefined;
  days: UsageDay[];
  models: UsageModelTotal[];
  modelDays: UsageModelDay[];
}

export interface UsageModelTotal {
  model: string;
  totalTokens: number;
  input: number;
  output: number;
}

export interface UsageModelDay {
  date: string;
  totalTokens: number;
  segments: { model: string; modelIndex: number; totalTokens: number }[];
}

const DAY_MS = 86_400_000;
const GRID_DAYS = 26 * 7;

function utcDay(date: string): number {
  const parsed = Date.parse(`${date}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== date) {
    throw new RangeError(`Invalid usage date: ${date}`);
  }
  return parsed;
}

function count(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new RangeError("Usage counts must be finite and non-negative");
  return value;
}

function emptyDay(date: string, inRange: boolean, future: boolean): UsageDay {
  return { date, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, totalTokens: 0, sessions: 0, messages: 0, inRange, future };
}

/** UTC day arithmetic keeps the fixed 26-week grid stable across DST changes. */
export function aggregateUsageOverview(records: readonly DailyUsageRecord[], range: UsageOverviewRange, today: string): UsageOverviewData {
  const end = utcDay(today);
  const start = range === "all" ? -Infinity : end - (Number(range) - 1) * DAY_MS;
  // Align Sunday–Saturday columns and leave the rest of this week unfilled.
  const gridEnd = end + (6 - new Date(end).getUTCDay()) * DAY_MS;
  const days = Array.from({ length: GRID_DAYS }, (_, index) => {
    const time = gridEnd - (GRID_DAYS - 1 - index) * DAY_MS;
    return emptyDay(new Date(time).toISOString().slice(0, 10), time >= start && time <= end, time > end);
  });
  const byDate = new Map(days.map((day) => [day.date, day]));
  const activeDates = new Set<string>();
  const modelTotals = new Map<string, UsageModelTotal>();
  const dailyModels = new Map<string, Map<string, number>>();
  const hours = Array.from({ length: 24 }, () => 0);
  let sessions = 0;
  let messages = 0;
  let totalTokens = 0;
  for (const record of records) {
    const time = utcDay(record.date);
    if (time < start || time > end) continue;
    const tokens = {
      input: count(record.tokens.input), output: count(record.tokens.output),
      cacheRead: count(record.tokens.cacheRead), cacheWrite: count(record.tokens.cacheWrite),
    };
    const total = tokens.input + tokens.output + tokens.cacheRead + tokens.cacheWrite;
    const recordSessions = count(record.sessions);
    const recordMessages = count(record.messages);
    sessions += recordSessions;
    messages += recordMessages;
    totalTokens += total;
    if (total > 0 || recordSessions > 0 || recordMessages > 0) activeDates.add(record.date);
    if (record.model !== "" && total > 0) {
      const model = modelTotals.get(record.model) ?? { model: record.model, totalTokens: 0, input: 0, output: 0 };
      model.totalTokens += total;
      model.input += tokens.input;
      model.output += tokens.output;
      modelTotals.set(record.model, model);
      const daily = dailyModels.get(record.date) ?? new Map<string, number>();
      daily.set(record.model, (daily.get(record.model) ?? 0) + total);
      dailyModels.set(record.date, daily);
    }
    record.hourCounts?.slice(0, 24).forEach((value, hour) => { hours[hour] = (hours[hour] ?? 0) + count(value); });
    const day = byDate.get(record.date);
    if (day !== undefined) {
      day.tokens.input += tokens.input;
      day.tokens.output += tokens.output;
      day.tokens.cacheRead += tokens.cacheRead;
      day.tokens.cacheWrite += tokens.cacheWrite;
      day.totalTokens += total;
      day.sessions += recordSessions;
      day.messages += recordMessages;
    }
  }
  const models = Array.from(modelTotals.values())
    .sort((a, b) => b.totalTokens - a.totalTokens || a.model.localeCompare(b.model));
  const modelDays = Array.from(dailyModels).sort(([a], [b]) => a.localeCompare(b)).map(([date, totals]) => {
    const segments = models.flatMap(({ model }, modelIndex) => {
      const totalTokens = totals.get(model);
      return totalTokens === undefined ? [] : [{ model, modelIndex, totalTokens }];
    });
    return { date, segments, totalTokens: segments.reduce((sum, segment) => sum + segment.totalTokens, 0) };
  });
  const highestHour = Math.max(...hours);
  return {
    sessions, messages, totalTokens, activeDays: activeDates.size,
    peakHour: highestHour > 0 ? hours.indexOf(highestHour) : undefined,
    favoriteModel: models.find((model) => model.model !== "Tools/summaries")?.model,
    days, models, modelDays,
  };
}

/** Prefer the smallest covering span, then roughly four intervals. */
export function usageModelAxisTicks(maximum: number): number[] {
  if (maximum <= 0) return [];
  const base = 10 ** Math.floor(Math.log10(maximum / 6));
  const candidates = [1, 2, 5, 10, 20, 50].map((multiplier) => {
    const step = Math.max(1, multiplier * base);
    return { step, intervals: Math.ceil(maximum / step) };
  }).filter(({ intervals }) => intervals <= 6);
  const best = candidates.reduce((a, b) => {
    const spanA = a.step * a.intervals;
    const spanB = b.step * b.intervals;
    return spanB < spanA || (spanB === spanA && Math.abs(b.intervals - 4) < Math.abs(a.intervals - 4)) ? b : a;
  });
  return Array.from({ length: best.intervals + 1 }, (_, index) => index * best.step);
}
