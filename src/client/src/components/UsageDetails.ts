import { renderUiIcon } from "./uiIcons";
import { t } from "../../../shared/i18n";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { SessionRef } from "../../../shared/apiTypes";
import "./SessionInspectionPanel";
import type { SessionStatus } from "../api";
import { formatCost } from "../utils/format";
import { sessionContextObservations, type ContextReadState, type SessionContextObservation } from "../sessionContextObservations";
import type { ChatLine } from "./shared";
import "./ModalSurface";

function tokenCount(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? t("ui.usage.unknown") : value.toLocaleString();
}

@customElement("usage-details")
export class UsageDetails extends LitElement {
  @property() machineId = "local";
  @property({ attribute: false }) session: SessionRef | undefined;
  @state() private inspectionOpen = false;
  @property({ attribute: false }) status?: SessionStatus;
  @property({ attribute: false }) messages: readonly ChatLine[] = [];
  @property({ type: Boolean }) historyPartial = false;
  @property({ attribute: false }) onClose?: () => void;

  override render() {
    const status = this.status;
    if (status === undefined) return nothing;
    const context = status.contextUsage;
    const percent = context?.percent;
    const percentage = percent == null || !Number.isFinite(percent) ? t("ui.usage.unknown") : `${percent.toFixed(1)}%`;
    const cost = Number.isFinite(status.cost) ? formatCost(status.cost) : t("ui.usage.unknown");
    const sources = status.contextSources;
    const observed = sessionContextObservations(this.messages);
    return html`
      <modal-surface .label=${t("ui.usage.title")} .initialFocus=${".usage-close"} .onClose=${() => this.onClose?.()}>
        <header>
          <strong>${t("ui.usage.title")}</strong>
          <button class="usage-close" type="button" aria-label=${t("ui.usage.close")} @click=${() => this.onClose?.()}>${renderUiIcon("close")}</button>
        </header>
        <div class="usage-content">
          ${this.session === undefined ? nothing : html`<details class="inspection" @toggle=${(event: Event) => { if (event.target instanceof HTMLDetailsElement) this.inspectionOpen = event.target.open; }}>
            <summary>${t("inspection.open")}</summary>
            ${this.inspectionOpen ? html`<session-inspection-panel .session=${this.session} .machineId=${this.machineId}></session-inspection-panel>` : nothing}
          </details>`}
          <section aria-labelledby="instructions-heading">
            <h2 id="instructions-heading">${t("ui.context.instructions")}</h2>
            ${sources === undefined ? html`<p class="note unavailable">${t("ui.context.unavailable")}</p>` : html`
              <p class="note">${t("ui.context.sourceNote")}</p>
              <h3>${t("ui.context.agents")}</h3>
              ${this.renderPaths(sources.agentFiles)}
              <h3>${t("ui.context.system")}</h3>
              ${sources.systemPromptFiles === undefined ? html`<p class="note">${t("ui.context.unsupported")}</p>` : sources.systemPromptFiles.length === 0 ? html`<p class="note">${t("ui.context.none")}</p>` : html`
                <ul class="source-list">${sources.systemPromptFiles.map((file) => html`<li>${file.kind === "append-system" ? html`<span class="entry-label">${t("ui.context.append")}</span>` : nothing}<span class="path">${file.path}</span></li>`)}</ul>
              `}
              <details class="skills">
                <summary tabindex="0">${t("ui.context.availableSkills")}${sources.availableSkills === undefined ? nothing : html`<span class="count">${sources.availableSkills.length}</span>`}</summary>
                <p class="note">${t("ui.context.skillNote")}</p>
                ${sources.availableSkills === undefined ? html`<p class="note">${t("ui.context.unsupported")}</p>` : sources.availableSkills.length === 0 ? html`<p class="note">${t("ui.context.none")}</p>` : html`
                  <ul class="source-list">${sources.availableSkills.map((skill) => html`<li><span class="entry-label" title=${skill.description ?? nothing}>${skill.name}${skill.modelInvocation === false ? html`<span class="manual-only">${t("ui.context.manualOnly")}</span>` : nothing}</span>${skill.path === undefined ? nothing : html`<span class="path">${skill.path}</span>`}</li>`)}</ul>
                `}
              </details>
            `}
          </section>
          <section aria-labelledby="observed-heading">
            <h2 id="observed-heading">${t("ui.context.observed")}</h2>
            <p class="note">${t("ui.context.historyNote")}</p>
            ${this.historyPartial ? html`<p class="note history-partial">${t("ui.context.partial")}</p>` : nothing}
            ${status.isCompacting ? html`<p class="note" role="status">${t("ui.context.compacting")}</p>` : nothing}
            ${observed.hasCompaction ? html`<p class="note">${t("ui.context.compacted")}</p>` : nothing}
            ${observed.references.length === 0 ? html`<p class="note">${t("ui.context.none")}</p>` : html`<ul class="source-list observations">${observed.references.map((reference) => this.renderObservation(reference))}</ul>`}
          </section>
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

  private renderPaths(files: readonly { path: string }[] | undefined) {
    if (files === undefined) return html`<p class="note">${t("ui.context.unsupported")}</p>`;
    if (files.length === 0) return html`<p class="note">${t("ui.context.none")}</p>`;
    return html`<ul class="source-list">${files.map((file) => html`<li><span class="path">${file.path}</span></li>`)}</ul>`;
  }

  private renderObservation(reference: SessionContextObservation) {
    if (reference.kind === "image") return html`<li><span class="entry-label">${t("ui.context.image")} <span class="entry-state">${reference.mimeType} × ${reference.count}</span></span></li>`;
    if (reference.kind === "skill-invocation") return html`<li><span class="entry-label">${reference.name} <span class="entry-state">${t("ui.context.invoked")}</span></span><span class="path">${reference.path}</span></li>`;
    return html`<li><span class="entry-label">${reference.kind === "skill-read" ? reference.name : nothing}<span class="entry-state">${this.readLabel(reference.state)}</span></span><span class="path">${reference.path}</span></li>`;
  }

  private readLabel(state: ContextReadState): string {
    return state === "completed" ? t("ui.context.read") : state === "failed" ? t("ui.context.failed") : t("ui.context.requested");
  }

  static override styles = css`
    :host { position: fixed; inset: 0; z-index: 10; color: var(--pi-text); font: var(--pi-font-weight-regular, 360) 13px/18px var(--pi-font-family, system-ui, sans-serif); }
    modal-surface { --modal-surface-width: min(520px, calc(100vw - 24px)); --modal-surface-max-height: calc(100dvh - 24px); --modal-surface-backdrop-padding: 12px; --modal-surface-radius: 16px; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 18px; border-bottom: 0; }
    header strong { font-size: 14px; font-weight: var(--pi-font-weight-medium, 460); }
    button { display: grid; place-items: center; flex: 0 0 auto; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--pi-muted); font: var(--pi-font-weight-regular, 360) 22px/1 var(--pi-font-family, system-ui, sans-serif); cursor: pointer; }
    button:hover { background: var(--pi-selection-bg); color: var(--pi-text); }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    .usage-content { min-width: 0; min-height: 0; overflow-y: auto; padding: 4px 18px 16px; }
    section + section { margin-top: 16px; padding-top: 4px; }
    h2 { margin: 12px 0 6px; color: var(--pi-text-secondary); font-size: 12px; font-weight: var(--pi-font-weight-medium, 460); }
    h3 { margin: 12px 0 4px; color: var(--pi-muted); font: var(--pi-font-weight-regular, 360) 12px/18px var(--pi-font-family, system-ui, sans-serif); }
    .note { margin: 5px 0; color: var(--pi-muted); font-size: 12px; overflow-wrap: anywhere; }
    .source-list { margin: 0; padding: 0; list-style: none; }
    .source-list li { min-width: 0; padding: 5px 0; }
    .path { display: block; min-width: 0; color: var(--pi-text-secondary); font: var(--pi-font-weight-regular, 360) 12px/18px var(--pi-font-monospace, ui-monospace, monospace); overflow-wrap: anywhere; white-space: pre-wrap; }
    .entry-label { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; min-width: 0; overflow-wrap: anywhere; }
    .entry-state, .manual-only { color: var(--pi-muted); font-size: 12px; }
    .skills { margin-top: 12px; }
    summary { width: fit-content; max-width: 100%; color: var(--pi-text-secondary); font-size: 12px; cursor: pointer; }
    summary:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 3px; border-radius: 3px; }
    .count { margin-left: 8px; color: var(--pi-muted); font-variant-numeric: tabular-nums; }
    dl { margin: 0; }
    dl > div { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; padding: 6px 0; }
    dt { min-width: 0; color: var(--pi-muted); font-size: 12px; overflow-wrap: anywhere; }
    dd { min-width: 0; margin: 0; color: var(--pi-text); font-size: 13px; font-variant-numeric: tabular-nums; text-align: right; overflow-wrap: anywhere; }
    .cost-row { margin-top: 4px; border-top: 1px solid var(--pi-border-muted); }
    @media (max-width: 760px), (pointer: coarse) { button { width: 44px; height: 44px; } }
    @media (max-width: 640px) {
      modal-surface { --modal-surface-place-items: end stretch; --modal-surface-backdrop-padding: 0; --modal-surface-width: 100%; --modal-surface-max-height: calc(100dvh - 12px); --modal-surface-radius: 16px 16px 0 0; }
      .usage-content { padding-bottom: max(20px, env(safe-area-inset-bottom)); }
    }
  `;
}
