// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "lit";
import { api, type Machine, type SessionInfo, type SessionModel, type SessionModelCatalogEntry, type SessionStatus, type Workspace } from "../api";
import { initialAppState, type AppState } from "../appState";
import { SessionController } from "../controllers/sessionController";
import { PiWebApp } from "./PiWebApp";
import { ThinkingPicker } from "./ThinkingPicker";
import { ModelPicker } from "./ModelPicker";
import { PromptEditor } from "./PromptEditor";
import { deepActiveElement } from "./modalLayerRegistry";
import { CommandPicker } from "./CommandPicker";

beforeEach(() => {
  vi.spyOn(SessionController.prototype, "listModels").mockResolvedValue([]);
  vi.spyOn(SessionController.prototype, "listModelCatalog").mockResolvedValue([]);
  vi.spyOn(SessionController.prototype, "listThinkingLevels").mockResolvedValue(["off", "low", "high"]);
  vi.spyOn(SessionController.prototype, "getSessionDefaults").mockResolvedValue({ defaultProvider: "anthropic", defaultModel: "claude-sonnet-4-5", defaultThinkingLevel: "high" });
});

afterEach(() => {
  const focused = deepActiveElement(document);
  if (focused instanceof HTMLElement) focused.blur();
  document.body.replaceChildren();
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

const modelDialogOrigin = { machineId: "local", sessionId: "session-1", cwd: "/repo" } as const;

describe("PiWebApp model dialog", () => {
  it("opens with the enabled options, the full catalog, and the current selection", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, {
      selectedSession,
      sessions: [selectedSession],
      status: sessionStatus(selectedSession.id, { provider: "openai", id: "gpt-5" }),
    });
    const listModels = vi.spyOn(SessionController.prototype, "listModels")
      .mockResolvedValue([{ provider: "openai", id: "gpt-5" }, { provider: "anthropic", id: "claude-sonnet-4-5" }]);
    const catalog = [
      { provider: "openai", id: "gpt-5", enabled: true },
      { provider: "anthropic", id: "claude-sonnet-4-5", enabled: true },
      { provider: "openai", id: "gpt-4o", enabled: false },
    ];
    const listModelCatalog = vi.spyOn(SessionController.prototype, "listModelCatalog").mockResolvedValue(catalog);

    await callAppMethod(app, "openModelDialog");

    expect(listModels).toHaveBeenCalledOnce();
    expect(listModelCatalog).toHaveBeenCalledOnce();
    const dialog = appModelDialog(app);
    expect(dialog?.defaultValue).toBe("anthropic/claude-sonnet-4-5");
    expect(dialog?.title).toBe("Select Model");
    expect(dialog?.selectedValue).toBe("openai/gpt-5");
    expect(dialog?.options).toEqual([
      { value: "openai/gpt-5", label: "gpt-5 ✓ current", description: "openai" },
      { value: "anthropic/claude-sonnet-4-5", label: "claude-sonnet-4-5", description: "anthropic" },
    ]);
    expect(dialog?.catalog).toEqual(catalog);
    expect(appThinkingDialog(app)).toMatchObject({ selectedValue: "off", defaultValue: "high", modelValue: "openai/gpt-5" });
  });

  it("refreshes an open dialog after a global model-scope change", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, {
      selectedSession,
      sessions: [selectedSession],
      status: sessionStatus(selectedSession.id, { provider: "openai", id: "gpt-5" }),
      modelDialog: {
        instanceId: 1,
        origin: modelDialogOrigin,
        title: "Select Model",
        selectedValue: "openai/gpt-5",
        options: [{ value: "openai/gpt-5", label: "gpt-5 ✓ current", description: "openai" }],
        catalog: [{ provider: "openai", id: "gpt-5", enabled: true }],
      },
    });
    const listModels = vi.spyOn(SessionController.prototype, "listModels")
      .mockResolvedValue([{ provider: "openai", id: "gpt-5" }, { provider: "openai", id: "gpt-4o" }]);
    const listModelCatalog = vi.spyOn(SessionController.prototype, "listModelCatalog")
      .mockResolvedValue([
        { provider: "openai", id: "gpt-5", enabled: true },
        { provider: "openai", id: "gpt-4o", enabled: true },
      ]);
    const sessions: unknown = Reflect.get(app, "sessions");
    if (typeof sessions !== "object" || sessions === null) throw new Error("PiWebApp session controller was unavailable");
    const applyGlobalEvent: unknown = Reflect.get(sessions, "applyGlobalEvent");
    if (typeof applyGlobalEvent !== "function") throw new Error("SessionController global event handler was unavailable");

    Reflect.apply(applyGlobalEvent, sessions, [{ type: "models.changed", revision: 2 }]);
    await vi.waitFor(() => { expect(appModelDialog(app)?.options).toHaveLength(2); });

    expect(listModels).toHaveBeenCalledOnce();
    expect(listModelCatalog).toHaveBeenCalledOnce();
    expect(appModelDialog(app)?.options).toEqual([
      { value: "openai/gpt-5", label: "gpt-5 ✓ current", description: "openai" },
      { value: "openai/gpt-4o", label: "gpt-4o", description: "openai" },
    ]);
    expect(appModelDialog(app)?.catalog).toEqual([
      { provider: "openai", id: "gpt-5", enabled: true },
      { provider: "openai", id: "gpt-4o", enabled: true },
    ]);
  });

  it("retries dialog loading when a global scope change arrives while it is opening", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, {
      selectedSession,
      sessions: [selectedSession],
      status: sessionStatus(selectedSession.id, { provider: "openai", id: "gpt-5" }),
    });
    let resolveInitialModels: ((models: SessionModel[]) => void) | undefined;
    let resolveInitialCatalog: ((catalog: SessionModelCatalogEntry[]) => void) | undefined;
    const listModels = vi.spyOn(SessionController.prototype, "listModels").mockImplementation(() => {
      if (listModels.mock.calls.length > 1) return Promise.resolve([{ provider: "openai", id: "gpt-5" }, { provider: "openai", id: "gpt-4o" }]);
      return new Promise((resolve) => { resolveInitialModels = resolve; });
    });
    const listModelCatalog = vi.spyOn(SessionController.prototype, "listModelCatalog").mockImplementation(() => {
      if (listModelCatalog.mock.calls.length > 1) {
        return Promise.resolve([
          { provider: "openai", id: "gpt-5", enabled: true },
          { provider: "openai", id: "gpt-4o", enabled: true },
        ]);
      }
      return new Promise((resolve) => { resolveInitialCatalog = resolve; });
    });

    const pending = callAppMethod(app, "openModelDialog");
    await vi.waitFor(() => { expect(listModels).toHaveBeenCalledOnce(); });
    const sessions: unknown = Reflect.get(app, "sessions");
    if (typeof sessions !== "object" || sessions === null) throw new Error("PiWebApp session controller was unavailable");
    const applyGlobalEvent: unknown = Reflect.get(sessions, "applyGlobalEvent");
    if (typeof applyGlobalEvent !== "function") throw new Error("SessionController global event handler was unavailable");
    Reflect.apply(applyGlobalEvent, sessions, [{ type: "models.changed", revision: 2 }]);
    resolveInitialModels?.([{ provider: "openai", id: "gpt-5" }]);
    resolveInitialCatalog?.([{ provider: "openai", id: "gpt-5", enabled: true }]);
    await pending;

    expect(listModels).toHaveBeenCalledTimes(2);
    expect(listModelCatalog).toHaveBeenCalledTimes(2);
    expect(appModelDialog(app)?.options).toEqual([
      { value: "openai/gpt-5", label: "gpt-5 ✓ current", description: "openai" },
      { value: "openai/gpt-4o", label: "gpt-4o", description: "openai" },
    ]);
  });

  it("discards catalog results when selection changes while the dialog is opening", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, { selectedSession, sessions: [selectedSession] });
    let resolveModels: ((models: SessionModel[]) => void) | undefined;
    let resolveCatalog: ((catalog: { provider: string; id: string; enabled: boolean }[]) => void) | undefined;
    vi.spyOn(SessionController.prototype, "listModels").mockImplementation(() => new Promise((resolve) => { resolveModels = resolve; }));
    vi.spyOn(SessionController.prototype, "listModelCatalog").mockImplementation(() => new Promise((resolve) => { resolveCatalog = resolve; }));

    const pending = callAppMethod(app, "openModelDialog");
    const replacement = session("session-2");
    setAppState(app, { selectedSession: replacement, sessions: [replacement] });
    resolveModels?.([{ provider: "openai", id: "gpt-5" }]);
    resolveCatalog?.([{ provider: "openai", id: "gpt-5", enabled: true }]);
    await pending;

    expect(appModelDialog(app)).toBeUndefined();
  });

  it("rebuilds the dialog's enabled options and catalog from the fresh catalog after a toggle", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, {
      selectedSession,
      sessions: [selectedSession],
      status: sessionStatus(selectedSession.id, { provider: "openai", id: "gpt-5" }),
      modelDialog: {
        instanceId: 1,
        origin: modelDialogOrigin,
        title: "Select Model",
        selectedValue: "openai/gpt-5",
        options: [{ value: "openai/gpt-5", label: "gpt-5 ✓ current", description: "openai" }],
        catalog: [
          { provider: "openai", id: "gpt-5", enabled: true },
          { provider: "openai", id: "gpt-4o", enabled: false },
        ],
      },
    });
    const freshCatalog = [
      { provider: "openai", id: "gpt-5", enabled: true },
      { provider: "openai", id: "gpt-4o", enabled: true },
      { provider: "anthropic", id: "claude-sonnet-4-5", enabled: false },
    ];
    const setModelEnabled = vi.spyOn(SessionController.prototype, "setModelEnabled").mockResolvedValue(freshCatalog);

    await callToggleHandler(app, "openai", "gpt-4o", true);

    expect(setModelEnabled).toHaveBeenCalledWith("openai", "gpt-4o", true);
    const dialog = appModelDialog(app);
    expect(dialog?.catalog).toEqual(freshCatalog);
    // Enabled-mode options hold the fresh catalog's enabled rows only;
    // disabled rows (anthropic/claude-sonnet-4-5) stay out of the Enabled list.
    expect(dialog?.options).toEqual([
      { value: "openai/gpt-5", label: "gpt-5 ✓ current", description: "openai" },
      { value: "openai/gpt-4o", label: "gpt-4o", description: "openai" },
    ]);
  });

  it("applies an atomic scope preset and rebuilds the enabled options", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    const dialog = {
      instanceId: 1,
      origin: modelDialogOrigin,
      title: "Select Model",
      selectedValue: "openai/gpt-5",
      options: [{ value: "openai/gpt-5", label: "gpt-5 ✓ current", description: "openai" }],
      catalog: [{ provider: "openai", id: "gpt-5", enabled: true }],
    };
    setAppState(app, {
      selectedSession,
      sessions: [selectedSession],
      status: sessionStatus(selectedSession.id, { provider: "openai", id: "gpt-5" }),
      modelDialog: dialog,
    });
    const freshCatalog = [
      { provider: "openai", id: "gpt-5", enabled: true },
      { provider: "openai", id: "gpt-4o", enabled: false },
    ];
    const setModelScope = vi.spyOn(SessionController.prototype, "setModelScope").mockResolvedValue(freshCatalog);

    await callScopeHandler(app, "current");

    expect(setModelScope).toHaveBeenCalledWith("current");
    expect(appModelDialog(app)?.catalog).toEqual(freshCatalog);
    expect(appModelDialog(app)?.options).toEqual([
      { value: "openai/gpt-5", label: "gpt-5 ✓ current", description: "openai" },
    ]);
  });

  it("leaves the dialog untouched when the toggle fails", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, {
      selectedSession,
      sessions: [selectedSession],
      modelDialog: { instanceId: 1, origin: modelDialogOrigin, title: "Select Model", options: [], catalog: [] },
    });
    const before = appModelDialog(app);
    vi.spyOn(SessionController.prototype, "setModelEnabled").mockResolvedValue(undefined);

    await callToggleHandler(app, "openai", "gpt-4o", true);

    expect(appModelDialog(app)).toBe(before);
  });

  it("does not restore the dialog when a toggle settles after it was closed", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, { selectedSession, sessions: [selectedSession], modelDialog: { instanceId: 1, origin: modelDialogOrigin, title: "Select Model", options: [], catalog: [] } });
    let resolveToggle: ((catalog: { provider: string; id: string; enabled: boolean }[]) => void) | undefined;
    vi.spyOn(SessionController.prototype, "setModelEnabled").mockImplementation(() => new Promise((resolve) => { resolveToggle = resolve; }));

    const pending = callToggleHandler(app, "openai", "gpt-5", true);
    setAppState(app, { selectedSession, sessions: [selectedSession], modelDialog: undefined });
    resolveToggle?.([{ provider: "openai", id: "gpt-5", enabled: true }]);
    await pending;

    expect(appModelDialog(app)).toBeUndefined();
  });

  it("closes the dialog when the live current model changes", () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, {
      selectedSession,
      sessions: [selectedSession],
      status: sessionStatus(selectedSession.id, { provider: "openai", id: "gpt-5" }),
      modelDialog: { instanceId: 1, origin: modelDialogOrigin, title: "Select Model", options: [], catalog: [] },
    });

    applyAppStatePatch(app, { status: sessionStatus(selectedSession.id, { provider: "openai", id: "gpt-4o" }) });

    expect(appModelDialog(app)).toBeUndefined();
  });

  it("refuses a scope mutation when the dialog no longer belongs to the selected session", async () => {
    const app = new PiWebApp();
    const replacement = session("session-2");
    setAppState(app, {
      selectedSession: replacement,
      sessions: [replacement],
      modelDialog: { instanceId: 1, origin: modelDialogOrigin, title: "Select Model", options: [], catalog: [] },
    });
    const setModelScope = vi.spyOn(SessionController.prototype, "setModelScope");

    await callScopeHandler(app, "all");

    expect(setModelScope).not.toHaveBeenCalled();
    expect(appModelDialog(app)).toBeUndefined();
  });

  it("does not apply a stale response to a replacement dialog", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    const original = { instanceId: 1, origin: modelDialogOrigin, title: "Select Model", options: [], catalog: [] };
    const replacement = { instanceId: 2, origin: modelDialogOrigin, title: "Replacement", options: [], catalog: [] };
    setAppState(app, { selectedSession, sessions: [selectedSession], modelDialog: original });
    let resolveScope: ((catalog: { provider: string; id: string; enabled: boolean }[]) => void) | undefined;
    vi.spyOn(SessionController.prototype, "setModelScope").mockImplementation(() => new Promise((resolve) => { resolveScope = resolve; }));

    const pending = callScopeHandler(app, "all");
    setAppState(app, { selectedSession, sessions: [selectedSession], modelDialog: replacement });
    resolveScope?.([{ provider: "openai", id: "gpt-5", enabled: true }]);
    await pending;

    expect(appModelDialog(app)).toBe(replacement);
  });
});

describe("startup default orchestration", () => {
  it("saves a model default without selecting it or closing the dialog", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, { selectedSession, modelDialog: { instanceId: 1, origin: modelDialogOrigin, title: "Model", selectedValue: "openai/gpt-5", options: [], catalog: [] } });
    const save = vi.spyOn(SessionController.prototype, "setSessionDefaults").mockResolvedValue({ defaultProvider: "anthropic", defaultModel: "claude-sonnet-4-5" });
    const select = vi.spyOn(SessionController.prototype, "setModel");
    await callDefaultHandler(app, "handleSetDefaultModel", "anthropic/claude-sonnet-4-5");
    expect(save).toHaveBeenCalledWith({ provider: "anthropic", modelId: "claude-sonnet-4-5" });
    expect(select).not.toHaveBeenCalled();
    expect(appModelDialog(app)).toMatchObject({ defaultValue: "anthropic/claude-sonnet-4-5", selectedValue: "openai/gpt-5" });
  });

  it("leaves the saved marker unchanged when saving fails", async () => {
    const app = new PiWebApp();
    setAppState(app, { selectedSession: session("session-1"), modelDialog: { instanceId: 1, origin: modelDialogOrigin, title: "Model", defaultValue: "openai/gpt-5", options: [], catalog: [] } });
    vi.spyOn(SessionController.prototype, "setSessionDefaults").mockResolvedValue(undefined);
    await callDefaultHandler(app, "handleSetDefaultModel", "anthropic/claude-sonnet-4-5");
    expect(appModelDialog(app)?.defaultValue).toBe("openai/gpt-5");
  });

  it("loads and pins thinking defaults independently of current thinking", async () => {
    const app = new PiWebApp();
    setAppState(app, { selectedSession: session("session-1"), status: { ...sessionStatus("session-1"), thinkingLevel: "low" } });
    vi.spyOn(SessionController.prototype, "listThinkingLevels").mockResolvedValue(["low", "high"]);
    await callAppMethod(app, "openThinkingDialog");
    const save = vi.spyOn(SessionController.prototype, "setSessionDefaults").mockResolvedValue({ defaultThinkingLevel: "high" });
    const select = vi.spyOn(SessionController.prototype, "setThinkingLevel");
    await callDefaultHandler(app, "handleSetDefaultThinking", "high");
    expect(save).toHaveBeenCalledWith({ thinkingLevel: "high" });
    expect(select).not.toHaveBeenCalled();
    const state: unknown = Reflect.get(app, "state");
    if (!isAppState(state)) throw new Error("Missing app state");
    expect(state.thinkingDialog).toMatchObject({ defaultValue: "high", selectedValue: "low" });
  });

  it("does not update a replacement model dialog after a save completes", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, { selectedSession, modelDialog: { instanceId: 1, origin: modelDialogOrigin, title: "Model", options: [], catalog: [] } });
    let resolveSave: ((value: { defaultProvider: string; defaultModel: string }) => void) | undefined;
    vi.spyOn(SessionController.prototype, "setSessionDefaults").mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
    const pending = callDefaultHandler(app, "handleSetDefaultModel", "openai/gpt-5");
    const replacement = { instanceId: 2, origin: modelDialogOrigin, title: "Replacement", options: [], catalog: [] };
    setAppState(app, { selectedSession, modelDialog: replacement });
    resolveSave?.({ defaultProvider: "openai", defaultModel: "gpt-5" });
    await pending;
    expect(appModelDialog(app)).toBe(replacement);
  });
});

describe("model popover orchestration", () => {
  it("keeps the latest requested picker when an earlier model load finishes last", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, { selectedSession, status: sessionStatus(selectedSession.id) });
    let resolveEarlierModels: ((models: SessionModel[]) => void) | undefined;
    vi.spyOn(SessionController.prototype, "listModels")
      .mockResolvedValue([{ provider: "provider", id: "latest" }])
      .mockImplementationOnce(() => new Promise((resolve) => { resolveEarlierModels = resolve; }));

    const earlier = callAppMethod(app, "openModelDialog");
    await callAppMethod(app, "openThinkingDialog");
    const latest = appModelDialog(app);
    resolveEarlierModels?.([{ provider: "provider", id: "earlier" }]);
    await earlier;

    expect(appModelDialog(app)).toBe(latest);
    expect(appModelDialog(app)?.options.map((option) => option.value)).toEqual(["provider/latest"]);
    const container = document.createElement("div");
    document.body.append(container);
    const renderDialog: unknown = Reflect.get(app, "renderModelDialog");
    if (typeof renderDialog !== "function") throw new Error("Settings renderer missing");
    render(Reflect.apply(renderDialog, app, []), container);
    expect(container.querySelector("thinking-picker")).toBeInstanceOf(ThinkingPicker);
    expect(container.querySelector("model-picker")).toBeNull();
  });

  it("discards an in-flight picker load after the rendered menu is cancelled", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, { selectedSession, status: sessionStatus(selectedSession.id) });
    await callAppMethod(app, "openModelDialog");
    const container = document.createElement("div");
    document.body.append(container);
    const renderDialog: unknown = Reflect.get(app, "renderModelDialog");
    if (typeof renderDialog !== "function") throw new Error("Settings renderer missing");
    render(Reflect.apply(renderDialog, app, []), container);
    const picker = container.querySelector("model-picker");
    if (!(picker instanceof ModelPicker)) throw new Error("Model menu missing");
    let resolveModels: ((models: SessionModel[]) => void) | undefined;
    vi.spyOn(SessionController.prototype, "listModels").mockImplementationOnce(() => new Promise((resolve) => { resolveModels = resolve; }));

    const pending = callAppMethod(app, "openThinkingDialog");
    picker.onCancel?.();
    resolveModels?.([{ provider: "provider", id: "late" }]);
    await pending;

    expect(appModelDialog(app)).toBeUndefined();
    expect(appThinkingDialog(app)).toBeUndefined();
    render(Reflect.apply(renderDialog, app, []), container);
    expect(container.querySelector("model-picker, thinking-picker")).toBeNull();
  });

  it("renders the compact picker and keeps it open until a model switch succeeds", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, { selectedSession, status: sessionStatus(selectedSession.id, { provider: "openai", id: "model-a" }) });
    vi.spyOn(SessionController.prototype, "listModels").mockResolvedValue([{ provider: "openai", id: "model-a" }, { provider: "provider", id: "model-b" }]);
    vi.spyOn(SessionController.prototype, "listModelCatalog").mockResolvedValue([]);
    await callAppMethod(app, "openModelDialog");
    const original = appModelDialog(app);
    const container = document.createElement("div");
    document.body.append(container);
    const renderDialog: unknown = Reflect.get(app, "renderModelDialog");
    if (typeof renderDialog !== "function") throw new Error("Model dialog renderer missing");
    render(Reflect.apply(renderDialog, app, []), container);
    const picker = container.querySelector("model-picker");
    if (!(picker instanceof ModelPicker)) throw new Error("Model menu missing");
    await picker.updateComplete;
    expect(picker.popoverMode).toBe(true);
    expect(picker.selectedValue).toBe("openai/model-a");
    expect(picker.thinking).toBeUndefined();
    expect(picker.renderRoot.querySelector("thinking-picker")).toBeNull();
    let resolveChange: ((applied: boolean) => void) | undefined;
    const change = vi.spyOn(SessionController.prototype, "setModel").mockImplementation(() => new Promise((resolve) => { resolveChange = resolve; }));
    const failing = picker.onPick?.("provider/model-b");
    expect(appModelDialog(app)).toBe(original);
    resolveChange?.(false);
    await expect(failing).resolves.toBe(false);
    expect(appModelDialog(app)).toBe(original);
    change.mockResolvedValue(true);
    await expect(picker.onPick?.("provider/model-b")).resolves.toBe(true);
    expect(change).toHaveBeenCalledWith("provider", "model-b");
    expect(appModelDialog(app)).toBeUndefined();
    expect(appThinkingDialog(app)).toBeUndefined();
  });

  it("rejects unavailable choices and closes the current choice without a request", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, { selectedSession, status: sessionStatus(selectedSession.id, { provider: "provider", id: "model-a" }) });
    vi.spyOn(SessionController.prototype, "listModels").mockResolvedValue([{ provider: "provider", id: "model-a" }]);
    vi.spyOn(SessionController.prototype, "listModelCatalog").mockResolvedValue([]);
    await callAppMethod(app, "openModelDialog");
    const select = vi.spyOn(SessionController.prototype, "setModel");
    await expect(pickModel(app, "provider/unavailable")).resolves.toBe(false);
    expect(select).not.toHaveBeenCalled();
    expect(appModelDialog(app)).toBeDefined();
    await expect(pickModel(app, "provider/model-a")).resolves.toBe(true);
    expect(appModelDialog(app)).toBeUndefined();
    expect(appThinkingDialog(app)).toBeUndefined();
    expect(select).not.toHaveBeenCalled();
  });

  it("does not close a replacement menu after an earlier selection completes", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, { selectedSession, status: sessionStatus(selectedSession.id) });
    vi.spyOn(SessionController.prototype, "listModels").mockResolvedValue([{ provider: "provider", id: "model-a" }]);
    vi.spyOn(SessionController.prototype, "listModelCatalog").mockResolvedValue([]);
    await callAppMethod(app, "openModelDialog");
    let resolveChange: ((applied: boolean) => void) | undefined;
    vi.spyOn(SessionController.prototype, "setModel").mockImplementation(() => new Promise((resolve) => { resolveChange = resolve; }));
    const changing = pickModel(app, "provider/model-a");
    await callAppMethod(app, "openModelDialog");
    const replacement = appModelDialog(app);
    resolveChange?.(true);
    await expect(changing).resolves.toBe(true);
    expect(appModelDialog(app)).toBe(replacement);
  });
});

async function pickModel(app: PiWebApp, value: string): Promise<boolean> {
  const method: unknown = Reflect.get(app, "pickModel");
  if (typeof method !== "function") throw new Error("Model selection unavailable");
  const result: unknown = await Reflect.apply(method, app, [value]);
  if (typeof result !== "boolean") throw new Error("Model selection did not report an outcome");
  return result;
}

describe("thinking slider orchestration", () => {
  it("opens the independent slider from the composer and binds its anchor, values, and default action", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, {
      selectedSession,
      sessions: [selectedSession],
      status: { ...sessionStatus(selectedSession.id, { provider: "provider", id: "model" }), thinkingLevel: "low" },
    });
    vi.spyOn(SessionController.prototype, "listThinkingLevels").mockResolvedValue(["low", "high"]);
    const { container, editor } = await mountComposer(app);
    const anchor = editor.thinkingAnchor;
    if (!(anchor instanceof HTMLButtonElement)) throw new Error("Thinking control missing");

    anchor.click();
    await vi.waitFor(() => { expect(appThinkingDialog(app)).toBeDefined(); });
    render(app.render(), container);
    const picker = container.querySelector("thinking-picker");
    if (!(picker instanceof ThinkingPicker)) throw new Error("Thinking slider missing");
    await picker.updateComplete;

    expect(container.querySelector("model-picker")).toBeNull();
    expect(picker.embedded).toBe(false);
    expect(picker.anchor).toBe(anchor);
    expect(picker.selectedValue).toBe("low");
    expect(picker.defaultValue).toBe("high");
    expect(picker.options.map((option) => option.value)).toEqual(["low", "high"]);
    const save = vi.spyOn(SessionController.prototype, "setSessionDefaults").mockResolvedValue({ defaultThinkingLevel: "low" });
    const setDefault = picker.renderRoot.querySelector<HTMLButtonElement>(".set-default");
    if (setDefault === null) throw new Error("Thinking default action missing");
    setDefault.click();
    await vi.waitFor(() => { expect(save).toHaveBeenCalledWith({ thinkingLevel: "low" }); });
    expect(appThinkingDialog(app)?.defaultValue).toBe("low");
  });

  it.each(["openModelDialog", "openThinkingDialog"] as const)("dismisses both settings from %s and clears both when moving to a session with the same model", async (entry) => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    const model = { provider: "provider", id: "model" };
    setAppState(app, { selectedSession, status: sessionStatus(selectedSession.id, model) });
    await callAppMethod(app, entry);
    const container = document.createElement("div");
    document.body.append(container);
    const renderDialog: unknown = Reflect.get(app, "renderModelDialog");
    if (typeof renderDialog !== "function") throw new Error("Model menu renderer missing");
    render(Reflect.apply(renderDialog, app, []), container);
    const picker = container.querySelector(entry === "openModelDialog" ? "model-picker" : "thinking-picker");
    if (!(picker instanceof ModelPicker) && !(picker instanceof ThinkingPicker)) throw new Error("Settings picker missing");
    picker.onCancel?.();
    expect(appModelDialog(app)).toBeUndefined();
    expect(appThinkingDialog(app)).toBeUndefined();
    await callAppMethod(app, "openThinkingDialog");
    expect(appModelDialog(app)).toBeDefined();
    const replacement = session("session-2");
    applyAppStatePatch(app, { selectedSession: replacement, status: sessionStatus(replacement.id, model) });
    expect(appModelDialog(app)).toBeUndefined();
    expect(appThinkingDialog(app)).toBeUndefined();
  });

  it("reflects external strength changes and can select the previous value again", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    const status = { ...sessionStatus(selectedSession.id), thinkingLevel: "low" };
    setAppState(app, { selectedSession, sessions: [selectedSession], status });
    vi.spyOn(SessionController.prototype, "listThinkingLevels").mockResolvedValue(["low", "high"]);
    await callAppMethod(app, "openThinkingDialog");
    const dialog = appThinkingDialog(app);
    applyAppStatePatch(app, { status: { ...status, thinkingLevel: "high" } });
    const container = document.createElement("div");
    document.body.append(container);
    const renderDialog: unknown = Reflect.get(app, "renderModelDialog");
    if (typeof renderDialog !== "function") throw new Error("Thinking dialog renderer missing");
    render(Reflect.apply(renderDialog, app, []), container);
    const picker = container.querySelector("thinking-picker");
    if (!(picker instanceof ThinkingPicker)) throw new Error("Thinking slider missing");
    expect(container.querySelector("model-picker")).toBeNull();
    expect(picker.embedded).toBe(false);
    await picker.updateComplete;
    expect(picker.selectedValue).toBe("high");
    expect(appThinkingDialog(app)).toBe(dialog);

    const change = vi.spyOn(SessionController.prototype, "setThinkingLevel").mockImplementation((value) => {
      applyAppStatePatch(app, { status: { ...status, thinkingLevel: value } });
      return Promise.resolve(true);
    });
    const range = picker.renderRoot.querySelector<HTMLInputElement>('input[type="range"]');
    if (range === null) throw new Error("Thinking slider control missing");
    range.value = "0";
    range.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => { expect(change).toHaveBeenCalledWith("low"); });
    expect(appThinkingDialog(app)?.selectedValue).toBe("low");
  });

  it("does not open levels loaded for a previous model", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, { selectedSession, status: sessionStatus(selectedSession.id, { provider: "provider", id: "old" }) });
    let resolveLevels: ((levels: string[]) => void) | undefined;
    vi.spyOn(SessionController.prototype, "listThinkingLevels").mockImplementation(() => new Promise((resolve) => { resolveLevels = resolve; }));
    const opening = callAppMethod(app, "openThinkingDialog");
    applyAppStatePatch(app, { status: sessionStatus(selectedSession.id, { provider: "provider", id: "new" }) });
    resolveLevels?.(["low", "high"]);
    await opening;
    expect(appThinkingDialog(app)).toBeUndefined();
    expect(appModelDialog(app)).toBeUndefined();
  });

  it("keeps the slider open and uses the actual applied strength without saving defaults", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    const status = { ...sessionStatus(selectedSession.id, { provider: "provider", id: "model" }), thinkingLevel: "low" };
    setAppState(app, { selectedSession, status });
    vi.spyOn(SessionController.prototype, "listThinkingLevels").mockResolvedValue(["low", "medium", "high"]);
    await callAppMethod(app, "openThinkingDialog");
    const saveDefault = vi.spyOn(SessionController.prototype, "setSessionDefaults");
    const setThinking = vi.spyOn(SessionController.prototype, "setThinkingLevel").mockImplementation(() => {
      applyAppStatePatch(app, { status: { ...status, thinkingLevel: "medium" } });
      return Promise.resolve(true);
    });
    expect(await pickThinking(app, "high")).toBe(true);
    expect(setThinking).toHaveBeenCalledWith("high");
    expect(appThinkingDialog(app)).toMatchObject({ selectedValue: "medium", defaultValue: "high" });
    expect(saveDefault).not.toHaveBeenCalled();
  });

  it("retains the original strength on failure and ignores unsupported choices", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, { selectedSession, status: { ...sessionStatus(selectedSession.id), thinkingLevel: "low" } });
    vi.spyOn(SessionController.prototype, "listThinkingLevels").mockResolvedValue(["low", "high"]);
    await callAppMethod(app, "openThinkingDialog");
    const original = appThinkingDialog(app);
    const setThinking = vi.spyOn(SessionController.prototype, "setThinkingLevel").mockResolvedValue(false);
    expect(await pickThinking(app, "max")).toBe(false);
    expect(setThinking).not.toHaveBeenCalled();
    expect(await pickThinking(app, "high")).toBe(false);
    expect(appThinkingDialog(app)).toBe(original);
  });

  it("does not overwrite a replacement slider after a request finishes", async () => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    setAppState(app, { selectedSession, status: { ...sessionStatus(selectedSession.id), thinkingLevel: "low" } });
    vi.spyOn(SessionController.prototype, "listThinkingLevels").mockResolvedValue(["low", "high"]);
    await callAppMethod(app, "openThinkingDialog");
    let resolveChange: ((applied: boolean) => void) | undefined;
    vi.spyOn(SessionController.prototype, "setThinkingLevel").mockImplementation(() => new Promise((resolve) => { resolveChange = resolve; }));
    const changing = pickThinking(app, "high");
    await callAppMethod(app, "openThinkingDialog");
    const replacement = appThinkingDialog(app);
    resolveChange?.(true);
    expect(await changing).toBe(false);
    expect(appThinkingDialog(app)).toBe(replacement);
    applyAppStatePatch(app, { status: sessionStatus(selectedSession.id, { provider: "provider", id: "different" }) });
    expect(appThinkingDialog(app)).toBeUndefined();
  });
});

describe("composer context selection", () => {
  it.each(["machine", "workspace"] as const)("opens real %s choices and delegates selection to navigation", async (kind) => {
    const app = new PiWebApp();
    const selectedSession = session("session-1");
    const local: Machine = { id: "local", name: "Local", kind: "local", createdAt: "now", updatedAt: "now" };
    const remote: Machine = { ...local, id: "remote", name: "Remote", kind: "remote", baseUrl: "https://remote.example" };
    const main: Workspace = { id: "main", projectId: "project", path: "/repo", label: "Main", isMain: true, effectiveConfig: {} };
    const feature: Workspace = { ...main, id: "feature", path: "/repo-feature", label: "Feature", isMain: false };
    setAppState(app, {
      selectedSession,
      sessions: [selectedSession],
      selectedMachine: local,
      machines: [local, remote],
      selectedWorkspace: main,
      workspaces: [main, feature],
    });
    const actions = appNavigationActions(app);
    const selectMachine = vi.spyOn(actions, "selectMachine").mockReturnValue(undefined);
    const selectWorkspace = vi.spyOn(actions, "selectWorkspace").mockReturnValue(undefined);
    const { container, editor } = await mountComposer(app);
    const control = editor.renderRoot.querySelector<HTMLButtonElement>(kind === "machine" ? ".machine-chip" : ".folder-chip");
    if (control === null) throw new Error(`${kind} composer control missing`);
    const menu = async () => {
      control.click();
      render(app.render(), container);
      const picker = container.querySelector("command-picker");
      if (!(picker instanceof CommandPicker)) throw new Error(`${kind} picker missing`);
      await picker.updateComplete;
      return picker;
    };
    const picker = await menu();
    const currentId = kind === "machine" ? local.id : main.id;
    const nextId = kind === "machine" ? remote.id : feature.id;
    expect(picker.options.map((option) => option.value)).toEqual([currentId, nextId]);
    expect(picker.options[0]?.label).toContain(`${kind === "machine" ? local.name : main.label} ✓`);
    expect(picker.options[1]?.label).toContain(kind === "machine" ? remote.name : feature.label);
    const updatedRemote = { ...remote, name: "Updated remote" };
    const updatedFeature = { ...feature, label: "Updated feature" };
    // Selection resolves the current object, even if the list changed while
    // the chooser was open.
    applyAppStatePatch(app, kind === "machine" ? { machines: [local, updatedRemote] } : { workspaces: [main, updatedFeature] });
    const choices = picker.renderRoot.querySelectorAll<HTMLButtonElement>(".options button");
    choices[1]?.click();

    if (kind === "machine") {
      expect(selectMachine).toHaveBeenCalledExactlyOnceWith(updatedRemote);
      expect(selectWorkspace).not.toHaveBeenCalled();
    } else {
      expect(selectWorkspace).toHaveBeenCalledExactlyOnceWith(updatedFeature);
      expect(selectMachine).not.toHaveBeenCalled();
    }
    render(app.render(), container);
    expect(container.querySelector("command-picker")).toBeNull();

    const current = await menu();
    current.renderRoot.querySelector<HTMLButtonElement>(".options button")?.click();
    render(app.render(), container);
    expect(container.querySelector("command-picker")).toBeNull();
    const cancelled = await menu();
    cancelled.renderRoot.querySelector<HTMLButtonElement>('button[aria-label="Close"]')?.click();
    render(app.render(), container);
    expect(container.querySelector("command-picker")).toBeNull();
    expect(selectMachine.mock.calls.length + selectWorkspace.mock.calls.length).toBe(1);
  });
});

async function mountComposer(app: PiWebApp): Promise<{ container: HTMLDivElement; editor: PromptEditor }> {
  vi.spyOn(api, "commands").mockResolvedValue([]);
  const container = document.createElement("div");
  document.body.append(container);
  // Render the real template without starting PiWebApp's API/socket bootstrap.
  render(app.render(), container);
  const editor = container.querySelector("prompt-editor");
  if (!(editor instanceof PromptEditor)) throw new Error("Composer missing");
  Object.defineProperty(app, "promptEditor", { configurable: true, value: editor });
  await editor.updateComplete;
  return { container, editor };
}

interface ComposerNavigationActions {
  selectMachine: (machine: Machine) => void;
  selectWorkspace: (workspace: Workspace) => void;
}

function appNavigationActions(app: PiWebApp): ComposerNavigationActions {
  const actions: unknown = Reflect.get(app, "navigationActions");
  if (!isComposerNavigationActions(actions)) throw new Error("Navigation actions missing");
  return actions;
}

function isComposerNavigationActions(actions: unknown): actions is ComposerNavigationActions {
  return typeof actions === "object" && actions !== null
    && "selectMachine" in actions && typeof actions.selectMachine === "function"
    && "selectWorkspace" in actions && typeof actions.selectWorkspace === "function";
}

function appThinkingDialog(app: PiWebApp): AppState["thinkingDialog"] {
  const state: unknown = Reflect.get(app, "state");
  if (!isAppState(state)) throw new Error("Missing app state");
  return state.thinkingDialog;
}

async function pickThinking(app: PiWebApp, value: string): Promise<boolean> {
  const method: unknown = Reflect.get(app, "pickThinking");
  if (typeof method !== "function") throw new Error("Thinking selection unavailable");
  const result: unknown = await Reflect.apply(method, app, [value]);
  if (typeof result !== "boolean") throw new Error("Thinking selection did not report an outcome");
  return result;
}

async function callDefaultHandler(app: PiWebApp, name: "handleSetDefaultModel" | "handleSetDefaultThinking", value: string): Promise<void> {
  const handler: unknown = Reflect.get(app, name);
  if (typeof handler !== "function") throw new Error(`Missing ${name}`);
  await Reflect.apply(handler, app, [value]);
}

type AppModelDialog = AppState["modelDialog"];

async function callAppMethod(app: PiWebApp, name: "openModelDialog" | "openThinkingDialog"): Promise<void> {
  const method: unknown = Reflect.get(app, name);
  if (typeof method !== "function") throw new Error(`PiWebApp ${name} was unavailable`);
  await Reflect.apply(method, app, []);
}

async function callToggleHandler(app: PiWebApp, provider: string, modelId: string, enabled: boolean): Promise<void> {
  const handler: unknown = Reflect.get(app, "handleToggleModelEnabled");
  if (typeof handler !== "function") throw new Error("PiWebApp model toggle handler was unavailable");
  await Reflect.apply(handler, app, [provider, modelId, enabled]);
}

async function callScopeHandler(app: PiWebApp, mode: "all" | "current"): Promise<void> {
  const handler: unknown = Reflect.get(app, "handleSetModelScope");
  if (typeof handler !== "function") throw new Error("PiWebApp model scope handler was unavailable");
  await Reflect.apply(handler, app, [mode]);
}

function appModelDialog(app: PiWebApp): AppModelDialog {
  const state: unknown = Reflect.get(app, "state");
  if (!isAppState(state)) throw new Error("PiWebApp state was unavailable");
  return state.modelDialog;
}

function isAppState(value: unknown): value is AppState {
  return typeof value === "object" && value !== null && "modelDialog" in value;
}

function setAppState(app: PiWebApp, patch: Partial<AppState>): void {
  if (!Reflect.set(app, "state", { ...initialAppState(), ...patch })) throw new Error("Could not set PiWebApp state");
}

function applyAppStatePatch(app: PiWebApp, patch: Partial<AppState>): void {
  const setState: unknown = Reflect.get(app, "setState");
  if (typeof setState !== "function") throw new Error("PiWebApp state updater was unavailable");
  Reflect.apply(setState, app, [patch]);
}

function session(id: string): SessionInfo {
  return {
    id,
    cwd: "/repo",
    path: `/repo/${id}.jsonl`,
    created: "2026-07-20T00:00:00.000Z",
    modified: "2026-07-20T00:00:00.000Z",
    messageCount: 1,
    firstMessage: id,
  };
}

function sessionStatus(sessionId: string, model?: SessionModel): SessionStatus {
  return {
    sessionId,
    isStreaming: false,
    isCompacting: false,
    isBashRunning: false,
    pendingMessageCount: 0,
    queuedMessages: [],
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    cost: 0,
    ...(model === undefined ? {} : { model }),
  };
}
