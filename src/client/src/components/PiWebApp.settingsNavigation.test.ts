// @vitest-environment happy-dom
import { LitElement } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, configApi, piPackagesApi, pluginsApi } from "../api";
import { modelConfigurationApi } from "../api/modelConfiguration";
import { initializeAppHistory } from "../appHistory";
import { PiWebApp } from "./PiWebApp";
import type { SettingsDialog } from "./SettingsDialog";
import type { SettingsModelsPanel } from "./settings/SettingsModelsPanel";
import { configResponse, pluginsResponse } from "./SettingsDialog.testSupport";

// Render the real app/settings boundary without starting unrelated transport.
// Dispatch real popstate events to the app's normal listener; only route data
// loading is replaced, so cancellation must preserve the actual mounted editor.
class SettingsNavigationApp extends PiWebApp {
  override connectedCallback(): void { LitElement.prototype.connectedCallback.call(this); }
}
customElements.define("settings-navigation-test-app", SettingsNavigationApp);
let listener: EventListener | undefined;
beforeEach(() => {
  window.history.replaceState({ piWebHistoryPosition: 2 }, "", "/?settings=models");
  vi.spyOn(configApi, "config").mockResolvedValue(configResponse({}));
  vi.spyOn(pluginsApi, "plugins").mockResolvedValue(pluginsResponse([]));
  vi.spyOn(piPackagesApi, "packages").mockResolvedValue({ packages: [] });
  vi.spyOn(api, "runtime").mockResolvedValue({ machineId: "local", ok: true, checkedAt: "now", capabilities: [] });
  vi.spyOn(modelConfigurationApi, "read").mockResolvedValue({ revision: "one", providers: [{ id: "custom", models: [{ id: "model", name: "Original" }] }] });
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
});
afterEach(() => {
  if (listener !== undefined) window.removeEventListener("popstate", listener);
  listener = undefined; document.body.replaceChildren(); localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
function required<T>(value: T | undefined | null): T { if (value == null) throw new Error("Missing control"); return value; }
function dialog(app: SettingsNavigationApp) { return required(app.shadowRoot?.querySelector<SettingsDialog>("settings-dialog")); }
function panel(app: SettingsNavigationApp) { return required(dialog(app).shadowRoot?.querySelector<SettingsModelsPanel>("settings-models-panel")); }
function input(app: SettingsNavigationApp) { return required(panel(app).shadowRoot?.querySelector<HTMLInputElement>('[data-field="model-name"]')); }
async function mount() {
  initializeAppHistory(); const app = new SettingsNavigationApp();
  Reflect.set(app, "restoreRoute", () => Promise.resolve(true));
  document.body.append(app);
  await vi.waitFor(() => { expect(input(app).value).toBe("Original"); });
  const capture: unknown = Reflect.get(app, "rememberSettingsLocation");
  if (typeof capture !== "function") throw new Error("Missing location capture");
  capture.call(app);
  const pop: unknown = Reflect.get(app, "onPopState");
  if (typeof pop !== "function") throw new Error("Missing popstate listener");
  listener = () => { pop.call(app); }; window.addEventListener("popstate", listener);
  return app;
}
function navigate(url: string, position: number) {
  window.history.replaceState({ piWebHistoryPosition: position }, "", url); window.dispatchEvent(new PopStateEvent("popstate"));
}
async function draft(app: SettingsNavigationApp) { input(app).value = "Keep my draft"; input(app).dispatchEvent(new Event("input", { bubbles: true })); await panel(app).updateComplete; }

describe("settings browser history protection", () => {
  it.each([[0, 2], [4, -2]])("returns to the original history entry after rejecting position %s", async (position, delta) => {
    const app = await mount(); await draft(app); const editor = panel(app);
    const confirm = vi.fn(() => false); vi.stubGlobal("confirm", confirm); const go = vi.spyOn(window.history, "go").mockImplementation(() => undefined);
    navigate("/", position);
    expect(confirm).toHaveBeenCalledOnce(); expect(go).toHaveBeenCalledWith(delta);
    navigate("/?settings=models", 2); await app.updateComplete;
    expect(panel(app)).toBe(editor); expect(input(app).value).toBe("Keep my draft"); expect(confirm).toHaveBeenCalledOnce();
  });
  it("retains drafts across category history and closes after explicit discard", async () => {
    const app = await mount(); await draft(app);
    const confirm = vi.fn(() => true); vi.stubGlobal("confirm", confirm);
    navigate("/?settings=general", 1); await app.updateComplete; expect(confirm).not.toHaveBeenCalled();
    navigate("/", 0); await app.updateComplete;
    expect(confirm).toHaveBeenCalledOnce(); expect(app.shadowRoot?.querySelector("settings-dialog")).toBeNull();
  });
  it("preserves the full settings route when rejecting an entry from before the UI upgrade", async () => {
    const app = await mount(); await draft(app);
    vi.stubGlobal("confirm", () => false);
    window.history.replaceState(null, "", "/?view=workspace"); window.dispatchEvent(new PopStateEvent("popstate"));
    await app.updateComplete;
    expect(new URL(window.location.href).searchParams.get("settings")).toBe("models");
    expect(input(app).value).toBe("Keep my draft");
  });
  it("protects a dirty editor from history navigation to a different machine", async () => {
    const app = await mount(); await draft(app);
    const confirm = vi.fn(() => false); vi.stubGlobal("confirm", confirm);
    const go = vi.spyOn(window.history, "go").mockImplementation(() => undefined);
    navigate("/?settings=models&machine=remote", 0);
    expect(confirm).toHaveBeenCalledOnce(); expect(go).toHaveBeenCalledWith(2);
    expect(input(app).value).toBe("Keep my draft");
    expect(modelConfigurationApi.read).not.toHaveBeenCalledWith("remote", expect.anything());
  });
  it("does not block browser navigation after a successful save", async () => {
    const app = await mount(); await draft(app);
    vi.spyOn(modelConfigurationApi, "write").mockImplementation((value) => Promise.resolve({ ...value, revision: "two" }));
    required(panel(app).shadowRoot?.querySelector<HTMLButtonElement>('[data-action="save"]')).click();
    await vi.waitFor(() => { expect(panel(app).hasUnsavedChanges).toBe(false); });
    const confirm = vi.fn(() => false); vi.stubGlobal("confirm", confirm);
    navigate("/", 0); await app.updateComplete;
    expect(confirm).not.toHaveBeenCalled(); expect(app.shadowRoot?.querySelector("settings-dialog")).toBeNull();
  });
});
