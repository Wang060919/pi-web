import { localizedText, t } from "../../../../shared/i18n";
import type { Machine, MachineKind, PiPackageInfo, PiPackageMutationAction, PiPackageMutationResponse, PiPackagesResponse } from "../../api";

export type PiPackageOperationKind = PiPackageMutationAction | "update-all";

export interface PiPackageOperationState {
  kind: PiPackageOperationKind;
  source?: string;
}

export interface PiPackageTargetContext {
  id: string;
  name: string;
  kind: MachineKind;
}

export function piPackageTargetContext(machine: Pick<Machine, "id" | "name" | "kind"> | undefined): PiPackageTargetContext {
  if (machine !== undefined) return { id: machine.id, name: machine.name, kind: machine.kind };
  return { id: "local", name: "local", kind: "local" };
}

export function piPackageTargetLabel(target: PiPackageTargetContext): string {
  return target.kind === "local" ? localizedText("piPackageSettings.local_gateway.2e99f041")`${target.name} (local gateway)` : localizedText("piPackageSettings.remote_machine.31e385eb")`${target.name} (remote machine)`;
}

export function shouldRefreshGatewayPluginsAfterPiPackageMutation(target: PiPackageTargetContext): boolean {
  return target.kind === "local";
}

export function normalizePiPackageSource(source: string): string {
  return source.trim();
}

export function piPackageSourceValidationMessage(source: string): string | undefined {
  if (normalizePiPackageSource(source) !== "") return undefined;
  return t("piPackageSettings.enter_a_pi_package_source_accepted_by.7921e529");
}

export function piPackageScopeLabel(packageInfo: Pick<PiPackageInfo, "scope">): string {
  return packageInfo.scope === "project" ? t("piPackageSettings.project_scope.0b04d71d") : t("piPackageSettings.user_scope.39f202c7");
}

export function piPackageFilteredLabel(packageInfo: Pick<PiPackageInfo, "filtered">): string {
  return packageInfo.filtered ? t("piPackageSettings.filtered_by_current_pi_package_settings.cc44d113") : t("piPackageSettings.available_in_this_pi_web_process.aec19b63");
}

export function piPackageInstalledPathLabel(packageInfo: Pick<PiPackageInfo, "installedPath">): string {
  return packageInfo.installedPath ?? t("piPackageSettings.installed_path_not_reported_by_pi.bbb5d79e");
}

/**
 * Carries a mutation response's refreshed package list, and the refreshed
 * installable-known-package suggestions if the server reported any, forward
 * into panel state — so a one-click (re)install or removal updates the
 * "Available packages" suggestions without a separate reload.
 */
export function piPackagesResponseAfterMutation(response: Pick<PiPackageMutationResponse, "packages" | "installableKnownPackages">): PiPackagesResponse {
  return {
    packages: response.packages,
    ...(response.installableKnownPackages === undefined ? {} : { installableKnownPackages: response.installableKnownPackages }),
  };
}

export function canUpdatePiPackage(packageInfo: Pick<PiPackageInfo, "scope">): boolean {
  return packageInfo.scope === "user";
}

export function piPackageUpdateDisabledReason(packageInfo: Pick<PiPackageInfo, "scope">): string | undefined {
  if (canUpdatePiPackage(packageInfo)) return undefined;
  return t("piPackageSettings.project_scope_pi_packages_are_listed_for.a8f4cd0b");
}

export function canUpdateAllPiPackages(packages: readonly Pick<PiPackageInfo, "scope">[]): boolean {
  return packages.length > 0 && packages.every(canUpdatePiPackage);
}

export function updateAllPiPackagesDisabledReason(packages: readonly Pick<PiPackageInfo, "scope">[]): string | undefined {
  if (packages.length === 0) return t("piPackageSettings.no_pi_packages_are_configured_yet.e44094f9");
  if (canUpdateAllPiPackages(packages)) return undefined;
  return t("piPackageSettings.update_all_is_disabled_while_project_scope.81518df9");
}

export function isPiPackageOperationPending(operation: PiPackageOperationState | undefined, kind: PiPackageOperationKind, source?: string): boolean {
  if (operation?.kind !== kind) return false;
  return source === undefined || operation.source === source;
}

export function piPackageMutationFollowUpMessage(action: PiPackageMutationAction, target = piPackageTargetContext(undefined)): string {
  const verb = action === "install" ? t("piPackageSettings.installed.3265c9f4") : action === "remove" ? t("piPackageSettings.removed.ebcc8834") : t("piPackageSettings.updated.146bfd6a");
  const targetSuffix = target.kind === "local" ? "" : localizedText("piPackageSettings.on.6801b022")` on ${target.name}`;
  const sessionScope = target.kind === "local" ? t("piPackageSettings.each_idle_pi_web_session.9ebbecf5") : localizedText("piPackageSettings.each_idle_pi_web_session_on.92b7bf49")`each idle PI WEB session on ${target.name}`;
  const pluginScope = target.kind === "local" ? t("piPackageSettings.pi_web_browser_plugin_changes.0418f7b7") : localizedText("piPackageSettings.pi_web_browser_plugin_changes_served_by.43ef0c97")`PI WEB browser plugin changes served by ${target.name}`;
  return localizedText("piPackageSettings.pi_package_type_reload_in_to_rediscover.fbb460d2")`Pi package ${verb}${targetSuffix}. Type /reload in ${sessionScope} to rediscover Pi runtime resources: extensions, skills, prompt templates, themes, and context/system prompt files. Reload the browser page separately for ${pluginScope}.`;
}

export function friendlyPiPackageErrorMessage(message: string, target: PiPackageTargetContext): string {
  const normalized = message.trim();
  if (target.kind !== "remote") return normalized;
  if (normalized === "Remote machine timeout") {
    return localizedText("piPackageSettings.timed_out_while_contacting_for_pi_package.d2ba3bab")`Timed out while contacting ${target.name} for Pi package management. The package operation may still be running remotely; reload the package list before retrying.`;
  }
  if (normalized === "Remote machine unavailable") {
    return localizedText("piPackageSettings.could_not_reach_for_pi_package_management.9bed0517")`Could not reach ${target.name} for Pi package management. Check the machine connection and try again.`;
  }
  return normalized;
}
