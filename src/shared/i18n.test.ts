// @vitest-environment happy-dom
import { html, render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTranslator, getLocale, getLocalePreference, initializeLocale, LOCALE_STORAGE_KEY, setLocalePreference } from "./i18nCore";
import { getLocale as getFilesLocale } from "../../pi-web-plugins/files/i18nCore";
import { getLocale as getGitLocale } from "../../pi-web-plugins/git/browser/i18nCore";

const resources = {
  button: {
    sourceHash: 3890418448,
    valueCount: 2,
    strings: ["<button @click=", ">保存 ", "</button>"],
    order: [0, 1],
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("browser display language", () => {
  it("follows the browser by default and respects a per-device override", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["zh-CN", "en"]);
    expect(getLocalePreference()).toBe("system");
    expect(getLocale()).toBe("zh-CN");
    initializeLocale();
    expect(document.documentElement.lang).toBe("zh-CN");
    setLocalePreference("en");
    expect(getLocale()).toBe("en");
    initializeLocale();
    expect(document.documentElement.lang).toBe("en");
    setLocalePreference("system");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
    expect(getLocale()).toBe("zh-CN");
  });

  it("shares one persisted preference with independently bundled plugins", () => {
    setLocalePreference("zh-CN");
    expect([getLocale(), getFilesLocale(), getGitLocale()]).toEqual(["zh-CN", "zh-CN", "zh-CN"]);
    setLocalePreference("en");
    expect([getLocale(), getFilesLocale(), getGitLocale()]).toEqual(["en", "en", "en"]);
  });

  it("uses English for other browser languages and ignores invalid stored data", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["fr-FR", "zh-CN"]);
    localStorage.setItem(LOCALE_STORAGE_KEY, "unexpected");
    expect(getLocalePreference()).toBe("system");
    expect(getLocale()).toBe("en");
  });

  it("handles navigator adapters that omit language fields", () => {
    vi.stubGlobal("navigator", { clipboard: {} });
    expect([getLocale(), getFilesLocale(), getGitLocale()]).toEqual(["en", "en", "en"]);
    vi.stubGlobal("navigator", { language: "zh-CN" });
    expect(getLocale()).toBe("zh-CN");
    vi.stubGlobal("navigator", undefined);
    expect(getLocale()).toBe("en");
  });

  it("keeps automatic language available when storage is blocked, and reports failed writes", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["zh-CN"]);
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("Storage denied"); },
      setItem: () => { throw new Error("Storage denied"); },
    });
    expect(getLocale()).toBe("zh-CN");
    expect(() => { setLocalePreference("en"); }).toThrow("Storage denied");
  });
});

describe("authored UI templates", () => {
  it("translates static labels while preserving escaping, handlers, and Lit template identity", () => {
    setLocalePreference("zh-CN");
    const { localizedTemplate } = createTranslator({ save: "Save" }, { save: "保存" }, resources);
    const container = document.createElement("div");
    document.body.append(container);
    const click = vi.fn();
    const draw = (value: string) => render(localizedTemplate("button", html)`<button @click=${click}>Save ${value}</button>`, container);
    draw('<img src="x"> Save 用户输入');
    const button = container.querySelector("button");
    expect(button?.textContent).toBe('保存 <img src="x"> Save 用户输入');
    expect(container.querySelector("img")).toBeNull();
    button?.click();
    expect(click).toHaveBeenCalledOnce();
    draw("second");
    expect(container.querySelector("button")).toBe(button);
    expect(button?.textContent).toBe("保存 second");
  });

  it("reorders authored text placeholders and omits English plural suffixes without changing values", () => {
    const { localizedText } = createTranslator({}, {}, {
      reordered: { sourceHash: 192603990, valueCount: 2, strings: ["无法在", "执行", ""], order: [1, 0] },
      plural: { sourceHash: 4216908343, valueCount: 2, strings: ["", " 个文件"], order: [0] },
    });
    const action = "install";
    const target = "用户工作区 Save";
    const describe = () => localizedText("reordered")`Failed to ${action} on ${target}`;
    const files = (count: number) => localizedText("plural")`${String(count)} file${count === 1 ? "" : "s"}`;
    setLocalePreference("en");
    expect(describe()).toBe("Failed to install on 用户工作区 Save");
    expect(files(2)).toBe("2 files");
    setLocalePreference("zh-CN");
    expect(describe()).toBe("无法在用户工作区 Save执行install");
    expect(files(2)).toBe("2 个文件");
  });

  it("keeps the original English template and falls back safely for stale or malformed catalogs", () => {
    const { localizedTemplate } = createTranslator({}, {}, {
      stale: resources.button,
      invalid: { ...resources.button, order: [9, 0] },
      wrongCount: { ...resources.button, strings: ["broken"] },
    });
    const container = document.createElement("div");
    const click = vi.fn();
    setLocalePreference("en");
    render(localizedTemplate("stale", html)`<button @click=${click}>Save ${"text"}</button>`, container);
    expect(container.textContent).toBe("Save text");
    setLocalePreference("zh-CN");
    render(localizedTemplate("stale", html)`<button @click=${click}>Changed ${"text"}</button>`, container);
    expect(container.textContent).toBe("Changed text");
    render(localizedTemplate("invalid", html)`<button @click=${click}>Save ${"text"}</button>`, container);
    expect(container.textContent).toBe("Save text");
    render(localizedTemplate("wrongCount", html)`<button @click=${click}>Save ${"text"}</button>`, container);
    expect(container.textContent).toBe("Save text");
    container.querySelector("button")?.click();
    expect(click).toHaveBeenCalledOnce();
  });
});
