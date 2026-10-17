// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearStagedAttachments, loadStagedAttachments, moveStagedAttachments } from "../promptAttachmentStaging";
import { PromptEditor } from "./PromptEditor";

class DeferredFileReader {
  static pending: DeferredFileReader[] = [];
  result: string | null = null;
  error: DOMException | null = null;
  onload: (() => void) | undefined;
  onerror: (() => void) | undefined;

  readAsDataURL(): void { DeferredFileReader.pending.push(this); }

  finish(): void {
    this.result = "data:text/plain;base64,aGVsbG8=";
    this.onload?.();
  }

  fail(): void {
    this.error = new DOMException("Read failed");
    this.onerror?.();
  }
}

async function settle(editor: PromptEditor): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await editor.updateComplete;
}

function startRead(editor: PromptEditor, name: string): DeferredFileReader {
  const input = editor.renderRoot.querySelector<HTMLInputElement>('input[type="file"]');
  if (input === null) throw new Error("Expected attachment input");
  Object.defineProperty(input, "files", { value: [new File(["hello"], name, { type: "text/plain" })], configurable: true });
  const index = DeferredFileReader.pending.length;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  const reader = DeferredFileReader.pending[index];
  if (reader === undefined) throw new Error("Expected pending file read");
  return reader;
}

async function mountEditor(sessionId = "capture-a"): Promise<PromptEditor> {
  const editor = new PromptEditor();
  editor.sessionId = sessionId;
  document.body.append(editor);
  await editor.updateComplete;
  return editor;
}

async function startCapture(): Promise<{ editor: PromptEditor; reader: DeferredFileReader }> {
  const editor = await mountEditor();
  return { editor, reader: startRead(editor, "notes.txt") };
}

beforeEach(() => {
  DeferredFileReader.pending = [];
  vi.stubGlobal("FileReader", DeferredFileReader);
});

afterEach(() => {
  document.body.replaceChildren();
  for (const key of ["local:capture-a", "local:capture-b", "local:capture-real", "remote:capture-a"]) clearStagedAttachments(key);
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("attachment reads across composer changes", () => {
  it.each(["session", "machine"] as const)("retains a pending attachment for its original %s without adding it to the new composer", async (destination) => {
    const { editor, reader } = await startCapture();
    if (destination === "session") editor.sessionId = "capture-b";
    else editor.machineId = "remote";
    await editor.updateComplete;
    reader.finish();
    await settle(editor);
    expect(editor.renderRoot.querySelector(".attachment-card")).toBeNull();

    editor.machineId = "local";
    editor.sessionId = "capture-a";
    await editor.updateComplete;
    expect(editor.renderRoot.querySelector(".attachment-card-name")?.textContent).toBe("notes.txt");
  });

  it("does not show a retired composer's file read failure in another conversation", async () => {
    const { editor, reader } = await startCapture();
    editor.sessionId = "capture-b";
    await editor.updateComplete;
    reader.fail();
    await settle(editor);
    expect(editor.renderRoot.querySelector(".attachment-error")).toBeNull();
  });

  it("retains a pending attachment when its original editor is unmounted", async () => {
    const { editor, reader } = await startCapture();
    editor.remove();
    reader.finish();
    await settle(editor);
    const replacement = new PromptEditor();
    replacement.sessionId = "capture-a";
    document.body.append(replacement);
    await replacement.updateComplete;
    expect(replacement.renderRoot.querySelector(".attachment-card-name")?.textContent).toBe("notes.txt");
  });

  it("does not resurrect an attachment removed after reading when the editor is remounted", async () => {
    const { editor, reader } = await startCapture();
    reader.finish();
    await settle(editor);
    editor.renderRoot.querySelector<HTMLButtonElement>(".attachment-remove")?.click();
    await editor.updateComplete;
    editor.remove();
    const replacement = new PromptEditor();
    replacement.sessionId = "capture-a";
    document.body.append(replacement);
    await replacement.updateComplete;
    expect(replacement.renderRoot.querySelector(".attachment-card")).toBeNull();
  });

  it("delivers an old reader to a replacement composer without restoring removed files or replacing newer attachments", async () => {
    const { editor, reader } = await startCapture();
    reader.finish();
    await settle(editor);
    const late = startRead(editor, "late.txt");
    editor.remove();
    const replacement = await mountEditor();
    replacement.renderRoot.querySelector<HTMLButtonElement>(".attachment-remove")?.click();
    await replacement.updateComplete;
    startRead(replacement, "fresh.txt").finish();
    await settle(replacement);
    late.finish();
    await settle(replacement);

    const names = () => [...replacement.renderRoot.querySelectorAll(".attachment-card-name")].map((element) => element.textContent);
    expect(names()).toEqual(["fresh.txt", "late.txt"]);
    const staged = loadStagedAttachments("local:capture-a");
    expect(new Set(staged.map((attachment) => attachment.id)).size).toBe(2);
    replacement.renderRoot.querySelector<HTMLButtonElement>(".attachment-remove")?.click();
    await replacement.updateComplete;
    expect(names()).toEqual(["late.txt"]);
    replacement.remove();
    const restored = await mountEditor();
    expect([...restored.renderRoot.querySelectorAll(".attachment-card-name")].map((element) => element.textContent)).toEqual(["late.txt"]);
  });

  it("follows a temporary-to-real session handoff even when no file has finished reading yet", async () => {
    const { editor, reader } = await startCapture();
    moveStagedAttachments("local:capture-a", "local:capture-real");
    editor.sessionId = "capture-real";
    await editor.updateComplete;
    reader.finish();
    await settle(editor);
    expect(editor.renderRoot.querySelector(".attachment-card-name")?.textContent).toBe("notes.txt");
    expect(loadStagedAttachments("local:capture-a")).toEqual([]);
    expect(loadStagedAttachments("local:capture-real").map((attachment) => attachment.name)).toEqual(["notes.txt"]);
  });
});
