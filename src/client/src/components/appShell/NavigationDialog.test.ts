// @vitest-environment happy-dom

import { afterEach, expect, it, vi } from "vitest";
import { NavigationDialog } from "./NavigationDialog";
import type { ModalSurface } from "../ModalSurface";
import { deepActiveElement } from "../modalLayerRegistry";

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
});

it("focuses search, supports button navigation and traps Tab, then restores focus on Escape", async () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();
  const dialog = new NavigationDialog();
  dialog.tabs = [{ id: "chat", label: "Chat" }, { id: "tools:files", label: "Files" }];
  dialog.selectedTab = "tools:files";
  dialog.onClose = () => { dialog.remove(); };
  const scroll = vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(() => undefined);
  document.body.append(dialog);
  await dialog.updateComplete;
  const surface = dialog.shadowRoot?.querySelector<ModalSurface>("modal-surface");
  if (surface == null) throw new Error("Expected shared modal surface");
  await surface.updateComplete;
  expect(surface.shadowRoot?.querySelector('[role="dialog"]')?.getAttribute("aria-label")).toBe("Navigation");
  const input = dialog.shadowRoot?.querySelector("input");
  expect(deepActiveElement(document)).toBe(input);
  dialog.shadowRoot?.querySelector<HTMLButtonElement>('.destination-button[aria-pressed="true"]')?.focus();
  const key = (value: string, shiftKey = false) => {
    const event = new KeyboardEvent("keydown", { key: value, shiftKey, bubbles: true, composed: true, cancelable: true });
    deepActiveElement(document)?.dispatchEvent(event);
    return event;
  };
  expect(key("ArrowUp").defaultPrevented).toBe(true);
  expect(deepActiveElement(document)?.textContent).toBe("Chat");
  key("End");
  expect(deepActiveElement(document)?.textContent).toBe("Files");
  key("Home");
  expect(deepActiveElement(document)?.textContent).toBe("Chat");
  expect(scroll).toHaveBeenCalledWith({ block: "nearest" });
  input?.focus();
  expect(key("Tab", true).defaultPrevented).toBe(true);
  expect(deepActiveElement(document)?.textContent).toBe("Collapsed");
  expect(key("Tab").defaultPrevented).toBe(true);
  expect(deepActiveElement(document)).toBe(input);
  const composingEscape = new KeyboardEvent("keydown", { key: "Escape", isComposing: true, bubbles: true, composed: true, cancelable: true });
  input?.dispatchEvent(composingEscape);
  expect(composingEscape.defaultPrevented).toBe(false);
  expect(dialog.isConnected).toBe(true);
  expect(key("Escape").defaultPrevented).toBe(true);
  expect(dialog.isConnected).toBe(false);
  expect(deepActiveElement(document)).toBe(opener);
});

it("filters destinations and navigates results from search without changing pins", async () => {
  const dialog = new NavigationDialog();
  dialog.tabs = [{ id: "chat", label: "Chat" }, { id: "tools:files", label: "Files" }, { id: "tools:find", label: "Find" }];
  dialog.onSelect = vi.fn();
  dialog.onClose = vi.fn();
  dialog.onPreferencesChange = vi.fn();
  document.body.append(dialog);
  await dialog.updateComplete;
  const input = dialog.shadowRoot?.querySelector("input");
  if (input == null) throw new Error("Expected navigation search input");
  const search = async (query: string) => {
    input.value = query;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await dialog.updateComplete;
  };
  const key = async (key: string) => {
    input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true }));
    await dialog.updateComplete;
  };
  const selected = () => dialog.shadowRoot?.querySelector('.destination-button.selected')?.textContent;
  const announcement = () => dialog.shadowRoot?.querySelector('[role="status"]')?.textContent;
  await search(" FI ");
  expect(dialog.shadowRoot?.querySelectorAll(".destination-button")).toHaveLength(2);
  expect(selected()).toBe("Files");
  expect(input.getAttribute("aria-describedby")).toBe("navigation-selection");
  expect(announcement()).toBe("Files, 1 of 2");
  await key("ArrowUp");
  expect(selected()).toBe("Find");
  expect(announcement()).toBe("Find, 2 of 2");
  expect(dialog.shadowRoot?.querySelector('[aria-current]')).toBeNull();
  await key("ArrowDown");
  expect(selected()).toBe("Files");
  await key("End");
  expect(selected()).toBe("Find");
  await key("Home");
  expect(selected()).toBe("Files");
  const composingEnter = new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true, composed: true, cancelable: true });
  input.dispatchEvent(composingEnter);
  expect(composingEnter.defaultPrevented).toBe(false);
  expect(dialog.onSelect).not.toHaveBeenCalled();
  await key("Enter");
  expect(dialog.onSelect).toHaveBeenCalledWith("tools:files");
  expect(dialog.onClose).toHaveBeenCalledOnce();
  expect(dialog.onPreferencesChange).not.toHaveBeenCalled();
  await search("missing");
  expect(dialog.shadowRoot?.textContent).toContain("No destinations found.");
  expect(announcement()).toBe("No destinations found.");
  await key("ArrowDown");
  await key("Enter");
  expect(dialog.onSelect).toHaveBeenCalledOnce();
  await search("");
  expect(selected()).toBe("Chat");
});

it("offers unpinned destinations and closes after navigating without modifying pins", async () => {
  const dialog = new NavigationDialog();
  dialog.tabs = [{ id: "chat", label: "Chat" }, { id: "tools:files", label: "Files" }];
  dialog.preferences = { pinnedIds: ["chat", "missing:tool"], mobileCollapsed: true };
  dialog.selectedTab = "tools:files";
  dialog.onSelect = vi.fn();
  dialog.onClose = vi.fn();
  dialog.onPreferencesChange = vi.fn();
  document.body.append(dialog);
  await dialog.updateComplete;
  const pin = dialog.shadowRoot?.querySelector<HTMLButtonElement>('button[aria-label="Pin Files"]');
  expect(pin?.getAttribute("aria-pressed")).toBe("false");
  expect(pin?.querySelector("svg")).not.toBeNull();
  const files = dialog.shadowRoot?.querySelector<HTMLButtonElement>('.destination > button:first-child[aria-pressed="true"]');
  expect(files?.textContent).toBe("Files");
  files?.click();
  expect(dialog.onSelect).toHaveBeenCalledWith("tools:files");
  expect(dialog.onClose).toHaveBeenCalledOnce();
  expect(dialog.onPreferencesChange).not.toHaveBeenCalled();
});

it("toggles icon pins and mobile layout independently, resets tabs, and uses shared Escape handling", async () => {
  const dialog = new NavigationDialog();
  dialog.tabs = [{ id: "chat", label: "Chat" }, { id: "tools:files", label: "Files" }];
  dialog.preferences = { pinnedIds: ["chat", "missing:tool"], mobileCollapsed: true };
  dialog.onPreferencesChange = (preferences) => { dialog.preferences = preferences; };
  dialog.onClose = vi.fn();
  document.body.append(dialog);
  await dialog.updateComplete;
  dialog.shadowRoot?.querySelector<HTMLButtonElement>('button[aria-label="Pin Files"]')?.click();
  await dialog.updateComplete;
  expect(dialog.preferences).toEqual({ pinnedIds: ["chat", "missing:tool", "tools:files"], mobileCollapsed: true });
  expect(dialog.shadowRoot?.querySelector('button[aria-label="Pin Files"]')?.getAttribute("aria-pressed")).toBe("true");
  const modes = [...dialog.shadowRoot?.querySelectorAll<HTMLButtonElement>('.mobile-navigation button') ?? []];
  expect(modes.map((button) => button.getAttribute("aria-pressed"))).toEqual(["false", "true"]);
  modes[0]?.click();
  await dialog.updateComplete;
  expect(dialog.preferences).toEqual({ pinnedIds: ["chat", "missing:tool", "tools:files"], mobileCollapsed: false });
  expect(modes.map((button) => button.getAttribute("aria-pressed"))).toEqual(["true", "false"]);
  modes[1]?.click();
  await dialog.updateComplete;
  dialog.shadowRoot?.querySelector<HTMLButtonElement>("footer button")?.click();
  await dialog.updateComplete;
  expect(dialog.preferences).toEqual({ pinnedIds: [], mobileCollapsed: true });
  expect([...dialog.shadowRoot?.querySelectorAll(".pin-button") ?? []].every((button) => button.getAttribute("aria-pressed") === "true")).toBe(true);
  expect(dialog.shadowRoot?.querySelector('input[type="checkbox"]')).toBeNull();
  const surface = dialog.shadowRoot?.querySelector<ModalSurface>("modal-surface");
  if (surface == null) throw new Error("Expected shared modal surface");
  await surface.updateComplete;
  deepActiveElement(document)?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
  expect(dialog.onClose).toHaveBeenCalledOnce();
});

it("groups essential destinations before other tools and materializes their pins when customized", async () => {
  const dialog = new NavigationDialog();
  dialog.tabs = [
    { id: "tasks:workspace.tasks", label: "Tasks" }, { id: "chat", label: "Chat" },
    { id: "files:workspace.files", label: "Files" }, { id: "pi-web.terminal:workspace.terminal", label: "Terminal" },
    { id: "info:workspace.info", label: "Info" },
  ];
  dialog.pinUniverse = ["navigation", ...dialog.tabs.map((tab) => tab.id)];
  dialog.preferences = { pinnedIds: [], useDefaultPins: true, mobileCollapsed: true };
  dialog.onPreferencesChange = (preferences) => { dialog.preferences = preferences; };
  document.body.append(dialog);
  await dialog.updateComplete;
  expect([...dialog.shadowRoot?.querySelectorAll("h3") ?? []].map((heading) => heading.textContent)).toEqual(["Pinned", "More tools"]);
  expect([...dialog.shadowRoot?.querySelectorAll(".destination-button") ?? []].map((button) => button.textContent)).toEqual(["Chat", "Files", "Terminal", "Tasks", "Info"]);
  const pin = dialog.shadowRoot?.querySelector<HTMLButtonElement>('button[aria-label="Pin Tasks"]');
  expect(pin?.getAttribute("aria-pressed")).toBe("false");
  pin?.click();
  await dialog.updateComplete;
  expect(dialog.preferences).toEqual({
    pinnedIds: ["navigation", "chat", "files:workspace.files", "pi-web.terminal:workspace.terminal", "tasks:workspace.tasks"],
    useDefaultPins: false, mobileCollapsed: true,
  });
  expect(dialog.shadowRoot?.querySelector('button[aria-label="Pin Info"]')?.getAttribute("aria-pressed")).toBe("false");
});

it("keeps the same tool controls, keyboard selection, and focus when pinning reorders destinations", async () => {
  const dialog = new NavigationDialog();
  dialog.tabs = [{ id: "test:a", label: "Alpha" }, { id: "test:b", label: "Beta" }, { id: "test:c", label: "Gamma" }];
  dialog.preferences = { pinnedIds: ["test:a"], mobileCollapsed: false };
  dialog.onPreferencesChange = (preferences) => { dialog.preferences = preferences; };
  document.body.append(dialog);
  await dialog.updateComplete;
  await dialog.shadowRoot?.querySelector<ModalSurface>("modal-surface")?.updateComplete;
  const destination = [...dialog.renderRoot.querySelectorAll<HTMLButtonElement>(".destination-button")].find((button) => button.textContent === "Gamma");
  const pin = dialog.renderRoot.querySelector<HTMLButtonElement>('button[aria-label="Pin Gamma"]');
  if (destination === undefined || pin === null) throw new Error("Expected Gamma controls");
  destination.focus();
  pin.focus();
  pin.click();
  await dialog.updateComplete;
  expect(dialog.renderRoot.querySelector('button[aria-label="Pin Gamma"]')).toBe(pin);
  expect(deepActiveElement(document)).toBe(pin);
  expect(dialog.renderRoot.querySelector(".destination-button.selected")).toBe(destination);
  expect(dialog.renderRoot.querySelector('[role="status"]')?.textContent).toBe("Gamma, 2 of 3");

  pin.click();
  await dialog.updateComplete;
  expect(dialog.preferences.pinnedIds).toEqual(["test:a"]);
  expect(deepActiveElement(document)).toBe(pin);
  expect(dialog.renderRoot.querySelector(".destination-button.selected")).toBe(destination);
});

it("searches contribution IDs as well as labels without making hidden tools permanent", async () => {
  const dialog = new NavigationDialog();
  dialog.tabs = [{ id: "chat", label: "Chat" }, { id: "tasks:workspace.tasks", label: "任务" }];
  dialog.preferences = { pinnedIds: [], useDefaultPins: true, mobileCollapsed: false };
  dialog.onSelect = vi.fn();
  dialog.onPreferencesChange = vi.fn();
  document.body.append(dialog);
  await dialog.updateComplete;
  const input = dialog.shadowRoot?.querySelector("input");
  if (input == null) throw new Error("Expected navigation search");
  input.value = "workspace.tasks";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await dialog.updateComplete;
  expect(dialog.shadowRoot?.querySelector("h3")?.textContent).toBe("More tools");
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }));
  expect(dialog.onSelect).toHaveBeenCalledWith("tasks:workspace.tasks");
  expect(dialog.onPreferencesChange).not.toHaveBeenCalled();
});

it("offers an essential preset without changing mobile layout or the meaning of show all", async () => {
  const dialog = new NavigationDialog();
  dialog.tabs = [{ id: "chat", label: "Chat" }, { id: "tasks:workspace.tasks", label: "Tasks" }];
  dialog.preferences = { pinnedIds: ["tasks:workspace.tasks"], mobileCollapsed: true };
  dialog.onPreferencesChange = (preferences) => { dialog.preferences = preferences; };
  document.body.append(dialog);
  await dialog.updateComplete;
  const presets = [...dialog.shadowRoot?.querySelectorAll<HTMLButtonElement>(".tab-presets button") ?? []];
  presets[1]?.click();
  await dialog.updateComplete;
  expect(dialog.preferences).toEqual({ pinnedIds: [], mobileCollapsed: true, useDefaultPins: true });
  expect(dialog.shadowRoot?.querySelector('button[aria-label="Pin Tasks"]')?.getAttribute("aria-pressed")).toBe("false");
  presets[0]?.click();
  await dialog.updateComplete;
  expect(dialog.preferences).toEqual({ pinnedIds: [], mobileCollapsed: true, useDefaultPins: false });
  expect([...dialog.shadowRoot?.querySelectorAll(".pin-button") ?? []].every((button) => button.getAttribute("aria-pressed") === "true")).toBe(true);
});

it("materializes a plugin-only fallback while preserving hidden main-view pins", async () => {
  const dialog = new NavigationDialog();
  dialog.tabs = [{ id: "custom:workspace.one", label: "One" }, { id: "custom:workspace.two", label: "Two" }];
  dialog.pinUniverse = ["navigation", "chat", ...dialog.tabs.map((tab) => tab.id)];
  dialog.preferences = { pinnedIds: [], mobileCollapsed: false, useDefaultPins: true };
  dialog.onPreferencesChange = (preferences) => { dialog.preferences = preferences; };
  document.body.append(dialog);
  await dialog.updateComplete;
  const pin = dialog.shadowRoot?.querySelector<HTMLButtonElement>('button[aria-label="Pin One"]');
  expect(pin?.getAttribute("aria-pressed")).toBe("true");
  pin?.click();
  await dialog.updateComplete;
  expect(dialog.preferences).toEqual({ pinnedIds: ["navigation", "chat"], mobileCollapsed: false, useDefaultPins: false });
});
