// @vitest-environment happy-dom

import { LitElement } from "lit";
import { setLocalePreference } from "../../../shared/i18n";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, configApi, piPackagesApi, pluginsApi, type PiWebConfigValues } from "../api";
import { THEME_STORAGE_KEY } from "../theme";
import { CHAT_TEXT_SIZE_STORAGE_KEY } from "../chatTextSize";
import { usageOverviewApi } from "../api/usageOverview";
import { PiWebApp } from "./PiWebApp";
import { SettingsDialog } from "./SettingsDialog";
import { configResponse, pluginsResponse } from "./SettingsDialog.testSupport";
import { SettingsThemePanel } from "./settings/SettingsThemePanel";
import { SettingsChatTextPanel } from "./settings/SettingsChatTextPanel";

// Mount real settings and theme interactions, leaving unrelated session/socket
// startup out of this component-boundary test.
class ThemeSettingsApp extends PiWebApp {
  override connectedCallback(): void {
    LitElement.prototype.connectedCallback.call(this);
  }
}
customElements.define("theme-settings-test-app", ThemeSettingsApp);

let config: PiWebConfigValues;
const unexpectedRequest = vi.fn(() => Promise.reject(new Error("Theme tests must not make network requests")));

beforeEach(() => {
  unexpectedRequest.mockClear();
  vi.stubGlobal("fetch", unexpectedRequest);
  vi.spyOn(window, "fetch").mockImplementation(unexpectedRequest);
  config = { defaultTheme: { themeId: "themes:pi-web-light", auto: false } };
  window.history.replaceState(null, "", "/?settings=general");
  vi.spyOn(configApi, "config").mockImplementation((machineId) => Promise.resolve(configResponse(machineId === undefined ? config : {})));
  vi.spyOn(configApi, "saveConfig").mockImplementation((saved) => {
    config = saved;
    return Promise.resolve(configResponse(saved));
  });
  vi.spyOn(pluginsApi, "plugins").mockResolvedValue(pluginsResponse([]));
  vi.spyOn(piPackagesApi, "packages").mockResolvedValue({ packages: [] });
  vi.spyOn(api, "runtime").mockResolvedValue({ machineId: "local", ok: true, checkedAt: "now", capabilities: [] });
  vi.spyOn(usageOverviewApi, "get").mockResolvedValue({ records: [], today: "2026-10-21", timeZone: "UTC", scope: "machine", warnings: [] });
  // Layout/transport work is unrelated to preferences; never open real sockets.
  vi.stubGlobal("WebSocket", class {
    static readonly CONNECTING = 0;
    readyState = 1;
    close(): void { this.readyState = 3; }
  });
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
});

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  sessionStorage.clear();
  document.documentElement.removeAttribute("data-pi-web-theme");
  document.documentElement.removeAttribute("style");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  expect(unexpectedRequest).not.toHaveBeenCalled();
});

describe("app theme defaults and device overrides", () => {
  it("uses config without saving it locally, then supports device override and following the default", async () => {
    const app = await mountApp();
    expect(document.documentElement.dataset["piWebTheme"]).toBe("themes:pi-web-light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    const panel = themePanel(app);
    selectTheme(panel, "themes:classic");
    await panel.updateComplete;
    button(panel, "Use on this device").click();
    await app.updateComplete;
    expect(document.documentElement.dataset["piWebTheme"]).toBe("themes:classic");
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? "null")).toEqual({ themeId: "themes:classic", auto: false });

    // A later config result must not overwrite a choice made on this device.
    settings(app).onConfigSaved?.({ defaultTheme: { themeId: "themes:pi-web-dark", auto: false } });
    await app.updateComplete;
    await panel.updateComplete;
    expect(document.documentElement.dataset["piWebTheme"]).toBe("themes:classic");
    button(panel, "Use the default").click();
    await app.updateComplete;
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.dataset["piWebTheme"]).toBe("themes:pi-web-dark");
  });

  it("preserves existing device preferences when setting a different default", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ themeId: "themes:classic", auto: false }));
    const app = await mountApp();
    const panel = themePanel(app);
    selectTheme(panel, "themes:pi-web-dark");
    await panel.updateComplete;
    button(panel, "Set as default").click();
    await vi.waitFor(() => { expect(config.defaultTheme).toEqual({ themeId: "themes:pi-web-dark", auto: false }); });
    await app.updateComplete;
    expect(document.documentElement.dataset["piWebTheme"]).toBe("themes:classic");
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? "null")).toEqual({ themeId: "themes:classic", auto: false });
  });

  it("keeps an unavailable saved theme intact while displaying the fallback", async () => {
    const saved = { themeId: "custom:temporarily-missing", auto: true };
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(saved));
    const app = await mountApp();
    expect(document.documentElement.dataset["piWebTheme"]).toBe("themes:classic");
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? "null")).toEqual(saved);
    expect(themePanel(app).hasLocalOverride).toBe(true);
  });
});

describe("conversation text size on this device", () => {
  it("shows Chinese labels rather than translation keys in the Chinese interface", async () => {
    setLocalePreference("zh-CN");
    try {
      const panel = chatTextPanel(await mountApp());
      await panel.updateComplete;
      expect(panel.shadowRoot?.textContent).toContain("会话文字大小");
      expect(panel.shadowRoot?.textContent).not.toContain("settingsChatText.");
      expect(button(panel, "中").getAttribute("aria-pressed")).toBe("true");
      expect(button(panel, "小").getAttribute("aria-pressed")).toBe("false");
      expect(button(panel, "大").getAttribute("aria-pressed")).toBe("false");
    } finally {
      setLocalePreference("en");
    }
  });

  it("defaults to Medium, applies each choice immediately, and restores it after remounting", async () => {
    const app = await mountApp();
    let panel = chatTextPanel(app);
    await panel.updateComplete;
    expect(button(panel, "Medium").getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem(CHAT_TEXT_SIZE_STORAGE_KEY)).toBeNull();
    for (const [label, size] of [["Small", "s"], ["Medium", "m"], ["Large", "l"]] as const) {
      button(panel, label).click();
      await app.updateComplete;
      await settings(app).updateComplete;
      await panel.updateComplete;
      expect(app.dataset["chatTextSize"]).toBe(size);
      expect(localStorage.getItem(CHAT_TEXT_SIZE_STORAGE_KEY)).toBe(size);
      expect(button(panel, label).getAttribute("aria-pressed")).toBe("true");
      expect(panel.shadowRoot?.querySelector('[role="status"]')?.textContent).toBe("Saved on this device.");
    }
    app.remove();
    panel = chatTextPanel(await mountApp());
    await panel.updateComplete;
    expect(button(panel, "Large").getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps the current size selected and reports when device storage rejects a save", async () => {
    const app = await mountApp();
    const panel = chatTextPanel(app);
    await panel.updateComplete;
    vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("Storage full"); });
    button(panel, "Large").click();
    await panel.updateComplete;
    expect(button(panel, "Medium").getAttribute("aria-pressed")).toBe("true");
    expect(button(panel, "Large").getAttribute("aria-pressed")).toBe("false");
    expect(panel.shadowRoot?.querySelector('[role="status"]')?.textContent).toContain("Could not save");
    expect(localStorage.getItem(CHAT_TEXT_SIZE_STORAGE_KEY)).toBeNull();
  });
});

async function mountApp(): Promise<ThemeSettingsApp> {
  const app = new ThemeSettingsApp();
  document.body.append(app);
  await vi.waitFor(() => {
    const panel = themePanel(app);
    expect(panel.loading).toBe(false);
    expect(panel.themes.length).toBeGreaterThan(0);
  });
  await app.updateComplete;
  await settings(app).updateComplete;
  await themePanel(app).updateComplete;
  return app;
}

function settings(app: ThemeSettingsApp): SettingsDialog {
  const dialog = app.shadowRoot?.querySelector<SettingsDialog>("settings-dialog");
  if (dialog == null) throw new Error("Expected settings dialog");
  return dialog;
}

function themePanel(app: ThemeSettingsApp): SettingsThemePanel {
  const panel = settings(app).shadowRoot?.querySelector("settings-preferences-panel")?.querySelector<SettingsThemePanel>("settings-theme-panel");
  if (panel == null) throw new Error("Expected theme settings");
  return panel;
}

function selectTheme(panel: SettingsThemePanel, id: string): void {
  const select = panel.shadowRoot?.querySelector<HTMLSelectElement>("select");
  if (select == null) throw new Error("Expected theme selector");
  select.value = id;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function chatTextPanel(app: ThemeSettingsApp): SettingsChatTextPanel {
  const panel = settings(app).shadowRoot?.querySelector<SettingsChatTextPanel>("settings-chat-text-panel");
  if (panel == null) throw new Error("Expected conversation text settings");
  return panel;
}

function button(panel: SettingsThemePanel | SettingsChatTextPanel, label: string): HTMLButtonElement {
  const control = [...panel.shadowRoot?.querySelectorAll<HTMLButtonElement>("button") ?? []].find((element) => element.textContent === label);
  if (control === undefined) throw new Error(`Expected ${label}`);
  return control;
}
