import { settingsDesignStyles } from "./settingsDesignStyles";
import { localizedTemplate, t } from "../../../../shared/i18n";
import { css, html, LitElement, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DEFAULT_WORKSPACE_ATTACHMENTS_FOLDER, DEFAULT_WORKSPACE_UPLOADS_FOLDER, type PiWebConfigEnvOverrides, type PiWebConfigResponse, type PiWebConfigValues } from "../../api";
import "./SettingsPanelFrame";
import type { SettingsNotice } from "./SettingsPanelFrame";
import {
  emptyGatewayServerConfigDraft,
  emptyMachineAccessConfigDraft,
  gatewayServerConfigFromDraft,
  gatewayServerDraftFromConfig,
  machineAccessConfigPatchFromDraft,
  machineAccessDraftFromConfig,
  type GatewayServerConfigDraft,
  type MachineAccessConfigDraft,
} from "./settingsConfigDraft";

function generalDescription(targetLabel: string): TemplateResult {
  return localizedTemplate("SettingsGeneralPanel.gateway_server_fields_edit_this_local_gateway.e5df6574", html)`Gateway server fields edit this local gateway. File access and upload defaults edit ${targetLabel}.`;
}

@customElement("settings-general-panel")
export class SettingsGeneralPanel extends LitElement {
  @property({ attribute: false }) configResponse: PiWebConfigResponse | undefined;
  @property({ attribute: false }) machineConfigResponse: PiWebConfigResponse | undefined;
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) machineLoading = false;
  @property({ type: Boolean }) saving = false;
  @property() error = "";
  @property() machineError = "";
  @property() savedMessage = "";
  @property() targetLabel = t("SettingsGeneralPanel.selected_machine.f48d51c1");
  @property({ attribute: false }) onReload?: () => void | Promise<void>;
  @property({ attribute: false }) onReloadMachine?: () => void | Promise<void>;
  @property({ attribute: false }) onSave?: (config: PiWebConfigValues) => void | Promise<void>;
  @property({ attribute: false }) onSaveMachineConfig?: (config: PiWebConfigValues) => void | Promise<void>;
  @state() private gatewayDraft: GatewayServerConfigDraft = emptyGatewayServerConfigDraft();
  @state() private machineDraft: MachineAccessConfigDraft = emptyMachineAccessConfigDraft();
  @state() private gatewayLocalError = "";
  @state() private machineLocalError = "";

  get hasUnsavedChanges(): boolean {
    return (this.configResponse !== undefined && JSON.stringify(this.gatewayDraft) !== JSON.stringify(gatewayServerDraftFromConfig(this.configResponse.config)))
      || (this.machineConfigResponse !== undefined && JSON.stringify(this.machineDraft) !== JSON.stringify(machineAccessDraftFromConfig(this.machineConfigResponse.config)));
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("configResponse") && this.configResponse !== undefined) {
      const previous = changed.get("configResponse");
      const next = gatewayServerDraftFromConfig(this.configResponse.config);
      if (previous === undefined || JSON.stringify(gatewayServerDraftFromConfig(previous.config)) !== JSON.stringify(next)
        || JSON.stringify(this.gatewayDraft) === JSON.stringify(gatewayServerDraftFromConfig(previous.config))) this.gatewayDraft = next;
      this.gatewayLocalError = "";
    }
    if (changed.has("machineConfigResponse") && this.machineConfigResponse !== undefined) {
      const previous = changed.get("machineConfigResponse");
      const next = machineAccessDraftFromConfig(this.machineConfigResponse.config);
      if (previous === undefined || JSON.stringify(machineAccessDraftFromConfig(previous.config)) !== JSON.stringify(next)
        || JSON.stringify(this.machineDraft) === JSON.stringify(machineAccessDraftFromConfig(previous.config))) this.machineDraft = next;
      this.machineLocalError = "";
    }
  }

  override render(): TemplateResult {
    return html`
      <settings-panel-frame
        .heading=${t("settingsLayout.connection")}
        .description=${generalDescription(this.targetLabel)}
        .actionLabel=${t("modelsSettings.reload")}
        .actionDisabled=${this.loading || this.machineLoading}
        .notices=${this.panelNotices()}
        .onAction=${() => { this.reloadAll(); }}
      >
        <div class="settings-sections">
          ${this.renderGatewayServerSettings()}
          ${this.renderSelectedMachineAccessSettings()}
        </div>
      </settings-panel-frame>
    `;
  }

  private renderGatewayServerSettings(): TemplateResult {
    const config = this.configResponse;
    return localizedTemplate("SettingsGeneralPanel.gateway_server_host_port_and_allowed_hosts.a02de7b8", html)`
      <section class="settings-card" aria-label="Gateway server settings">
        <div class="card-heading">
          <h3>Gateway server</h3>
          <p>Host, port, and allowed hosts are saved in the gateway config. Address changes require the web service to restart before the running server binds to the new address.</p>
        </div>
        ${config === undefined && this.loading ? localizedTemplate("SettingsGeneralPanel.loading_gateway_configuration.a9c580f4", html)`<div class="loading-card">Loading gateway configuration…</div>` : localizedTemplate("SettingsGeneralPanel.gateway_config_file_host_address_the_web.121b3ef5", html)`
          <div class="config-path-card">
            <span>Gateway config file</span>
            <code>${config?.path ?? t("SettingsGeneralPanel.unknown.d62169b4")}</code>
            <small>${config?.exists === true ? t("SettingsGeneralPanel.existing_file.63fefc92") : t("SettingsGeneralPanel.this_file_will_be_created_on_save.812f722e")}</small>
          </div>
          <form class="config-form" @submit=${(event: Event) => { void this.saveGatewayConfig(event); }}>
            <label class="field" data-setting-id="host">
              <span class="field-heading">
                <span>Host</span>
                ${this.renderOverrideBadge("host")}
              </span>
              <input .value=${this.gatewayDraft.host} placeholder="127.0.0.1" autocomplete="off" spellcheck="false" @input=${(event: Event) => { this.updateGatewayDraft({ host: inputValue(event) }); }}>
              <small>Address the web server should bind to. Leave empty to use PI WEB's default.</small>
            </label>

            <label class="field" data-setting-id="port">
              <span class="field-heading">
                <span>Port</span>
                ${this.renderOverrideBadge("port")}
              </span>
              <input .value=${this.gatewayDraft.port} inputmode="numeric" pattern="[0-9]*" placeholder="8504" autocomplete="off" @input=${(event: Event) => { this.updateGatewayDraft({ port: inputValue(event) }); }}>
              <small>TCP port from 1 to 65535. Leave empty to use PI WEB's default.</small>
            </label>

            <div class="field" data-setting-id="allowed-hosts">
              <span class="field-heading">
                <span>Allowed hosts</span>
                ${this.renderOverrideBadge("allowedHosts")}
              </span>
              <select .value=${this.gatewayDraft.allowedHostsMode} @change=${(event: Event) => { this.updateGatewayDraft({ allowedHostsMode: selectValue(event) === "all" ? "all" : "list" }); }}>
                <option value="list">Only listed hosts</option>
                <option value="all">Allow every host</option>
              </select>
              <textarea .value=${this.gatewayDraft.allowedHostsText} ?disabled=${this.gatewayDraft.allowedHostsMode === "all"} rows="4" placeholder="example.local&#10;192.168.1.20" spellcheck="false" @input=${(event: Event) => { this.updateGatewayDraft({ allowedHostsText: textAreaValue(event) }); }}></textarea>
              <small>Enter one host per line, or choose “Allow every host” to write <code>true</code>.</small>
            </div>

            ${this.renderGatewayEffectiveConfig()}

            <footer class="form-actions">
              <span role="status" class="save-feedback">${this.gatewayLocalError || this.error || this.savedMessage}</span>
              <button class="primary" ?disabled=${this.loading || this.saving}>${this.saving ? t("SettingsGeneralPanel.saving.3d58be6e") : t("SettingsGeneralPanel.save_gateway_server_config.93519a05")}</button>
            </footer>
          </form>
        `}
      </section>
    `;
  }

  private renderSelectedMachineAccessSettings(): TemplateResult {
    const config = this.machineConfigResponse;
    return localizedTemplate("SettingsGeneralPanel.selected_machine_file_access_and_uploads_external.7472e2ab", html)`
      <section class="settings-card" aria-label="Selected machine file access and upload settings">
        <div class="card-heading">
          <h3>Selected machine file access and uploads</h3>
          <p>External filesystem roots and upload defaults are saved on ${this.targetLabel}.</p>
        </div>
        ${this.renderMachineMessages()}
        ${config === undefined ? html`<div class="loading-card">${this.machineLoading ? t("SettingsGeneralPanel.loading_selected_machine_file_access_config.a3025dc6") : t("SettingsGeneralPanel.selected_machine_file_access_config_is_unavailable.f750567e")}</div>` : localizedTemplate("SettingsGeneralPanel.selected_machine_config_file_external_filesystem_roots.57f2e810", html)`
          <div class="config-path-card">
            <span>Selected machine config file</span>
            <code>${config.path}</code>
            <small>${config.exists ? t("SettingsGeneralPanel.existing_file.35d20e24") : t("SettingsGeneralPanel.this_file_will_be_created_on_save.c784f502")}</small>
          </div>
          <form class="config-form" @submit=${(event: Event) => { void this.saveMachineAccessConfig(event); }}>
            <label class="field" data-setting-id="paths">
              <span class="field-heading">
                <span>External filesystem roots</span>
              </span>
              <textarea .value=${this.machineDraft.allowedPathsText} rows="4" placeholder="~/SDKs&#10;/opt/reference" spellcheck="false" @input=${(event: Event) => { this.updateMachineDraft({ allowedPathsText: textAreaValue(event) }); }}></textarea>
              <small>Allowlist for absolute <code>@</code> completions and file explorer reads outside a workspace on ${this.targetLabel}. Enter one absolute path, Windows absolute path, or <code>~</code>-prefixed path per line. Leave empty to deny external paths by default.</small>
            </label>

            <label class="field" data-setting-id="uploads">
              <span class="field-heading">
                <span>Default upload folder</span>
              </span>
              <input .value=${this.machineDraft.uploadDefaultFolder} placeholder=${DEFAULT_WORKSPACE_UPLOADS_FOLDER} autocomplete="off" spellcheck="false" @input=${(event: Event) => { this.updateMachineDraft({ uploadDefaultFolder: inputValue(event) }); }}>
              <small>Workspace-relative folder for manual file uploads on ${this.targetLabel}. Leave empty to use PI WEB's default <code>${DEFAULT_WORKSPACE_UPLOADS_FOLDER}</code>.</small>
            </label>

            <label class="field" data-setting-id="attachments">
              <span class="field-heading">
                <span>Default attachments folder</span>
              </span>
              <input .value=${this.machineDraft.attachmentDefaultFolder} placeholder=${DEFAULT_WORKSPACE_ATTACHMENTS_FOLDER} autocomplete="off" spellcheck="false" @input=${(event: Event) => { this.updateMachineDraft({ attachmentDefaultFolder: inputValue(event) }); }}>
              <small>Workspace-relative folder for prompt attachments saved into the workspace on ${this.targetLabel}. Leave empty to use PI WEB's default <code>${DEFAULT_WORKSPACE_ATTACHMENTS_FOLDER}</code>.</small>
            </label>

            ${this.renderMachineEffectiveConfig()}

            <footer class="form-actions"><span role="status" class="save-feedback">${this.machineLocalError || this.machineError || this.savedMessage}</span>
              <button class="primary" ?disabled=${this.machineLoading || this.saving}>${this.saving ? t("SettingsGeneralPanel.saving.1400bac6") : t("SettingsGeneralPanel.save_file_upload_config.b04e4894")}</button>
            </footer>
          </form>
        `}
      </section>
    `;
  }

  private panelNotices(): readonly SettingsNotice[] {
    const notices: SettingsNotice[] = [];
    const gatewayError = this.gatewayLocalError || this.error;
    if (gatewayError !== "") notices.push({ type: "error", title: t("SettingsGeneralPanel.configuration.ad4668a0"), content: gatewayError });
    if (this.savedMessage !== "") notices.push({ type: "success", content: this.savedMessage });
    return notices;
  }

  private renderMachineMessages(): TemplateResult | null {
    const error = this.machineLocalError || this.machineError;
    if (error === "") return null;
    return html`<div class="message error-message">${error}</div>`;
  }

  private renderOverrideBadge(key: keyof PiWebConfigEnvOverrides): TemplateResult | null {
    if (this.configResponse?.envOverrides[key] !== true) return null;
    return localizedTemplate("SettingsGeneralPanel.environment_override.3e11246f", html)`<span class="override-badge">environment override</span>`;
  }

  private renderGatewayEffectiveConfig(): TemplateResult {
    const effective = this.configResponse?.effectiveConfig ?? {};
    return localizedTemplate("SettingsGeneralPanel.effective_gateway_settings_after_environment_overrides_.3ab30f3a", html)`
      <section class="effective-card" aria-label="Effective gateway configuration summary">
        <h3>Effective gateway settings after environment overrides</h3>
        <dl>
          <div><dt>Host</dt><dd>${effective.host ?? localizedTemplate("SettingsGeneralPanel.default.f3cfac0c", html)`<span class="muted">127.0.0.1 default</span>`}</dd></div>
          <div><dt>Port</dt><dd>${effective.port ?? localizedTemplate("SettingsGeneralPanel.default.142f3482", html)`<span class="muted">8504 default</span>`}</dd></div>
          <div><dt>Allowed hosts</dt><dd>${formatAllowedHosts(effective.allowedHosts)}</dd></div>
        </dl>
      </section>
    `;
  }

  private renderMachineEffectiveConfig(): TemplateResult {
    const effective = this.machineConfigResponse?.effectiveConfig ?? {};
    return localizedTemplate("SettingsGeneralPanel.effective_selected_machine_settings_external_roots_uplo.36130e7a", html)`
      <section class="effective-card" aria-label="Effective selected machine file access and upload summary">
        <h3>Effective selected-machine settings</h3>
        <dl>
          <div><dt>External roots</dt><dd>${formatAllowedPaths(effective.pathAccess?.allowedPaths)}</dd></div>
          <div><dt>Upload folder</dt><dd>${effective.uploads?.defaultFolder ?? localizedTemplate("SettingsGeneralPanel.default.8f219ece", html)`<span class="muted">${DEFAULT_WORKSPACE_UPLOADS_FOLDER} default</span>`}</dd></div>
          <div><dt>Attachments folder</dt><dd>${effective.attachments?.defaultFolder ?? localizedTemplate("SettingsGeneralPanel.default.fca107f1", html)`<span class="muted">${DEFAULT_WORKSPACE_ATTACHMENTS_FOLDER} default</span>`}</dd></div>
        </dl>
      </section>
    `;
  }

  private reloadAll(): void {
    if (this.hasUnsavedChanges && !window.confirm(t("settingsDraft.reload"))) return;
    if (this.configResponse !== undefined) this.gatewayDraft = gatewayServerDraftFromConfig(this.configResponse.config);
    if (this.machineConfigResponse !== undefined) this.machineDraft = machineAccessDraftFromConfig(this.machineConfigResponse.config);
    void this.onReload?.();
    void this.onReloadMachine?.();
  }

  private async saveGatewayConfig(event: Event): Promise<void> {
    event.preventDefault();
    this.gatewayLocalError = "";
    try {
      await this.onSave?.(gatewayServerConfigFromDraft(this.gatewayDraft, this.configResponse?.config ?? {}));
    } catch (error) {
      this.gatewayLocalError = errorMessage(error);
    }
  }

  private async saveMachineAccessConfig(event: Event): Promise<void> {
    event.preventDefault();
    this.machineLocalError = "";
    try {
      await this.onSaveMachineConfig?.(machineAccessConfigPatchFromDraft(this.machineDraft));
    } catch (error) {
      this.machineLocalError = errorMessage(error);
    }
  }

  private updateGatewayDraft(patch: Partial<GatewayServerConfigDraft>): void {
    this.gatewayDraft = { ...this.gatewayDraft, ...patch };
    this.gatewayLocalError = "";
  }

  private updateMachineDraft(patch: Partial<MachineAccessConfigDraft>): void {
    this.machineDraft = { ...this.machineDraft, ...patch };
    this.machineLocalError = "";
  }

  static override styles = [css`
    :host { display: block; font: var(--pi-font-weight-regular, 360) 13px/18px var(--pi-font-family, system-ui, sans-serif); }
    small { font-size: 12px; line-height: 16px; }
    strong { font-weight: var(--pi-font-weight-medium, 460); }
    .card-heading { display: grid; gap: 6px; min-width: 0; }
    h3, p { margin: 0; }
    h3 { font-size: 14px; line-height: 20px; font-weight: var(--pi-font-weight-medium, 460); }
    p { color: var(--pi-muted); font-size: 14px; line-height: 20px; }
    button, input, select, textarea { font: inherit; }
    button { box-sizing: border-box; min-height: 30px; border: 0; border-radius: 6px; background: transparent; color: var(--pi-text); padding: 6px 10px; font: inherit; cursor: pointer; }
    button:not(:disabled):hover { background: var(--pi-surface-hover); }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    button:disabled { opacity: .55; cursor: not-allowed; }
    .settings-sections { display: grid; gap: 14px; }
    .settings-card, .message, .loading-card, .config-path-card, .effective-card { border: 0; border-radius: 10px; background: var(--pi-surface); padding: 12px; }
    .settings-card { display: grid; gap: 14px; }
    .message { margin-bottom: 12px; }
    .settings-card .message { margin-bottom: 0; }
    .error-message { color: var(--pi-danger); background: color-mix(in srgb, var(--pi-danger) 10%, var(--pi-surface)); }
    .loading-card { color: var(--pi-muted); }
    .config-path-card { display: grid; gap: 5px; }
    .config-path-card span, .field-heading, dt { color: var(--pi-muted); font-size: 12px; font-weight: var(--pi-font-weight-medium, 460); }
    code { border: 0; border-radius: 5px; background: var(--pi-bg); padding: 1px 4px; color: var(--pi-text); font: var(--pi-font-weight-regular, 360) 12px/17.5px var(--pi-font-monospace, ui-monospace, monospace); overflow-wrap: anywhere; }
    .config-path-card small, .field small { color: var(--pi-muted); }
    .config-form { display: grid; gap: 14px; }
    .field { display: grid; gap: 7px; }
    .field-heading { display: flex; align-items: center; gap: 8px; }
    input, select, textarea { box-sizing: border-box; width: 100%; min-width: 0; border: 1px solid var(--pi-border); border-radius: 8px; background: var(--pi-bg); color: var(--pi-text); padding: 9px 10px; outline: none; font: var(--pi-font-weight-regular, 360) var(--pi-control-font-size, 14px)/1.428571 var(--pi-control-font-family, system-ui, sans-serif); }
    input:focus, select:focus, textarea:focus { border-color: var(--pi-accent); box-shadow: 0 0 0 1px var(--pi-accent-border); }
    textarea { resize: vertical; min-height: 94px; font-family: var(--pi-control-monospace-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace); }
    textarea:disabled { opacity: .55; }
    .override-badge { border: 0; border-radius: 999px; color: var(--pi-warning); background: var(--pi-warning-surface); padding: 2px 7px; font-size: 12px; font-weight: var(--pi-font-weight-medium, 460); }
    .effective-card { display: grid; gap: 10px; }
    .effective-card dl { display: grid; gap: 8px; margin: 0; }
    .effective-card dl > div { display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 12px; align-items: baseline; }
    dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
    .muted { color: var(--pi-muted); }
    .form-actions { position: sticky; bottom: -18px; display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; padding: 10px 0; background: var(--pi-surface); }
    .save-feedback { flex: 1 1 180px; min-width: 0; overflow-wrap: anywhere; }
    .primary { background: var(--pi-selection-bg); color: var(--pi-text-bright); font-weight: var(--pi-font-weight-medium, 460); }

    @media (max-width: 760px) {
      .effective-card dl > div { grid-template-columns: minmax(0, 1fr); gap: 3px; }
    }

    @media (max-width: 760px), (pointer: coarse) {
      button, input, select { min-height: 44px; }
      .toggle { box-sizing: border-box; min-height: 44px; }
    }
  `, settingsDesignStyles];
}

function formatAllowedHosts(value: PiWebConfigValues["allowedHosts"]): string | TemplateResult {
  if (value === true) return t("SettingsGeneralPanel.any_host.5d5e668d");
  if (Array.isArray(value)) return value.length === 0 ? localizedTemplate("SettingsGeneralPanel.none_listed.d3249ccc", html)`<span class="muted">None listed</span>` : value.join(", ");
  return localizedTemplate("SettingsGeneralPanel.unset.dfc13475", html)`<span class="muted">Unset</span>`;
}

function formatAllowedPaths(value: string[] | undefined): string | TemplateResult {
  if (value === undefined || value.length === 0) return localizedTemplate("SettingsGeneralPanel.external_paths_denied.1d220948", html)`<span class="muted">External paths denied</span>`;
  return value.join(", ");
}

function inputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : "";
}

function selectValue(event: Event): string {
  return event.target instanceof HTMLSelectElement ? event.target.value : "";
}

function textAreaValue(event: Event): string {
  return event.target instanceof HTMLTextAreaElement ? event.target.value : "";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
