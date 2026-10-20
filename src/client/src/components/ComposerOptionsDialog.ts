import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { t } from "../../../shared/i18n";
import { renderUiIcon } from "./uiIcons";
import "./ModalSurface";

export type ComposerOptionAction = "top" | "end" | "timeline" | "machine" | "workspace" | "thinking";

/** Rendered beside the composer so its size containment cannot clip the sheet. */
@customElement("composer-options-dialog")
export class ComposerOptionsDialog extends LitElement {
  @property() machineLabel = "";
  @property() workspaceLabel = "";
  @property() thinkingLabel = "";
  @property({ type: Boolean }) hasWorkspace = false;
  @property({ type: Boolean }) navigationEnabled = false;
  @property({ attribute: false }) onSelect?: (action: ComposerOptionAction) => void;
  @property({ attribute: false }) onClose?: () => void;

  override render() {
    return html`
      <modal-surface .label=${t("navigation.more")} .initialFocus=${".close"} .onClose=${this.onClose}>
        <header><strong>${t("navigation.more")}</strong><button class="close" type="button" aria-label=${t("navigation.close")} @click=${this.onClose}>${renderUiIcon("close")}</button></header>
        <div class="options">
          ${this.navigationEnabled ? html`<nav aria-label=${t("ui.chatTimeline.controls")}>
            <button type="button" data-action="top" @click=${() => this.onSelect?.("top")}>${renderUiIcon("arrowUp")}<span>${t("ui.chatTimeline.top")}</span></button>
            <button type="button" data-action="end" @click=${() => this.onSelect?.("end")}>${renderUiIcon("arrowDown")}<span>${t("ui.chatTimeline.end")}</span></button>
          </nav>` : null}
          ${this.navigationEnabled ? html`<button type="button" data-action="timeline" aria-haspopup="dialog" @click=${() => this.onSelect?.("timeline")}>${t("ui.chatTimeline.navigation")}</button>` : null}
          ${this.hasWorkspace ? html`
            <button type="button" data-action="machine" aria-haspopup="dialog" @click=${() => this.onSelect?.("machine")}><span>${t("ui.composer.machinePicker")}</span><small>${this.machineLabel}</small></button>
            <button type="button" data-action="workspace" aria-haspopup="dialog" @click=${() => this.onSelect?.("workspace")}><span>${t("ui.navigation.workspacePicker")}</span><small>${this.workspaceLabel}</small></button>
          ` : null}
          ${this.thinkingLabel === "" ? null : html`<button type="button" data-action="thinking" aria-haspopup="dialog" @click=${() => this.onSelect?.("thinking")}><span>${t("ui.thinkingPicker.title")}</span><small>${this.thinkingLabel}</small></button>`}
        </div>
      </modal-surface>
    `;
  }

  static override styles = css`
    :host { position: fixed; inset: 0; z-index: 40; color: var(--pi-text); font: var(--pi-font-weight-regular, 360) 14px/20px var(--pi-font-family, system-ui, sans-serif); }
    modal-surface { --modal-surface-place-items: end center; --modal-surface-backdrop-padding: 8px; --modal-surface-width: min(480px, 100%); --modal-surface-max-height: calc(var(--pi-viewport-height, 100dvh) - 16px); }
    header { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; padding: 4px 8px 4px 16px; }
    .options { display: grid; gap: 4px; min-height: 0; padding: 0 8px 8px; overflow-y: auto; overscroll-behavior: contain; }
    nav { display: flex; gap: 4px; }
    button { box-sizing: border-box; display: flex; align-items: center; gap: 8px; min-width: 44px; min-height: 44px; padding: 8px; border: 0; border-radius: 6px; background: transparent; color: inherit; font: inherit; text-align: start; cursor: pointer; }
    nav button { flex: 1 1 0; }
    button:hover { background: var(--pi-selection-bg); }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: -2px; }
    button span { min-width: 0; overflow-wrap: anywhere; }
    small { min-width: 0; margin-left: auto; max-width: 55%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--pi-muted); }
    .close { flex: 0 0 44px; justify-content: center; }
  `;
}
