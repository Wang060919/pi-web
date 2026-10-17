import { afterEach, describe, expect, it, vi } from "vitest";
import type { UsageOverviewResponse } from "../../../shared/usageOverview";
import { parseUsageOverviewResponse, usageOverviewApi, usageOverviewPath } from "./usageOverview";

const response: UsageOverviewResponse = {
  records: [{ date: "2026-10-17", model: "provider/model", sessions: 1, messages: 2, tokens: { input: 10, output: 20, cacheRead: 30, cacheWrite: 40 }, hourCounts: Array.from({ length: 24 }, (_, hour) => hour === 9 ? 2 : 0) }],
  today: "2026-10-17", timeZone: "Asia/Shanghai", scope: "workspace", warnings: [],
};

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("usage overview API", () => {
  it("encodes machine and query values while preserving the nested application base", async () => {
    const path = usageOverviewPath("/repo/a ?&中", "Asia/Shanghai", "remote/a");
    expect(path).toBe("api/machines/remote%2Fa/usage-overview?cwd=%2Frepo%2Fa+%3F%26%E4%B8%AD&timeZone=Asia%2FShanghai");
    vi.stubGlobal("document", { baseURI: "https://example.test/nested/" });
    vi.stubEnv("BASE_URL", "/nested/");
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify(response)));
    vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();
    await expect(usageOverviewApi.get("/repo/a ?&中", "Asia/Shanghai", "remote/a", { signal: controller.signal })).resolves.toEqual(response);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(`https://example.test/nested/${path}`, expect.objectContaining({ cache: "no-store", signal: controller.signal }));
  });

  it("accepts a valid empty response and optional hourly counts", () => {
    expect(parseUsageOverviewResponse({ ...response, records: [] })).toEqual({ ...response, records: [] });
    const daily = response.records[0];
    if (daily === undefined) throw new Error("Expected usage fixture");
    const withoutHours = { date: daily.date, model: daily.model, sessions: daily.sessions, messages: daily.messages, tokens: daily.tokens };
    expect(parseUsageOverviewResponse({ ...response, records: [withoutHours], warnings: ["partial"] }).records).toEqual([withoutHours]);
  });

  it.each([
    { ...response, scope: "global" },
    { ...response, today: "2026-02-30" },
    { ...response, timeZone: "unknown/zone" },
    { ...response, warnings: [5] },
    { ...response, records: [{ ...response.records[0], sessions: -1 }] },
    { ...response, records: [{ ...response.records[0], messages: 1.5 }] },
    { ...response, records: [{ ...response.records[0], tokens: { input: Infinity, output: 1, cacheRead: 0, cacheWrite: 0 } }] },
    { ...response, records: [{ ...response.records[0], date: "2026-04-31" }] },
    { ...response, records: [{ ...response.records[0], model: 5 }] },
    { ...response, records: [{ ...response.records[0], hourCounts: [1] }] },
  ])("rejects malformed statistics instead of displaying invented counts: %j", (value) => {
    expect(() => parseUsageOverviewResponse(value)).toThrow();
  });
});
