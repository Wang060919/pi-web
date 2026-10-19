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
    return localizedTemplate("SettingsThemePanel.theme_choose_a_theme_on_this_device.d6cd1f89", html)`
      <section class="theme-card" aria-labelledby="theme-heading">
        <header>
          <h3 id="theme-heading">Theme</h3>
          <p>Choose a theme on this device, or save a default for browsers that use the default.</p>
        </header>
        <div class="current-theme" role="status">
          <strong>${this.hasLocalOverride ? t("SettingsThemePanel.using_a_theme_saved_on_this_device.408c8ab7") : t("SettingsThemePanel.using_the_default_theme.7f64b2d6")}</strong>
          <span>Current: ${this.themeName(this.activeThemeId || this.preference.themeId)}</span>
          <span>Default: ${this.themeName(this.defaultPreference.themeId)}${this.defaultPreference.auto ? t("SettingsThemePanel.auto.4a08014a") : ""}</span>
        </div>
        <label class="field">
          <span>Theme</span>
          <select aria-label="Theme" .value=${this.draft.themeId} ?disabled=${busy} @change=${(event: Event) => {
            if (event.target instanceof HTMLSelectElement) this.draft = { ...this.draft, themeId: event.target.value };
          }}>
            ${!selectedAvailable ? localizedTemplate("SettingsThemePanel.unavailable.58a76ce3", html)`<option value=${this.draft.themeId}>${this.draft.themeId} (unavailable)</option>` : null}
            ${this.themes.map((theme) => html`<option value=${theme.id}>${theme.name}</option>`)}
          </select>
        </label>
        <label class="auto-field">
          <input type="checkbox" .checked=${this.draft.auto} ?disabled=${busy} @change=${(event: Event) => {
            if (event.target instanceof HTMLInputElement) this.draft = { ...this.draft, auto: event.target.checked };
          }}>
          <span>Auto <small>Follow this device's light/dark preference when the theme has a pair.</small></span>
        </label>
        <div class="theme-actions">
          <button class="primary" ?disabled=${busy || !selectedAvailable} @click=${() => this.onUseLocal?.({ ...this.draft })}>Use on this device</button>
          <button ?disabled=${busy || !selectedAvailable} @click=${() => { void this.onSetDefault?.({ ...this.draft }); }}>Set as default</button>
          <button ?disabled=${busy || !this.hasLocalOverride} @click=${() => this.onUseDefault?.()}>Use the default</button>
        </div>
        <p class="hint">Setting a default leaves saved device choices unchanged. Use the default to remove this device's override.</p>
      </section>
    `;
  }

  private themeName(id: string): string {
    return this.themes.find((theme) => theme.id === id)?.name ?? localizedText("SettingsThemePanel.unavailable.98a0d016")`${id} (unavailable)`;
  }

  static override styles = css`
    :host { display: block; font: var(--pi-font-weight-regular, 360) 13px/18px var(--pi-font-family, system-ui, sans-serif); }
    small { font-size: 12px; line-height: 16px; }
    strong { font-weight: var(--pi-font-weight-medium, 460); }
    .theme-card { display: grid; gap: 14px; padding: 16px; border: 0; border-radius: 10px; background: var(--pi-surface); }
    header { display: grid; gap: 6px; }
    h3, p { margin: 0; }
    h3 { font-size: 14px; line-height: 20px; font-weight: var(--pi-font-weight-medium, 460); }
    p { color: var(--pi-muted); font-size: 14px; line-height: 20px; }
    small { color: var(--pi-muted); font-size: 12px; line-height: 16px; }
    .current-theme { display: grid; gap: 5px; padding: 12px; border: 0; border-radius: 8px; background: var(--pi-bg); }
    .current-theme span { color: var(--pi-text-secondary); font-size: 12px; overflow-wrap: anywhere; }
    .field { display: grid; gap: 7px; }
    .field > span { color: var(--pi-muted); font-size: 12px; font-weight: var(--pi-font-weight-medium, 460); }
    select { box-sizing: border-box; width: 100%; border: 1px solid var(--pi-border); border-radius: 8px; padding: 9px 10px; background: var(--pi-bg); color: var(--pi-text); font: var(--pi-font-weight-regular, 360) var(--pi-control-font-size, 14px)/1.428571 var(--pi-control-font-family, system-ui, sans-serif); }
    .auto-field { display: flex; align-items: flex-start; gap: 9px; }
    .auto-field input { margin-top: 3px; accent-color: var(--pi-accent); }
    .auto-field span { display: grid; gap: 3px; }
    .theme-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    button { box-sizing: border-box; min-height: 30px; border: 0; border-radius: 6px; background: transparent; color: var(--pi-text); padding: 6px 10px; font: inherit; cursor: pointer; }
    button:not(:disabled):hover { background: var(--pi-surface-hover); }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    select:focus-visible, input:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    .primary { background: var(--pi-selection-bg); color: var(--pi-text-bright); font-weight: var(--pi-font-weight-medium, 460); }
    button:disabled, select:disabled, input:disabled { opacity: .55; cursor: not-allowed; }
    .hint { font-size: 12px; }

    @media (max-width: 760px), (pointer: coarse) {
      button, select { min-height: 44px; }
      .auto-field { box-sizing: border-box; min-height: 44px; }
    }
  `;
}
