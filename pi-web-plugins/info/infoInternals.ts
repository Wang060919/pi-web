import { getLocale, localizedTemplate, localizedText, t } from "./i18n.js";
// Implementation details of the bundled Info plugin.
//
// This file is NOT part of the plugin skeleton. If you copied the Info plugin
// as a starting point for your own plugin, replace everything here with your
// own content — the plugin contract (metadata and contribution definitions)
// lives in pi-web-plugin.ts.

import type { TemplateResult } from "lit";
import type { ApplicationPanelContext, HtmlTemplateTag, MachineKind, PiWebComponentStatus, PiWebInstallationInfo, PiWebReleaseStatus, PiWebStatusResponse, PluginMachine, PluginRuntimeContext, Workspace } from "@jmfederico/pi-web/plugin-api";

export type ComponentHealth = "current" | "restart needed" | "unavailable";

export function componentHealth(component: PiWebComponentStatus): ComponentHealth {
  if (!component.available) return "unavailable";
  if (component.stale) return "restart needed";
  return "current";
}

export function formatVersion(version: string | undefined): string {
  return version === undefined || version === "" ? t("infoInternals.unknown.803893ed") : version;
}

export function installationLabel(installation: PiWebInstallationInfo | undefined): string {
  if (installation === undefined) return t("infoInternals.installation_unknown.886b58ac");
  if (installation.kind === "pi-package") {
    const scope = installation.scope === undefined ? "" : ` · ${installation.scope}`;
    const source = installation.source ?? t("infoInternals.pi_package.23fb2fae");
    return `${source}${scope}`;
  }
  if (installation.kind === "npm-global") return t("infoInternals.global_npm_package.90e0a1d3");
  if (installation.kind === "local") return t("infoInternals.local_checkout.848f62a2");
  if (installation.kind === "docker") return installation.dockerMode === "dev" ? t("infoInternals.docker_development_runtime.6aea1c6b") : t("infoInternals.docker_runtime.5d5a150c");
  return t("infoInternals.installation_unknown.2361b8fb");
}

export function machineKindLabel(kind: MachineKind): string {
  return kind === "local" ? t("infoInternals.local_machine.af085924") : t("infoInternals.remote_machine.cef1f0d7");
}

export function releaseSummary(release: PiWebReleaseStatus): string {
  if (release.updateAvailable) {
    return release.latestVersion === undefined || release.latestVersion === ""
      ? t("infoInternals.update_available.ec3af8df")
      : localizedText("infoInternals.update_available.ec7cab25")`Update available: ${release.latestVersion}`;
  }
  if (release.error !== undefined && release.error !== "") return localizedText("infoInternals.update_check_failed.ca499b2b")`Update check failed: ${release.error}`;
  if (release.skipped === true) return t("infoInternals.update_check_skipped.119c4959");
  return t("infoInternals.up_to_date.ee0814c0");
}

/** One-line component summary used by the panel rows and the clipboard diagnostics. */
export function componentDetails(component: PiWebComponentStatus): string {
  const parts = [
    localizedText("infoInternals.running.b8f221e0")`running ${formatVersion(component.runtimeVersion)}`,
    localizedText("infoInternals.installed.eefd6f39")`installed ${formatVersion(component.installedVersion)}`,
    `pi ${formatVersion(component.piVersion)}`,
    componentHealthLabel(componentHealth(component)),
    installationLabel(component.installation),
  ];
  if (component.installation?.path !== undefined && component.installation.path !== "") parts.push(component.installation.path);
  if (component.error !== undefined && component.error !== "") parts.push(localizedText("infoInternals.error.23495af3")`error: ${component.error}`);
  return parts.join(" · ");
}

/** Note shown when the session daemon runs a different Pi version than the web process. */
export function piVersionDriftNote(web: PiWebComponentStatus, sessiond: PiWebComponentStatus): string | undefined {
  if (!sessiond.available) return undefined;
  if (web.piVersion === undefined || sessiond.piVersion === undefined) return undefined;
  return web.piVersion === sessiond.piVersion ? undefined : localizedText("infoInternals.session_daemon_running.a517b4dd")`session daemon running ${formatVersion(sessiond.piVersion)}`;
}

export function workspaceFlags(workspace: Workspace): string[] {
  return [
    workspace.provider === undefined ? t("infoInternals.folder_workspace.f60a32ec") : localizedText("infoInternals.provider.d94abe6d")`provider: ${workspace.provider.pluginId}`,
    workspace.isMain ? t("infoInternals.main_workspace.ca8b8ea7") : undefined,
  ].filter((flag): flag is string => flag !== undefined);
}

export interface DiagnosticsInput {
  status: PiWebStatusResponse | undefined;
  machine?: PluginMachine | undefined;
  workspace?: Workspace | undefined;
}

/** Plain-text status block suitable for pasting into a bug report. */
export function diagnosticsSummary({ status, machine, workspace }: DiagnosticsInput): string {
  const lines: string[] = [t("infoInternals.pi_web_diagnostics.291d66ab")];
  if (status === undefined) {
    lines.push(t("infoInternals.status_unavailable.ea1e4a84"));
  } else {
    lines.push(localizedText("infoInternals.package.6f1c85f5")`Package: ${status.packageName}`);
    lines.push(localizedText("infoInternals.template.82909293")`${componentLabel(status.components.web)}: ${componentDetails(status.components.web)}`);
    lines.push(localizedText("infoInternals.template.3cba3a52")`${componentLabel(status.components.sessiond)}: ${componentDetails(status.components.sessiond)}`);
    const checked = status.release.checkedAt === undefined || status.release.skipped === true ? "" : localizedText("infoInternals.checked.8b95f7f1")` (checked ${status.release.checkedAt})`;
    lines.push(localizedText("infoInternals.release.0332139b")`Release: ${releaseSummary(status.release)}${checked}`);
    lines.push(localizedText("infoInternals.status_generated.051055ed")`Status generated: ${status.generatedAt}`);
  }
  if (machine !== undefined) lines.push(localizedText("infoInternals.machine.06bfb269")`Machine: ${machine.name} (${machineKindLabel(machine.kind)})`);
  if (workspace === undefined) {
    lines.push(t("infoInternals.workspace_none_selected.6cded959"));
  } else {
    lines.push(localizedText("infoInternals.workspace.2d466c07")`Workspace: ${workspace.label} — ${workspace.path} (${workspaceFlags(workspace).join(t("infoInternals.template.93f0b894"))})`);
  }
  return lines.join("\n");
}

/** Action body: copy the diagnostics summary for the current runtime context. */
export async function copyDiagnostics(context: PluginRuntimeContext): Promise<void> {
  const summary = diagnosticsSummary({
    status: context.state.piWebStatus,
    machine: context.state.selectedMachine,
    workspace: context.state.selectedWorkspace,
  });
  await navigator.clipboard.writeText(summary);
}

function renderComponent(html: HtmlTemplateTag, component: PiWebComponentStatus): TemplateResult {
  const health = componentHealth(component);
  return html`
    <div class="info-component">
      <strong>${componentLabel(component)}</strong>
      <span class=${health === "current" ? "info-health-ok" : "info-health-attention"}>${componentHealthLabel(health)}</span>
      <small>${componentDetails(component)}</small>
    </div>
  `;
}

function renderStatusSection(html: HtmlTemplateTag, status: PiWebStatusResponse | undefined): TemplateResult {
  if (status === undefined) {
    return localizedTemplate("infoInternals.pi_web_pi_web_status_is_not.7a7e9d57", html)`
      <section>
        <strong>PI WEB</strong>
        <p class="muted">PI WEB status is not available yet. It refreshes automatically in the background.</p>
      </section>
    `;
  }
  const web = status.components.web;
  const driftNote = piVersionDriftNote(web, status.components.sessiond);
  const messageCount = status.messages.length;
  return localizedTemplate("infoInternals.pi_web_version_pi_package_installation_release.382b030a", html)`
    <section>
      <strong>PI WEB</strong>
      <div class="info-row">
        <span>Version</span>
        <span>${formatVersion(web.runtimeVersion)}</span>
        ${web.installedVersion === undefined || web.installedVersion === web.runtimeVersion ? null : localizedTemplate("infoInternals.installed.510a7424", html)`<small>installed ${formatVersion(web.installedVersion)}</small>`}
      </div>
      <div class="info-row">
        <span>Pi</span>
        <span>${formatVersion(web.piVersion)}</span>
        ${driftNote === undefined ? null : html`<small>${driftNote}</small>`}
      </div>
      <div class="info-row">
        <span>Package</span>
        <span>${status.packageName}</span>
      </div>
      <div class="info-row">
        <span>Installation</span>
        <span>${installationLabel(web.installation)}</span>
        ${web.installation?.path === undefined || web.installation.path === "" ? null : html`<small>${web.installation.path}</small>`}
      </div>
      <div class="info-row">
        <span>Release</span>
        <span>${releaseSummary(status.release)}</span>
        ${status.release.checkedAt === undefined || status.release.skipped === true ? null : localizedTemplate("infoInternals.checked.19689557", html)`<small>checked ${status.release.checkedAt}</small>`}
      </div>
      ${messageCount === 0 ? null : localizedTemplate("infoInternals.status_open_the_updates_tab_for_details.757946cf", html)`<p class="muted">${String(messageCount)} status ${messageCount === 1 ? "message" : "messages"} — open the Updates tab for details.</p>`}
      <p class="muted">Status generated ${status.generatedAt}</p>
    </section>
    <section>
      <strong>Services</strong>
      ${renderComponent(html, status.components.web)}
      ${renderComponent(html, status.components.sessiond)}
    </section>
  `;
}

function renderMachineSection(html: HtmlTemplateTag, machine: PluginMachine): TemplateResult {
  return localizedTemplate("infoInternals.machine_name_type.174986be", html)`
    <section>
      <strong>Machine</strong>
      <div class="info-row">
        <span>Name</span>
        <span>${machine.name}</span>
      </div>
      <div class="info-row">
        <span>Type</span>
        <span>${machineKindLabel(machine.kind)}</span>
      </div>
    </section>
  `;
}

function renderWorkspaceSection(html: HtmlTemplateTag, workspace: Workspace): TemplateResult {
  return localizedTemplate("infoInternals.workspace_name_path.e08d5fd2", html)`
    <section>
      <strong>Workspace</strong>
      <div class="info-row">
        <span>Name</span>
        <span>${workspace.label}</span>
      </div>
      <div class="info-row">
        <span>Path</span>
        <span class="info-path">${workspace.path}</span>
        ${workspaceFlags(workspace).length === 0 ? null : html`<small>${workspaceFlags(workspace).join(" · ")}</small>`}
      </div>
    </section>
  `;
}

/** Panel body: machine status is useful even without a selected workspace. */
export function renderInfoPanel(html: HtmlTemplateTag, context: ApplicationPanelContext): TemplateResult {
  return localizedTemplate("infoInternals.viewer_info_status_flex_auto_min_height.0971f282", html)`
    <style>
      .viewer.info-status { flex: 1 1 auto; min-height: 0; box-sizing: border-box; display: flex; flex-direction: column; gap: 18px; padding: 12px; font: 400 13px/18px var(--pi-font-family, system-ui, sans-serif); overflow-y: auto; overflow-x: hidden; }
      .viewer.info-status section { flex: 0 0 auto; min-width: 0; display: grid; gap: 8px; align-content: start; }
      .viewer.info-status p { margin: 0; }
      .toolbar strong, .viewer.info-status section > strong, .info-component strong { font-weight: 500; }
      .info-row { display: grid; grid-template-columns: minmax(90px, auto) minmax(0, 1fr); gap: 3px 10px; border-bottom: 0; padding: 6px 0; overflow-wrap: anywhere; }
      .info-row small { grid-column: 1 / -1; color: var(--pi-muted); font-size: 12px; line-height: 16px; }
      .info-component { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px 10px; border-bottom: 0; padding: 6px 0; }
      .info-component small { grid-column: 1 / -1; color: var(--pi-muted); font-size: 12px; line-height: 16px; overflow-wrap: anywhere; }
      .info-health-ok { color: var(--pi-success); }
      .info-health-attention { color: var(--pi-warning); }
    </style>
    <section class="toolbar"><strong>Info</strong></section>
    <section class="viewer info-status">
      ${renderStatusSection(html, context.state.piWebStatus)}
      ${renderMachineSection(html, context.machine)}
      ${context.workspace === undefined ? null : renderWorkspaceSection(html, context.workspace)}
    </section>
  `;
}

function componentHealthLabel(health: ComponentHealth): string {
  if (health === "current") return t("ui.health.current");
  return health === "restart needed" ? t("ui.health.restart") : t("ui.health.unavailable");
}
function componentLabel(component: PiWebComponentStatus): string {
  if (getLocale() !== "zh-CN") return component.label;
  return component.component === "web" ? t("ui.component.web") : t("ui.component.sessiond");
}
