// @vitest-environment happy-dom
import { undo } from "@codemirror/commands";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearStagedAttachments, saveStagedAttachments } from "../promptAttachmentStaging";
import { PromptEditor } from "./PromptEditor";

afterEach(() => {
  document.body.replaceChildren();
  clearStagedAttachments("local:composer-enhancements");
  localStorage.clear();
  vi.restoreAllMocks();
});

async function mount(): Promise<PromptEditor> {
  const editor = new PromptEditor();
  editor.sessionId = "composer-enhancements";
  editor.inputHistory = ["first prompt", "latest prompt", "first prompt"];
  document.body.append(editor);
  await editor.updateComplete;
  return editor;
}

function press(editor: PromptEditor, key: string, options: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true, ...options });
  editor.view?.contentDOM.dispatchEvent(event);
  return event;
}

function paste(editor: PromptEditor, html: string, text: string): ClipboardEvent {
  const event = new ClipboardEvent("paste", { bubbles: true, composed: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { files: [], getData: (type: string) => type === "text/html" ? html : text } });
  editor.view?.contentDOM.dispatchEvent(event);
  return event;
}

describe("prompt input history", () => {
  it("opens from an empty prompt, selects with arrows, inserts with Tab, and can undo", async () => {
    const editor = await mount();
    press(editor, "ArrowUp");
    await editor.updateComplete;
    const options = editor.renderRoot.querySelectorAll('[role="option"]');
    expect([...options].map((item) => item.textContent)).toEqual(["first prompt", "latest prompt"]);
    press(editor, "ArrowDown");
    await editor.updateComplete;
    expect(editor.view?.contentDOM.getAttribute("aria-activedescendant")).toBe("prompt-history-1");
    press(editor, "Tab");
    await editor.updateComplete;
    expect(editor.view?.state.doc.toString()).toBe("latest prompt");
    expect(editor.renderRoot.querySelector('[role="listbox"]')).toBeNull();
    if (editor.view === undefined) throw new Error("Editor missing");
    undo(editor.view);
    expect(editor.view.state.doc.toString()).toBe("");
  });

  it("leaves existing drafts and IME input alone and closes with Escape without editing", async () => {
    const editor = await mount();
    press(editor, "ArrowUp", { isComposing: true });
    await editor.updateComplete;
    expect(editor.renderRoot.querySelector('[role="listbox"]')).toBeNull();
    editor.replaceText("draft");
    press(editor, "ArrowUp");
    await editor.updateComplete;
    expect(editor.renderRoot.querySelector('[role="listbox"]')).toBeNull();
    editor.replaceText("");
    press(editor, "ArrowUp");
    await editor.updateComplete;
    press(editor, "Escape");
    await editor.updateComplete;
    expect(editor.renderRoot.querySelector('[role="listbox"]')).toBeNull();
    expect(editor.view?.state.doc.toString()).toBe("");
  });

  it("resets history when switching conversations", async () => {
    const editor = await mount();
    press(editor, "ArrowUp");
    await editor.updateComplete;
    editor.sessionId = "another-conversation";
    await editor.updateComplete;
    expect(editor.renderRoot.querySelector('[role="listbox"]')).toBeNull();
  });
});

describe("linked web clipboard text", () => {
  it("replaces the selected text in one undoable paste transaction", async () => {
    const editor = await mount();
    editor.replaceText("Read old text");
    editor.view?.dispatch({ selection: { anchor: 5, head: 13 } });
    const event = paste(editor, '<p><a href="https://example.com">the guide</a></p>', "the guide");
    expect(event.defaultPrevented).toBe(true);
    expect(editor.view?.state.doc.toString()).toBe("Read [the guide](<https://example.com/>)");
    if (editor.view === undefined) throw new Error("Editor missing");
    undo(editor.view);
    expect(editor.view.state.doc.toString()).toBe("Read old text");
  });

  it("keeps pasted link labels plain inside code fences", async () => {
    const editor = await mount();
    editor.replaceText("```\n\n```");
    editor.view?.dispatch({ selection: { anchor: 4 } });
    paste(editor, '<a href="https://example.com">the guide</a>', "the guide");
    expect(editor.view?.state.doc.toString()).toBe("```\nthe guide\n```");
  });
});

describe("image compression controls", () => {
  it("defaults to original quality, shows sizes, and blocks sending during processing", async () => {
    saveStagedAttachments("local:composer-enhancements", [{ id: "image", kind: "image", name: "screenshot.png", mimeType: "image/png", data: "original", size: 4000, imageProcessing: true }]);
    const editor = await mount();
    const select = editor.renderRoot.querySelector<HTMLSelectElement>(".attachment-image-controls select");
    expect(select?.value).toBe("original");
    expect(select?.disabled).toBe(true);
    expect(editor.renderRoot.querySelector<HTMLButtonElement>(".send-button")?.disabled).toBe(true);
    const onSend = vi.fn();
    editor.onSend = onSend;
    press(editor, "Enter");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("can restore the original from a compressed attachment through the rendered control", async () => {
    const original = { name: "screenshot.png", mimeType: "image/png", data: "original", size: 4000 };
    saveStagedAttachments("local:composer-enhancements", [{ id: "image", kind: "image", name: "screenshot.webp", mimeType: "image/webp", data: "processed", size: 1000, originalImage: original, imageCompression: "compressed" }]);
    const editor = await mount();
    expect(editor.renderRoot.querySelector(".attachment-image-controls")?.textContent).toContain("3.9 KB → 1000 B");
    const select = editor.renderRoot.querySelector<HTMLSelectElement>(".attachment-image-controls select");
    if (select === null) throw new Error("Image control missing");
    select.value = "original";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await editor.updateComplete;
    expect(editor.renderRoot.querySelector(".attachment-card-name")?.textContent).toBe("screenshot.png");
  });
});
