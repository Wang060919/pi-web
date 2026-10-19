// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { setLocalePreference } from "../../../shared/i18n";
import type { Locale } from "../../../shared/i18nCore";
import type { DailyUsageRecord } from "../usageOverview";
import { UsageOverview } from "./UsageOverview";
import { UsageModels } from "./UsageModels";

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

async function mount(records: readonly DailyUsageRecord[] = [], locale: Locale = "en"): Promise<UsageOverview> {
  setLocalePreference(locale);
  const overview = new UsageOverview();
  overview.today = "2026-10-17";
  overview.locale = locale;
  overview.records = records;
  document.body.append(overview);
  await overview.updateComplete;
  return overview;
}

function button(overview: UsageOverview, label: string): HTMLButtonElement {
  const match = Array.from(overview.renderRoot.querySelectorAll<HTMLButtonElement>("header button"))
    .find((element) => element.textContent.trim() === label);
  if (match === undefined) throw new Error(`Missing button: ${label}`);
  return match;
}

function metrics(overview: UsageOverview): Record<string, string> {
  return Object.fromEntries(Array.from(overview.renderRoot.querySelectorAll(".metrics > div"), (metric) => [
    metric.querySelector("dt")?.textContent ?? "", metric.querySelector("dd")?.textContent ?? "",
  ]));
}

function dayButtons(overview: UsageOverview): HTMLButtonElement[] {
  return Array.from(overview.renderRoot.querySelectorAll<HTMLButtonElement>("button[data-date]"));
}

async function modelsView(overview: UsageOverview): Promise<UsageModels> {
  const models = overview.renderRoot.querySelector("usage-models");
  if (!(models instanceof UsageModels)) throw new Error("Missing model usage view");
  await models.updateComplete;
  return models;
}

async function key(overview: UsageOverview, button: HTMLButtonElement, key: string): Promise<void> {
  button.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  await overview.updateComplete;
  await overview.updateComplete;
}

describe("UsageOverview", () => {
  it("updates metrics and model rankings through the actual range and view controls", async () => {
    const overview = await mount([
      { date: "2026-09-01", model: "Pi Archive", tokens: { input: 300, output: 0, cacheRead: 0, cacheWrite: 0 }, sessions: 2, messages: 4 },
      { date: "2026-10-16", model: "Pi Mini", tokens: { input: 100, output: 50, cacheRead: 0, cacheWrite: 0 }, sessions: 1, messages: 3 },
    ]);
    expect(metrics(overview)).toMatchObject({ Sessions: "3", Messages: "7", "Total tokens": "450", "Active days": "2", "Favorite model": "Pi Archive" });

    button(overview, "7d").click();
    await overview.updateComplete;
    expect(button(overview, "7d").getAttribute("aria-pressed")).toBe("true");
    expect(button(overview, "All").getAttribute("aria-pressed")).toBe("false");
    expect(metrics(overview)).toMatchObject({ Sessions: "1", Messages: "3", "Total tokens": "150", "Active days": "1", "Favorite model": "Pi Mini" });

    button(overview, "Models").click();
    await overview.updateComplete;
    expect(overview.renderRoot.querySelector(".metrics")).toBeNull();
    const models = await modelsView(overview);
    expect(models.models).toEqual([{ model: "Pi Mini", totalTokens: 150, input: 100, output: 50 }]);
    expect(models.days.map((day) => day.date)).toEqual(["2026-10-16"]);
    button(overview, "All").click();
    await overview.updateComplete;
    await modelsView(overview);
    expect(models.models.map((model) => model.model)).toEqual(["Pi Archive", "Pi Mini"]);
    expect(models.days.map((day) => day.date)).toEqual(["2026-09-01", "2026-10-16"]);
    button(overview, "Overview").click();
    await overview.updateComplete;
    expect(metrics(overview)["Total tokens"]).toBe("450");
  });

  it("renders empty metrics and a useful empty model view", async () => {
    const overview = await mount();
    expect(metrics(overview)).toEqual({ Sessions: "0", Messages: "0", "Total tokens": "0", "Active days": "0", "Peak hour": "—", "Favorite model": "—" });
    expect(dayButtons(overview)).toHaveLength(182);
    expect(overview.renderRoot.querySelector('[role="tooltip"]')).toBeNull();
    button(overview, "Models").click();
    await overview.updateComplete;
    const models = await modelsView(overview);
    expect(models.renderRoot.querySelector(".empty")?.textContent).toBe("No model usage in this range.");
    expect(models.renderRoot.querySelector("ol")).toBeNull();
  });

  it("offers a single keyboard entry, navigable dates, and a dismissible tooltip associated with the focused day", async () => {
    const overview = await mount([
      { date: "2026-10-17", model: "Pi Mini", tokens: { input: 10, output: 20, cacheRead: 30, cacheWrite: 40 }, sessions: 1, messages: 2 },
    ]);
    const today = dayButtons(overview).at(-1);
    if (today === undefined) throw new Error("Missing today's heatmap cell");
    expect(dayButtons(overview).filter((day) => day.tabIndex === 0)).toEqual([today]);
    today.focus();
    await overview.updateComplete;
    expect(overview.renderRoot.querySelector('[role="tooltip"]')?.textContent).toBe("Oct 17 — 2");
    expect(today.getAttribute("aria-describedby")).toBe("usage-day-tooltip");
    expect(today.getAttribute("aria-label")).toContain("2 Messages");

    await key(overview, today, "Home");
    const first = dayButtons(overview)[0];
    if (first === undefined) throw new Error("Missing first heatmap cell");
    expect(overview.shadowRoot?.activeElement).toBe(first);
    expect(dayButtons(overview).filter((day) => day.tabIndex === 0)).toEqual([first]);
    await key(overview, first, "ArrowDown");
    expect(overview.shadowRoot?.activeElement).toBe(dayButtons(overview)[1]);
    const second = dayButtons(overview)[1];
    if (second === undefined) throw new Error("Missing second heatmap cell");
    await key(overview, second, "Escape");
    expect(overview.renderRoot.querySelector('[role="tooltip"]')).toBeNull();
    expect(second.hasAttribute("aria-describedby")).toBe(false);
    await key(overview, second, "End");
    expect(overview.shadowRoot?.activeElement).toBe(today);
    expect(dayButtons(overview).filter((day) => day.tabIndex === 0)).toEqual([today]);
  });

  it("colors message activity independently of token volume and leaves future dates unfilled", async () => {
    const overview = await mount([
      { date: "2026-10-18", model: "Pi Mini", tokens: { input: 10000, output: 0, cacheRead: 0, cacheWrite: 0 }, sessions: 1, messages: 1 },
      { date: "2026-10-19", model: "Pi Mini", tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, sessions: 1, messages: 8 },
    ]);
    overview.today = "2026-10-19";
    await overview.updateComplete;
    expect(overview.renderRoot.querySelector('[data-date="2026-10-18"]')?.getAttribute("data-level")).toBe("1");
    expect(overview.renderRoot.querySelector('[data-date="2026-10-19"]')?.getAttribute("data-level")).toBe("4");
    expect(overview.renderRoot.querySelectorAll(".future")).toHaveLength(5);
    const today = dayButtons(overview).at(-1);
    if (today === undefined) throw new Error("Missing today's heatmap cell");
    today.focus();
    await key(overview, today, "End");
    expect(overview.shadowRoot?.activeElement).toBe(today);
    expect(overview.renderRoot.querySelector('[role="tooltip"]')?.textContent).toBe("Oct 19 — 8");
    button(overview, "7d").click();
    await overview.updateComplete;
    expect(overview.renderRoot.querySelector('[role="tooltip"]')).toBeNull();
  });

  it("provides Chinese labels and accessible date descriptions without leaking translation keys", async () => {
    const overview = await mount([], "zh-CN");
    expect(button(overview, "总览").getAttribute("aria-pressed")).toBe("true");
    expect(metrics(overview)).toMatchObject({ 会话数: "0", 消息数: "0", "总 Token": "0", 高峰时段: "—" });
    expect(dayButtons(overview).at(-1)?.getAttribute("aria-label")).toContain("2026年10月17日");
    button(overview, "模型").click();
    await overview.updateComplete;
    expect((await modelsView(overview)).renderRoot.querySelector(".empty")?.textContent).toBe("此时间范围内暂无模型用量。");
    expect(overview.renderRoot.textContent).not.toContain("ui.usageOverview.");
  });
});
