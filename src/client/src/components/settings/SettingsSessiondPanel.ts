import { settingsDesignStyles } from "./settingsDesignStyles";
import { localizedTemplate, localizedText, t } from "../../../../shared/i18n";
import { css, html, LitElement, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { PiWebConfigResponse, PiWebConfigValues } from "../../api";
import "./SettingsPanelFrame";
import type { SettingsNotice } from "./SettingsPanelFrame";
import { askUserConfigPatch, spawnSessionsConfigPatch, subsessionsConfigPatch } from "./settingsSessiondConfig";

@customElement("settings-sessiond-panel")
export class SettingsSessiondPanel extends LitElement {
  @property({ attribute: false }) configResponse: PiWebConfigResponse | undefined;
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) saving = false;
  @property() error = "";
  @property() savedMessage = "";
  @property() targetLabel = t("SettingsSessiondPanel.local_local_gateway.27222439");
  @property({ attribute: false }) onReload?: () => void | Promise<void>;
  @property({ attribute: false }) onSave?: (config: PiWebConfigValues) => void | Promise<void>;

  override render(): TemplateResult {
    const config = this.configResponse;
    const spawnOverridden = config?.envOverrides.spawnSessions === true;
    // On by default: the effective config is the source of truth for the toggle
    // state, so an unset config file still shows the feature as enabled.
    const effectiveSpawn = config?.effectiveConfig.spawnSessions !== false;
    const subsessionsOverridden = config?.envOverrides.subsessions === true;
    // On by default; also requires spawn to be enabled.
    const effectiveSubsessions = config?.effectiveConfig.subsessions === true && effectiveSpawn;
    const askUserOverridden = config?.envOverrides.askUser === true;
    const effectiveAskUser = config?.effectiveConfig.askUser === true;
    return localizedTemplate("SettingsSessiondPanel.template.26f9a698", html)`
      <settings-panel-frame
        heading="Session daemon"
        .description=${sessiondDescription(this.targetLabel)}
        actionLabel="Reload"
        .actionDisabled=${this.loading}
        .notices=${this.panelNotices()}
        .onAction=${this.onReload}
      >
        ${config === undefined ? this.renderUnavailableConfigState() : localizedTemplate("SettingsSessiondPanel.config_file_allow_agents_to_start_sessions.534620de", html)`
          <div class="config-path-card">
            <span>Config file</span>
            <code>${config.path}</code>
          </div>
          <div class="field">
            <span class="field-heading">
              <span>Allow agents to start sessions</span>
              ${spawnOverridden ? localizedTemplate("SettingsSessiondPanel.environment_override.d2ca5df0", html)`<span class="override-badge">environment override</span>` : null}
            </span>
            <label class="toggle">
              <input
                type="checkbox"
                .checked=${effectiveSpawn}
                ?disabled=${this.loading || this.saving || spawnOverridden}
                @change=${(event: Event) => { void this.toggleSpawnSessions(event); }}
              >
              <span>Enable the <code>spawn_session</code> tool</span>
            </label>
            <small>When enabled, LLMs can start new sessions, constrained to a workspace (any worktree) of the same registered project so every spawned session stays visible here. On by default.</small>
          </div>
          <div class="field">
            <span class="field-heading">
              <span>Allow agents to start tracked subsessions</span>
              ${subsessionsOverridden ? localizedTemplate("SettingsSessiondPanel.environment_override.e3b11162", html)`<span class="override-badge">environment override</span>` : null}
            </span>
            <label class="toggle">
              <input
                type="checkbox"
                .checked=${effectiveSubsessions}
                ?disabled=${this.loading || this.saving || subsessionsOverridden || !effectiveSpawn}
                @change=${(event: Event) => { void this.toggleSubsessions(event); }}
              >
              <span>Enable the <code>spawn_subsession</code> tools</span>
            </label>
            <small>Agents can start child sessions they stay attached to (<code>spawn_subsession</code>, <code>list_subsessions</code>, <code>check_subsession</code>, <code>read_subsession</code>) and are notified when a child finishes. Requires "Allow agents to start sessions". On by default.</small>
          </div>
          <div class="field">
            <span class="field-heading">
              <span>Allow agents to ask questions</span>
              ${askUserOverridden ? localizedTemplate("SettingsSessiondPanel.environment_override.dc37fc31", html)`<span class="override-badge">environment override</span>` : null}
            </span>
            <label class="toggle">
              <input
                type="checkbox"
                aria-label="Enable Ask Questions"
                .checked=${effectiveAskUser}
                ?disabled=${this.loading || this.saving || askUserOverridden}
                @change=${(event: Event) => { void this.toggleAskUser(event); }}
              >
              <span>Enable the <code>ask_user</code> tool</span>
            </label>
            <small>Agents can post a structured question form and pause until the user responds. On by default.</small>
          </div>
          <section class="effective-card" aria-label="Desired session daemon configuration summary">
            <h3>Desired after environment overrides</h3>
            <dl>
              <div><dt>Spawn sessions</dt><dd>${effectiveSpawn ? t("SettingsSessiondPanel.enabled.68bcbbec") : localizedTemplate("SettingsSessiondPanel.disabled.ef648582", html)`<span class="muted">Disabled</span>`}</dd></div>
              <div><dt>Subsessions</dt><dd>${effectiveSubsessions ? t("SettingsSessiondPanel.enabled.8c68f207") : localizedTemplate("SettingsSessiondPanel.disabled.2f767cdd", html)`<span class="muted">Disabled</span>`}</dd></div>
              <div><dt>Ask questions</dt><dd>${effectiveAskUser ? t("SettingsSessiondPanel.enabled.61d53259") : localizedTemplate("SettingsSessiondPanel.disabled.2854ff8e", html)`<span class="muted">Disabled</span>`}</dd></div>
            </dl>
          </section>
        `}
      </settings-panel-frame>
    `;
  }

  private panelNotices(): readonly SettingsNotice[] {
    return sessiondPanelNotices({
      error: this.error,
      savedMessage: this.savedMessage,
    });
  }

  private renderUnavailableConfigState(): TemplateResult {
    return html`<div class="loading-card">${this.loading ? t("SettingsSessiondPanel.loading_configuration.8f0bd4b6") : t("SettingsSessiondPanel.configuration_is_unavailable_reload_to_try_again.f9b662a8")}</div>`;
  }

  private async toggleSpawnSessions(event: Event): Promise<void> {
    const enabled = event.target instanceof HTMLInputElement && event.target.checked;
    await this.onSave?.(spawnSessionsConfigPatch(enabled));
  }

  private async toggleSubsessions(event: Event): Promise<void> {
    const enabled = event.target instanceof HTMLInputElement && event.target.checked;
    await this.onSave?.(subsessionsConfigPatch(enabled));
  }

  private async toggleAskUser(event: Event): Promise<void> {
    const enabled = event.target instanceof HTMLInputElement && event.target.checked;
    await this.onSave?.(askUserConfigPatch(enabled));
  }

  static override styles = [css`
    :host { display: block; font: var(--pi-font-weight-regular, 360) 13px/18px var(--pi-font-family, system-ui, sans-serif); }
    small { font-size: 12px; line-height: 16px; }
    strong { font-weight: var(--pi-font-weight-medium, 460); }
    h3 { margin: 0; font-size: 14px; line-height: 20px; font-weight: var(--pi-font-weight-medium, 460); }
    .loading-card, .config-path-card, .effective-card { border: 0; border-radius: 10px; background: var(--pi-surface); padding: 12px; }
    .loading-card { color: var(--pi-muted); }
    .config-path-card { display: grid; gap: 5px; }
    .config-path-card span, .field-heading, dt { color: var(--pi-muted); font-size: 12px; font-weight: var(--pi-font-weight-medium, 460); }
    code { border: 0; border-radius: 5px; background: var(--pi-bg); padding: 1px 4px; color: var(--pi-text); font: var(--pi-font-weight-regular, 360) 12px/17.5px var(--pi-font-monospace, ui-monospace, monospace); overflow-wrap: anywhere; }
    .field { display: grid; gap: 7px; }
    .field small { color: var(--pi-muted); line-height: 16px; }
    .field-heading { display: flex; align-items: center; gap: 8px; }
    .toggle { display: flex; align-items: center; gap: 9px; cursor: pointer; }
    .toggle input { width: 16px; height: 16px; accent-color: var(--pi-accent); }
    .toggle input:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    .toggle input:disabled { cursor: not-allowed; }
    .override-badge { border: 0; border-radius: 999px; color: var(--pi-warning); background: var(--pi-warning-surface); padding: 2px 7px; font-size: 12px; font-weight: var(--pi-font-weight-medium, 460); }
    .effective-card { display: grid; gap: 10px; }
    .effective-card dl { display: grid; gap: 8px; margin: 0; }
    .effective-card dl > div { display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 12px; align-items: baseline; }
    dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
    .muted { color: var(--pi-muted); }

    @media (max-width: 760px) {
      .effective-card dl > div { grid-template-columns: minmax(0, 1fr); gap: 3px; }
    }

    @media (max-width: 760px), (pointer: coarse) {
      .toggle { box-sizing: border-box; min-height: 44px; }
    }
  `, settingsDesignStyles];
}

export function sessiondDescription(targetLabel: string): string {
  return localizedText("SettingsSessiondPanel.agent_tool_capabilities_for_sessions_on_changes.b540a794")`Agent tool capabilities for sessions on ${targetLabel}. Changes are saved immediately but only take effect after the session daemon on that machine restarts.`;
}

export interface SessiondPanelNoticeContext {
  readonly error: string;
  readonly savedMessage: string;
}

/**
 * Compute the session-daemon panel's notice stack (error, then saved
 * confirmation) as a pure, publicly testable seam so tests assert the dynamic
 * notice logic and ordering here instead of scraping rendered `TemplateResult`
 * internals.
 */
export function sessiondPanelNotices(context: SessiondPanelNoticeContext): readonly SettingsNotice[] {
  const notices: SettingsNotice[] = [];
  if (context.error !== "") notices.push({ type: "error", content: context.error });
  if (context.savedMessage !== "") notices.push({ type: "success", content: context.savedMessage });
  return notices;
}
