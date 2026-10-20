// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configApi, piPackagesApi, pluginsApi } from "../api";
import { SettingsDialog } from "./SettingsDialog";
import { configResponse, pluginsResponse } from "./SettingsDialog.testSupport";
import { findSettingsElement, searchSettings, settingsSearchItems } from "./settings/settingsSearch";

const scroll = vi.fn();

beforeEach(() => {
  scroll.mockClear();
  vi.spyOn(configApi, "config").mockResolvedValue(configResponse({}));
  vi.spyOn(pluginsApi, "plugins").mockResolvedValue(pluginsResponse([]));
  vi.spyOn(piPackagesApi, "packages").mockResolvedValue({ packages: [] });
  vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(scroll);
});
afterEach(() => { document.body.replaceChildren(); localStorage.clear(); vi.restoreAllMocks(); });
function required<T>(value: T | null | undefined): T { if (value == null) throw new Error("Missing control"); return value; }
async function mount() {
  const dialog = new SettingsDialog(); dialog.onNavigate = (section) => { dialog.section = section; };
  document.body.append(dialog); await dialog.updateComplete; return dialog;
}
async function query(dialog: SettingsDialog, text: string) {
  const input = required(dialog.shadowRoot?.querySelector<HTMLInputElement>('.settings-search input'));
  input.value = text; input.dispatchEvent(new Event("input", { bubbles: true })); await dialog.updateComplete; return input;
}

describe("settings search and category navigation", () => {
  it("finds concrete rows using bilingual keywords and all query terms", () => {
    const items = settingsSearchItems();
    expect(searchSettings(items, "上传 目录").map((item) => item.id)).toEqual(["uploads"]);
    expect(searchSettings(items, "server port").map((item) => item.id)).toEqual(["port"]);
    expect(searchSettings(items, "font size").map((item) => item.id)).toEqual(["chat-text-size"]);
    expect(searchSettings(items, "字号").map((item) => item.id)).toEqual(["chat-text-size"]);
    expect(searchSettings(items, "nonexistent")).toEqual([]);
  });

  it("navigates from a keyboard search result to its exact field across shadow roots", async () => {
    const dialog = await mount();
    const input = await query(dialog, "port");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }));
    await vi.waitFor(() => { expect(dialog.section).toBe("connection"); });
    const root = required(dialog.shadowRoot);
    await vi.waitFor(async () => {
      const row = await findSettingsElement(root, '[data-setting-id="port"]');
      expect(row?.hasAttribute("data-search-highlight")).toBe(true);
      expect(row?.getRootNode()).toBeInstanceOf(ShadowRoot);
      const shadow = row?.getRootNode();
      if (!(shadow instanceof ShadowRoot)) throw new Error("Expected shadow root");
      expect(shadow.activeElement).toBe(row?.querySelector("input"));
    });
    expect(scroll).toHaveBeenCalledWith({ block: "center", behavior: "auto" });
  });

  it("focuses search with Ctrl+F and dismisses only search results on Escape", async () => {
    const dialog = await mount(); const close = vi.fn(); dialog.onClose = close;
    const input = await query(dialog, "theme");
    required(dialog.shadowRoot?.querySelector(".settings-shell")).dispatchEvent(new KeyboardEvent("keydown", { key: "f", ctrlKey: true, bubbles: true }));
    expect(dialog.shadowRoot?.activeElement).toBe(input);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
    await dialog.updateComplete;
    expect(close).not.toHaveBeenCalled(); expect(input.value).toBe("");
    expect(dialog.shadowRoot?.querySelector(".settings-search-results")).toBeNull();
  });

  it("provides manual keyboard activation and linked panels in the compact category strip", async () => {
    const dialog = await mount();
    const tabs = [...required(dialog.shadowRoot).querySelectorAll<HTMLButtonElement>('.mobile-tabs [role="tab"]')];
    const first = required(tabs[0]); const second = required(tabs[1]);
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(dialog.section).toBe("general"); expect(dialog.shadowRoot?.activeElement).toBe(second);
    second.click(); await dialog.updateComplete;
    expect(dialog.section).toBe("shortcuts"); expect(second.getAttribute("aria-selected")).toBe("true");
    const panel = dialog.shadowRoot?.getElementById(required(second.getAttribute("aria-controls")));
    expect(panel?.hasAttribute("hidden")).toBe(false);
  });
});
