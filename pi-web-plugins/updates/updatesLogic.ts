import { t } from "./i18n.js";
import type { PiWebDockerMode, PiWebInstallationInfo, PiWebStatusMessage, PiWebStatusResponse, PluginRuntimeState } from "@wang060919/pi-web/plugin-api";

export interface CommandEntry {
  label: string;
  command: string;
}

export interface UpdatesRuntimeHint {
  dockerMode?: PiWebDockerMode;
}

// The shared update CLI owns installation-specific planning, confirmation, and
// safe execution. Stale components without an available update need a restart.
export function recommendedCommand(status: PiWebStatusResponse): CommandEntry | undefined {
  const { commands, release, components } = status;
  if (release.updateAvailable && typeof commands.update === "string" && commands.update !== "") {
    return { label: t("updatesLogic.update_pi_web.2cbdf77a"), command: commands.update };
  }
  const restartNeeded = components.web.stale || components.sessiond.stale || !components.sessiond.available;
  if (restartNeeded && typeof commands.restart === "string" && commands.restart !== "") {
    return { label: t("updatesLogic.restart_everything.55320f26"), command: commands.restart };
  }
  return undefined;
}

export function additionalCommands(status: PiWebStatusResponse, recommended: CommandEntry | undefined): CommandEntry[] {
  return [
    [t("updatesLogic.update.66abfc01"), status.commands.update],
    [t("updatesLogic.restart_all.04d4b249"), status.commands.restart],
    [t("updatesLogic.restart_web_ui.267dce69"), status.commands.restartWeb],
    [t("updatesLogic.restart_session_daemon.995e3f30"), status.commands.restartSessiond],
    [t("updatesLogic.status.3c933ee5"), status.commands.status],
  ]
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== "")
    .filter(([, command]) => command !== recommended?.command)
    .map(([label, command]) => ({ label, command }));
}

export function messagesFor(state: PluginRuntimeState | undefined): PiWebStatusMessage[] {
  return state?.piWebStatus?.messages ?? [];
}

export function statusFor(state: PluginRuntimeState | undefined): PiWebStatusResponse | undefined {
  return state?.piWebStatus;
}

export function messageCount(state: PluginRuntimeState | undefined): number {
  return messagesFor(state).length;
}

export function isSelfManagedInstallation(installation: PiWebInstallationInfo | undefined): boolean {
  return installation === undefined || installation.kind === "local" || installation.kind === "docker" || installation.kind === "unknown";
}

export function shouldShowUpdatesPanel(state: PluginRuntimeState | undefined, hint: UpdatesRuntimeHint = {}): boolean {
  const status = statusFor(state);
  if (hint.dockerMode !== undefined) return true;
  if (messageCount(state) > 0) return true;
  if (status === undefined) return false;
  if (status.release.error !== undefined && status.release.error !== "") return true;
  return isSelfManagedInstallation(status.components.web.installation)
    || isSelfManagedInstallation(status.components.sessiond.installation);
}

export function fallbackDockerStatus(hint: UpdatesRuntimeHint, generatedAt = t("updatesLogic.federated_status_unavailable.87d84f86")): PiWebStatusResponse | undefined {
  if (hint.dockerMode === undefined) return undefined;
  const commandPrefix = hint.dockerMode === "dev" ? "pi-web-docker --dev" : "pi-web-docker";
  const installation: PiWebInstallationInfo = { kind: "docker", dockerMode: hint.dockerMode };
  return {
    packageName: "@wang060919/pi-web",
    generatedAt,
    components: {
      web: { component: "web", label: t("updatesLogic.web_ui.2cd4616e"), stale: false, available: true, installation },
      sessiond: { component: "sessiond", label: t("updatesLogic.session_daemon.9e3fe90d"), stale: false, available: true, installation },
    },
    release: { packageName: "@wang060919/pi-web", updateAvailable: false, skipped: true },
    commands: {
      // The development image mounts its built checkout at /workspace and does
      // not install a global pi-web executable. Both invoke the same CLI.
      update: hint.dockerMode === "dev" ? "node /workspace/dist/cli.js update" : "pi-web update",
      restart: `${commandPrefix} restart`,
      restartWeb: `${commandPrefix} restart-web`,
      restartSessiond: `${commandPrefix} restart-sessiond`,
      status: `${commandPrefix} status`,
    },
    messages: [{
      id: "docker-status-compatibility",
      severity: "info",
      title: t("updatesLogic.docker_update_commands_available.780127fe"),
      body: t("updatesLogic.this_updates_plugin_was_loaded_from_a.86f7b142"),
    }],
  };
}

export function formatVersion(version: string | undefined): string {
  return version === undefined || version === "" ? t("updatesLogic.unknown.172e52ad") : version;
}

export function installationLabel(installation: PiWebInstallationInfo | undefined): string {
  if (installation === undefined) return t("updatesLogic.installation_unknown.18c85529");
  if (installation.kind === "pi-package") {
    const scope = installation.scope === undefined ? "" : ` · ${installation.scope}`;
    const source = installation.source ?? t("updatesLogic.pi_package.716145a9");
    return `${source}${scope}`;
  }
  if (installation.kind === "npm-global") return t("updatesLogic.global_npm_package.d87a26a9");
  if (installation.kind === "local") return t("updatesLogic.local_checkout.e5505e31");
  if (installation.kind === "docker") return installation.dockerMode === "dev" ? t("updatesLogic.docker_development_runtime.ff5d1b2d") : t("updatesLogic.docker_runtime.4726dda4");
  return t("updatesLogic.installation_unknown.27bc9914");
}
