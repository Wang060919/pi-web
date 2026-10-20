import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { t } from "../../../shared/i18n";
import type { ChatTimelineEntry } from "../chatTimeline";
import { renderUiIcon } from "./uiIcons";
import "./ModalSurface";

/** On-demand navigation through the same loaded turns as the desktop rail. */
@customElement("chat-timeline-dialog")
export class ChatTimelineDialog extends LitElement {
  @property({ attribute: false }) entries: readonly ChatTimelineEntry[] = [];
  @property() currentKey: string | undefined;
  @property({ attribute: false }) onSelect?: (entry: ChatTimelineEntry) => void;
  @property({ attribute: false }) onClose?: () => void;

  override render() {
    return html`<modal-surface .label=${t("ui.chatTimeline.navigation")} .initialFocus=${".close"} .onClose=${this.onClose}>
      <header><div><strong>${t("ui.chatTimeline.navigation")}</strong><small>${t("ui.chatTimeline.loaded")}</small></div><button type="button" class="close" aria-label=${t("navigation.close")} @click=${this.onClose}>${renderUiIcon("close")}</button></header>
      <nav aria-label=${t("ui.chatTimeline.loaded")}>
        ${this.entries.map((entry) => html`<button type="button" class="entry" aria-label=${`${t("ui.chatTimeline.jump")}: ${entry.title}`} aria-current=${entry.key === this.currentKey ? "location" : nothing} @click=${() => this.onSelect?.(entry)}><strong>${entry.title}</strong><small>${entry.preview || t("ui.chatTimeline.emptyReply")}</small></button>`)}
      </nav>
    </modal-surface>`;
  }

  static override styles = css`
    :host { position: fixed; inset: 0; z-index: 40; color: var(--pi-text); font: var(--pi-font-weight-regular, 360) 14px/20px var(--pi-font-family, system-ui, sans-serif); }
    modal-surface { --modal-surface-place-items: end center; --modal-surface-backdrop-padding: 8px; --modal-surface-width: min(480px, 100%); --modal-surface-max-height: calc(var(--pi-viewport-height, 100dvh) - 16px); }
    header { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 8px 4px 16px; }
    header div { min-width: 0; }
    small { display: block; color: var(--pi-muted); font: inherit; }
    nav { display: grid; gap: 4px; min-height: 0; padding: 0 8px 8px; overflow-y: auto; overscroll-behavior-y: contain; }
    button { box-sizing: border-box; min-width: 44px; min-height: 44px; padding: 8px; border: 0; border-radius: 6px; background: transparent; color: inherit; font: inherit; text-align: start; cursor: pointer; }
    .entry { display: block; width: 100%; overflow-wrap: anywhere; white-space: normal; }
    .entry small { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .entry[aria-current="location"], button:hover { background: var(--pi-selection-bg); }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: -2px; }
    .close { display: inline-grid; flex: 0 0 44px; place-items: center; }
  `;
}
