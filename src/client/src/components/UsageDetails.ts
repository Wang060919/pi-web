import { t } from "../../../shared/i18n";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { SessionStatus } from "../api";
import { formatCost } from "../utils/format";
import "./ModalSurface";

function tokenCount(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? t("ui.usage.unknown") : value.toLocaleString();
}

@customElement("usage-details")
export class UsageDetails extends LitElement {
  @property({ attribute: false }) status?: SessionStatus;
  @property({ attribute: false }) onClose?: () => void;

  override render() {
    const status = this.status;
    if (status === undefined) return nothing;
    const context = status.contextUsage;
    const percent = context?.percent;
    const percentage = percent == null || !Number.isFinite(percent) ? t("ui.usage.unknown") : `${percent.toFixed(1)}%`;
    const cost = Number.isFinite(status.cost) ? formatCost(status.cost) : t("ui.usage.unknown");
    return html`
      <modal-surface .label=${t("ui.usage.title")} .initialFocus=${".usage-close"} .onClose=${() => this.onClose?.()}>
        <header>
          <strong>${t("ui.usage.title")}</strong>
          <button class="usage-close" type="button" aria-label=${t("ui.usage.close")} @click=${() => this.onClose?.()}>×</button>
        </header>
        <div class="usage-content">
          <section aria-labelledby="context-heading">
            <h2 id="context-heading">${t("ui.usage.context")}</h2>
            <dl>
              <div><dt>${t("ui.usage.contextPercent")}</dt><dd>${percentage}</dd></div>
              <div><dt>${t("ui.usage.contextUsed")}</dt><dd>${tokenCount(context?.tokens)}</dd></div>
              <div><dt>${t("ui.usage.contextWindow")}</dt><dd>${tokenCount(context?.contextWindow)}</dd></div>
            </dl>
          </section>
          <section aria-labelledby="tokens-heading">
            <h2 id="tokens-heading">${t("ui.usage.tokens")}</h2>
            <dl>
              <div><dt>${t("ui.usage.input")}</dt><dd>${tokenCount(status.tokens.input)}</dd></div>
              <div><dt>${t("ui.usage.output")}</dt><dd>${tokenCount(status.tokens.output)}</dd></div>
              <div><dt>${t("ui.usage.cacheRead")}</dt><dd>${tokenCount(status.tokens.cacheRead)}</dd></div>
              <div><dt>${t("ui.usage.cacheWrite")}</dt><dd>${tokenCount(status.tokens.cacheWrite)}</dd></div>
              <div><dt>${t("ui.usage.total")}</dt><dd>${tokenCount(status.tokens.total)}</dd></div>
              <div class="cost-row"><dt>${t("ui.usage.cost")}</dt><dd title=${Number.isFinite(status.cost) ? `$${String(status.cost)}` : nothing}>${cost}</dd></div>
            </dl>
          </section>
        </div>
      </modal-surface>
    `;
  }

  static override styles = css`
    :host { position: fixed; inset: 0; z-index: 10; color: var(--pi-text); font: 400 13px/18px var(--pi-font-family, system-ui, sans-serif); }
    modal-surface { --modal-surface-width: min(380px, calc(100vw - 24px)); --modal-surface-max-height: calc(100dvh - 24px); --modal-surface-backdrop-padding: 12px; --modal-surface-radius: 16px; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 18px; border-bottom: 0; }
    header strong { font-size: 14px; font-weight: 500; }
    button { display: grid; place-items: center; flex: 0 0 auto; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--pi-muted); font: 22px/1 var(--pi-font-family, system-ui, sans-serif); cursor: pointer; }
    button:hover { background: var(--pi-selection-bg); color: var(--pi-text); }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    .usage-content { min-width: 0; min-height: 0; overflow-y: auto; padding: 4px 18px 16px; }
    section + section { margin-top: 16px; padding-top: 4px; }
    h2 { margin: 12px 0 6px; color: var(--pi-text-secondary); font-size: 12px; font-weight: 500; }
    dl { margin: 0; }
    dl > div { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; padding: 6px 0; }
    dt { min-width: 0; color: var(--pi-muted); font-size: 12px; overflow-wrap: anywhere; }
    dd { min-width: 0; margin: 0; color: var(--pi-text); font-size: 13px; font-variant-numeric: tabular-nums; text-align: right; overflow-wrap: anywhere; }
    .cost-row { margin-top: 4px; border-top: 1px solid var(--pi-border-muted); }
    @media (pointer: coarse) { button { width: 44px; height: 44px; } }
    @media (max-width: 640px) {
      modal-surface { --modal-surface-place-items: end stretch; --modal-surface-backdrop-padding: 0; --modal-surface-width: 100%; --modal-surface-max-height: calc(100dvh - 12px); --modal-surface-radius: 16px 16px 0 0; }
      .usage-content { padding-bottom: max(20px, env(safe-area-inset-bottom)); }
    }
  `;
}
