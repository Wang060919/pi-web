import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { getLocale, t } from "../../../shared/i18n";
import type { UsageOverviewResponse } from "../../../shared/usageOverview";
import { usageOverviewApi } from "../api/usageOverview";
import "./UsageOverview";

/** Reads the selected workspace or machine summaries while the welcome surface is mounted. */
@customElement("welcome-usage-overview")
export class WelcomeUsageOverview extends LitElement {
  @property() cwd = "";
  @property() machineId = "local";
  @property() projectName = "";
  @property() timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  @property() locale = getLocale();
  @state() private result: UsageOverviewResponse | undefined;
  @state() private loading = true;
  @state() private failed = false;
  private requestEpoch = 0;
  private requestController: AbortController | undefined;
  private reloadOnNextUpdate = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.reloadOnNextUpdate = true;
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.requestEpoch += 1;
    this.requestController?.abort();
    this.requestController = undefined;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("cwd") || changed.has("machineId") || changed.has("timeZone")) {
      // Never render a previous workspace's records under the new workspace.
      this.result = undefined;
      this.failed = false;
      this.loading = true;
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (this.isConnected && (this.reloadOnNextUpdate || changed.has("cwd") || changed.has("machineId") || changed.has("timeZone"))) {
      this.reloadOnNextUpdate = false;
      void this.reload();
    }
  }

  private async reload(): Promise<void> {
    this.requestController?.abort();
    this.requestController = undefined;
    const epoch = ++this.requestEpoch;
    const controller = new AbortController();
    this.requestController = controller;
    this.loading = true;
    this.failed = false;
    try {
      const result = await usageOverviewApi.get(this.cwd.trim() === "" ? undefined : this.cwd, this.timeZone, this.machineId, { signal: controller.signal });
      if (!this.isConnected || epoch !== this.requestEpoch) return;
      this.result = result;
    } catch {
      if (!this.isConnected || epoch !== this.requestEpoch || controller.signal.aborted) return;
      this.result = undefined;
      this.failed = true;
    } finally {
      if (this.isConnected && epoch === this.requestEpoch) {
        this.loading = false;
        this.requestController = undefined;
      }
    }
  }

  override render() {
    const machineScope = this.cwd.trim() === "";
    const projectLabel = machineScope ? t("ui.usageOverview.allProjects") : this.projectName;
    return html`
      <section aria-label=${t("ui.usageOverview.title")} aria-busy=${String(this.loading)}>
        <header>
          <span>${t(machineScope ? "ui.usageOverview.machineScope" : "ui.usageOverview.scope")}${projectLabel === "" ? nothing : html` · ${projectLabel}`}</span>
          <button type="button" ?disabled=${this.loading} @click=${() => { void this.reload(); }}>${t(this.loading && this.result !== undefined ? "ui.usageOverview.refreshing" : "ui.usageOverview.refresh")}</button>
        </header>
        ${this.result === undefined ? this.failed ? html`
          <div class="notice error" role="alert"><p>${t("ui.usageOverview.loadError")}</p><button type="button" @click=${() => { void this.reload(); }}>${t("ui.usageOverview.retry")}</button></div>
        ` : html`<p class="notice" role="status">${t("ui.usageOverview.loading")}</p>` : this.result.records.length === 0 && this.result.warnings.length > 0 ? html`
          <p class="notice" role="status">${t("ui.usageOverview.partial")}</p>
        ` : html`
          ${this.result.warnings.length === 0 ? nothing : html`<p class="partial" role="status">${t("ui.usageOverview.partial")}</p>`}
          <usage-overview .records=${this.result.records} .today=${this.result.today} .locale=${this.locale}></usage-overview>
        `}
        <details><summary>${t("ui.usageOverview.methodLabel")}</summary><p>${t(this.cwd.trim() === "" ? "ui.usageOverview.machineMethod" : "ui.usageOverview.method")}</p></details>
      </section>
    `;
  }

  static override styles = css`
    :host { display: block; width: 480px; max-width: 100%; color: var(--pi-text); font: var(--pi-font-weight-regular, 360) 12px/18px var(--pi-control-font-family, var(--pi-font-family, system-ui, sans-serif)); }
    * { box-sizing: border-box; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 22px; margin-bottom: 10px; color: var(--pi-muted); }
    header > span { min-width: 0; overflow-wrap: anywhere; }
    button { flex-shrink: 0; border: 0; border-radius: 5px; background: transparent; color: var(--pi-muted); padding: 2px 6px; font: inherit; cursor: pointer; }
    button:not(:disabled):hover { color: var(--pi-text); background: var(--pi-surface-hover); }
    button:disabled { opacity: .6; cursor: default; }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    p { margin: 0; }
    details { margin-top: 10px; color: var(--pi-muted); }
    summary { width: fit-content; cursor: pointer; }
    summary:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    details p { margin-top: 5px; }
    .notice { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 277px; padding: 16px; border-radius: 8px; background: light-dark(#f0f0ef, var(--pi-surface, #282828)); color: var(--pi-muted); }
    .error { align-items: flex-start; flex-direction: column; justify-content: center; }
    .error button { color: var(--pi-text); background: var(--pi-selection-bg); }
    .partial { margin-bottom: 8px; color: var(--pi-muted); }
    @media (max-width: 760px), (pointer: coarse) {
      button { min-width: 44px; min-height: 44px; }
      summary { box-sizing: border-box; min-height: 44px; padding-block: 12px; }
      header { gap: 8px; margin-bottom: 6px; }
    }
  `;
}
