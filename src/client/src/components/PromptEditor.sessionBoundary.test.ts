// @vitest-environment happy-dom
import { redo, undo } from "@codemirror/commands";
import { Transaction } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, type SlashCommand } from "../api";
import { loadDraft, saveDraft } from "../promptDraftStorage";
import { AutocompleteMenu } from "./AutocompleteMenu";
import { PromptEditor } from "./PromptEditor";

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
});

async function mount(): Promise<PromptEditor> {
  const editor = new PromptEditor();
  editor.machineId = "local";
  editor.sessionId = "source";
  editor.cwd = "/repo";
  document.body.append(editor);
  await editor.updateComplete;
  return editor;
}

function viewOf(editor: PromptEditor): EditorView {
  if (editor.view === undefined) throw new Error("Prompt editor is not mounted");
  return editor.view;
}

function typeAtEnd(editor: PromptEditor, text: string): void {
  const view = viewOf(editor);
  const end = view.state.doc.length;
  view.dispatch({ changes: { from: end, insert: text }, selection: { anchor: end + text.length }, annotations: Transaction.userEvent.of("input.type") });
}

const destinations = [
  { name: "session", machineId: "local", sessionId: "destination" },
  { name: "machine", machineId: "remote", sessionId: "source" },
] as const;

describe.each(destinations)("composer $name boundaries", ({ machineId, sessionId }) => {
  it.each(["", "Private draft edited"])("resets undo and redo while preserving each draft, including matching text (%j)", async (destinationDraft) => {
    saveDraft("local:source", "Private draft");
    saveDraft(`${machineId}:${sessionId}`, destinationDraft);
    const editor = await mount();
    typeAtEnd(editor, " edited");
    expect(loadDraft("local:source")).toBe("Private draft edited");

    editor.machineId = machineId;
    editor.sessionId = sessionId;
    await editor.updateComplete;
    const view = viewOf(editor);
    expect(view.state.doc.toString()).toBe(destinationDraft);
    expect(undo(view)).toBe(false);
    expect(redo(view)).toBe(false);
    expect(loadDraft(`${machineId}:${sessionId}`)).toBe(destinationDraft);

    typeAtEnd(editor, " New edit");
    expect(undo(view)).toBe(true);
    expect(view.state.doc.toString()).toBe(destinationDraft);
    expect(redo(view)).toBe(true);
    expect(view.state.doc.toString()).toBe(`${destinationDraft} New edit`);

    editor.machineId = "local";
    editor.sessionId = "source";
    await editor.updateComplete;
    expect(viewOf(editor).state.doc.toString()).toBe("Private draft edited");
    expect(undo(viewOf(editor))).toBe(false);
    expect(redo(viewOf(editor))).toBe(false);
    expect(loadDraft(`${machineId}:${sessionId}`)).toBe(`${destinationDraft} New edit`);
  });

  it("ignores an old completion response when the destination restores an identical draft", async () => {
    let finishOld: ((commands: SlashCommand[]) => void) | undefined;
    const oldResponse = new Promise<SlashCommand[]>((resolve) => { finishOld = resolve; });
    const load = vi.spyOn(api, "commands").mockReturnValueOnce(oldResponse).mockResolvedValue([{ name: "destination-command", source: "extension" }]);
    saveDraft(`${machineId}:${sessionId}`, "/");
    const editor = await mount();
    typeAtEnd(editor, "/");
    expect(load).toHaveBeenNthCalledWith(1, { id: "source", cwd: "/repo" }, "local");

    editor.machineId = machineId;
    editor.sessionId = sessionId;
    await editor.updateComplete;
    expect(load).toHaveBeenNthCalledWith(2, { id: sessionId, cwd: "/repo" }, machineId);
    if (finishOld === undefined) throw new Error("Old completion request was not started");
    finishOld([{ name: "source-only-command", source: "extension" }]);
    await Promise.resolve();
    await Promise.resolve();
    await editor.updateComplete;
    const menu = editor.renderRoot.querySelector("autocomplete-menu");
    if (!(menu instanceof AutocompleteMenu)) throw new Error("Completion menu missing");
    await menu.updateComplete;
    expect(menu.renderRoot.querySelector(".label")?.textContent).toBe("/destination-command");
    expect(menu.renderRoot.textContent).not.toContain("source-only-command");
    expect(viewOf(editor).state.doc.toString()).toBe("/");
  });
});
