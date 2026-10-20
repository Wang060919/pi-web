// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SelectedSessionNotificationView } from "../sessionNotifications";
import { ChatView } from "./ChatView";

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
});

function inbox(severity: "info" | "warning" | "error" = "info"): SelectedSessionNotificationView {
  return {
    machineId: "local", sessionId: "mobile-notices", cwd: "/repo", daemonInstanceId: "daemon",
    notifications: [{ id: "notice", message: "Notification text", truncated: false, severity, receivedAt: "2026-10-19T00:00:00Z", order: 1 }],
    retainedCount: 1, discardedCount: 0, highestSeverity: severity,
    dismissThrough: { order: 1, overflowWatermark: 0 }, pendingDismissedIds: new Set(), dismissAllPending: false, announcements: [],
  };
}

async function mount(mobile: boolean, severity: "info" | "warning" | "error" = "info") {
  const media = window.matchMedia("(max-width: 760px)");
  Object.defineProperty(media, "matches", { value: mobile, configurable: true });
  vi.spyOn(window, "matchMedia").mockReturnValue(media);
  const view = new ChatView();
  view.sessionId = "mobile-notices";
  view.notificationInbox = inbox(severity);
  document.body.append(view);
  await view.updateComplete;
  return view;
}

function toggle(view: ChatView): HTMLButtonElement {
  const button = view.renderRoot.querySelector<HTMLButtonElement>(".notification-toggle");
  if (button === null) throw new Error("Missing notifications toggle");
  return button;
}

describe("mobile notification disclosure", () => {
  it("collapses informational notices, keeps expansion through inbox updates and navigation, and lets users collapse again", async () => {
    const view = await mount(true);
    expect(toggle(view).getAttribute("aria-expanded")).toBe("false");
    expect(view.renderRoot.querySelector<HTMLElement>(".notification-list")?.hidden).toBe(true);
    toggle(view).click();
    await view.updateComplete;
    expect(toggle(view).getAttribute("aria-expanded")).toBe("true");
    view.notificationInbox = inbox();
    await view.updateComplete;
    expect(toggle(view).getAttribute("aria-expanded")).toBe("true");
    view.sessionId = "other";
    await view.updateComplete;
    view.sessionId = "mobile-notices";
    await view.updateComplete;
    expect(toggle(view).getAttribute("aria-expanded")).toBe("true");
    toggle(view).click();
    await view.updateComplete;
    expect(toggle(view).getAttribute("aria-expanded")).toBe("false");
  });

  it.each(["warning", "error"] as const)("keeps %s visible and opens newly important notices", async (severity) => {
    const view = await mount(true);
    view.notificationInbox = inbox(severity);
    await view.updateComplete;
    expect(toggle(view).getAttribute("aria-expanded")).toBe("true");
    expect(view.renderRoot.querySelector<HTMLElement>(".notification-list")?.hidden).toBe(false);
  });

  it("updates the default on resize without overriding an explicit expansion", async () => {
    const view = await mount(true);
    const media = window.matchMedia("(max-width: 760px)");
    Object.defineProperty(media, "matches", { value: false, configurable: true });
    window.dispatchEvent(new Event("resize"));
    await view.updateComplete;
    expect(toggle(view).getAttribute("aria-expanded")).toBe("true");
    Object.defineProperty(media, "matches", { value: true, configurable: true });
    window.dispatchEvent(new Event("resize"));
    await view.updateComplete;
    expect(toggle(view).getAttribute("aria-expanded")).toBe("false");
    toggle(view).click();
    await view.updateComplete;
    window.dispatchEvent(new Event("resize"));
    await view.updateComplete;
    expect(toggle(view).getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps desktop notices expanded by default", async () => {
    expect(toggle(await mount(false)).getAttribute("aria-expanded")).toBe("true");
  });
});
