// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { COMPOSER_SEND_DESKTOP, COMPOSER_SEND_MOBILE } from "../composerShortcuts";
import { PromptEditor } from "./PromptEditor";
import { ThinkingLevelLabel } from "./ThinkingLevelLabel";
import { api } from "../api";
import { clearStagedAttachments, saveStagedAttachments } from "../promptAttachmentStaging";

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  clearStagedAttachments("local:composer-attachments");
  vi.restoreAllMocks();
});

async function mount(shortcut: string | null, mobile = false) {
  const media = window.matchMedia("(pointer: coarse)");
  Object.defineProperty(media, "matches", { value: mobile });
  vi.spyOn(window, "matchMedia").mockReturnValue(media);
  const editor = new PromptEditor();
  editor.shortcuts = { [COMPOSER_SEND_DESKTOP]: shortcut, [COMPOSER_SEND_MOBILE]: shortcut };
  editor.onSend = vi.fn();
  document.body.append(editor);
  await editor.updateComplete;
  editor.replaceText("Hello");
  return editor;
}

function press(editor: PromptEditor, key: string, modifiers: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true, ...modifiers });
  editor.view?.contentDOM.dispatchEvent(event);
  return event;
}

describe("composer send behavior", () => {
  it.each([
    { preference: "steer" as const, streaming: false, compacting: false, expected: undefined },
    { preference: "steer" as const, streaming: true, compacting: false, expected: "steer" },
    { preference: "followUp" as const, streaming: true, compacting: false, expected: "followUp" },
    { preference: "steer" as const, streaming: true, compacting: true, expected: "followUp" },
    { preference: "followUp" as const, streaming: false, compacting: true, expected: "followUp" },
  ])("uses $expected for keyboard while keeping button behavior stable ($preference, streaming=$streaming, compacting=$compacting)", async ({ preference, streaming, compacting, expected }) => {
    const editor = await mount("mod+enter");
    editor.defaultStreamingBehavior = preference;
    editor.canSteer = streaming;
    editor.isCompacting = compacting;
    await editor.updateComplete;
    const highlighted = editor.renderRoot.querySelectorAll(".default-send-action");
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]?.getAttribute("aria-label")).toBe(expected === "steer" ? "Steer current response" : streaming || compacting ? "Queue message" : "Send message");
    press(editor, "Enter", { ctrlKey: true });
    if (editor.onSend === undefined) throw new Error("Missing send callback");
    expect(vi.mocked(editor.onSend).mock.calls[0]?.[1]).toBe(expected);
    editor.replaceText("Next message");
    const button = editor.shadowRoot?.querySelector<HTMLButtonElement>(".send-button");
    expect(button?.getAttribute("aria-label")).toBe(streaming || compacting ? "Queue message" : "Send message");
    button?.click();
    expect(editor.onSend).toHaveBeenCalledTimes(2);
    expect(vi.mocked(editor.onSend).mock.calls[1]?.[1]).toBe(streaming || compacting ? "followUp" : undefined);
    if (compacting) expect(editor.shadowRoot?.querySelector(".steer-button")).toBeNull();
  });

  it.each(["steer", "followUp"] as const)("keeps button order and steering action stable when keyboard default is %s", async (preference) => {
    const editor = await mount("mod+enter");
    expect(editor.defaultStreamingBehavior).toBe("steer");
    editor.defaultStreamingBehavior = preference;
    editor.canSteer = true;
    await editor.updateComplete;
    expect([...editor.renderRoot.querySelectorAll<HTMLButtonElement>(".composer-buttons button")].map((button) => button.getAttribute("aria-label"))).toEqual(["Queue message", "Steer current response", "Stop current work"]);
    const steer = editor.shadowRoot?.querySelector<HTMLButtonElement>(".steer-button");
    steer?.click();
    expect(editor.onSend).toHaveBeenCalledOnce();
    if (editor.onSend === undefined) throw new Error("Missing send callback");
    expect(vi.mocked(editor.onSend).mock.calls[0]?.[1]).toBe("steer");
    editor.defaultStreamingBehavior = preference === "steer" ? "followUp" : "steer";
    await editor.updateComplete;
    expect(editor.renderRoot.querySelector(".default-send-action")?.getAttribute("aria-label")).toBe(preference === "steer" ? "Queue message" : "Steer current response");
    expect([...editor.renderRoot.querySelectorAll<HTMLButtonElement>(".composer-buttons button")].map((button) => button.getAttribute("aria-label"))).toEqual(["Queue message", "Steer current response", "Stop current work"]);
  });

  it("explains pending submission while keeping stop available and the draft intact", async () => {
    const editor = await mount("mod+enter");
    editor.canSteer = true;
    editor.canStop = true;
    editor.sending = true;
    editor.onStop = vi.fn();
    await editor.updateComplete;

    expect(editor.renderRoot.querySelector("footer")?.getAttribute("aria-busy")).toBe("true");
    expect(editor.renderRoot.querySelector('[role="status"]')?.textContent).toBe("Sending…");
    expect(editor.renderRoot.querySelector<HTMLButtonElement>(".send-button")?.disabled).toBe(true);
    expect(editor.renderRoot.querySelector<HTMLButtonElement>(".steer-button")?.disabled).toBe(true);
    const stop = editor.renderRoot.querySelector<HTMLButtonElement>(".stop-button");
    expect(stop?.disabled).toBe(false);
    stop?.click();
    press(editor, "Enter", { ctrlKey: true });
    expect(editor.onStop).toHaveBeenCalledOnce();
    expect(editor.onSend).not.toHaveBeenCalled();
    expect(editor.view?.state.doc.toString()).toBe("Hello");

    editor.sending = false;
    editor.isCompacting = true;
    await editor.updateComplete;
    expect(editor.renderRoot.querySelector("footer")?.getAttribute("aria-busy")).toBe("false");
    expect(editor.renderRoot.querySelector('[role="status"]')?.textContent).toContain("next message will be queued");
    expect(editor.renderRoot.querySelector(".send-button .composer-action-label")?.textContent).toBe("Queue");
    expect(editor.renderRoot.querySelector(".steer-button")).toBeNull();
  });

  it("does not describe shell commands as queued while history compacts", async () => {
    const editor = await mount("mod+enter");
    editor.replaceText("!pwd");
    editor.isCompacting = true;
    await editor.updateComplete;

    expect(editor.renderRoot.querySelector("footer")?.classList.contains("shell-mode")).toBe(true);
    expect(editor.renderRoot.querySelector(".mode-hint")?.textContent).toContain("Shell command");
    expect(editor.renderRoot.querySelector('[role="status"]')).toBeNull();

    editor.sending = true;
    await editor.updateComplete;
    expect(editor.renderRoot.querySelector('[role="status"]')?.textContent).toBe("Sending…");
  });

  it("keeps the complete model identity available and model controls wired", async () => {
    const editor = await mount("mod+enter");
    const provider = "long-provider-name";
    const model = "a-long-model-name-with-a-large-context-window-and-version";
    editor.status = {
      sessionId: "composer-model", model: { provider, id: model },
      isStreaming: false, isCompacting: false, isBashRunning: false,
      pendingMessageCount: 0, queuedMessages: [],
      tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, cost: 0,
    };
    editor.onSelectModel = vi.fn();
    await editor.updateComplete;

    const label = editor.renderRoot.querySelector(".model-label");
    expect(label?.textContent).toBe(model);
    expect(label?.getAttribute("title")).toBe(`${provider}/${model}`);
    expect(editor.renderRoot.querySelector(".select-thinking")).toBeNull();
    editor.renderRoot.querySelector<HTMLButtonElement>(".select-model")?.click();
    expect(editor.onSelectModel).toHaveBeenCalledOnce();
  });

  it("updates the independent thinking control from status without replacing the editor", async () => {
    const editor = await mount("mod+enter");
    const status = {
      sessionId: "composer-thinking", model: { provider: "openai", id: "gpt-5" }, thinkingLevel: "low",
      isStreaming: false, isCompacting: false, isBashRunning: false,
      pendingMessageCount: 0, queuedMessages: [],
      tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, cost: 0,
    };
    editor.status = status;
    editor.cwd = "/projects/pi-web";
    editor.onSelectThinking = vi.fn();
    editor.onSelectMachine = vi.fn();
    editor.onSelectWorkspace = vi.fn();
    await editor.updateComplete;
    const content = editor.view?.contentDOM;
    expect(editor.renderRoot.querySelector(".thinking-label")?.textContent).toBe("low");
    const rollingLabel = editor.renderRoot.querySelector("thinking-level-label");
    if (!(rollingLabel instanceof ThinkingLevelLabel)) throw new Error("Rolling strength label missing");
    expect(rollingLabel.options.map((option) => option.value)).toEqual(["off", "minimal", "low", "medium", "high", "xhigh", "max"]);
    editor.status = { ...status, thinkingLevel: "high" };
    await editor.updateComplete;
    const thinking = editor.renderRoot.querySelector<HTMLButtonElement>(".select-thinking");
    expect(thinking?.getAttribute("aria-label")).toBe("Thinking strength: high");
    expect(rollingLabel.value).toBe("high");
    expect(editor.renderRoot.querySelector("thinking-level-label")).toBe(rollingLabel);
    expect(editor.thinkingAnchor).toBe(thinking);
    thinking?.click();
    expect(editor.onSelectThinking).toHaveBeenCalledOnce();
    expect(editor.view?.contentDOM).toBe(content);
    expect(editor.view?.state.doc.toString()).toBe("Hello");
    expect(editor.renderRoot.querySelector(".folder-chip")?.getAttribute("title")).toBe("/projects/pi-web");
    expect(editor.renderRoot.querySelector(".folder-chip span")?.textContent).toBe("pi-web");
    editor.renderRoot.querySelector<HTMLButtonElement>(".machine-chip")?.click();
    editor.renderRoot.querySelector<HTMLButtonElement>(".folder-chip")?.click();
    expect(editor.onSelectMachine).toHaveBeenCalledOnce();
    expect(editor.onSelectWorkspace).toHaveBeenCalledOnce();
  });

  it("keeps staged attachment names and delivery controls accessible as attachments are removed", async () => {
    const attachments = Array.from({ length: 4 }, (_, index) => ({
      id: `attachment-${String(index)}`, kind: "file" as const,
      name: `long-project-analysis-document-${String(index)}.txt`, mimeType: "text/plain", data: "aGVsbG8=", size: 5,
    }));
    saveStagedAttachments("local:composer-attachments", attachments);
    const editor = new PromptEditor();
    editor.sessionId = "composer-attachments";
    editor.onSend = vi.fn();
    document.body.append(editor);
    await editor.updateComplete;

    expect(editor.renderRoot.querySelector(".attachment-count")?.textContent).toBe("Attachments · 4");
    expect([...editor.renderRoot.querySelectorAll(".attachment-chip")].map((chip) => chip.getAttribute("title"))).toEqual(attachments.map((attachment) => attachment.name));
    const delivery = editor.renderRoot.querySelector<HTMLSelectElement>(".attachment-delivery select");
    expect(delivery?.getAttribute("aria-label")).toBe("How attachments are delivered to the agent");
    expect(delivery?.value).toBe("folder");
    editor.renderRoot.querySelector<HTMLButtonElement>(".attachment-remove")?.click();
    await editor.updateComplete;
    expect(editor.renderRoot.querySelector(".attachment-count")?.textContent).toBe("Attachments · 3");
    expect([...editor.renderRoot.querySelectorAll(".attachment-chip")].map((chip) => chip.getAttribute("title"))).toEqual(attachments.slice(1).map((attachment) => attachment.name));
    expect(editor.onSend).not.toHaveBeenCalled();
  });
});

describe("composer keyboard handling", () => {
  it("inserts newlines with Enter/Shift+Enter and sends with the configured combination", async () => {
    const editor = await mount("mod+enter");
    press(editor, "Enter");
    press(editor, "Enter", { shiftKey: true });
    expect(editor.view?.state.doc.toString()).toBe("Hello\n\n");
    expect(editor.onSend).not.toHaveBeenCalled();
    press(editor, "Enter", { ctrlKey: true });
    expect(editor.onSend).toHaveBeenCalledOnce();
  });

  it("claims send keys before global dispatch even when sending is unavailable", async () => {
    const editor = await mount("mod+enter");
    const ownership: boolean[] = [];
    const capture = (event: KeyboardEvent) => { ownership.push(editor.ownsKeyboardEvent(event)); };
    window.addEventListener("keydown", capture, true);
    try {
      editor.replaceText("");
      press(editor, "Enter", { ctrlKey: true });
      editor.disabled = true;
      await editor.updateComplete;
      press(editor, "Enter", { metaKey: true });
      press(editor, "k", { ctrlKey: true });
      expect(ownership).toEqual([true, true, false]);
      expect(editor.onSend).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("keydown", capture, true);
    }
  });

  it("keeps keyboard submission disabled with None while the send button works", async () => {
    const editor = await mount(null);
    press(editor, "Enter");
    press(editor, "Enter", { shiftKey: true });
    expect(editor.onSend).not.toHaveBeenCalled();
    editor.shadowRoot?.querySelector<HTMLButtonElement>(".send-button")?.click();
    expect(editor.onSend).toHaveBeenCalledOnce();
  });

  it("accepts a completion before sending on plain Enter", async () => {
    vi.spyOn(api, "commands").mockResolvedValue([{ name: "tree", source: "builtin" }]);
    const editor = await mount("enter");
    editor.sessionId = "test-session";
    editor.cwd = "/repo";
    await editor.updateComplete;
    editor.view?.dispatch({ changes: { from: 0, to: editor.view.state.doc.length, insert: "/tr" }, selection: { anchor: 3 } });
    await vi.waitFor(() => {
      const menu = editor.shadowRoot?.querySelector("autocomplete-menu");
      expect(menu?.shadowRoot?.textContent).toContain("/tree");
    });
    press(editor, "Enter");
    expect(editor.view?.state.doc.toString()).toBe("/tree ");
    expect(editor.onSend).not.toHaveBeenCalled();
  });

  it("does not submit while composing", async () => {
    const editor = await mount("enter");
    press(editor, "Enter", { isComposing: true });
    expect(editor.onSend).not.toHaveBeenCalled();
  });

  it("ignores touch autocapitalization but accepts explicit Shift+Enter", async () => {
    const editor = await mount("shift+enter", true);
    press(editor, "Enter", { shiftKey: true });
    expect(editor.onSend).not.toHaveBeenCalled();
    press(editor, "Shift", { shiftKey: true });
    press(editor, "Enter", { shiftKey: true });
    expect(editor.onSend).toHaveBeenCalledOnce();
  });
});
