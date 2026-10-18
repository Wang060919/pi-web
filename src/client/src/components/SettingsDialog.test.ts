// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configApi, piPackagesApi, pluginsApi } from "../api";
import { deepActiveElement, dialogSection, dialogSurface, pressKey, requiredElement, settleRenderedDialog, surfaceBackdrop } from "./modalSurfaceTestSupport";
import { SettingsDialog } from "./SettingsDialog";
import { modelConfigurationApi } from "../api/modelConfiguration";
import { mcpManagementApi } from "../api/mcpManagement";
import { runtimeInspectionApi } from "../api/runtimeInspection";
import { SettingsSkillsPanel } from "./settings/SettingsSkillsPanel";
import { SettingsModelsPanel } from "./settings/SettingsModelsPanel";
import { SettingsMcpPanel } from "./settings/SettingsMcpPanel";
import { configResponse, pluginsResponse } from "./SettingsDialog.testSupport";

beforeEach(() => {
  // The dialog loads gateway and selected-machine settings data when it
  // connects; stub those boundary calls so the shell tests stay deterministic.
  vi.spyOn(configApi, "config").mockResolvedValue(configResponse({}));
  vi.spyOn(pluginsApi, "plugins").mockResolvedValue(pluginsResponse([]));
  vi.spyOn(piPackagesApi, "packages").mockResolvedValue({ packages: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
  localStorage.clear();
});

describe("settings-dialog modal surface", () => {
  it.each(["models", "mcp", "skills"] as const)("routes %s to the selected machine and forwards workspace context", async (section) => {
    const models = vi.spyOn(modelConfigurationApi, "read").mockResolvedValue({ revision: "models-revision", providers: [] });
    const mcp = vi.spyOn(mcpManagementApi, "list").mockResolvedValue({ servers: [], revisions: { global: "mcp-revision" }, projectTrusted: true, hasProject: true, errors: [], requiresReload: true });
    const skills = vi.spyOn(runtimeInspectionApi, "skills").mockResolvedValue({ skills: [], diagnostics: [], projectTrusted: true });
    const dialog = new SettingsDialog();
    dialog.section = section;
    dialog.machine = { id: "remote", name: "Remote machine", kind: "remote", createdAt: "now", updatedAt: "now" };
    dialog.projectId = "project";
    dialog.workspaceId = "workspace";
    dialog.onNavigate = vi.fn();
    document.body.append(dialog);
    await settleRenderedDialog(dialog);
    if (section === "models") {
      const panel = dialog.renderRoot.querySelector("settings-models-panel");
      if (!(panel instanceof SettingsModelsPanel)) throw new Error("Model settings panel missing");
      await panel.updateComplete;
      expect(panel.machineId).toBe("remote");
      expect(models.mock.calls[0]?.[0]).toBe("remote");
      expect(dialog.renderRoot.querySelector("settings-mcp-panel")).toBeNull();
    } else if (section === "mcp") {
      const panel = dialog.renderRoot.querySelector("settings-mcp-panel");
      if (!(panel instanceof SettingsMcpPanel)) throw new Error("MCP settings panel missing");
      await panel.updateComplete;
      expect(panel.machineId).toBe("remote");
      expect(panel.projectId).toBe("project");
      expect(panel.workspaceId).toBe("workspace");
      expect(mcp).toHaveBeenCalledWith("remote", { projectId: "project", workspaceId: "workspace" });
      expect(dialog.renderRoot.querySelector("settings-models-panel")).toBeNull();
    } else {
      const panel = dialog.renderRoot.querySelector("settings-skills-panel");
      if (!(panel instanceof SettingsSkillsPanel)) throw new Error("Skills panel missing");
      await panel.updateComplete;
      expect(skills).toHaveBeenCalledWith("remote", { projectId: "project", workspaceId: "workspace" }, expect.any(AbortSignal));
    }
    const selected = dialog.renderRoot.querySelector<HTMLButtonElement>('.settings-nav button[aria-current="page"]');
    selected?.click();
    expect(dialog.onNavigate).toHaveBeenCalledExactlyOnceWith(section);
  });

  it("moves focus into the labelled dialog when opened", async () => {
    const dialog = await mountDialog();

    expect(deepActiveElement()).toBe(dialogSection(dialog));
    expect(dialogSection(dialog).getAttribute("aria-label")).toBe("PI WEB settings");
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn<() => void>();
    const dialog = await mountDialog({ onClose });

    pressKey(dialogSurface(dialog), "Escape");

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes when the backdrop itself is pressed", async () => {
    const onClose = vi.fn<() => void>();
    const dialog = await mountDialog({ onClose });

    surfaceBackdrop(dialog).dispatchEvent(new MouseEvent("mousedown", { bubbles: true, composed: true }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("moves focus from the dialog section to the first dialog control on Tab", async () => {
    const dialog = await mountDialog();
    const closeButton = requiredElement(dialog.shadowRoot?.querySelector<HTMLButtonElement>("header .close-button"), "settings close button");
    expect(deepActiveElement()).toBe(dialogSection(dialog));

    pressKey(dialogSurface(dialog), "Tab");

    expect(deepActiveElement()).toBe(closeButton);
  });
});

interface SettingsDialogCallbacks {
  onClose?: () => void;
}

async function mountDialog(callbacks: SettingsDialogCallbacks = {}): Promise<SettingsDialog> {
  const dialog = new SettingsDialog();
  Object.assign(dialog, callbacks);
  document.body.append(dialog);
  await settleRenderedDialog(dialog);
  return dialog;
}
