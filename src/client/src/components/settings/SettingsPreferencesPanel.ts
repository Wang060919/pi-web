import { settingsDesignStyles } from "./settingsDesignStyles";
import { t } from "../../../../shared/i18n";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./SettingsPanelFrame";

@customElement("settings-preferences-panel")
export class SettingsPreferencesPanel extends LitElement {
  @property() error = "";
  @property() savedMessage = "";

  override render() {
    return html`<settings-panel-frame
      .heading=${t("settingsLayout.preferences")}
      .description=${t("settingsLayout.preferencesDescription")}
      .notices=${[
        ...(this.error === "" ? [] : [{ type: "error" as const, content: this.error }]),
        ...(this.savedMessage === "" ? [] : [{ type: "success" as const, content: this.savedMessage }]),
      ]}
    ><div class="preferences"><slot></slot></div></settings-panel-frame>`;
  }
  static override styles = [css`
    :host { display: block; }
    .preferences { display: grid; gap: 24px; }
    slot { display: contents; }
  `, settingsDesignStyles];
}
