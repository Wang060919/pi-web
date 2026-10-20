import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { t } from "../../../../shared/i18n";
import { CHAT_TEXT_SIZES, DEFAULT_CHAT_TEXT_SIZE, type ChatTextSize } from "../../chatTextSize";
import { settingsDesignStyles } from "./settingsDesignStyles";

@customElement("settings-chat-text-panel")
export class SettingsChatTextPanel extends LitElement {
  @property() value: ChatTextSize = DEFAULT_CHAT_TEXT_SIZE;
  @property({ attribute: false }) onChange?: (size: ChatTextSize) => void;
  @state() private saved = false;
  @state() private failed = false;

  private choose(size: ChatTextSize): void {
    if (size === this.value || this.onChange === undefined) return;
    this.saved = false;
    this.failed = false;
    try {
      this.onChange(size);
      this.saved = true;
    } catch {
      this.failed = true;
    }
  }

  override render() {
    return html`
      <section aria-labelledby="chat-text-heading">
        <h3 id="chat-text-heading">${t("settingsChatText.heading")}</h3>
        <div class="size-row" data-setting-id="chat-text-size">
          <div class="description"><span id="size-label">${t("settingsChatText.size")}</span><small id="size-description">${t("settingsChatText.description")}</small></div>
          <div class="segmented" style=${`--segment-index: ${String(CHAT_TEXT_SIZES.indexOf(this.value))}`} role="group" aria-labelledby="size-label" aria-describedby="size-description">
            ${CHAT_TEXT_SIZES.map((size) => html`<button type="button" aria-pressed=${String(this.value === size)} @click=${() => { this.choose(size); }}>${t(`settingsChatText.${size}`)}</button>`)}
          </div>
        </div>
        <p class="feedback" role="status" aria-live="polite">${this.failed ? t("settingsChatText.saveFailed") : this.saved ? t("settingsChatText.saved") : ""}</p>
      </section>`;
  }

  static override styles = [css`
    :host { display: block; }
    h3 { margin: 0 0 12px; }
    .size-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 12px 0; border-bottom: 1px solid var(--pi-border-muted); }
    .description { display: grid; gap: 4px; }
    small, .feedback { color: var(--pi-muted); }
    .segmented { position: relative; flex: 0 0 auto; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 1px; border-radius: 8px; background: var(--pi-surface); }
    .segmented::before { content: ""; position: absolute; inset-block: 1px; left: 1px; width: calc((100% - 2px) / 3); border-radius: 7px; background: var(--pi-bg); box-shadow: inset 0 0 0 1px var(--pi-border-muted), 0 1px 2px var(--pi-shadow); transform: translateX(calc(var(--segment-index) * 100%)); transition: transform .15s ease; }
    button { position: relative; z-index: 1; border: 0; background: transparent; color: var(--pi-muted); font: inherit; white-space: nowrap; cursor: pointer; }
    button[aria-pressed="true"] { color: var(--pi-text); }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: -2px; }
    .feedback { min-height: 18px; margin: 6px 0 0; font-size: 13px; line-height: 18px; }
    @media (prefers-reduced-motion: reduce) { .segmented::before { transition: none; } }
    @media (max-width: 760px), (pointer: coarse) { .size-row { align-items: flex-start; flex-direction: column; gap: 12px; } button { min-width: 44px; } }
  `, settingsDesignStyles];
}
