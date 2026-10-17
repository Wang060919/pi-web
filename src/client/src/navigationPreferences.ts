import { parseMachineScopedPluginId } from "../../shared/machinePluginIds";

export interface NavigationPreferences {
  pinnedIds: string[];
  mobileCollapsed: boolean;
  /** Absent on stored preferences from before essential tabs were introduced. */
  useDefaultPins?: boolean;
}

const storageKey = "pi-web:navigation-preferences";

function browserStorage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function loadNavigationPreferences(storage: Pick<Storage, "getItem"> | undefined = browserStorage()): NavigationPreferences {
  try {
    const value: unknown = JSON.parse(storage?.getItem(storageKey) ?? "null");
    if (typeof value === "object" && value !== null) {
      const pins: unknown = "pinnedIds" in value ? value.pinnedIds : undefined;
      return {
        pinnedIds: Array.isArray(pins) ? [...new Set(pins.filter((id): id is string => typeof id === "string" && id.length > 0))] : [],
        mobileCollapsed: "mobileCollapsed" in value && value.mobileCollapsed === true,
        ...("useDefaultPins" in value && typeof value.useDefaultPins === "boolean" ? { useDefaultPins: value.useDefaultPins } : {}),
      };
    }
  } catch {
    // Layout preferences are optional when storage is blocked or malformed.
  }
  return { pinnedIds: [], mobileCollapsed: false, useDefaultPins: true };
}

export function saveNavigationPreferences(preferences: NavigationPreferences, storage: Pick<Storage, "setItem"> | undefined = browserStorage()): void {
  try {
    storage?.setItem(storageKey, JSON.stringify(preferences));
  } catch {
    // Ignore quota/privacy errors for this optional browser layout preference.
  }
}

export function isNavigationPinned(id: string, pinnedIds: readonly string[]): boolean {
  return pinnedIds.length === 0 || pinnedIds.includes(id);
}

export function pinnedNavigationTabs<T extends { id: string }>(tabs: readonly T[], pinnedIds: readonly string[], useDefaultPins = false): T[] {
  if (useDefaultPins) {
    const essentials = tabs.filter((tab) => isEssentialDestination(tab.id));
    // A custom plugin-only installation must still have an immediately reachable tool.
    return essentials.length > 0 ? essentials : tabs.slice(0, 1);
  }
  return tabs.filter((tab) => isNavigationPinned(tab.id, pinnedIds));
}

export function toggleNavigationPin(id: string, pinnedIds: readonly string[], availableIds: readonly string[]): string[] {
  // Materialize the implicit "all" before unpinning. Never prune unavailable plugin IDs.
  const explicitPins = pinnedIds.length === 0 ? availableIds : pinnedIds;
  return explicitPins.includes(id) ? explicitPins.filter((pin) => pin !== id) : [...explicitPins, id];
}

function isEssentialDestination(id: string): boolean {
  if (id === "navigation" || id === "chat" || id === "files:workspace.files") return true;
  const [pluginId, contributionId] = id.split(":");
  return contributionId === "workspace.terminal" && pluginId !== undefined
    && (pluginId === "pi-web.terminal" || parseMachineScopedPluginId(pluginId)?.pluginId === "pi-web.terminal");
}
