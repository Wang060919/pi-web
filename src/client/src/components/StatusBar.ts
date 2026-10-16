import { localizedTemplate, localizedText, t } from "../../../shared/i18n";
import { LitElement, css, html, svg, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { SessionStatus } from "../api";
import { renderSessionWarningIcon, statusBarStyles } from "./shared";
import "./UsageDetails";

export interface StatusBarWarningControlContent {
  countText: string;
  accessibleLabel: string;
}

export function statusBarWarningControlContent(count: number, expanded: boolean): StatusBarWarningControlContent | undefined {
  if (!Number.isInteger(count) || count <= 0) return undefined;
  const warningText = localizedText("StatusBar.template.123f7e9d")`${String(count)} ${count === 1 ? "warning" : "warnings"}`;
  return {
    countText: String(count),
    accessibleLabel: expanded ? localizedText("StatusBar.minimise.98e2a11d")`Minimise ${warningText}` : localizedText("StatusBar.show_in_the_warning_area.71d1978a")`Show ${warningText} in the warning area`,
  };
}

@customElement("status-bar")
export class StatusBar extends LitElement {
  @property({ type: Boolean, reflect: true }) compact = false;
  @property({ attribute: false }) status: SessionStatus | undefined = undefined;
  @property({ type: Number }) warningCount = 0;
  @property({ type: Boolean }) warningsExpanded = false;
  @property({ attribute: false }) onToggleWarnings?: () => void;
  @state() private usageOpen = false;

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("status") && (this.status === undefined || changed.get("status")?.sessionId !== this.status.sessionId)) this.usageOpen = false;
  }

  private readonly handleToggleWarnings = (): void => {
    this.onToggleWarnings?.();
  };

  override render() {
    const status = this.status;
    if (status === undefined) return localizedTemplate("StatusBar.no_session_status_yet.dc472689", html)`<div class="bar muted">No session status yet</div>`;
    const percent = status.contextUsage?.percent;
    const percentage = percent == null || !Number.isFinite(percent) ? undefined : percent;
    const contextText = percentage === undefined ? t("StatusBar.context_unknown.34527476") : `${t("ui.usage.context")} ${percentage.toFixed(1)}%`;
    const usageLabel = `${t("ui.usage.open")}: ${contextText}`;
    const warningControl = statusBarWarningControlContent(this.warningCount, this.warningsExpanded);
    return html`
      <div class="bar">
        ${warningControl === undefined || this.onToggleWarnings === undefined ? null : html`
          <button
            type="button"
            class="warning-toggle"
            title=${warningControl.accessibleLabel}
            aria-label=${warningControl.accessibleLabel}
            aria-expanded=${String(this.warningsExpanded)}
            @click=${this.handleToggleWarnings}
          >
            ${renderSessionWarningIcon("warning", "warning-toggle-icon")}
            <span>${warningControl.countText}</span>
          </button>
        `}
        <button
          type="button"
          class="usage-toggle"
          title=${usageLabel}
          aria-label=${usageLabel}
          aria-haspopup="dialog"
          aria-expanded=${String(this.usageOpen)}
          @click=${() => { this.usageOpen = !this.usageOpen; }}
        >
          <svg class=${`context-ring${percentage !== undefined && percentage >= 90 ? " danger" : percentage !== undefined && percentage >= 70 ? " warning" : ""}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle class="context-ring-track" cx="12" cy="12" r="9"></circle>
            ${percentage === undefined ? svg`<text class="context-ring-unknown" x="12" y="15.5" text-anchor="middle">?</text>` : svg`<circle class="context-ring-value" cx="12" cy="12" r="9" pathLength="100" stroke-dasharray=${`${String(Math.max(0, Math.min(100, percentage)))} 100`}></circle>`}
          </svg>
          <span class="context-text">${contextText}</span>
        </button>
        ${status.pendingMessageCount > 0 ? localizedTemplate("StatusBar.queued.aa0b8a9a", html)`<span>${String(status.pendingMessageCount)} queued</span>` : null}
      </div>
      ${this.usageOpen ? html`<usage-details .status=${status} .onClose=${() => { this.usageOpen = false; }}></usage-details>` : nothing}
    `;
  }

  static override styles = [statusBarStyles, css`
    .bar { gap: 10px; padding: 5px 12px; }
    .bar > span { flex: 0 0 auto; color: var(--pi-warning); }
    .usage-toggle { display: inline-flex; flex: 0 1 auto; align-items: center; gap: 6px; min-width: 0; padding: 3px 5px; border: 0; border-radius: 999px; background: transparent; color: var(--pi-muted); font: inherit; font-variant-numeric: tabular-nums; white-space: nowrap; cursor: pointer; }
    .usage-toggle:hover { color: var(--pi-text); background: var(--pi-surface-hover); }
    .usage-toggle:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    .context-ring { flex: 0 0 auto; width: 20px; height: 20px; color: var(--pi-accent); fill: none; stroke-width: 2.5; }
    .context-ring-track { stroke: var(--pi-border); }
    .context-ring-unknown { fill: var(--pi-muted); font: 10px var(--pi-font-family, system-ui, sans-serif); stroke: none; }
    .context-ring-value { transform: rotate(-90deg); transform-origin: center; stroke: currentColor; stroke-linecap: round; }
    .context-ring.warning { color: var(--pi-warning); }
    .context-ring.danger { color: var(--pi-danger); }
    :host([compact]) { display: inline-flex; min-width: 0; }
    :host([compact]) .bar { gap: 4px; padding: 0; border: 0; background: transparent; }
    :host([compact]) .context-text { display: none; }
    :host([compact]) .usage-toggle { padding: 6px; }
    :host([compact]) .context-ring { width: 15px; height: 15px; }

  `];
}
