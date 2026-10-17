import { describe, expect, it } from "vitest";
import { machineScopedBundledPluginId } from "../../shared/machinePluginIds";
import { isNavigationPinned, loadNavigationPreferences, pinnedNavigationTabs, saveNavigationPreferences, toggleNavigationPin } from "./navigationPreferences";

const tabs = [{ id: "navigation" }, { id: "chat" }, { id: "plugin:files" }];

describe("navigation preferences", () => {
  it("shows all tabs for empty pins and explicit all pins, in destination order", () => {
    expect(pinnedNavigationTabs(tabs, [])).toEqual(tabs);
    expect(pinnedNavigationTabs(tabs, ["plugin:files", "chat", "navigation"])).toEqual(tabs);
    expect(pinnedNavigationTabs(tabs, ["plugin:files"])).toEqual([tabs[2]]);
  });

  it("materializes implicit all pins on unpin and treats removing the last pin as all", () => {
    expect(toggleNavigationPin("chat", [], tabs.map((tab) => tab.id))).toEqual(["navigation", "plugin:files"]);
    const pins = toggleNavigationPin("chat", ["chat"], []);
    expect(pins).toEqual([]);
    expect(isNavigationPinned("plugin:files", pins)).toBe(true);
  });

  it("retains unavailable plugins through filtering and pin management", () => {
    const pins = ["missing:tool"];
    expect(pinnedNavigationTabs(tabs, pins)).toEqual([]);
    expect(toggleNavigationPin("chat", pins, ["chat"])).toEqual(["missing:tool", "chat"]);
    expect(pinnedNavigationTabs([{ id: "missing:tool" }], pins)).toEqual([{ id: "missing:tool" }]);
    expect(pins).toEqual(["missing:tool"]);
  });

  it("round-trips pins independently from mobile collapse", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const preferences = { pinnedIds: ["missing:tool"], mobileCollapsed: true };
    saveNavigationPreferences(preferences, storage);
    expect(loadNavigationPreferences(storage)).toEqual(preferences);
    saveNavigationPreferences({ ...preferences, mobileCollapsed: false }, storage);
    expect(loadNavigationPreferences(storage)).toEqual({ ...preferences, mobileCollapsed: false });
  });

  it("defaults safely for malformed or unavailable storage and validates stored values", () => {
    const storage = (raw: string) => ({ getItem: () => raw });
    expect(loadNavigationPreferences(storage("{"))).toEqual({ pinnedIds: [], mobileCollapsed: false, useDefaultPins: true });
    expect(loadNavigationPreferences(storage('{"pinnedIds":["chat",5,"chat",""],"mobileCollapsed":"true"}'))).toEqual({ pinnedIds: ["chat"], mobileCollapsed: false });
    const blocked = { getItem: () => { throw new Error("Blocked"); }, setItem: () => { throw new Error("Blocked"); } };
    expect(loadNavigationPreferences(blocked)).toEqual({ pinnedIds: [], mobileCollapsed: false, useDefaultPins: true });
    expect(() => { saveNavigationPreferences({ pinnedIds: [], mobileCollapsed: true }, blocked); }).not.toThrow();
  });

  it("uses essential tabs only for a new preference while preserving stored all-tab and custom choices", () => {
    const storage = (raw: string | null) => ({ getItem: () => raw });
    expect(loadNavigationPreferences(storage(null))).toEqual({ pinnedIds: [], mobileCollapsed: false, useDefaultPins: true });
    expect(loadNavigationPreferences(storage('{"pinnedIds":[],"mobileCollapsed":true}'))).toEqual({ pinnedIds: [], mobileCollapsed: true });
    expect(loadNavigationPreferences(storage('{"pinnedIds":["tasks:workspace.tasks"],"mobileCollapsed":false}'))).toEqual({ pinnedIds: ["tasks:workspace.tasks"], mobileCollapsed: false });
    expect(loadNavigationPreferences(storage('{"pinnedIds":[],"useDefaultPins":"true"}'))).toEqual({ pinnedIds: [], mobileCollapsed: false });
  });

  it("keeps only everyday destinations in source order, including machine-scoped terminals", () => {
    const tabs = [
      { id: "navigation" }, { id: "chat" }, { id: "files:workspace.files" },
      { id: "tasks:workspace.tasks" }, { id: "pi-web.terminal:workspace.terminal" },
      { id: `${machineScopedBundledPluginId("remote-1", "pi-web.terminal")}:workspace.terminal` }, { id: "info:workspace.info" },
      { id: "machine.invalid.pi-web.terminal:workspace.terminal" },
    ];
    expect(pinnedNavigationTabs(tabs, [], true)).toEqual([tabs[0], tabs[1], tabs[2], tabs[4], tabs[5]]);
    expect(pinnedNavigationTabs(tabs, [])).toEqual(tabs);
  });

  it("leaves a usable fallback when no essential plugin is available without altering explicit pins", () => {
    const tabs = [{ id: "custom:workspace.one" }, { id: "custom:workspace.two" }];
    expect(pinnedNavigationTabs(tabs, [], true)).toEqual([tabs[0]]);
    expect(pinnedNavigationTabs([], [], true)).toEqual([]);
    expect(pinnedNavigationTabs(tabs, ["unavailable:tool"])).toEqual([]);
  });

  it("round-trips the essential tab choice independently from mobile collapse", () => {
    let saved: string | null = null;
    const storage = { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } };
    const preferences = { pinnedIds: [], mobileCollapsed: true, useDefaultPins: true };
    saveNavigationPreferences(preferences, storage);
    expect(loadNavigationPreferences(storage)).toEqual(preferences);
    saveNavigationPreferences({ ...preferences, useDefaultPins: false }, storage);
    expect(loadNavigationPreferences(storage)).toEqual({ ...preferences, useDefaultPins: false });
  });
});
