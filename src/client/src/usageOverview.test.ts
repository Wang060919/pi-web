import { describe, expect, it } from "vitest";
import { aggregateUsageOverview, usageModelAxisTicks, type DailyUsageRecord } from "./usageOverview";

function record(date: string, model = "Pi Mini", input = 10): DailyUsageRecord {
  return { date, model, tokens: { input, output: 0, cacheRead: 0, cacheWrite: 0 }, sessions: 1, messages: 2 };
}

describe("aggregateUsageOverview", () => {
  it("includes today and the previous six days across a month boundary", () => {
    const data = aggregateUsageOverview([
      record("2026-02-26"), record("2026-02-27"), record("2026-03-05"), record("2026-03-06"),
    ], "7", "2026-03-05");

    expect(data).toMatchObject({ sessions: 2, messages: 4, totalTokens: 20, activeDays: 2 });
    expect(data.days.filter((day) => day.inRange).map((day) => day.date)).toEqual([
      "2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05",
    ]);
  });

  it("uses an inclusive thirty-day window without treating a month as thirty days", () => {
    const data = aggregateUsageOverview([
      record("2026-02-03"), record("2026-02-04"), record("2026-03-05"), record("2026-03-06"),
    ], "30", "2026-03-05");

    expect(data.totalTokens).toBe(20);
    expect(data.modelDays.map((day) => day.date)).toEqual(["2026-02-04", "2026-03-05"]);
    const visibleDays = data.days.filter((day) => day.inRange);
    expect(visibleDays).toHaveLength(30);
    expect(visibleDays[0]?.date).toBe("2026-02-04");
    expect(visibleDays.at(-1)?.date).toBe("2026-03-05");
  });

  it("counts older all-time usage while keeping a contiguous twenty-six-week grid and excluding the future", () => {
    const data = aggregateUsageOverview([
      record("2025-12-31", "Archive", 100), record("2026-01-01"), record("2026-07-01"), record("2026-07-02", "Future", 999),
    ], "all", "2026-07-01");

    expect(data).toMatchObject({ totalTokens: 120, activeDays: 3, sessions: 3 });
    expect(data.models.map((model) => model.model)).toEqual(["Archive", "Pi Mini"]);
    expect(data.modelDays[0]?.date).toBe("2025-12-31");
    expect(data.days).toHaveLength(26 * 7);
    expect(data.days[0]?.date).toBe("2026-01-04");
    expect(data.days.at(-1)?.date).toBe("2026-07-04");
    expect(new Set(data.days.map((day) => day.date)).size).toBe(182);
    expect(data.days.filter((day) => day.future).map((day) => day.date)).toEqual(["2026-07-02", "2026-07-03", "2026-07-04"]);
    expect(data.days.every((day) => day.inRange === !day.future)).toBe(true);
    expect(data.days.reduce((total, day) => total + day.totalTokens, 0)).toBe(10);
  });

  it("combines token categories and daily models, ranks total consumption, and reports the busiest message hour", () => {
    const firstHours = Array.from({ length: 24 }, (_, hour) => hour === 20 ? 4 : hour === 10 ? 6 : 0);
    const secondHours = Array.from({ length: 24 }, (_, hour) => hour === 20 ? 3 : 0);
    const data = aggregateUsageOverview([
      { date: "2026-10-16", model: "Pi Mini", tokens: { input: 60, output: 10, cacheRead: 15, cacheWrite: 25 }, sessions: 1, messages: 2, hourCounts: firstHours },
      { date: "2026-10-16", model: "Pi Mini", tokens: { input: 40, output: 10, cacheRead: 15, cacheWrite: 25 }, sessions: 1, messages: 3 },
      { date: "2026-10-16", model: "Pi Pro", tokens: { input: 200, output: 100, cacheRead: 0, cacheWrite: 0 }, sessions: 1, messages: 6, hourCounts: secondHours },
      { ...record("2026-10-17", "Pi Mini", 20), sessions: 2, messages: 3 },
    ], "all", "2026-10-17");

    expect(data).toMatchObject({ sessions: 5, messages: 14, totalTokens: 520, activeDays: 2, favoriteModel: "Pi Pro", peakHour: 20 });
    expect(data.models).toEqual([{ model: "Pi Pro", totalTokens: 300, input: 200, output: 100 }, { model: "Pi Mini", totalTokens: 220, input: 120, output: 20 }]);
    expect(data.modelDays).toEqual([
      { date: "2026-10-16", totalTokens: 500, segments: [{ model: "Pi Pro", modelIndex: 0, totalTokens: 300 }, { model: "Pi Mini", modelIndex: 1, totalTokens: 200 }] },
      { date: "2026-10-17", totalTokens: 20, segments: [{ model: "Pi Mini", modelIndex: 1, totalTokens: 20 }] },
    ]);
    expect(data.days.find((day) => day.date === "2026-10-16")).toMatchObject({
      tokens: { input: 300, output: 120, cacheRead: 30, cacheWrite: 50 }, totalTokens: 500, sessions: 3, messages: 11,
    });
  });

  it("returns explicit empty totals without inventing a favorite model or peak hour", () => {
    const data = aggregateUsageOverview([], "all", "2026-10-17");
    expect(data).toMatchObject({ sessions: 0, messages: 0, totalTokens: 0, activeDays: 0, favoriteModel: undefined, peakHour: undefined, models: [] });
    expect(data.days.every((day) => day.totalTokens === 0)).toBe(true);
  });

  it("counts unattributed activity and summary usage without inventing a favorite model", () => {
    const data = aggregateUsageOverview([
      { ...record("2026-10-17", "", 0), sessions: 1, messages: 3 },
      { ...record("2026-10-17", "Tools/summaries", 50), sessions: 0, messages: 0 },
    ], "all", "2026-10-17");
    expect(data).toMatchObject({ sessions: 1, messages: 3, totalTokens: 50, favoriteModel: undefined });
    expect(data.models).toEqual([{ model: "Tools/summaries", totalTokens: 50, input: 50, output: 0 }]);
  });

  it("rejects malformed dates and invalid consumption instead of silently producing misleading totals", () => {
    for (const invalidDate of ["2026-02-30", "2026-1-01", "not-a-date"]) {
      expect(() => aggregateUsageOverview([record(invalidDate)], "all", "2026-10-17")).toThrow(RangeError);
    }
    expect(() => aggregateUsageOverview([], "all", "2026-02-30")).toThrow(RangeError);
    for (const invalidCount of [-1, NaN, Infinity]) {
      expect(() => aggregateUsageOverview([record("2026-10-17", "Pi Mini", invalidCount)], "all", "2026-10-17")).toThrow(RangeError);
    }
  });
});

describe("usageModelAxisTicks", () => {
  it("covers the reference 49k day with ten-thousand-token intervals", () => {
    expect(usageModelAxisTicks(49000)).toEqual([0, 10000, 20000, 30000, 40000, 50000]);
  });

  it("handles empty and small usage without zero-sized intervals", () => {
    expect(usageModelAxisTicks(0)).toEqual([]);
    expect(usageModelAxisTicks(1)).toEqual([0, 1]);
    expect(usageModelAxisTicks(4)).toEqual([0, 1, 2, 3, 4]);
  });
});
