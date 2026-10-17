// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setLocalePreference } from "../../../shared/i18n";
import type { UsageOverviewResponse } from "../../../shared/usageOverview";
import { HttpRequestError } from "../api/http";
import { usageOverviewApi } from "../api/usageOverview";
import type { UsageOverview } from "./UsageOverview";
import { WelcomeUsageOverview } from "./WelcomeUsageOverview";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
}

function response(tokens: number, warnings: string[] = []): UsageOverviewResponse {
  return { records: [{ date: "2026-10-17", model: "Actual model", tokens: { input: tokens, output: 0, cacheRead: 0, cacheWrite: 0 }, sessions: 1, messages: 2 }], today: "2026-10-17", timeZone: "Asia/Shanghai", scope: "workspace", warnings };
}

async function settle(overview: WelcomeUsageOverview): Promise<void> {
  await overview.updateComplete;
  await Promise.resolve();
  await overview.updateComplete;
}

async function mount(): Promise<WelcomeUsageOverview> {
  const overview = new WelcomeUsageOverview();
  overview.cwd = "/first";
  overview.timeZone = "Asia/Shanghai";
  document.body.append(overview);
  await settle(overview);
  return overview;
}

function panel(overview: WelcomeUsageOverview): UsageOverview | null {
  return overview.renderRoot.querySelector<UsageOverview>("usage-overview");
}

beforeEach(() => { setLocalePreference("en"); });
afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("welcome usage loading", () => {
  it("does not present zero statistics while loading and ignores an old workspace response", async () => {
    const first = deferred<UsageOverviewResponse>();
    const second = deferred<UsageOverviewResponse>();
    const get = vi.spyOn(usageOverviewApi, "get").mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const overview = await mount();
    expect(panel(overview)).toBeNull();
    expect(overview.renderRoot.querySelector('[role="status"]')?.textContent.trim()).not.toBe("");
    const signal = get.mock.calls[0]?.[3]?.signal;
    overview.cwd = "/second";
    overview.machineId = "remote";
    await settle(overview);
    expect(signal?.aborted).toBe(true);
    const secondSignal = get.mock.calls[1]?.[3]?.signal;
    expect(secondSignal).toBeInstanceOf(AbortSignal);
    expect(get).toHaveBeenLastCalledWith("/second", "Asia/Shanghai", "remote", { signal: secondSignal });
    second.resolve(response(200));
    await settle(overview);
    expect(panel(overview)?.records[0]?.tokens.input).toBe(200);
    first.resolve(response(100));
    await settle(overview);
    expect(panel(overview)?.records[0]?.tokens.input).toBe(200);
  });

  it("clears loaded data immediately when the workspace changes", async () => {
    const pending = deferred<UsageOverviewResponse>();
    vi.spyOn(usageOverviewApi, "get").mockResolvedValueOnce(response(100)).mockReturnValueOnce(pending.promise);
    const overview = await mount();
    expect(panel(overview)?.records[0]?.tokens.input).toBe(100);
    overview.cwd = "/second";
    await settle(overview);
    expect(panel(overview)).toBeNull();
    expect(overview.renderRoot.querySelector("section")?.getAttribute("aria-busy")).toBe("true");
    pending.resolve(response(200));
    await settle(overview);
    expect(panel(overview)?.records[0]?.tokens.input).toBe(200);
  });

  it("offers retry after an HTTP failure and marks a partial response without exposing server details", async () => {
    const get = vi.spyOn(usageOverviewApi, "get").mockRejectedValueOnce(new HttpRequestError("Invalid /private/path", 400))
      .mockResolvedValueOnce(response(50, ["Unreadable /private/session.jsonl"]));
    const overview = await mount();
    expect(panel(overview)).toBeNull();
    expect(overview.renderRoot.querySelector('[role="alert"]')).not.toBeNull();
    expect(overview.renderRoot.textContent).not.toContain("/private/");
    const retry = overview.renderRoot.querySelector<HTMLButtonElement>(".error button");
    if (retry === null) throw new Error("Expected retry control");
    retry.click();
    await settle(overview);
    expect(get).toHaveBeenCalledTimes(2);
    expect(panel(overview)?.records[0]?.tokens.input).toBe(50);
    expect(overview.renderRoot.querySelector(".partial")?.textContent).not.toBe("");
    expect(overview.renderRoot.textContent).not.toContain("/private/");
  });

  it("does not show zero totals when no records could be read", async () => {
    vi.spyOn(usageOverviewApi, "get").mockResolvedValue({ ...response(0, ["unreadable"]), records: [] });
    const overview = await mount();
    expect(panel(overview)).toBeNull();
    expect(overview.renderRoot.querySelector('[role="status"]')?.textContent.trim()).not.toBe("");
    expect(overview.renderRoot.textContent).not.toContain("unreadable");
  });

  it("cancels when detached, ignores completion, and reloads when reattached", async () => {
    const pending = deferred<UsageOverviewResponse>();
    const get = vi.spyOn(usageOverviewApi, "get").mockReturnValueOnce(pending.promise).mockResolvedValueOnce(response(80));
    const overview = await mount();
    const signal = get.mock.calls[0]?.[3]?.signal;
    overview.remove();
    expect(signal?.aborted).toBe(true);
    pending.resolve(response(100));
    await settle(overview);
    expect(panel(overview)).toBeNull();
    document.body.append(overview);
    await settle(overview);
    expect(get).toHaveBeenCalledTimes(2);
    expect(panel(overview)?.records[0]?.tokens.input).toBe(80);
  });

  it("restarts an aborted read when reattached with a render update still pending", async () => {
    const pending = deferred<UsageOverviewResponse>();
    const get = vi.spyOn(usageOverviewApi, "get").mockReturnValueOnce(pending.promise).mockResolvedValueOnce(response(80));
    const overview = await mount();
    overview.requestUpdate();
    expect(overview.isUpdatePending).toBe(true);
    overview.remove();
    document.body.append(overview);
    await settle(overview);
    expect(get).toHaveBeenCalledTimes(2);
    expect(panel(overview)?.records[0]?.tokens.input).toBe(80);
    expect(overview.renderRoot.querySelector("section")?.getAttribute("aria-busy")).toBe("false");
    expect(overview.renderRoot.querySelector<HTMLButtonElement>("header button")?.disabled).toBe(false);
    pending.resolve(response(100));
    await settle(overview);
    expect(panel(overview)?.records[0]?.tokens.input).toBe(80);
  });
});
