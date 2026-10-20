import { writeAppHistory } from "./appHistory";
export type SettingsSection = "general" | "connection" | "sessiond" | "packages" | "plugins" | "shortcuts" | "models" | "mcp" | "skills";

export function readSettingsSection(): SettingsSection | undefined {
  return parseSettingsSection(new URLSearchParams(window.location.search).get("settings"));
}

export function writeSettingsSection(section: SettingsSection | undefined, options?: { replace?: boolean | undefined }): void {
  const url = new URL(window.location.href);
  if (section === undefined) url.searchParams.delete("settings");
  else url.searchParams.set("settings", section);
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  writeAppHistory(url, options?.replace === true);
}

export function parseSettingsSection(value: string | null): SettingsSection | undefined {
  if (value === "general" || value === "connection") return value;
  if (value === "models" || value === "mcp" || value === "skills") return value;
  if (value === "sessiond" || value === "sessions") return "sessiond";
  if (value === "packages" || value === "pi-packages") return "packages";
  if (value === "plugins") return "plugins";
  if (value === "shortcuts" || value === "keyboard" || value === "keyboard-shortcuts") return "shortcuts";
  return undefined;
}
