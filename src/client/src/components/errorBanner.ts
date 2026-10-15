import { localizedTemplate, localizedText, t } from "../../../shared/i18n";
import { html, type TemplateResult } from "lit";
import type { ServerNoticeSeverity } from "../../../shared/apiTypes";

/**
 * The shared application banner. Browser-local failures use the default error
 * severity; server-owned notices reuse the same presentation with their own
 * severity and dismissal callback.
 */
export function errorBanner(
  error: string,
  onDismiss: () => void,
  severity: ServerNoticeSeverity = "error",
  onRetry?: () => void,
): TemplateResult | null {
  if (error === "") return null;
  const severityLabel = bannerSeverityLabel(severity);
  const dismissLabel = localizedText("errorBanner.dismiss.ca566a5f")`Dismiss ${severityLabel.toLowerCase()}`;
  return html`<div class=${`error ${severity}`} role="alert">
    <span class="error-text">${error}</span>
    ${onRetry === undefined ? null : localizedTemplate("errorBanner.retry.1a58dfe6", html)`<button type="button" class="error-retry" @click=${() => { onRetry(); }}>Retry</button>`}
    <button type="button" class="error-dismiss" aria-label=${dismissLabel} title=${dismissLabel} @click=${() => { onDismiss(); }}>✕</button>
  </div>`;
}

function bannerSeverityLabel(severity: ServerNoticeSeverity): string {
  if (severity === "error") return t("errorBanner.error.710302f2");
  if (severity === "warning") return t("errorBanner.warning.1f79dfb1");
  return t("errorBanner.info.36338f90");
}
