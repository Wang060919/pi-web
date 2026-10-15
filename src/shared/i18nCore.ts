/** Browser-only locale preference, shared by the app and independently loaded plugins. */
export type Locale = "en" | "zh-CN";
export type LocalePreference = Locale | "system";
export const LOCALE_STORAGE_KEY = "pi-web.locale";

export function getLocalePreference(): LocalePreference {
  try {
    const stored = globalThis.localStorage.getItem(LOCALE_STORAGE_KEY);
    return stored === "en" || stored === "zh-CN" ? stored : "system";
  } catch {
    // Browsers can deny storage access; automatic language still works.
    return "system";
  }
}

export function setLocalePreference(preference: LocalePreference): void {
  if (preference === "system") globalThis.localStorage.removeItem(LOCALE_STORAGE_KEY);
  else globalThis.localStorage.setItem(LOCALE_STORAGE_KEY, preference);
}

export function getLocale(): Locale {
  const preference = getLocalePreference();
  if (preference !== "system") return preference;
  const browser: Partial<Pick<Navigator, "languages" | "language">> = typeof navigator === "undefined" ? {} : navigator;
  const language = browser.languages?.[0] ?? browser.language ?? "en";
  return /^zh(?:-|$)/i.test(language) ? "zh-CN" : "en";
}

export function initializeLocale(): void {
  if (typeof document !== "undefined") document.documentElement.lang = getLocale();
}

interface TranslatedTemplate {
  readonly sourceHash: number;
  readonly valueCount: number;
  readonly strings: readonly string[];
  readonly order: readonly number[];
}

type TemplateTag<Result> = (strings: TemplateStringsArray, ...values: unknown[]) => Result;

/** Translate only authored static UI text. Values are never searched or rewritten. */
export function createTranslator<English extends Record<string, string>, Templates extends Record<string, TranslatedTemplate>>(
  english: English,
  chinese: Partial<Record<keyof English, string>>,
  templates: Templates,
) {
  const templateCache = new Map<keyof Templates, TemplateStringsArray>();

  function t(key: keyof English): string {
    const source = english[key] ?? String(key);
    return getLocale() === "zh-CN" ? chinese[key] ?? source : source;
  }

  function localizedTemplate<Result>(key: keyof Templates, tag: TemplateTag<Result>): TemplateTag<Result> {
    return (original, ...values) => {
      if (getLocale() !== "zh-CN") return tag(original, ...values);
      const translation = templates[key];
      // A stale catalog must never move event handlers or values to new bindings.
      if (translation?.valueCount !== values.length
        || translation.strings.length !== translation.order.length + 1
        || translation.order.some((index) => !Number.isInteger(index) || index < 0 || index >= values.length)
        || translation.sourceHash !== hashTemplateStrings(original)) return tag(original, ...values);
      let strings = templateCache.get(key);
      if (strings === undefined) {
        strings = Object.freeze(Object.assign([...translation.strings], { raw: Object.freeze([...translation.strings]) }));
        templateCache.set(key, strings);
      }
      return tag(strings, ...translation.order.map((index) => values[index]));
    };
  }

  function localizedText(key: keyof Templates): TemplateTag<string> {
    return localizedTemplate(key, (strings, ...values) => {
      let result = strings[0] ?? "";
      values.forEach((value, index) => { result += String(value) + (strings[index + 1] ?? ""); });
      return result;
    });
  }

  return { t, localizedTemplate, localizedText };
}

function hashTemplateStrings(strings: readonly string[]): number {
  let hash = 2166136261;
  const source = JSON.stringify(strings);
  for (let index = 0; index < source.length; index += 1) {
    hash = Math.imul(hash ^ source.charCodeAt(index), 16777619) >>> 0;
  }
  return hash;
}
