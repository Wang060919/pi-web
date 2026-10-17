import { localizedText, t } from "../../../../shared/i18n";
import type { PiWebConfigValues } from "../../api";

export interface GatewayServerConfigDraft {
  host: string;
  port: string;
  allowedHostsMode: "list" | "all";
  allowedHostsText: string;
}

export interface MachineAccessConfigDraft {
  allowedPathsText: string;
  uploadDefaultFolder: string;
  attachmentDefaultFolder: string;
}

export function emptyGatewayServerConfigDraft(): GatewayServerConfigDraft {
  return { host: "", port: "", allowedHostsMode: "list", allowedHostsText: "" };
}

export function emptyMachineAccessConfigDraft(): MachineAccessConfigDraft {
  return { allowedPathsText: "", uploadDefaultFolder: "", attachmentDefaultFolder: "" };
}

export function gatewayServerDraftFromConfig(config: PiWebConfigValues): GatewayServerConfigDraft {
  return {
    host: config.host ?? "",
    port: config.port === undefined ? "" : String(config.port),
    allowedHostsMode: config.allowedHosts === true ? "all" : "list",
    allowedHostsText: Array.isArray(config.allowedHosts) ? config.allowedHosts.join("\n") : "",
  };
}

export function machineAccessDraftFromConfig(config: PiWebConfigValues): MachineAccessConfigDraft {
  return {
    allowedPathsText: config.pathAccess?.allowedPaths?.join("\n") ?? "",
    uploadDefaultFolder: config.uploads?.defaultFolder ?? "",
    attachmentDefaultFolder: config.attachments?.defaultFolder ?? "",
  };
}

export function gatewayServerConfigFromDraft(draft: GatewayServerConfigDraft, baseConfig: PiWebConfigValues = {}): PiWebConfigValues {
  // Gateway saves replace the complete config; clear only fields this draft owns.
  const config = { ...baseConfig };
  delete config.host;
  delete config.port;
  const host = draft.host.trim();
  const port = draft.port.trim();
  if (host !== "") config.host = host;
  if (port !== "") {
    const parsed = Number(port);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) throw new Error(t("settingsConfigDraft.port_must_be_an_integer_from_to.83c34a7a"));
    config.port = parsed;
  }
  config.allowedHosts = draft.allowedHostsMode === "all" ? true : parseAllowedHostsText(draft.allowedHostsText);
  return config;
}

export function machineAccessConfigPatchFromDraft(draft: MachineAccessConfigDraft): PiWebConfigValues {
  const allowedPaths = parseAllowedPathsText(draft.allowedPathsText);
  const uploadDefaultFolder = normalizeWorkspaceRelativeFolder(draft.uploadDefaultFolder, t("settingsConfigDraft.upload_default_folder.a55ac9e4"));
  const attachmentDefaultFolder = normalizeWorkspaceRelativeFolder(draft.attachmentDefaultFolder, t("settingsConfigDraft.attachment_default_folder.8e99c7a1"));
  return {
    pathAccess: { allowedPaths },
    uploads: uploadDefaultFolder === "" ? {} : { defaultFolder: uploadDefaultFolder },
    attachments: attachmentDefaultFolder === "" ? {} : { defaultFolder: attachmentDefaultFolder },
  };
}

function parseAllowedHostsText(value: string): string[] {
  return value.split(/[\n,]/u).map((host) => host.trim()).filter((host) => host !== "");
}

function parseAllowedPathsText(value: string): string[] {
  const paths = value.split("\n").map((path) => path.trim()).filter((path) => path !== "");
  const invalid = paths.find((path) => !isAbsoluteishAllowedPath(path));
  if (invalid !== undefined) throw new Error(localizedText("settingsConfigDraft.allowed_external_paths_must_be_absolute_paths.7185bde1")`Allowed external paths must be absolute paths or start with ~: ${invalid}`);
  return paths;
}

function normalizeWorkspaceRelativeFolder(value: string, label: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  if (isAbsoluteLike(trimmed)) throw new Error(localizedText("settingsConfigDraft.must_be_workspace_relative.1050254c")`${label} must be workspace-relative.`);
  const parts = trimmed.split(/[\\/]+/u).filter((part) => part !== "" && part !== ".");
  if (parts.length === 0) return "";
  if (parts.some((part) => part === "..")) throw new Error(localizedText("settingsConfigDraft.must_not_contain_path_traversal.3e60bfc4")`${label} must not contain path traversal.`);
  return parts.join("/");
}

function isAbsoluteishAllowedPath(path: string): boolean {
  return path === "~" || path.startsWith("~/") || path.startsWith("~\\") || path.startsWith("/") || path.startsWith("\\") || /^[A-Za-z]:[\\/]/u.test(path);
}

function isAbsoluteLike(value: string): boolean {
  const withForwardSlashes = value.replace(/\\/g, "/");
  return withForwardSlashes.startsWith("/") || /^[A-Za-z]:\//u.test(withForwardSlashes);
}
