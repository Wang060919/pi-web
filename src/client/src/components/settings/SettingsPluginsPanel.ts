import { settingsDesignStyles } from "./settingsDesignStyles";
import { localizedTemplate, localizedText, t } from "../../../../shared/i18n";
import { css, html, LitElement, nothing, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { PiWebConfigResponse, PiWebPluginInfo, PiWebPluginsResponse } from "../../api";
import { PI_WEB_PLUGIN_RECOVERY_COMMANDS } from "../../../../shared/pluginRecoveryCommands";
import { REQUIRED_TERMINAL_PLUGIN_ID } from "../../../../shared/requiredTerminalPlugin";
import "./SettingsPanelFrame";
import type { SettingsNotice } from "./SettingsPanelFrame";

export type SettingsPluginRow = PiWebPluginInfo & { configOnly: boolean; editable: boolean };

@customElement("settings-plugins-panel")
export class SettingsPluginsPanel extends LitElement {
  @property({ attribute: false }) pluginsResponse: PiWebPluginsResponse | undefined;
  @property({ attribute: false }) configResponse: PiWebConfigResponse | undefined;
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) saving = false;
  @property({ type: Boolean }) recoveryCommandsSupported = false;
  @property() error = "";
  @property() savedMessage = "";
  @property() targetLabel = t("SettingsPluginsPanel.local_local_gateway.6922d7cd");
  @property({ attribute: false }) onReload?: () => void | Promise<void>;
  @property({ attribute: false }) onTogglePlugin?: (pluginId: string, enabled: boolean) => void | Promise<void>;

  override render(): TemplateResult {
    const plugins = settingsPluginRows(this.pluginsResponse, this.configResponse);
    const hasPluginResponse = this.pluginsResponse !== undefined;
    return localizedTemplate("SettingsPluginsPanel.template.1bd39169", html)`
      <settings-panel-frame
        heading="PI WEB plugins"
        .description=${pluginsDescription(this.targetLabel)}
        actionLabel="Reload"
        actionTitle=${localizedText("SettingsPluginsPanel.reload_pi_web_plugins_from.84fccec3")`Reload PI WEB plugins from ${this.targetLabel}`}
        .actionDisabled=${this.loading}
        .notices=${this.panelNotices(plugins.length > 0)}
        .onAction=${this.onReload}
      >
        ${this.renderPanelContent(plugins, hasPluginResponse)}
      </settings-panel-frame>
    `;
  }

  private panelNotices(showTrustedCodeWarning: boolean): readonly SettingsNotice[] {
    const notices: SettingsNotice[] = [];
    if (this.error !== "") notices.push({ type: "error", content: this.error });
    if (this.shouldShowConfigUnavailableNotice(showTrustedCodeWarning)) {
      notices.push({ type: "availability", content: t("SettingsPluginsPanel.configuration_is_unavailable_reload_to_try_again.ed4a963a") });
    }
    if (this.savedMessage !== "") notices.push({ type: "success", content: this.savedNotice() });

    const runtime = this.pluginsResponse?.serverRuntime;
    if (runtime?.status === "unavailable") {
      notices.push({
        type: "availability",
        title: t("SettingsPluginsPanel.active_server_plugin_state_unavailable.89728d5b"),
        content: localizedTemplate("SettingsPluginsPanel.desired_config_remains_editable_but_pi_web.fa683815", html)`Desired config remains editable, but PI WEB cannot verify the sessiond snapshot. ${runtime.message ?? t("SettingsPluginsPanel.restart_or_reconnect_sessiond_then_reload.300841ed")}`,
      });
    } else if (runtime?.status === "incompatible") {
      notices.push({
        type: "error",
        title: t("SettingsPluginsPanel.plugin_lifecycle_version_mismatch.75c29359"),
        content: localizedTemplate("SettingsPluginsPanel.update_and_restart_both_components_before_loading.f849e683", html)`${runtime.message ?? t("SettingsPluginsPanel.the_web_process_and_session_daemon_do.b30c3b0e")} Update and restart both components before loading server-backed browser plugins.`,
      });
    }
    if (runtime?.safeStart !== undefined) {
      notices.push({
        type: "warning",
        title: t("SettingsPluginsPanel.server_plugin_safe_mode_active.c12306c4"),
        content: runtime.safeStart === "bundled-only"
          ? localizedTemplate("SettingsPluginsPanel.only_bundled_server_plugins_were_imported_clear.afb7f9e0", html)`Only bundled server plugins were imported. Clear safe mode with <code>${runtime.recovery.clearSafeStart}</code>.`
          : localizedTemplate("SettingsPluginsPanel.no_server_plugins_were_imported_terminal_is.fec84120", html)`No server plugins were imported; Terminal is unavailable and the kernel folder workspace remains available for diagnosis. Clear safe mode with <code>${runtime.recovery.clearSafeStart}</code>.`,
      });
    }
    if (runtime?.desiredSafeStart !== undefined && runtime.desiredSafeStart !== (runtime.safeStart ?? "off")) {
      notices.push({
        type: "warning",
        title: t("SettingsPluginsPanel.safe_mode_restart_pending.d4446364"),
        content: runtime.desiredSafeStart === "off"
          ? t("SettingsPluginsPanel.safe_start_is_cleared_in_offline_config.2cf124fe")
          : localizedText("SettingsPluginsPanel.offline_config_requests_safe_start_it_takes.b095a6fb")`Offline config requests ${safeStartLabel(runtime.desiredSafeStart)} safe start. It takes effect before plugin import on the next sessiond restart.`,
      });
    }
    if (runtime?.restartRequired === true) {
      notices.push({
        type: "warning",
        title: t("SettingsPluginsPanel.session_daemon_restart_required.42f5a58e"),
        content: t("SettingsPluginsPanel.desired_plugin_config_or_package_revisions_differ.5f7bf868"),
      });
    }
    for (const diagnostic of this.pluginsResponse?.diagnostics ?? []) {
      notices.push({
        type: diagnostic.kind === "conflict" ? "error" : "warning",
        title: diagnostic.kind === "conflict" ? t("SettingsPluginsPanel.plugin_id_conflict.44a30f61") : t("SettingsPluginsPanel.plugin_discovery_diagnostic.c383e76d"),
        content: `${diagnostic.snapshot === "active" ? t("SettingsPluginsPanel.active_snapshot.c6863fb2") : t("SettingsPluginsPanel.desired_catalog.7043f553")}: ${diagnostic.message}`,
      });
    }
    if (showTrustedCodeWarning) {
      notices.push({
        type: "security",
        content: localizedTemplate("SettingsPluginsPanel.trusted_code_warning_pi_web_plugins_and.d623b69a", html)`<strong>Trusted code warning:</strong> PI WEB plugins and Pi packages can run with your user permissions. Enable plugins only from sources you trust.`,
      });
    }
    return notices;
  }

  private savedNotice(): string {
    if (this.pluginsResponse?.serverRuntime.status !== "available" || this.pluginsResponse.serverRuntime.restartRequired) {
      return localizedText("SettingsPluginsPanel.restart_the_session_daemon_to_apply_server.344d2294")`${this.savedMessage} Restart the session daemon to apply server-plugin changes; browser-only changes apply after reloading this tab.`;
    }
    return localizedText("SettingsPluginsPanel.reload_the_browser_tab_to_apply_browser.88cc67a7")`${this.savedMessage} Reload the browser tab to apply browser-only plugin changes.`;
  }

  private shouldShowConfigUnavailableNotice(hasLoadedPlugins: boolean): boolean {
    return hasLoadedPlugins && this.configResponse === undefined && !this.loading && this.error === "";
  }

  private renderPanelContent(plugins: SettingsPluginRow[], hasPluginResponse: boolean): TemplateResult {
    if (!hasPluginResponse && plugins.length === 0) {
      return html`
        <div class="loading-card">${this.loading ? t("SettingsPluginsPanel.loading_pi_web_plugins.4494aff0") : localizedText("SettingsPluginsPanel.pi_web_plugin_list_unavailable_for_use.316fb92c")`PI WEB plugin list unavailable for ${this.targetLabel}. Use Reload to try again.`}</div>
        ${this.renderRecoveryCommands()}
      `;
    }
    if (plugins.length === 0) {
      return localizedTemplate("SettingsPluginsPanel.no_pi_web_plugins_are_discovered_or.8c52e9e7", html)`
        <div class="loading-card">No PI WEB plugins are discovered or active on ${this.targetLabel}.</div>
        ${this.renderRecoveryCommands()}
      `;
    }
    return localizedTemplate("SettingsPluginsPanel.config_key_on_plugins_browser_only_changes.72f081f5", html)`
      <div class="plugin-note">Config key on ${this.targetLabel}: <code>plugins</code>. Browser-only changes apply after a tab reload; server-backed changes follow sessiond's startup snapshot and can require a manual restart.</div>
      <div class="plugin-list">
        ${plugins.map((plugin) => this.renderPlugin(plugin))}
      </div>
      ${this.renderRecoveryCommands()}
    `;
  }

  private renderPlugin(plugin: SettingsPluginRow): TemplateResult {
    const configured = this.configResponse?.config.plugins?.[plugin.id];
    const configuredState = plugin.required === true
      ? t("SettingsPluginsPanel.required_ordinary_config_cannot_disable.b755b692")
      : !plugin.discovered && configured === undefined
        ? t("SettingsPluginsPanel.desired_package_config_absent.452bd625")
        : configured?.enabled === false ? t("SettingsPluginsPanel.config_disabled.6c15bc5a") : configured?.enabled === true ? t("SettingsPluginsPanel.config_enabled.2e14a829") : t("SettingsPluginsPanel.default_enabled.fb4224b7");
    return html`
      <article class=${`plugin-card${plugin.enabled ? "" : " disabled"}`} data-setting-id=${`plugin-${encodeURIComponent(plugin.id)}`}>
        <div class="plugin-main">
          <strong>${plugin.id}</strong>
          <small>${plugin.configOnly ? t("SettingsPluginsPanel.configured_only_package_not_discovered.b48e308b") : `${plugin.source} · ${pluginScopeLabel(plugin.scope)}${plugin.machineSpecific ? t("SettingsPluginsPanel.machine_specific.8fbefaec") : ""}${plugin.required === true ? t("SettingsPluginsPanel.required.fbe1d01e") : ""}${plugin.discovered ? "" : t("SettingsPluginsPanel.active_snapshot_only.3055b694")}`}</small>
          <small>${configuredState}</small>
          ${this.renderPluginStatuses(plugin)}
          ${plugin.server?.message === undefined ? nothing : html`<small class="diagnostic">${plugin.server.message}</small>`}
          ${plugin.server?.health?.message === undefined ? nothing : localizedTemplate("SettingsPluginsPanel.health.73907ae8", html)`<small class="diagnostic">Health: ${plugin.server.health.message}</small>`}
          ${plugin.server === undefined || plugin.required === true ? nothing : localizedTemplate("SettingsPluginsPanel.offline_disable.a4a00e47", html)`<small class="command">Offline disable: <code>${plugin.server.disableCommand}</code></small>`}
        </div>
        <label class="toggle">
          <input type="checkbox" .checked=${plugin.enabled} ?disabled=${this.saving || this.configResponse === undefined || !plugin.editable} @change=${(event: Event) => { void this.togglePlugin(plugin, event); }}>
          <span>${plugin.required === true ? t("SettingsPluginsPanel.required.38c8fe5f") : t("SettingsPluginsPanel.enabled.9e15adff")}</span>
        </label>
      </article>
    `;
  }

  private renderPluginStatuses(plugin: SettingsPluginRow): TemplateResult {
    const server = plugin.server;
    return html`
      <div class="status-list" aria-label=${localizedText("SettingsPluginsPanel.plugin_states.87101fec")`${plugin.id} plugin states`}>
        ${server === undefined ? html`<span class="status neutral">${plugin.configOnly ? t("SettingsPluginsPanel.configured_only.72723347") : t("SettingsPluginsPanel.browser_only.c8637591")}</span>` : html`<span class=${`status ${serverStateTone(server.state)}`}>${serverStateLabel(server.state)}</span>`}
        ${plugin.conflict ? localizedTemplate("SettingsPluginsPanel.conflict.87ff0f61", html)`<span class="status error">Conflict</span>` : nothing}
        ${server?.staleRevision === true ? localizedTemplate("SettingsPluginsPanel.stale_revision.9dabd467", html)`<span class="status warning">Stale revision</span>` : nothing}
        ${server?.restartRequired === true ? localizedTemplate("SettingsPluginsPanel.restart_required.9d3aad82", html)`<span class="status warning">Restart required</span>` : nothing}
        ${server?.health === undefined ? nothing : localizedTemplate("SettingsPluginsPanel.health.6f222265", html)`<span class=${`status ${healthTone(server.health.status)}`}>Health ${healthLabel(server.health.status)}</span>`}
      </div>
    `;
  }

  private renderRecoveryCommands(): TemplateResult | typeof nothing {
    const runtime = this.pluginsResponse?.serverRuntime;
    const responseRecovery = runtime?.status === "incompatible" && !this.recoveryCommandsSupported ? undefined : runtime?.recovery;
    const recovery = responseRecovery ?? (this.recoveryCommandsSupported ? PI_WEB_PLUGIN_RECOVERY_COMMANDS : undefined);
    if (recovery === undefined) return nothing;
    return localizedTemplate("SettingsPluginsPanel.offline_recovery_on_these_commands_edit_config.b7f2fef0", html)`
      <aside class="recovery" aria-label="Offline server-plugin recovery commands">
        <strong>Offline recovery on ${this.targetLabel}</strong>
        <small>These commands edit config without contacting sessiond or importing plugins. They never include machine credentials.</small>
        <code>${recovery.showSafeStart}</code>
        <code>${recovery.bundledOnly}</code>
        <code>${recovery.noServerPlugins}</code>
        <code>${recovery.clearSafeStart}</code>
      </aside>
    `;
  }

  private async togglePlugin(plugin: SettingsPluginRow, event: Event): Promise<void> {
    const enabled = event.target instanceof HTMLInputElement ? event.target.checked : plugin.enabled;
    await this.onTogglePlugin?.(plugin.id, enabled);
  }

  static override styles = [css`
    :host { display: block; font: var(--pi-font-weight-regular, 360) 13px/18px var(--pi-font-family, system-ui, sans-serif); }
    small { font-size: 12px; line-height: 16px; }
    strong { font-weight: var(--pi-font-weight-medium, 460); }
    input { font: inherit; }
    input:disabled { opacity: .55; cursor: not-allowed; }
    .loading-card, .plugin-note, .plugin-card, .recovery { border: 0; border-radius: 10px; background: var(--pi-surface); padding: 12px; }
    .loading-card, .plugin-note { color: var(--pi-muted); }
    code { border: 0; border-radius: 5px; background: var(--pi-bg); padding: 1px 4px; color: var(--pi-text); font: var(--pi-font-weight-regular, 360) 12px/17.5px var(--pi-font-monospace, ui-monospace, monospace); overflow-wrap: anywhere; }
    .plugin-list { display: grid; gap: 10px; }
    .plugin-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; }
    .plugin-card.disabled { opacity: .8; }
    .plugin-main { min-width: 0; display: grid; gap: 5px; }
    .plugin-main > strong, .plugin-main > small:not(.command) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .plugin-main small { color: var(--pi-muted); }
    .diagnostic { color: var(--pi-text) !important; }
    .command { line-height: 1.5; }
    .status-list { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 2px; }
    .status { border: 0; background: color-mix(in srgb, var(--pi-text) 8%, transparent); border-radius: 999px; padding: 2px 7px; color: var(--pi-muted); font-size: 12px; line-height: 16px; }
    .status.success { color: var(--pi-success); background: var(--pi-success-surface); }
    .status.warning { color: var(--pi-text); background: var(--pi-warning-surface); }
    .status.error { color: var(--pi-danger); background: color-mix(in srgb, var(--pi-danger) 10%, var(--pi-surface)); }
    .toggle { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; }
    .toggle input { width: 18px; height: 18px; accent-color: var(--pi-accent); }
    .toggle input:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    .recovery { display: grid; gap: 7px; }
    .recovery small { color: var(--pi-muted); line-height: 16px; }
    .recovery code { display: block; width: fit-content; max-width: 100%; }

    @media (max-width: 760px) {
      .plugin-card { grid-template-columns: minmax(0, 1fr); align-items: start; }
      .toggle { justify-self: start; }
    }

    @media (max-width: 760px), (pointer: coarse) {
      .toggle { box-sizing: border-box; min-height: 44px; }
    }
  `, settingsDesignStyles];
}

export function settingsPluginRows(
  response: PiWebPluginsResponse | undefined,
  config: PiWebConfigResponse | undefined,
): SettingsPluginRow[] {
  const configuredPlugins = config?.config.plugins ?? {};
  const rows = (response?.plugins ?? []).map((plugin): SettingsPluginRow => {
    const configured = configuredPlugins[plugin.id];
    const enabled = plugin.required === true ? true : configured?.enabled ?? plugin.enabled;
    return {
      ...plugin,
      enabled,
      configOnly: false,
      editable: plugin.required !== true && (plugin.discovered || configured !== undefined),
    };
  });
  const knownIds = new Set(rows.map(({ id }) => id));
  for (const [id, configured] of Object.entries(configuredPlugins)) {
    if (knownIds.has(id)) continue;
    const required = id === REQUIRED_TERMINAL_PLUGIN_ID;
    rows.push({
      id,
      ...(required ? { required: true as const } : {}),
      source: "config",
      scope: "local",
      machineSpecific: false,
      enabled: required || configured.enabled !== false,
      discovered: false,
      conflict: false,
      configOnly: true,
      editable: !required,
    });
  }
  return rows.sort((left, right) => left.id.localeCompare(right.id));
}

function serverStateLabel(state: NonNullable<PiWebPluginInfo["server"]>["state"]): string {
  switch (state) {
    case "active": return t("SettingsPluginsPanel.active.0addf7ef");
    case "failed": return t("SettingsPluginsPanel.failed.02b0086d");
    case "incompatible": return t("SettingsPluginsPanel.incompatible.6187ea5e");
    case "disabled": return t("SettingsPluginsPanel.disabled.1dd4d6c5");
    case "missing": return t("SettingsPluginsPanel.not_active.8ed3679c");
    case "unknown": return t("SettingsPluginsPanel.active_state_unavailable.1630991a");
  }
}

function serverStateTone(state: NonNullable<PiWebPluginInfo["server"]>["state"]): "success" | "warning" | "error" | "neutral" {
  switch (state) {
    case "active": return "success";
    case "disabled":
    case "missing": return "warning";
    case "failed":
    case "incompatible": return "error";
    case "unknown": return "neutral";
  }
}

function healthTone(status: NonNullable<NonNullable<PiWebPluginInfo["server"]>["health"]>["status"]): "success" | "warning" | "error" {
  switch (status) {
    case "healthy": return "success";
    case "degraded": return "warning";
    case "unhealthy": return "error";
  }
}

function pluginsDescription(targetLabel: string): TemplateResult {
  return localizedTemplate("SettingsPluginsPanel.compare_desired_plugin_config_with_the_active.01be4e5d", html)`Compare desired plugin config with the active sessiond startup snapshot on <strong>${targetLabel}</strong>. This is separate from installing Pi packages.`;
}

function healthLabel(status: "healthy" | "degraded" | "unhealthy"): string {
  return status === "healthy" ? t("ui.plugin.health.healthy") : status === "degraded" ? t("ui.plugin.health.degraded") : t("ui.plugin.health.unhealthy");
}
function safeStartLabel(mode: string): string {
  if (mode === "off") return t("ui.plugin.safe.off");
  if (mode === "bundled-only") return t("ui.plugin.safe.bundled-only");
  return mode === "none" ? t("ui.plugin.safe.none") : mode;
}
function pluginScopeLabel(scope: string): string {
  if (scope === "user") return t("ui.plugin.scope.user");
  if (scope === "project") return t("ui.plugin.scope.project");
  if (scope === "local") return t("ui.plugin.scope.local");
  return scope === "bundled" ? t("ui.plugin.scope.bundled") : scope;
}
