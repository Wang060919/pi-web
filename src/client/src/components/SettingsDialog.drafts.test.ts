// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configApi, piPackagesApi, pluginsApi } from "../api";
import { modelConfigurationApi } from "../api/modelConfiguration";
import { SettingsDialog } from "./SettingsDialog";
import { configResponse, pluginsResponse } from "./SettingsDialog.testSupport";
import type { SettingsModelsPanel } from "./settings/SettingsModelsPanel";
import type { SettingsGeneralPanel } from "./settings/SettingsGeneralPanel";

beforeEach(() => {
  vi.spyOn(configApi, "config").mockResolvedValue(configResponse({}));
  vi.spyOn(pluginsApi, "plugins").mockResolvedValue(pluginsResponse([]));
  vi.spyOn(piPackagesApi, "packages").mockResolvedValue({ packages: [] });
  vi.spyOn(modelConfigurationApi, "read").mockResolvedValue({ revision: "one", providers: [{ id: "custom", models: [{ id: "model", name: "Original" }] }] });
});
afterEach(() => { document.body.replaceChildren(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function mount() {
  const dialog = new SettingsDialog();
  dialog.section = "models";
  dialog.onNavigate = (section) => { dialog.section = section; };
  document.body.append(dialog);
  await vi.waitFor(() => { expect(dialog.shadowRoot?.querySelector("settings-models-panel")?.shadowRoot?.querySelector('[data-field="model-name"]')).toBeInstanceOf(HTMLInputElement); });
  return dialog;
}
function required<T>(element: T | null | undefined): T { if (element == null) throw new Error("Missing rendered control"); return element; }
function modelPanel(dialog: SettingsDialog) { return required(dialog.shadowRoot?.querySelector<SettingsModelsPanel>("settings-models-panel")); }
function input(panel: SettingsModelsPanel, field: string) { return required(panel.shadowRoot?.querySelector<HTMLInputElement>(`[data-field="${field}"]`)); }
function edit(element: HTMLInputElement, value: string) { element.value = value; element.dispatchEvent(new Event("input", { bubbles: true, composed: true })); }
async function navigate(dialog: SettingsDialog, text: string) {
  required(Array.from(dialog.shadowRoot?.querySelectorAll<HTMLButtonElement>(".settings-nav button") ?? []).find((button) => button.textContent.trim().startsWith(text))).click();
  await dialog.updateComplete;
}

describe("settings draft protection", () => {
  it("searches settings without losing the current draft", async () => {
    const dialog = await mount();
    const panel = modelPanel(dialog);
    edit(input(panel, "model-name"), "Draft survives search");
    const search = required(dialog.shadowRoot?.querySelector<HTMLInputElement>('.settings-search input'));
    edit(search, "connection"); await dialog.updateComplete;
    expect(dialog.shadowRoot?.querySelectorAll('.settings-nav button')).toHaveLength(9);
    expect(dialog.shadowRoot?.querySelector('.settings-search-results')?.textContent).toContain('Server port');
    expect(panel.hasUnsavedChanges).toBe(true);
    expect(input(panel, "model-name").value).toBe("Draft survives search");
    await navigate(dialog, "Connection & access");
    edit(search, "no-matching-section"); await dialog.updateComplete;
    expect(dialog.shadowRoot?.querySelector('.no-sections')?.textContent).toContain("No matching");
    edit(search, ""); await dialog.updateComplete;
    await navigate(dialog, "Model configuration");
    expect(modelPanel(dialog)).toBe(panel);
    expect(input(panel, "model-name").value).toBe("Draft survives search");
  });

  it("does not reuse a model draft for a different machine", async () => {
    const dialog = await mount(); const previous = modelPanel(dialog);
    edit(input(previous, "model-name"), "Local machine draft"); await previous.updateComplete;
    dialog.machine = { id: "remote", name: "Remote", kind: "remote", createdAt: "now", updatedAt: "now" };
    await dialog.updateComplete;
    await vi.waitFor(() => {
      expect(modelPanel(dialog)).not.toBe(previous);
      expect(input(modelPanel(dialog), "model-name").value).toBe("Original");
    });
    expect(modelConfigurationApi.read).toHaveBeenLastCalledWith("remote", expect.any(AbortSignal));
  });

  it("keeps the same model editor and its unsaved values across category changes", async () => {
    const dialog = await mount(); const panel = modelPanel(dialog);
    edit(input(panel, "model-name"), "Unsent draft"); await panel.updateComplete;
    await navigate(dialog, "General"); await navigate(dialog, "Model configuration");
    expect(modelPanel(dialog)).toBe(panel);
    expect(input(panel, "model-name").value).toBe("Unsent draft");
    expect(modelConfigurationApi.read).toHaveBeenCalledOnce();
    expect(localStorage.length).toBe(0);
  });

  it("protects hidden drafts on close and browser reload, and closes after explicit discard", async () => {
    const dialog = await mount(); const close = vi.fn(); dialog.onClose = close;
    edit(input(modelPanel(dialog), "model-name"), "Unsent draft");
    await navigate(dialog, "General");
    const confirm = vi.fn(() => false); vi.stubGlobal("confirm", confirm);
    required(dialog.shadowRoot?.querySelector<HTMLButtonElement>(".close-button")).click();
    expect(confirm).toHaveBeenCalledOnce(); expect(close).not.toHaveBeenCalled();
    const unload = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    confirm.mockReturnValue(true);
    required(dialog.shadowRoot?.querySelector<HTMLButtonElement>(".close-button")).click();
    expect(close).toHaveBeenCalledOnce();
  });

  it("clears the dirty state after a successful save", async () => {
    vi.spyOn(modelConfigurationApi, "write").mockImplementation((value) => Promise.resolve({ ...value, revision: "two" }));
    const dialog = await mount(); const panel = modelPanel(dialog); const close = vi.fn(); dialog.onClose = close;
    edit(input(panel, "model-name"), "Saved name"); await panel.updateComplete;
    required(panel.shadowRoot?.querySelector<HTMLButtonElement>('[data-action="save"]')).click();
    await vi.waitFor(() => { expect(panel.hasUnsavedChanges).toBe(false); });
    const confirm = vi.fn(() => false); vi.stubGlobal("confirm", confirm);
    required(dialog.shadowRoot?.querySelector<HTMLButtonElement>(".close-button")).click();
    expect(confirm).not.toHaveBeenCalled(); expect(close).toHaveBeenCalledOnce();
    expect(panel.shadowRoot?.querySelector('.save-feedback [role="status"]')?.textContent).toContain("Saved");
  });

  it("keeps general drafts through unrelated configuration updates and guards reload", async () => {
    const dialog = await mount(); await navigate(dialog, "Connection & access");
    const panel = required(dialog.shadowRoot?.querySelector<SettingsGeneralPanel>("settings-general-panel"));
    await panel.updateComplete;
    const host = required(panel.shadowRoot?.querySelector<HTMLInputElement>('input[placeholder="127.0.0.1"]'));
    edit(host, "draft.local"); await panel.updateComplete;
    panel.configResponse = configResponse({ shortcuts: { "test-action": null } }); await panel.updateComplete;
    expect(host.value).toBe("draft.local"); expect(panel.hasUnsavedChanges).toBe(true);
    const confirm = vi.fn(() => false); vi.stubGlobal("confirm", confirm);
    const frame = required(panel.shadowRoot?.querySelector("settings-panel-frame"));
    required(frame.shadowRoot?.querySelector<HTMLButtonElement>("button")).click();
    expect(confirm).toHaveBeenCalledOnce(); expect(host.value).toBe("draft.local");
  });
});
