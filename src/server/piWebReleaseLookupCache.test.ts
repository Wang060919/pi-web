import { describe, expect, it, vi } from "vitest";
import { createPiWebReleaseLookupCache } from "./piWebReleaseLookupCache.js";

describe("createPiWebReleaseLookupCache", () => {
  it("checks for a new release after five minutes by default", async () => {
    let now = 0;
    const load = vi.fn()
      .mockResolvedValueOnce("1.0.0")
      .mockResolvedValueOnce("1.1.0");
    const cache = createPiWebReleaseLookupCache(load, { now: () => now });

    await cache.get("0.9.0");
    now = 5 * 60 * 1000 - 1;
    await expect(cache.get("0.9.0")).resolves.toMatchObject({ latestVersion: "1.0.0" });
    expect(load).toHaveBeenCalledOnce();

    now += 1;
    await expect(cache.get("0.9.0")).resolves.toMatchObject({ latestVersion: "1.1.0", checkedAtMs: now });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("retries failed checks after thirty seconds and caches a recovered result for five minutes", async () => {
    let now = 0;
    const load = vi.fn()
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce("1.1.0")
      .mockResolvedValueOnce("1.2.0");
    const cache = createPiWebReleaseLookupCache(load, { now: () => now });

    await expect(cache.get("1.0.0")).resolves.toMatchObject({ error: "network unavailable" });
    now = 29_999;
    await expect(cache.get("1.0.0")).resolves.toMatchObject({ error: "network unavailable" });
    expect(load).toHaveBeenCalledOnce();

    now = 30_000;
    await expect(cache.get("1.0.0")).resolves.toEqual({ latestVersion: "1.1.0", checkedAtMs: now });
    now += 5 * 60 * 1000 - 1;
    await expect(cache.get("1.0.0")).resolves.toMatchObject({ latestVersion: "1.1.0" });
    expect(load).toHaveBeenCalledTimes(2);

    now += 1;
    await expect(cache.get("1.0.0")).resolves.toMatchObject({ latestVersion: "1.2.0" });
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("serves a fresh cached release lookup", async () => {
    let now = 1_000;
    const load = vi.fn(() => Promise.resolve("1.0.0"));
    const cache = createPiWebReleaseLookupCache(load, { ttlMs: 100, now: () => now });

    await expect(cache.get("0.9.0")).resolves.toMatchObject({ latestVersion: "1.0.0", checkedAtMs: 1_000 });
    now = 1_050;
    await expect(cache.get("0.9.1")).resolves.toMatchObject({ latestVersion: "1.0.0", checkedAtMs: 1_000 });

    expect(load).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledWith("0.9.0");
  });

  it("bypasses a fresh lookup when forced", async () => {
    let now = 1_000;
    const load = vi.fn()
      .mockResolvedValueOnce("1.0.0")
      .mockResolvedValueOnce("1.1.0");
    const cache = createPiWebReleaseLookupCache(load, { ttlMs: 100, now: () => now });

    await cache.get("0.9.0");
    now = 1_050;

    await expect(cache.get("0.9.0", { force: true })).resolves.toMatchObject({ latestVersion: "1.1.0", checkedAtMs: 1_050 });
    await expect(cache.get("0.9.0")).resolves.toMatchObject({ latestVersion: "1.1.0", checkedAtMs: 1_050 });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it.each(["forced-first", "regular-first"] as const)("does not let an older regular lookup replace a forced result when %s completes", async (completionOrder) => {
    const regular = createDeferred<string>();
    const forced = createDeferred<string>();
    const load = vi.fn()
      .mockImplementationOnce(() => regular.promise)
      .mockImplementationOnce(() => forced.promise);
    const cache = createPiWebReleaseLookupCache(load);

    const regularLookup = cache.get("0.9.0");
    const forcedLookup = cache.get("0.9.0", { force: true });
    if (completionOrder === "forced-first") {
      forced.resolve("2.0.0");
      await expect(forcedLookup).resolves.toMatchObject({ latestVersion: "2.0.0" });
      regular.resolve("1.0.0");
      await expect(regularLookup).resolves.toMatchObject({ latestVersion: "1.0.0" });
    } else {
      regular.resolve("1.0.0");
      await expect(regularLookup).resolves.toMatchObject({ latestVersion: "1.0.0" });
      forced.resolve("2.0.0");
      await expect(forcedLookup).resolves.toMatchObject({ latestVersion: "2.0.0" });
    }

    await expect(cache.get("0.9.0")).resolves.toMatchObject({ latestVersion: "2.0.0" });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("makes regular callers join a pending forced lookup", async () => {
    const forced = createDeferred<string>();
    const load = vi.fn(() => forced.promise);
    const cache = createPiWebReleaseLookupCache(load);

    const forcedLookup = cache.get("0.9.0", { force: true });
    const regularLookup = cache.get("0.9.0");

    expect(regularLookup).toBe(forcedLookup);
    forced.resolve("2.0.0");
    await expect(regularLookup).resolves.toMatchObject({ latestVersion: "2.0.0" });
    expect(load).toHaveBeenCalledOnce();
  });
});

function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}
