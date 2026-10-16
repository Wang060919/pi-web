import { t } from "../../shared/i18n";

/** Display known levels without losing a newer runtime's unknown values. */
export function thinkingDisplayLabel(level: string): string {
  switch (level) {
    case "off": return t("ui.thinking.off");
    case "minimal": return t("ui.thinking.minimal");
    case "low": return t("ui.thinking.low");
    case "medium": return t("ui.thinking.medium");
    case "high": return t("ui.thinking.high");
    case "xhigh": return t("ui.thinking.xhigh");
    case "max": return t("ui.thinking.max");
    default: return level;
  }
}

/** Intensity descriptions stay meaningful across providers with different budgets. */
export function thinkingDescription(level: string): string | undefined {
  switch (level) {
    case "off": return t("ui.thinkingDescription.off");
    case "minimal": return t("ui.thinkingDescription.minimal");
    case "low": return t("ui.thinkingDescription.low");
    case "medium": return t("ui.thinkingDescription.medium");
    case "high": return t("ui.thinkingDescription.high");
    case "xhigh": return t("ui.thinkingDescription.xhigh");
    case "max": return t("ui.thinkingDescription.max");
    default: return undefined;
  }
}
