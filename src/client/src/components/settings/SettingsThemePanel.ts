import { settingsDesignStyles } from "./settingsDesignStyles";
import { localizedTemplate, localizedText, t } from "../../../../shared/i18n";
import { css, html, LitElement, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { QualifiedThemeContribution } from "../../plugins/types";
import { DEFAULT_THEME_PREFERENCE, type ThemePreference } from "../../theme";

@customElement("settings-theme-panel")
export class SettingsThemePanel extends LitElement {
  @property({ attribute: false }) themes: readonly QualifiedThemeContribution[] = [];
  @property({ attribute: false }) preference: ThemePreference = DEFAULT_THEME_PREFERENCE;
  @property({ attribute: false }) defaultPreference: ThemePreference = DEFAULT_THEME_PREFERENCE;
  @property() activeThemeId = "";
  @property({ type: Boolean }) hasLocalOverride = false;
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) saving = false;
  @property({ attribute: false }) onUseLocal?: (preference: ThemePreference) => void;
  @property({ attribute: false }) onSetDefault?: (preference: ThemePreference) => void | Promise<void>;
  @property({ attribute: false }) onUseDefault?: () => void;
  @state() private draft: ThemePreference = { ...DEFAULT_THEME_PREFERENCE };

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("preference")) this.draft = { ...this.preference };
  }

  override render(): TemplateResult {
    const selectedAvailable = this.themes.some((theme) => theme.id === this.draft.themeId);
    const busy = this.loading || this.saving;
    return html`
      <section class="theme-card" aria-labelledby="theme-heading">
        <header><h3 id="theme-heading">${t("settingsAppearance.heading")}</h3><p>${t("settingsAppearance.description")}</p></header>
        <label class="field"><span>${t("settingsAppearance.theme")}</span>
          <select aria-label=${t("settingsAppearance.theme")} .value=${this.draft.themeId} ?disabled=${busy} @change=${(event: Event) => {
            if (event.target instanceof HTMLSelectElement) this.draft = { ...this.draft, themeId: event.target.value };
          }}>
            ${!selectedAvailable ? localizedTemplate("SettingsThemePanel.unavailable.58a76ce3", html)`<option value=${this.draft.themeId}>${this.draft.themeId} (unavailable)</option>` : null}
            ${this.themes.map((theme) => html`<option value=${theme.id} .selected=${theme.id === this.draft.themeId}>${theme.name}</option>`)}
          </select>
        </label>
        <div class="mode-row">
          <div><span>${t("settingsAppearance.mode")}</span><small>${t("settingsAppearance.autoHint")}</small></div>
          <div class="segmented" style=${`--segment-index: ${this.draft.auto ? "0" : "1"}`} role="group" aria-label=${t("settingsAppearance.mode")}>
            <button type="button" aria-pressed=${String(this.draft.auto)} ?disabled=${busy} @click=${() => { this.draft = { ...this.draft, auto: true }; }}>${t("settingsAppearance.system")}</button>
            <button type="button" aria-pressed=${String(!this.draft.auto)} ?disabled=${busy} @click=${() => { this.draft = { ...this.draft, auto: false }; }}>${t("settingsAppearance.fixed")}</button>
          </div>
        </div>
        <div class="current-theme" role="status">
          <strong>${this.hasLocalOverride ? t("SettingsThemePanel.using_a_theme_saved_on_this_device.408c8ab7") : t("SettingsThemePanel.using_the_default_theme.7f64b2d6")}</strong>
          <span>${t("settingsAppearance.current")} ${this.themeName(this.activeThemeId || this.preference.themeId)}</span>
          <span>${t("settingsAppearance.default")} ${this.themeName(this.defaultPreference.themeId)}${this.defaultPreference.auto ? t("SettingsThemePanel.auto.4a08014a") : ""}</span>
        </div>
        <div class="theme-actions">
          <button class="primary" ?disabled=${busy || !selectedAvailable} @click=${() => this.onUseLocal?.({ ...this.draft })}>${t("settingsAppearance.useDevice")}</button>
          <button ?disabled=${busy || !selectedAvailable} @click=${() => { void this.onSetDefault?.({ ...this.draft }); }}>${t("settingsAppearance.setDefault")}</button>
          <button ?disabled=${busy || !this.hasLocalOverride} @click=${() => this.onUseDefault?.()}>${t("settingsAppearance.useDefault")}</button>
        </div>
        <p class="hint">${t("settingsAppearance.defaultHint")}</p>
      </section>`;
  }

  private themeName(id: string): string {
    return this.themes.find((theme) => theme.id === id)?.name ?? localizedText("SettingsThemePanel.unavailable.98a0d016")`${id} (unavailable)`;
  }

  static override styles = [css`
    :host { display: block; font: var(--pi-font-weight-regular, 360) 13px/18px var(--pi-font-family, system-ui, sans-serif); }
    small { font-size: 12px; line-height: 16px; }
    strong { font-weight: var(--pi-font-weight-medium, 460); }
    .theme-card { display: grid; gap: 0; padding: 0; background: transparent; }
    header { display: grid; gap: 6px; margin: 8px 0 18px; }
    h3, p { margin: 0; }
    h3 { font-size: 14px; line-height: 20px; font-weight: var(--pi-font-weight-medium, 460); }
    p { color: var(--pi-muted); font-size: 14px; line-height: 20px; }
    small { color: var(--pi-muted); font-size: 12px; line-height: 16px; }
    .current-theme { display: grid; gap: 4px; margin-top: 18px; color: var(--pi-muted); }
    .current-theme span { color: var(--pi-text-secondary); font-size: 12px; overflow-wrap: anywhere; }
    .field { display: grid; grid-template-columns: minmax(0, 1fr) minmax(180px, 280px); align-items: center; gap: 24px; padding: 16px 0; border-bottom: 1px solid var(--pi-border-muted); }
    .field > span { color: var(--pi-text); font-size: 14px; font-weight: var(--pi-font-weight-medium, 460); }
    select { box-sizing: border-box; width: 100%; border: 1px solid var(--pi-border-muted); border-radius: 8px; padding: 9px 10px; background: var(--pi-bg); color: var(--pi-text); font: var(--pi-font-weight-regular, 360) var(--pi-control-font-size, 14px)/1.428571 var(--pi-control-font-family, system-ui, sans-serif); }
    .mode-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 16px 0; border-bottom: 1px solid var(--pi-border-muted); }
    .mode-row > div:first-child { display: grid; gap: 5px; }
    .segmented { position: relative; flex: 0 0 auto; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 1px; border-radius: 8px; background: var(--pi-surface); }
    .segmented::before { content: ""; position: absolute; top: 1px; bottom: 1px; left: 1px; width: calc((100% - 2px) / 2); border-radius: 7px; background: var(--pi-bg); box-shadow: inset 0 0 0 1px var(--pi-border-muted), 0 1px 2px var(--pi-shadow); transform: translateX(calc(var(--segment-index) * 100%)); transition: transform .15s ease; }
    .segmented button { position: relative; z-index: 1; background: transparent; color: var(--pi-muted); white-space: nowrap; }
    .segmented button[aria-pressed="true"] { color: var(--pi-text); }
    .theme-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin: 20px 0 10px; }
    button { box-sizing: border-box; min-height: 30px; border: 0; border-radius: 8px; background: var(--pi-surface); color: var(--pi-text); padding: 6px 10px; font: inherit; cursor: pointer; }
    button:not(:disabled):hover { background: var(--pi-surface-hover); }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    select:focus-visible, input:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    .primary { background: var(--pi-selection-bg); color: var(--pi-text-bright); font-weight: var(--pi-font-weight-medium, 460); }
    button:disabled, select:disabled, input:disabled { opacity: .55; cursor: not-allowed; }
    .hint { font-size: 12px; }

    @media (prefers-reduced-motion: reduce) { .segmented::before { transition: none; } }
    @media (max-width: 760px), (pointer: coarse) {
      button, select { min-height: 44px; }
      .field { grid-template-columns: minmax(0, 1fr); gap: 10px; }
      .mode-row { align-items: flex-start; flex-direction: column; gap: 12px; }
    }
  `, settingsDesignStyles];
}
