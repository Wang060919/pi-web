// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { setLocalePreference } from "../../../shared/i18n";
import type { Locale } from "../../../shared/i18nCore";
import { aggregateUsageOverview, type DailyUsageRecord } from "../usageOverview";
import { UsageModels } from "./UsageModels";

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.unstubAllGlobals();
});

function record(date: string, model: string, input: number, output = 0): DailyUsageRecord {
  return { date, model, tokens: { input, output, cacheRead: 0, cacheWrite: 0 }, sessions: 1, messages: 2 };
}

async function mount(records: DailyUsageRecord[], locale: Locale = "en"): Promise<UsageModels> {
  setLocalePreference(locale);
  const data = aggregateUsageOverview(records, "all", "2026-10-19");
  const view = new UsageModels();
  view.models = data.models;
  view.days = data.modelDays;
  view.totalTokens = data.totalTokens;
  view.locale = locale;
  document.body.append(view);
  await view.updateComplete;
  await view.updateComplete;
  return view;
}

function dayButtons(view: UsageModels): HTMLButtonElement[] {
  return [...view.renderRoot.querySelectorAll<HTMLButtonElement>(".plot-day")];
}

describe("UsageModels", () => {
  it("shows model input/output totals and percentages alongside daily stacked usage", async () => {
    const view = await mount([
      record("2026-10-18", "Pi Mini", 300, 100),
      record("2026-10-19", "Pi Mini", 100),
      record("2026-10-19", "Pi Pro", 200, 300),
    ]);
    expect([...view.renderRoot.querySelectorAll(".model-name")].map((row) => row.textContent)).toEqual(["Pi Mini", "Pi Pro"]);
    expect([...view.renderRoot.querySelectorAll(".model-io")].map((row) => row.textContent)).toEqual(["400 in · 100 out", "200 in · 300 out"]);
    expect([...view.renderRoot.querySelectorAll(".model-percent")].map((row) => row.textContent)).toEqual(["50.0%", "50.0%"]);
    expect(dayButtons(view).map((day) => day.getAttribute("aria-label"))).toEqual(["Oct 18: 400 Tokens", "Oct 19: 600 Tokens"]);
    expect(dayButtons(view).map((day) => day.querySelectorAll(".segment").length)).toEqual([1, 2]);
  });

  it("expands model legends beyond six rows and collapses them again", async () => {
    const view = await mount(Array.from({ length: 8 }, (_, index) => record("2026-10-19", `Model ${String(index)}`, 100 - index)));
    const expand = view.renderRoot.querySelector<HTMLButtonElement>(".expand");
    if (expand === null) throw new Error("Missing model expansion control");
    expect(view.renderRoot.querySelectorAll("li")).toHaveLength(6);
    expect(expand.textContent).toBe("Show 2 more");
    expect(expand.getAttribute("aria-expanded")).toBe("false");
    expand.click();
    await view.updateComplete;
    expect(view.renderRoot.querySelectorAll("li")).toHaveLength(8);
    expect(expand.textContent).toBe("Show less");
    expect(expand.getAttribute("aria-expanded")).toBe("true");
    expand.click();
    await view.updateComplete;
    expect(view.renderRoot.querySelectorAll("li")).toHaveLength(6);
  });

  it("exposes per-model day details through a single keyboard entry and dismissible tooltip", async () => {
    const view = await mount([record("2026-10-18", "Pi Mini", 400), record("2026-10-19", "Pi Mini", 100), record("2026-10-19", "Pi Pro", 500)]);
    const [first, last] = dayButtons(view);
    if (first === undefined || last === undefined) throw new Error("Missing daily usage controls");
    expect(dayButtons(view).filter((day) => day.tabIndex === 0)).toEqual([last]);
    last.focus();
    await view.updateComplete;
    expect(last.getAttribute("aria-describedby")).toBe("model-day-tooltip");
    expect(view.renderRoot.querySelector('[role="tooltip"]')?.textContent).toContain("Pi Pro: 500");
    expect(view.renderRoot.querySelector('[role="tooltip"]')?.textContent).toContain("Pi Mini: 100");
    last.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    await view.updateComplete;
    await view.updateComplete;
    expect(view.shadowRoot?.activeElement).toBe(first);
    expect(dayButtons(view).filter((day) => day.tabIndex === 0)).toEqual([first]);
    expect(view.renderRoot.querySelector('[role="tooltip"]')?.textContent).toContain("Pi Mini: 400");
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await view.updateComplete;
    expect(view.renderRoot.querySelector('[role="tooltip"]')).toBeNull();
    expect(first.hasAttribute("aria-describedby")).toBe(false);
  });

  it("localizes chart and legend text", async () => {
    const view = await mount([record("2026-10-19", "Pi Pro", 49000, 11)], "zh-CN");
    expect(view.renderRoot.querySelector(".chart")?.getAttribute("aria-label")).toBe("每日各模型 Token 用量");
    expect(view.renderRoot.querySelector(".model-io")?.textContent).toBe("4.9万 输入 · 11 输出");
    expect(view.renderRoot.querySelector(".model-percent")?.textContent).toBe("100.0%");
    expect(view.renderRoot.textContent).not.toContain("ui.usageOverview.");
  });

  it("disconnects size observation and resumes it when the view reconnects", async () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class { observe = observe; disconnect = disconnect; });
    const view = await mount([record("2026-10-19", "Pi Pro", 49000)]);
    expect(observe).toHaveBeenCalledExactlyOnceWith(view.renderRoot.querySelector(".plot"));
    view.remove();
    expect(disconnect).toHaveBeenCalledOnce();
    document.body.append(view);
    await view.updateComplete;
    expect(observe).toHaveBeenCalledTimes(2);
  });
});
