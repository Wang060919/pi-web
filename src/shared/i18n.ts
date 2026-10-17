import { createTranslator } from './i18nCore';
import { messages as english } from './locales/en';
import { messages as chinese, templates } from './locales/zh-CN';

export { getLocale, getLocalePreference, initializeLocale, setLocalePreference } from './i18nCore';
export type { LocalePreference } from './i18nCore';

export const { t, localizedTemplate, localizedText } = createTranslator(english, chinese, templates);

/** Human-facing role labels; the role values themselves remain protocol identifiers. */
export function roleDisplayLabel(role: string): string {
  if (role === "user") return t("ui.role.user");
  if (role === "assistant") return t("ui.role.assistant");
  if (role === "tool") return t("ui.role.tool");
  return role;
}
