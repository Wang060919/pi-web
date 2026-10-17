// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModelConfigurationResponse } from "../../../../shared/modelConfiguration";
import { MODEL_SECRET_UNCHANGED } from "../../../../shared/modelConfiguration";
import { SettingsModelsPanel } from "./SettingsModelsPanel";

afterEach(() => { document.body.replaceChildren(); localStorage.clear(); });

const configuration: ModelConfigurationResponse = { revision: "revision-one", providers: [{ id: "custom", baseUrl: "https://example.com/v1", apiKey: MODEL_SECRET_UNCHANGED, models: [{ id: "one", contextWindow: 1000 }] }] };
function fakeApi() {
  return {
    read: vi.fn(() => Promise.resolve(structuredClone(configuration))),
    write: vi.fn((value: ModelConfigurationResponse) => Promise.resolve({ ...value, revision: "revision-two" })),
    discover: vi.fn(() => Promise.resolve({ models: [{ id: "one" }, { id: "two", contextWindow: 4000 }], truncated: false })),
    test: vi.fn(() => Promise.resolve({ ok: true, latencyMs: 12, status: 200, responseText: "OK" })),
  };
}
function button(panel: SettingsModelsPanel, action: string): HTMLButtonElement {
  const found = panel.shadowRoot?.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
  if (found === null || found === undefined) throw new Error(`Missing button ${action}`);
  return found;
}
async function settled(panel: SettingsModelsPanel): Promise<void> { await vi.waitFor(() => { expect(button(panel, "reload").disabled).toBe(false); }); await panel.updateComplete; }
async function mount(): Promise<{ panel: SettingsModelsPanel; api: ReturnType<typeof fakeApi> }> {
  const api = fakeApi(); const panel = new SettingsModelsPanel(); panel.api = api; panel.machineId = "remote-machine"; document.body.append(panel); await settled(panel); return { panel, api };
}

describe("model settings panel", () => {
  it("stops loading after an invalid API response and can reload the configuration", async () => {
    const api = fakeApi();
    api.read.mockRejectedValueOnce(new SyntaxError("Unexpected token '<', HTML is not JSON"));
    const panel = new SettingsModelsPanel();
    panel.api = api;
    document.body.append(panel);
    await settled(panel);
    expect(panel.shadowRoot?.querySelector('[role="alert"]')?.textContent).toBe("Operation failed");
    expect(panel.shadowRoot?.textContent).not.toContain("Loading model configuration");
    expect(panel.shadowRoot?.textContent).not.toContain("Unexpected token");
    expect(panel.shadowRoot?.querySelector('[data-action="save"]')).toBeNull();

    button(panel, "reload").click();
    await settled(panel);
    expect(api.read).toHaveBeenCalledTimes(2);
    expect(panel.shadowRoot?.querySelector('[role="alert"]')).toBeNull();
    expect(panel.shadowRoot?.querySelector('[data-field="provider-id"]')).not.toBeNull();
  });

  it("tests and saves the current draft on the selected machine without exposing an existing key", async () => {
    const { panel, api } = await mount();
    const context = panel.shadowRoot?.querySelector<HTMLInputElement>('[data-field="model-context"]');
    if (context === undefined || context === null) throw new Error("Missing context input");
    context.value = "8192"; context.dispatchEvent(new Event("input", { bubbles: true })); await panel.updateComplete;
    button(panel, "test").click(); await settled(panel);
    expect(api.test).toHaveBeenCalledWith(expect.objectContaining({ apiKey: MODEL_SECRET_UNCHANGED, models: [expect.objectContaining({ contextWindow: 8192 })] }), "one", "remote-machine", expect.any(AbortSignal));
    expect(panel.shadowRoot?.textContent).toContain("OK");
    expect(api.write).not.toHaveBeenCalled();
    button(panel, "save").click(); await settled(panel);
    expect(api.write).toHaveBeenCalledWith(expect.objectContaining({ revision: "revision-one", providers: [expect.objectContaining({ models: [expect.objectContaining({ contextWindow: 8192 })] })] }), "remote-machine", expect.any(AbortSignal));
    expect(panel.shadowRoot?.querySelector<HTMLInputElement>('[data-field="provider-key"]')?.type).toBe("password");
  });

  it("adds selected discovered models to the draft without saving or duplicating existing models", async () => {
    const { panel, api } = await mount(); button(panel, "discover").click(); await settled(panel);
    const existing = panel.shadowRoot?.querySelector<HTMLInputElement>('[data-discovered-id="one"]');
    const choice = panel.shadowRoot?.querySelector<HTMLInputElement>('[data-discovered-id="two"]');
    expect(existing?.disabled).toBe(true);
    if (choice === undefined || choice === null) throw new Error("Missing discovered choice");
    choice.click(); await panel.updateComplete; button(panel, "add-selected").click(); await panel.updateComplete;
    expect(panel.shadowRoot?.querySelectorAll('[data-field="model-id"]').length).toBe(2);
    expect(api.write).not.toHaveBeenCalled();
  });

  it("keeps malformed headers editable and blocks network actions until corrected", async () => {
    const { panel, api } = await mount(); const headers = panel.shadowRoot?.querySelector<HTMLTextAreaElement>('[data-field="provider-headers"]');
    if (headers === null || headers === undefined) throw new Error("Missing headers");
    headers.value = "broken JSON"; headers.dispatchEvent(new Event("input", { bubbles: true })); await panel.updateComplete;
    button(panel, "save").click(); await settled(panel);
    expect(api.write).not.toHaveBeenCalled(); expect(panel.shadowRoot?.querySelector('[role="alert"]')?.textContent).toContain("Invalid JSON");
    expect(headers.value).toBe("broken JSON");
  });
});
