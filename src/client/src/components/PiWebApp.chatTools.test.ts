// @vitest-environment happy-dom
import { LitElement } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, type Machine, type SessionInfo, type Workspace } from "../api";
import { initialAppState, type AppState } from "../appState";
import { AppShellController } from "../appShell/appShellController";
import { ChatScrollFlows } from "../ChatScrollFlows";
import { CommandPicker } from "./CommandPicker";
import { ComposerOptionsDialog } from "./ComposerOptionsDialog";
import { ModalSurface } from "./ModalSurface";
import { AuthController } from "../controllers/authController";
import { SessionController } from "../controllers/sessionController";
import { PluginRegistry } from "../plugins/registry";
import { loadDraft } from "../promptDraftStorage";
import type { QuotedChatSelection } from "../quotedSelection";
import { ChatView } from "./ChatView";
import { PiWebApp } from "./PiWebApp";
import { PromptEditor } from "./PromptEditor";

// Keep the real shell/composer lifecycle while omitting unrelated network bootstrap.
class ChatToolsApp extends PiWebApp {
  override connectedCallback(): void { LitElement.prototype.connectedCallback.call(this); }
}
customElements.define("chat-tools-test-app", ChatToolsApp);

const session: SessionInfo = { id: "source-session", cwd: "/repo", path: "/sessions/source.jsonl", created: "now", modified: "now", messageCount: 1, firstMessage: "hello" };
const workspace: Workspace = { id: "workspace", projectId: "project", path: "/repo", label: "Main", isMain: true, effectiveConfig: {} };
const machine: Machine = { id: "local", name: "Local", kind: "local", createdAt: "now", updatedAt: "now" };
const selection: QuotedChatSelection = { machineId: "local", sessionId: session.id, entryId: "source-entry", text: "first line\nsecond line" };
const controllers: SessionController[] = [];
const registries: PluginRegistry[] = [];

afterEach(async () => {
  document.body.replaceChildren();
  for (const controller of controllers.splice(0)) controller.dispose();
  for (const registry of registries.splice(0)) await registry.dispose();
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

function deferred<T>() {
  let resolve: ((value: T) => void) | undefined;
  const promise = new Promise<T>((finish) => { resolve = finish; });
  return { promise, resolve: (value: T) => { if (resolve === undefined) throw new Error("Missing deferred resolver"); resolve(value); } };
}

async function mountedApp(mobile = false) {
  const app = new ChatToolsApp();
  const shell: unknown = Reflect.get(app, "appShell");
  if (!(shell instanceof AppShellController)) throw new Error("Missing app shell");
  shell.isMobileNavigationLayout = mobile;
  await Reflect.get(app, "builtInPluginsReady");
  const registry: unknown = Reflect.get(app, "plugins");
  const controller: unknown = Reflect.get(app, "sessions");
  const modes: unknown = Reflect.get(app, "verifiedPluginModeByMachine");
  if (!(registry instanceof PluginRegistry) || !(controller instanceof SessionController) || !(modes instanceof Map)) throw new Error("App collaborators unavailable");
  registries.push(registry);
  controllers.push(controller);
  modes.set("local", "recovery-disabled");
  let state: AppState = { ...initialAppState(), selectedMachine: machine, selectedWorkspace: workspace, selectedSession: session, sessions: [session], messages: [{ role: "assistant", entryId: "source-entry", parts: [{ type: "text", text: selection.text }] }] };
  Reflect.set(app, "state", state);
  document.body.append(app);
  const settle = async () => {
    await app.updateComplete;
    const editor = app.renderRoot.querySelector("prompt-editor");
    const view = app.renderRoot.querySelector("chat-view");
    if (!(editor instanceof PromptEditor) || !(view instanceof ChatView) || view.onQuoteSelection === undefined) throw new Error("Expected wired chat and composer");
    await editor.updateComplete;
    await view.updateComplete;
    return { editor, view, quote: view.onQuoteSelection };
  };
  const select = async (target: SessionInfo) => {
    state = { ...state, selectedSession: target, sessions: [target] };
    Reflect.set(app, "state", state);
    return settle();
  };
  const patch = async (value: Partial<AppState>) => {
    state = { ...state, ...value };
    Reflect.set(app, "state", state);
    return settle();
  };
  return { app, controller, select, patch, shell, ...await settle() };
}

describe("quoted selection → real app composer", () => {
  it("appends a same-session quote and preserves the user's existing selected draft", async () => {
    const host = await mountedApp();
    host.editor.replaceText("Keep this draft");
    host.editor.view?.dispatch({ selection: { anchor: 0, head: 4 } });
    await host.quote(selection, false);
    expect(host.editor.view?.state.doc.toString()).toBe("Keep this draft\n\n> first line\n> second line\n\n");
    expect(loadDraft(`local:${session.id}`)).toBe("Keep this draft\n\n> first line\n> second line\n\n");
    expect(host.editor.view?.state.selection.main.head).toBe(host.editor.view?.state.doc.length);
  });

  it("does not insert into another conversation selected in the same workspace while creation is pending", async () => {
    const host = await mountedApp();
    const created = { ...session, id: "created-session" };
    const pending = deferred<SessionInfo | undefined>();
    vi.spyOn(host.controller, "startSessionWithResult").mockReturnValue(pending.promise);
    const legacy = vi.spyOn(host.controller, "startSession");
    const quoting = host.quote(selection, true);
    const other = await host.select({ ...session, id: "other-session" });
    other.editor.replaceText("Other draft stays untouched");
    pending.resolve(created);
    await quoting;
    expect(other.editor.view?.state.doc.toString()).toBe("Other draft stays untouched");
    expect(loadDraft("local:other-session")).toBe("Other draft stays untouched");
    expect(legacy).not.toHaveBeenCalled();
  });

  it("adds the quote only to the actual returned new session and preserves its pending draft", async () => {
    const host = await mountedApp();
    host.editor.replaceText("Original draft");
    const created = { ...session, id: "actual-created-session" };
    const pending = deferred<SessionInfo | undefined>();
    const start = vi.spyOn(host.controller, "startSessionWithResult").mockReturnValue(pending.promise);
    const quoting = host.quote(selection, true);
    const selected = await host.select(created);
    selected.editor.replaceText("New session draft");
    pending.resolve(created);
    await quoting;
    expect(start).toHaveBeenCalledOnce();
    expect(selected.editor.view?.state.doc.toString()).toBe("New session draft\n\n> first line\n> second line\n\n");
    expect(loadDraft(`local:${session.id}`)).toBe("Original draft");
  });

  it("keeps the original draft and reports failed new-session creation", async () => {
    const host = await mountedApp();
    host.editor.replaceText("Original draft");
    vi.spyOn(host.controller, "startSessionWithResult").mockResolvedValue(undefined);
    await expect(host.quote(selection, true)).rejects.toThrow();
    expect(host.editor.view?.state.doc.toString()).toBe("Original draft");
  });
});

describe("session creation result contract", () => {
  it("returns the actual SessionInfo while retaining the legacy Promise<void> method", async () => {
    let state: AppState = { ...initialAppState(), selectedWorkspace: workspace, selectedSession: session, sessions: [session] };
    const created = { ...session, id: "returned-session" };
    const start = vi.fn<typeof api.startSession>().mockResolvedValue(created);
    const controller = new SessionController(() => state, (patch) => { state = { ...state, ...patch }; }, () => undefined, undefined, {
      api: { ...api, startSession: start },
      navigateToSession: (target) => { state = { ...state, selectedSession: target }; return Promise.resolve(true); },
    });
    controllers.push(controller);
    await expect(controller.startSessionWithResult({ updateUrl: false })).resolves.toBe(created);
    await expect(controller.startSession({ updateUrl: false })).resolves.toBeUndefined();
    expect(start).toHaveBeenCalledTimes(2);
    expect(state.selectedSession?.id).toBe(created.id);
  });
});

describe("HTML export from the composer", () => {
  it("reports a failed export without submitting a model prompt or rejecting the send handler", async () => {
    const host = await mountedApp();
    const send = vi.spyOn(host.controller, "send");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "Transcript unavailable" }), { status: 404, headers: { "content-type": "application/json" } }));
    if (host.editor.onSend === undefined) throw new Error("Expected wired composer send handler");
    await expect(host.editor.onSend("/export")).resolves.toBe(false);
    await host.app.updateComplete;
    expect(send).not.toHaveBeenCalled();
    expect(host.app.renderRoot.textContent).toContain("Transcript unavailable");
  });
});

describe("local authentication commands from the composer", () => {
  it("accepts /login without submitting a model prompt", async () => {
    const host = await mountedApp();
    const send = vi.spyOn(host.controller, "send");
    if (host.editor.onSend === undefined) throw new Error("Expected wired composer send handler");
    await expect(host.editor.onSend("/login")).resolves.toBe(true);
    expect(send).not.toHaveBeenCalled();
    const auth: unknown = Reflect.get(host.app, "auth");
    if (!(auth instanceof AuthController)) throw new Error("Expected authentication controller");
    auth.closeDialog();
    await host.app.updateComplete;
  });
});


describe("mobile More sheet in the real app", () => {
  async function open(host: Awaited<ReturnType<typeof mountedApp>>) {
    const trigger = host.editor.renderRoot.querySelector<HTMLButtonElement>(".mobile-options-toggle");
    if (trigger === null) throw new Error("Missing More trigger");
    // This harness exercises focus routing, not responsive CSS. Expose the
    // mobile opener to the modal registry's visibility guard at its desktop size.
    trigger.style.display = "inline-grid";
    trigger.focus();
    trigger.click();
    await host.app.updateComplete;
    await host.editor.updateComplete;
    const dialog = host.app.renderRoot.querySelector("composer-options-dialog");
    if (!(dialog instanceof ComposerOptionsDialog)) throw new Error("Missing More sheet");
    await dialog.updateComplete;
    const surface = dialog.renderRoot.querySelector("modal-surface");
    if (!(surface instanceof ModalSurface)) throw new Error("Missing sheet surface");
    await surface.updateComplete;
    return { trigger, dialog, surface };
  }

  it("cancels back to More without losing the draft and closes before jumping with transcript focus", async () => {
    const host = await mountedApp(true);
    const input = host.editor.view;
    host.editor.replaceText("Unsent mobile draft");
    expect(host.view.mobileNavigationExternal).toBe(true);
    const { trigger, dialog } = await open(host);
    dialog.renderRoot.querySelector<HTMLButtonElement>(".close")?.click();
    await host.app.updateComplete;
    expect(host.editor.shadowRoot?.activeElement).toBe(trigger);
    expect(host.editor.view).toBe(input);
    expect(host.editor.view?.state.doc.toString()).toBe("Unsent mobile draft");
    for (const action of ["top", "end"] as const) {
      const spy = vi.spyOn(ChatScrollFlows.prototype, action === "top" ? "jumpToTop" : "jumpToEnd").mockImplementation(() => undefined);
      const reopened = await open(host);
      reopened.dialog.renderRoot.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)?.click();
      await host.app.updateComplete;
      await Promise.resolve();
      expect(host.app.renderRoot.querySelector("composer-options-dialog")).toBeNull();
      expect(spy).toHaveBeenCalledOnce();
      expect(host.view.shadowRoot?.activeElement).toBe(host.view.renderRoot.querySelector(".chat"));
      expect(host.editor.view?.state.doc.toString()).toBe("Unsent mobile draft");
      spy.mockRestore();
    }
  });

  it("hands focus to the existing workspace picker and restores the More opener on cancel", async () => {
    const host = await mountedApp(true);
    const { trigger, dialog } = await open(host);
    dialog.renderRoot.querySelector<HTMLButtonElement>('[data-action="workspace"]')?.click();
    await host.app.updateComplete;
    await Promise.resolve();
    await host.app.updateComplete;
    expect(host.app.renderRoot.querySelector("composer-options-dialog")).toBeNull();
    const command = host.app.renderRoot.querySelector("command-picker");
    if (!(command instanceof CommandPicker)) throw new Error("Missing context picker");
    await command.updateComplete;
    const surface = command.shadowRoot?.querySelector("modal-surface");
    if (!(surface instanceof ModalSurface)) throw new Error("Missing context picker surface");
    await surface.updateComplete;
    surface.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true, cancelable: true }));
    await host.app.updateComplete;
    expect(host.editor.shadowRoot?.activeElement).toBe(trigger);
  });

  it("closes on session/desktop transitions and retains standalone jumps while composer is inert", async () => {
    const host = await mountedApp(true);
    await open(host);
    await host.select({ ...session, id: "other-mobile-session" });
    expect(host.app.renderRoot.querySelector("composer-options-dialog")).toBeNull();
    await open(host);
    host.shell.isMobileNavigationLayout = false;
    host.app.requestUpdate();
    await host.app.updateComplete;
    expect(host.app.renderRoot.querySelector("composer-options-dialog")).toBeNull();
    host.shell.isMobileNavigationLayout = true;
    const next = await host.patch({ status: {
      sessionId: "other-mobile-session", recentlyActiveElsewhere: true,
      isStreaming: false, isCompacting: false, isBashRunning: false, pendingMessageCount: 0, queuedMessages: [],
      tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, cost: 0,
    } });
    expect(next.editor.hasAttribute("inert")).toBe(true);
    expect(next.view.mobileNavigationExternal).toBe(false);
    expect(next.view.renderRoot.querySelectorAll(".chat-jumps button")).toHaveLength(2);
  });
});
