// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadDraft, moveDraft } from "../promptDraftStorage";
import { clearStagedAttachments, loadStagedAttachments, moveStagedAttachments, saveStagedAttachments, type PendingAttachment } from "../promptAttachmentStaging";
import { PromptEditor } from "./PromptEditor";

const source = "local:submission-source";
const destination = "local:submission-destination";
const attachment: PendingAttachment = { id: "original", kind: "image", name: "clipboard.png", mimeType: "image/png", data: "QUJD", size: 3 };

afterEach(() => {
  document.body.replaceChildren();
  clearStagedAttachments(source);
  clearStagedAttachments(destination);
  localStorage.clear();
  vi.restoreAllMocks();
});

function deferred() {
  let resolve!: (accepted: boolean) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<boolean>((finish, fail) => { resolve = finish; reject = fail; });
  return { promise, resolve, reject };
}

async function mount(sessionId = "submission-source") {
  const editor = new PromptEditor();
  editor.sessionId = sessionId;
  document.body.append(editor);
  await editor.updateComplete;
  return editor;
}

async function settle(editor: PromptEditor) {
  await Promise.resolve();
  await editor.updateComplete;
  await Promise.resolve();
  await editor.updateComplete;
}

function clickSend(editor: PromptEditor) {
  const button = editor.renderRoot.querySelector<HTMLButtonElement>(".send-button");
  if (button === null) throw new Error("Missing send button");
  button.click();
}

describe("ordinary prompt submission recovery", () => {
  it.each(["rejected", "false"])("retains durable text and clipboard attachments after a %s send", async (failure) => {
    saveStagedAttachments(source, [attachment]);
    const editor = await mount();
    editor.replaceText("Unsent draft");
    const pending = deferred();
    editor.onSend = () => pending.promise;
    clickSend(editor);
    if (failure === "rejected") pending.reject(new Error("Offline"));
    else pending.resolve(false);
    await settle(editor);
    expect(editor.view?.state.doc.toString()).toBe("Unsent draft");
    expect(loadDraft(source)).toBe("Unsent draft");
    expect(loadStagedAttachments(source)).toEqual([attachment]);
    expect(editor.renderRoot.querySelector('[role="alert"]')).not.toBeNull();
    editor.sessionId = "submission-destination";
    await editor.updateComplete;
    editor.sessionId = "submission-source";
    await editor.updateComplete;
    expect(editor.view?.state.doc.toString()).toBe("Unsent draft");
  });

  it("consumes accepted input and permits the next streaming steer", async () => {
    saveStagedAttachments(source, [attachment]);
    const editor = await mount();
    editor.canSteer = true;
    editor.replaceText("First steering message");
    const pending = deferred();
    const send = vi.fn<NonNullable<PromptEditor["onSend"]>>().mockReturnValueOnce(pending.promise).mockResolvedValue(true);
    editor.onSend = send;
    clickSend(editor);
    await editor.updateComplete;
    clickSend(editor);
    expect(send).toHaveBeenCalledOnce();
    pending.resolve(true);
    await settle(editor);
    expect(editor.view?.state.doc.toString()).toBe("");
    expect(loadDraft(source)).toBe("");
    expect(loadStagedAttachments(source)).toEqual([]);
    editor.replaceText("Next steering message");
    clickSend(editor);
    await settle(editor);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("keeps edits and newly staged attachments made during successful delivery", async () => {
    saveStagedAttachments(source, [attachment]);
    const editor = await mount();
    editor.replaceText("Submitted draft");
    const pending = deferred();
    editor.onSend = () => pending.promise;
    clickSend(editor);
    editor.replaceText("Next draft");
    const added = { ...attachment, id: "new", name: "new.png" };
    saveStagedAttachments(source, [...loadStagedAttachments(source), added]);
    pending.resolve(true);
    await settle(editor);
    expect(editor.view?.state.doc.toString()).toBe("Next draft");
    expect(loadDraft(source)).toBe("Next draft");
    expect(loadStagedAttachments(source)).toEqual([added]);
  });

  it.each([false, true])("keeps completion scoped to the originating conversation (accepted=%s)", async (accepted) => {
    saveStagedAttachments(source, [attachment]);
    const editor = await mount();
    editor.replaceText("Source draft");
    const pending = deferred();
    editor.onSend = () => pending.promise;
    clickSend(editor);
    editor.sessionId = "submission-destination";
    await editor.updateComplete;
    editor.replaceText("Destination draft");
    pending.resolve(accepted);
    await settle(editor);
    expect(editor.view?.state.doc.toString()).toBe("Destination draft");
    expect(loadDraft(destination)).toBe("Destination draft");
    expect(loadDraft(source)).toBe(accepted ? "" : "Source draft");
    expect(loadStagedAttachments(source)).toEqual(accepted ? [] : [attachment]);
    editor.sessionId = "submission-source";
    await editor.updateComplete;
    expect(editor.view?.state.doc.toString()).toBe(accepted ? "" : "Source draft");
  });

  it.each([false, true])("follows a temporary session handoff (accepted=%s)", async (accepted) => {
    saveStagedAttachments(source, [attachment]);
    const editor = await mount();
    editor.replaceText("Pending session draft");
    const pending = deferred();
    editor.onSend = () => pending.promise;
    clickSend(editor);
    moveDraft(source, destination);
    moveStagedAttachments(source, destination);
    editor.sessionId = "submission-destination";
    pending.resolve(accepted);
    await settle(editor);
    expect(loadDraft(destination)).toBe(accepted ? "" : "Pending session draft");
    expect(editor.view?.state.doc.toString()).toBe(accepted ? "" : "Pending session draft");
    expect(loadStagedAttachments(destination)).toEqual(accepted ? [] : [attachment]);
  });

  it.each([false, true])("reconciles an accepted submission in a replacement composer (newer draft=%s)", async (edited) => {
    const original = await mount();
    original.replaceText("Submitted draft");
    const pending = deferred();
    original.onSend = () => pending.promise;
    clickSend(original);
    original.remove();
    const replacement = await mount();
    expect(replacement.view?.state.doc.toString()).toBe("Submitted draft");
    const sendAgain = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
    replacement.onSend = sendAgain;
    if (edited) replacement.replaceText("New draft");
    clickSend(replacement);
    expect(sendAgain).not.toHaveBeenCalled();
    pending.resolve(true);
    await settle(replacement);
    expect(replacement.view?.state.doc.toString()).toBe(edited ? "New draft" : "");
    expect(loadDraft(source)).toBe(edited ? "New draft" : "");
    replacement.replaceText("Next submission");
    clickSend(replacement);
    await settle(replacement);
    expect(sendAgain).toHaveBeenCalledOnce();
  });

  it("consumes accepted attachments even if the staging array was replaced with equivalent members", async () => {
    saveStagedAttachments(source, [attachment]);
    const editor = await mount();
    editor.replaceText("Submitted draft");
    const pending = deferred();
    editor.onSend = () => pending.promise;
    clickSend(editor);
    saveStagedAttachments(source, [...loadStagedAttachments(source)]);
    pending.resolve(true);
    await settle(editor);
    expect(loadDraft(source)).toBe("");
    expect(editor.view?.state.doc.toString()).toBe("");
    expect(loadStagedAttachments(source)).toEqual([]);
  });

  it("supports legacy ordinary void callbacks", async () => {
    const editor = await mount();
    editor.replaceText("Submitted draft");
    editor.onSend = vi.fn<(...args: unknown[]) => void>();
    clickSend(editor);
    await settle(editor);
    expect(editor.view?.state.doc.toString()).toBe("");
  });
});
