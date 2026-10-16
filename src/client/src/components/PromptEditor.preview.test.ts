// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearStagedAttachments, saveStagedAttachments } from "../promptAttachmentStaging";
import { PromptEditor } from "./PromptEditor";
import type { AttachmentPreview } from "./AttachmentPreview";
import type { ModalSurface } from "./ModalSurface";

const sessionId = "attachment-preview";
const attachment = { id: "notes", kind: "file" as const, name: "project-notes.txt", mimeType: "text/plain", data: "aGVsbG8=", size: 5 };

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  clearStagedAttachments(`local:${sessionId}`);
  clearStagedAttachments(`local:${sessionId}-next`);
  vi.restoreAllMocks();
});

async function mount() {
  saveStagedAttachments(`local:${sessionId}`, [attachment]);
  const editor = new PromptEditor();
  editor.sessionId = sessionId;
  editor.onSend = vi.fn();
  document.body.append(editor);
  await editor.updateComplete;
  return editor;
}

async function openPreview(editor: PromptEditor) {
  const trigger = editor.renderRoot.querySelector<HTMLButtonElement>(".attachment-preview-trigger");
  if (trigger === null) throw new Error("Attachment card is missing");
  trigger.focus();
  trigger.click();
  await editor.updateComplete;
  const preview = editor.renderRoot.querySelector<AttachmentPreview>("attachment-preview");
  if (preview === null) throw new Error("Attachment preview did not open");
  await preview.updateComplete;
  await preview.renderRoot.querySelector<ModalSurface>("modal-surface")?.updateComplete;
  return { preview, trigger };
}

describe("composer attachment cards", () => {
  it("shows the name, file type, and size and opens a local preview without sending", async () => {
    const editor = await mount();
    expect(editor.renderRoot.querySelector(".attachment-card-name")?.textContent).toBe("project-notes.txt");
    expect(editor.renderRoot.querySelector(".attachment-card-info")?.textContent).toBe("TXT · 5 B");
    const { preview } = await openPreview(editor);
    expect(preview.renderRoot.querySelector("pre")?.textContent).toBe("hello");
    expect(editor.onSend).not.toHaveBeenCalled();
  });

  it.each(["Escape", "close"])("restores card focus when dismissed with %s", async (action) => {
    const editor = await mount();
    const { preview, trigger } = await openPreview(editor);
    const close = preview.renderRoot.querySelector<HTMLButtonElement>(".preview-close");
    expect(preview.shadowRoot?.activeElement).toBe(close);
    if (action === "Escape") close?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
    else close?.click();
    await editor.updateComplete;
    expect(editor.renderRoot.querySelector("attachment-preview")).toBeNull();
    expect(editor.shadowRoot?.activeElement).toBe(trigger);
    expect(editor.renderRoot.querySelectorAll(".attachment-card")).toHaveLength(1);
  });

  it("closes and removes the attachment from its preview", async () => {
    const editor = await mount();
    const { preview } = await openPreview(editor);
    preview.renderRoot.querySelector<HTMLButtonElement>(".preview-remove")?.click();
    await editor.updateComplete;
    expect(editor.renderRoot.querySelector("attachment-preview")).toBeNull();
    expect(editor.renderRoot.querySelector(".attachment-card")).toBeNull();
    expect(editor.view?.hasFocus).toBe(true);
    expect(editor.onSend).not.toHaveBeenCalled();
  });

  it("closes an old preview when the composer switches to another session", async () => {
    const editor = await mount();
    await openPreview(editor);
    editor.sessionId = `${sessionId}-next`;
    await editor.updateComplete;
    expect(editor.renderRoot.querySelector("attachment-preview")).toBeNull();
    expect(editor.renderRoot.querySelector(".attachment-card")).toBeNull();
    editor.sessionId = sessionId;
    await editor.updateComplete;
    expect(editor.renderRoot.querySelectorAll(".attachment-card")).toHaveLength(1);
    expect(editor.renderRoot.querySelector("attachment-preview")).toBeNull();
  });
});
