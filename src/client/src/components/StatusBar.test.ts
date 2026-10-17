// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionStatus } from "../api";
import { StatusBar, statusBarWarningControlContent } from "./StatusBar";
import type { UsageDetails } from "./UsageDetails";
import { deepActiveElement, dialogSection, dialogSurface, pressKey, requiredElement, settleRenderedDialog } from "./modalSurfaceTestSupport";

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("statusBarWarningControlContent", () => {
  it("provides an action label for both states while keeping only the count visible", () => {
    expect(statusBarWarningControlContent(1, true)).toEqual({
      countText: "1",
      accessibleLabel: "Minimise 1 warning",
    });
    expect(statusBarWarningControlContent(3, false)).toEqual({
      countText: "3",
      accessibleLabel: "Show 3 warnings in the warning area",
    });
  });

  it("omits the control content when there are no warnings", () => {
    expect(statusBarWarningControlContent(0, false)).toBeUndefined();
  });
});

describe("StatusBar compact usage and warnings", () => {
  it("keeps usage details accessible from the compact composer ring", async () => {
    const bar = new StatusBar();
    bar.compact = true;
    bar.status = status();
    document.body.append(bar);
    await bar.updateComplete;
    expect(bar.hasAttribute("compact")).toBe(true);
    const toggle = bar.renderRoot.querySelector<HTMLButtonElement>(".usage-toggle");
    expect(toggle?.getAttribute("aria-label")).toBe("View context and usage: context unknown");
    toggle?.click();
    await bar.updateComplete;
    expect(bar.renderRoot.querySelector("usage-details")).not.toBeNull();
  });

  it("keeps the controlled warning action and queued messages visible beside compact context usage", async () => {
    const onToggleWarnings = vi.fn();
    const statusBar = await mount((element) => {
      element.status = { ...status(), pendingMessageCount: 3, contextUsage: { tokens: 25000, contextWindow: 100000, percent: 25 } };
      element.warningCount = 2;
      element.warningsExpanded = true;
      element.onToggleWarnings = onToggleWarnings;
    });
    const toggle = requiredElement(statusBar.shadowRoot?.querySelector<HTMLButtonElement>(".warning-toggle"), "warning toggle");
    expect(toggle.getAttribute("aria-label")).toBe("Minimise 2 warnings");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(usageToggle(statusBar).textContent).toContain("Context 25.0%");
    expect(statusBar.shadowRoot?.querySelector(".bar > span")?.textContent).toBe("3 queued");

    toggle.click();
    await statusBar.updateComplete;
    expect(onToggleWarnings).toHaveBeenCalledOnce();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    statusBar.warningsExpanded = false;
    await statusBar.updateComplete;
    expect(toggle.getAttribute("aria-label")).toBe("Show 2 warnings in the warning area");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("omits an unavailable warning action without hiding queued work", async () => {
    const statusBar = await mount((element) => {
      element.warningCount = 2;
      element.status = { ...status(), pendingMessageCount: 1 };
    });
    expect(statusBar.shadowRoot?.querySelector(".warning-toggle")).toBeNull();
    expect(statusBar.shadowRoot?.querySelector(".bar > span")?.textContent).toBe("1 queued");
  });

  it.each([undefined, { tokens: 500, contextWindow: 1000, percent: null }, { tokens: 500, contextWindow: 1000, percent: Number.NaN }])("preserves unknown context percentages without inferring a value from token counts (%j)", async (contextUsage) => {
    const statusBar = await mount((element) => { element.status = { ...status(), ...(contextUsage === undefined ? {} : { contextUsage }) }; });
    expect(usageToggle(statusBar).textContent).toContain("context unknown");
    expect(usageToggle(statusBar).getAttribute("aria-label")).toBe("View context and usage: context unknown");
    expect(statusBar.shadowRoot?.querySelector(".context-ring-value")).toBeNull();
  });

  it("retains a reported percentage above 100 while bounding only the drawn ring", async () => {
    const statusBar = await mount((element) => { element.status = { ...status(), contextUsage: { tokens: 125400, contextWindow: 100000, percent: 125.4 } }; });
    expect(usageToggle(statusBar).textContent).toContain("Context 125.4%");
    expect(statusBar.shadowRoot?.querySelector(".context-ring-value")?.getAttribute("stroke-dasharray")).toBe("100 100");
  });
});

describe("StatusBar usage details", () => {
  it("opens an accessible dialog with every source counter, cost, and current context measurement", async () => {
    const statusBar = await mount((element) => {
      element.status = {
        ...status(),
        tokens: { input: 1234, output: 456, cacheRead: 7000, cacheWrite: 345, total: 9876 }, cost: 0.00567,
        contextUsage: { tokens: 34567, contextWindow: 128000, percent: 27.005 },
      };
    });
    const details = await openDetails(statusBar);
    expect(dialogSection(details).getAttribute("aria-label")).toBe("Context and usage");
    expect(dialogSection(details).getAttribute("aria-modal")).toBe("true");
    expect(detailRows(details)).toEqual({
      Usage: "27.0%", "Used tokens": (34567).toLocaleString(), "Context window": (128000).toLocaleString(),
      Input: (1234).toLocaleString(), Output: "456", "Cache read": (7000).toLocaleString(), "Cache write": "345", "Total tokens": (9876).toLocaleString(), "Total cost": "$0.0057",
    });
    expect(details.shadowRoot?.querySelector(".cost-row dd")?.getAttribute("title")).toBe("$0.00567");
    expect(usageToggle(statusBar).getAttribute("aria-expanded")).toBe("true");
    expect(deepActiveElement()).toBe(details.shadowRoot?.querySelector(".usage-close"));
  });

  it.each(["button", "Escape"])("closes with %s and restores focus to the usage trigger", async (action) => {
    const statusBar = await mount();
    const trigger = usageToggle(statusBar);
    const details = await openDetails(statusBar);
    if (action === "Escape") pressKey(dialogSurface(details), "Escape");
    else requiredElement(details.shadowRoot?.querySelector<HTMLButtonElement>(".usage-close"), "close usage button").click();
    await statusBar.updateComplete;
    expect(statusBar.shadowRoot?.querySelector("usage-details")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(deepActiveElement()).toBe(trigger);
  });

  it("passes the loaded transcript and incomplete-history boundary to the context view", async () => {
    const statusBar = await mount((element) => {
      element.historyPartial = true;
      element.messages = [{ role: "skill", parts: [{ type: "skillRead", name: "review", path: "/skills/review/SKILL.md" }] }];
    });
    const details = await openDetails(statusBar);

    expect(details.shadowRoot?.querySelector(".history-partial")?.textContent).toContain("Earlier messages are not loaded");
    expect(details.shadowRoot?.querySelector(".observations")?.textContent).toContain("Read requested");
    expect(details.shadowRoot?.querySelector(".observations")?.textContent).toContain("/skills/review/SKILL.md");
  });

  it("updates an open dialog in place and keeps unavailable context values unknown", async () => {
    const statusBar = await mount();
    const details = await openDetails(statusBar);
    statusBar.status = { ...status(), cost: 1.25, tokens: { input: 40, output: 20, cacheRead: 30, cacheWrite: 10, total: 99 }, contextUsage: { tokens: null, contextWindow: 200000, percent: null } };
    await statusBar.updateComplete;
    await settleRenderedDialog(details);
    expect(statusBar.shadowRoot?.querySelector("usage-details")).toBe(details);
    expect(detailRows(details)).toMatchObject({ Usage: "Unknown", "Used tokens": "Unknown", "Context window": (200000).toLocaleString(), Input: "40", Output: "20", "Cache read": "30", "Cache write": "10", "Total tokens": "99", "Total cost": "$1.25" });
    expect(usageToggle(statusBar).textContent).toContain("context unknown");
  });

  it.each(["switch", "unavailable"])("closes details when session status is %s and does not reopen on return", async (change) => {
    const statusBar = await mount();
    await openDetails(statusBar);
    statusBar.status = change === "switch" ? { ...status(), sessionId: "session-2" } : undefined;
    await statusBar.updateComplete;
    expect(statusBar.shadowRoot?.querySelector("usage-details")).toBeNull();
    if (change === "unavailable") {
      expect(statusBar.shadowRoot?.textContent).toContain("No session status yet");
      expect(statusBar.shadowRoot?.querySelector(".usage-toggle")).toBeNull();
    }
    statusBar.status = status();
    await statusBar.updateComplete;
    expect(statusBar.shadowRoot?.querySelector("usage-details")).toBeNull();
  });
});

async function mount(configure?: (element: StatusBar) => void): Promise<StatusBar> {
  const statusBar = new StatusBar();
  statusBar.status = status();
  configure?.(statusBar);
  document.body.append(statusBar);
  await statusBar.updateComplete;
  return statusBar;
}

function usageToggle(statusBar: StatusBar): HTMLButtonElement {
  return requiredElement(statusBar.shadowRoot?.querySelector<HTMLButtonElement>(".usage-toggle"), "usage trigger");
}

async function openDetails(statusBar: StatusBar): Promise<UsageDetails> {
  usageToggle(statusBar).focus();
  usageToggle(statusBar).click();
  await statusBar.updateComplete;
  const details = requiredElement(statusBar.shadowRoot?.querySelector<UsageDetails>("usage-details"), "usage details");
  await settleRenderedDialog(details);
  return details;
}

function detailRows(details: UsageDetails): Record<string, string> {
  return Object.fromEntries(Array.from(details.shadowRoot?.querySelectorAll("dl > div") ?? [], (row) => [row.querySelector("dt")?.textContent ?? "", row.querySelector("dd")?.textContent ?? ""]));
}

function status(): SessionStatus {
  return {
    sessionId: "session-1",
    isStreaming: true,
    isCompacting: false,
    isBashRunning: false,
    pendingMessageCount: 0,
    queuedMessages: [],
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    cost: 0,
  };
}
