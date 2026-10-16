import { css, html, LitElement, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { getLocalePreference, setLocalePreference, t, type LocalePreference } from "../../../../shared/i18n";

@customElement("settings-language-panel")
export class SettingsLanguagePanel extends LitElement {
  @property({ attribute: false }) reloadPage: () => void = () => { window.location.reload(); };
  @state() private preference: LocalePreference = getLocalePreference();
  @state() private error = "";

  override render(): TemplateResult {
    return html`
      <section class="language-card" aria-labelledby="language-heading">
        <header>
          <h3 id="language-heading">${t("settings.language.title")}</h3>
          <p>${t("settings.language.description")}</p>
        </header>
        <label>
          <span>${t("settings.language.title")}</span>
          <select aria-label=${t("settings.language.title")} .value=${this.preference} @change=${(event: Event) => { this.changePreference(event); }}>
            <option value="system">${t("settings.language.system")}</option>
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
          </select>
        </label>
        ${this.error === "" ? null : html`<p class="error" role="alert">${this.error}</p>`}
        <div class="actions">
          <button type="button" @click=${() => { this.apply(); }}>${t("settings.language.apply")}</button>
          <small>${t("settings.language.hint")}</small>
        </div>
      </section>
    `;
  }

  private changePreference(event: Event): void {
    if (!(event.target instanceof HTMLSelectElement)) return;
    const value = event.target.value;
    if (value === "system" || value === "en" || value === "zh-CN") {
      this.preference = value;
      this.error = "";
    }
  }

  private apply(): void {
    try {
      setLocalePreference(this.preference);
    } catch {
      this.error = t("settings.language.saveFailed");
      return;
    }
    this.reloadPage();
  }

  static override styles = css`
    :host { display: block; font: 400 13px/18px var(--pi-font-family, system-ui, sans-serif); }
    small { font-size: 12px; line-height: 16px; }
    strong { font-weight: 500; }
    .language-card { display: grid; gap: 14px; padding: 16px; border: 0; border-radius: 10px; background: var(--pi-surface); }
    header, label { display: grid; gap: 6px; }
    h3, p { margin: 0; }
    h3 { font-size: 14px; line-height: 20px; font-weight: 500; }
    p { color: var(--pi-muted); font-size: 14px; line-height: 20px; }
    small, label > span { color: var(--pi-muted); font-size: 12px; line-height: 16px; }
    label > span { font-size: 12px; font-weight: 500; }
    select { box-sizing: border-box; width: 100%; border: 1px solid var(--pi-border); border-radius: 8px; padding: 9px 10px; background: var(--pi-bg); color: var(--pi-text); font: var(--pi-control-font-size, 14px)/1.428571 var(--pi-control-font-family, system-ui, sans-serif); }
    .actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
    button { box-sizing: border-box; min-height: 30px; border: 0; border-radius: 6px; background: var(--pi-selection-bg); color: var(--pi-text); padding: 6px 10px; font: inherit; font-weight: 500; cursor: pointer; }
    button:not(:disabled):hover { background: var(--pi-surface-hover); }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    select:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    .error { color: var(--pi-danger); }

    @media (max-width: 760px), (pointer: coarse) {
      button, select { min-height: 44px; }
    }
  `;
}
