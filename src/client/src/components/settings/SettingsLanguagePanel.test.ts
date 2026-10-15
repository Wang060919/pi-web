// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { getLocalePreference, initializeLocale } from "../../../../shared/i18n";
import { SettingsLanguagePanel } from "./SettingsLanguagePanel";

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  document.documentElement.lang = "en";
  vi.restoreAllMocks();
});

describe("display language settings", () => {
  it("stages a language without saving, then persists before requesting a reload", async () => {
    const panel = await mountPanel();
    const reload = vi.fn(() => { expect(getLocalePreference()).toBe("zh-CN"); });
    panel.reloadPage = reload;
    const select = required(panel.shadowRoot?.querySelector("select"));
    expect(select.value).toBe("system");
    select.value = "zh-CN";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await panel.updateComplete;
    expect(getLocalePreference()).toBe("system");
    expect(reload).not.toHaveBeenCalled();
    required(panel.shadowRoot?.querySelector("button")).click();
    expect(reload).toHaveBeenCalledOnce();

    initializeLocale();
    const translated = await mountPanel();
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(translated.shadowRoot?.textContent).toContain("应用并刷新");
    expect(required(translated.shadowRoot?.querySelector("select")).value).toBe("zh-CN");
  });

  it("shows a storage failure without reloading or claiming that the choice was saved", async () => {
    const panel = await mountPanel();
    const reload = vi.fn();
    panel.reloadPage = reload;
    const select = required(panel.shadowRoot?.querySelector("select"));
    select.value = "zh-CN";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await panel.updateComplete;
    vi.spyOn(localStorage, "setItem").mockImplementationOnce(() => { throw new Error("Storage unavailable"); });
    required(panel.shadowRoot?.querySelector("button")).click();
    await panel.updateComplete;
    expect(reload).not.toHaveBeenCalled();
    expect(getLocalePreference()).toBe("system");
    expect(panel.shadowRoot?.querySelector('[role="alert"]')?.textContent).toContain("Could not save");
  });
});

async function mountPanel(): Promise<SettingsLanguagePanel> {
  const panel = new SettingsLanguagePanel();
  document.body.append(panel);
  await panel.updateComplete;
  return panel;
}

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Expected rendered language control");
  return value;
}
