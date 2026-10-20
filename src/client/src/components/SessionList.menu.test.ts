// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionInfo } from "../api";
import { ModalSurface } from "./ModalSurface";
import { SessionList } from "./SessionList";

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

const session: SessionInfo = {
  id: "one", path: "/sessions/one.jsonl", cwd: "/workspace",
  created: "2026-06-09T00:00:00.000Z", modified: "2026-06-09T00:00:00.000Z",
  messageCount: 1, firstMessage: "Example session", persisted: true,
};

async function mount(parent: ParentNode = document.body): Promise<SessionList> {
  const list = new SessionList();
  list.sessions = [session];
  parent.append(list);
  await list.updateComplete;
  return list;
}

function element(list: SessionList, selector: string): HTMLElement {
  const result = list.shadowRoot?.querySelector<HTMLElement>(selector);
  if (!result) throw new Error(`Missing ${selector}`);
  return result;
}

async function openMenu(list: SessionList): Promise<HTMLElement> {
  const toggle = element(list, ".action-menu-toggle");
  toggle.click();
  await list.updateComplete;
  expect(list.shadowRoot?.querySelector(".action-menu-panel")).not.toBeNull();
  return toggle;
}

describe("session action menu dismissal", () => {
  it("closes on Escape and returns focus to its trigger without cancelling sidebar navigation", async () => {
    const list = await mount();
    const cancelNavigation = vi.fn();
    list.onCancelKeyboardNavigation = cancelNavigation;
    const toggle = await openMenu(list);
    const action = element(list, ".action-menu-panel button");
    action.focus();

    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true, cancelable: true });
    action.dispatchEvent(escape);
    await list.updateComplete;

    expect(list.shadowRoot?.querySelector(".action-menu-panel")).toBeNull();
    expect(list.shadowRoot?.activeElement).toBe(toggle);
    expect(escape.defaultPrevented).toBe(true);
    expect(cancelNavigation).not.toHaveBeenCalled();
  });

  it("closes on the list's own blank space and when selecting a row", async () => {
    const list = await mount();
    const onSelect = vi.fn();
    list.onSelect = onSelect;
    await openMenu(list);
    element(list, "section").click();
    await list.updateComplete;
    expect(list.shadowRoot?.querySelector(".action-menu-panel")).toBeNull();

    await openMenu(list);
    element(list, ".action-row").click();
    await list.updateComplete;
    expect(list.shadowRoot?.querySelector(".action-menu-panel")).toBeNull();
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(session);
  });

  it("dismisses before showing cleanup without restoring the old menu afterwards", async () => {
    const list = await mount();
    const cleanup = vi.fn(() => {
      const dialog = document.createElement("dialog");
      document.body.append(dialog);
    });
    list.onCleanup = cleanup;
    await openMenu(list);
    element(list, ".filter-toggle").click();
    await list.updateComplete;
    element(list, ".cleanup-entry").click();
    await list.updateComplete;

    expect(cleanup).toHaveBeenCalledOnce();
    expect(document.querySelector("dialog")).not.toBeNull();
    expect(list.shadowRoot?.querySelector(".action-menu-panel")).toBeNull();
    document.querySelector("dialog")?.remove();
    await list.updateComplete;
    expect(list.shadowRoot?.querySelector(".action-menu-panel")).toBeNull();
  });

  it("closes on outside controls even when they stop click propagation", async () => {
    const list = await mount();
    await openMenu(list);
    const outside = document.createElement("button");
    const onClick = vi.fn((event: MouseEvent) => { event.stopPropagation(); });
    outside.addEventListener("click", onClick);
    document.body.append(outside);
    outside.click();
    await list.updateComplete;

    expect(onClick).toHaveBeenCalledOnce();
    expect(list.shadowRoot?.querySelector(".action-menu-panel")).toBeNull();
  });

  it("dismisses when a keyboard-opened modal takes focus, leaving Escape to the modal", async () => {
    const app = document.createElement("div");
    const appRoot = app.attachShadow({ mode: "open" });
    document.body.append(app);
    const list = await mount(appRoot);
    const settings = document.createElement("div");
    const settingsRoot = settings.attachShadow({ mode: "open" });
    appRoot.append(settings);
    await openMenu(list);
    const action = element(list, ".action-menu-panel button");
    action.focus();
    await list.updateComplete;
    expect(list.shadowRoot?.querySelector(".action-menu-panel")).not.toBeNull();

    const modal = new ModalSurface();
    const input = document.createElement("input");
    modal.append(input);
    modal.initialFocus = "input";
    const close = vi.fn();
    modal.onClose = close;
    document.addEventListener("keydown", () => { settingsRoot.append(modal); }, { once: true });
    action.dispatchEvent(new KeyboardEvent("keydown", { key: ",", ctrlKey: true, bubbles: true, composed: true }));
    await modal.updateComplete;
    await list.updateComplete;

    expect(settingsRoot.activeElement).toBe(input);
    expect(list.shadowRoot?.querySelector(".action-menu-panel")).toBeNull();
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
    expect(close).toHaveBeenCalledOnce();
  });

  it("handles focus leaving its shadow tree without a document-level focus transition", async () => {
    const app = document.createElement("div");
    const appRoot = app.attachShadow({ mode: "open" });
    document.body.append(app);
    const list = await mount(appRoot);
    const settings = document.createElement("div");
    settings.attachShadow({ mode: "open" });
    appRoot.append(settings);
    await openMenu(list);
    const action = element(list, ".action-menu-panel button");
    action.focus();
    // Native focus retargeting can suppress the document event when both
    // branches have the same outer host; model the surviving local event.
    action.dispatchEvent(new FocusEvent("focusout", { bubbles: true, composed: false, relatedTarget: settings }));
    await list.updateComplete;

    expect(list.shadowRoot?.querySelector(".action-menu-panel")).toBeNull();
  });

  it("keeps menu actions usable and lets the same trigger toggle the menu closed", async () => {
    const list = await mount();
    const archive = vi.fn();
    list.onArchive = archive;
    await openMenu(list);
    element(list, 'button[title="Archive session"]').click();
    await list.updateComplete;
    expect(archive).toHaveBeenCalledExactlyOnceWith(session);
    expect(list.shadowRoot?.querySelector(".action-menu-panel")).toBeNull();

    const toggle = await openMenu(list);
    toggle.click();
    await list.updateComplete;
    expect(list.shadowRoot?.querySelector(".action-menu-panel")).toBeNull();
  });
});
