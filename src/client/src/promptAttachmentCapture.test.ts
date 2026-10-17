// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { PromptEditor } from "./components/PromptEditor";
import { capturePromptAttachments, DEFAULT_FILE_MIME_TYPE, effectivePromptAttachmentDelivery, READ_FAILURE_MESSAGE, type CapturableFile } from "./promptAttachmentCapture";
import { clearStagedAttachments, saveStagedAttachments } from "./promptAttachmentStaging";

const composerSessionId = "attachment-wiring";

afterEach(() => {
  document.body.replaceChildren();
  clearStagedAttachments(`local:${composerSessionId}`);
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function file(name: string, type: string, size = 10): CapturableFile {
  return { name, type, size };
}

describe("capturePromptAttachments", () => {
  it("reads supported images as native inline image attachments", async () => {
    const result = await capturePromptAttachments(
      [file("shot.png", "image/png"), file("pic.webp", "image/webp")],
      (f) => Promise.resolve(`data-for-${f.name}`),
    );

    expect(result.error).toBeUndefined();
    expect(result.attachments).toEqual([
      { kind: "image", name: "shot.png", mimeType: "image/png", data: "data-for-shot.png", size: 10 },
      { kind: "image", name: "pic.webp", mimeType: "image/webp", data: "data-for-pic.webp", size: 10 },
    ]);
  });

  it("captures generic files with their browser MIME type", async () => {
    const result = await capturePromptAttachments(
      [file("report.pdf", "application/pdf", 1234), file("vector.svg", "image/svg+xml")],
      (f) => Promise.resolve(`data-for-${f.name}`),
    );

    expect(result.error).toBeUndefined();
    expect(result.attachments).toEqual([
      { kind: "file", name: "report.pdf", mimeType: "application/pdf", data: "data-for-report.pdf", size: 1234 },
      { kind: "file", name: "vector.svg", mimeType: "image/svg+xml", data: "data-for-vector.svg", size: 10 },
    ]);
  });

  it("uses application/octet-stream when the browser does not provide a MIME type", async () => {
    const result = await capturePromptAttachments([file("archive", "")], () => Promise.resolve("x"));

    expect(result.attachments[0]).toMatchObject({ kind: "file", name: "archive", mimeType: DEFAULT_FILE_MIME_TYPE });
  });

  it("derives fallback names for unnamed pasted attachments", async () => {
    const result = await capturePromptAttachments(
      [file("", "image/jpeg"), file("", "application/pdf")],
      () => Promise.resolve("x"),
    );

    expect(result.attachments.map((attachment) => attachment.name)).toEqual(["pasted-image.jpg", "pasted-file.bin"]);
  });

  it("reports a read failure without dropping other attachments", async () => {
    const result = await capturePromptAttachments(
      [file("bad.png", "image/png"), file("good.txt", "text/plain")],
      (f) => f.name === "bad.png" ? Promise.reject(new Error("boom")) : Promise.resolve("ok"),
    );

    expect(result.error).toBe(READ_FAILURE_MESSAGE);
    expect(result.attachments.map((attachment) => attachment.name)).toEqual(["good.txt"]);
  });

  it("returns no attachments and no error for an empty batch", async () => {
    const result = await capturePromptAttachments([], () => Promise.resolve("x"));
    expect(result).toEqual({ attachments: [] });
  });
});

describe("effectivePromptAttachmentDelivery", () => {
  it("preserves inline delivery when all pending attachments are supported images", () => {
    expect(effectivePromptAttachmentDelivery("inline", [{ kind: "image", mimeType: "image/png" }])).toBe("inline");
  });

  it("preserves an explicit folder preference for supported images", () => {
    expect(effectivePromptAttachmentDelivery("folder", [{ kind: "image", mimeType: "image/png" }])).toBe("folder");
  });

  it("forces folder delivery when any attachment is a generic file", () => {
    expect(effectivePromptAttachmentDelivery("inline", [
      { kind: "image", mimeType: "image/png" },
      { kind: "file", mimeType: "application/pdf" },
    ])).toBe("folder");
  });
});

describe("PromptEditor attachment wiring", () => {
  it("captures pasted files, strips data URL prefixes, and keeps successful reads when others fail", async () => {
    const editor = new PromptEditor();
    editor.sessionId = composerSessionId;
    const onSend = vi.fn<NonNullable<PromptEditor["onSend"]>>();
    editor.onSend = onSend;
    document.body.append(editor);
    await editor.updateComplete;
    editor.replaceText("inspect attachments");
    installFileReaderStub([
      { kind: "load", result: "data:image/png;base64,UE5H" },
      { kind: "error", error: new DOMException("File unavailable", "NotReadableError") },
    ]);
    const pasteEvent = pasteEventWithFiles([
      new File(["png"], "shot.png", { type: "image/png" }),
      new File(["pdf"], "report.pdf", { type: "application/pdf" }),
    ]);
    const footer = editor.renderRoot.querySelector("footer");
    if (footer === null) throw new Error("Expected composer paste surface");
    footer.dispatchEvent(pasteEvent);
    await flushMicrotasks();
    await editor.updateComplete;
    expect(pasteEvent.defaultPrevented).toBe(true);
    expect(editor.renderRoot.querySelector(".attachment-error")?.textContent).toContain(READ_FAILURE_MESSAGE);
    expect(editor.renderRoot.querySelectorAll(".attachment-card")).toHaveLength(1);
    editor.renderRoot.querySelector<HTMLButtonElement>(".send-button")?.click();
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("inspect attachments", undefined, [
      { kind: "image", mimeType: "image/png", data: "UE5H", name: "shot.png" },
    ], "inline", undefined);
  });

  it("removes a pending attachment chip before sending the remaining attachments", async () => {
    saveStagedAttachments(`local:${composerSessionId}`, [
      { id: "attachment-1", kind: "file", name: "report.pdf", mimeType: "application/pdf", data: "UkVQT1JU", size: 6 },
      { id: "attachment-2", kind: "image", name: "shot.png", mimeType: "image/png", data: "UE5H", size: 3 },
    ]);
    const editor = new PromptEditor();
    editor.sessionId = composerSessionId;
    const onSend = vi.fn<NonNullable<PromptEditor["onSend"]>>();
    editor.onSend = onSend;
    document.body.append(editor);
    await editor.updateComplete;
    editor.replaceText("please review");
    editor.renderRoot.querySelector<HTMLButtonElement>('button[aria-label="Remove report.pdf"]')?.click();
    await editor.updateComplete;
    expect([...editor.renderRoot.querySelectorAll(".attachment-card-name")].map((element) => element.textContent)).toEqual(["shot.png"]);
    editor.renderRoot.querySelector<HTMLButtonElement>(".send-button")?.click();
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("please review", undefined, [
      { kind: "image", mimeType: "image/png", data: "UE5H", name: "shot.png" },
    ], "inline", undefined);
  });
});

type StubFileReaderOutcome =
  | { kind: "load"; result: string }
  | { kind: "error"; error: DOMException };

function installFileReaderStub(outcomes: StubFileReaderOutcome[]): void {
  class StubFileReader {
    onerror: (() => void) | null = null;
    onload: (() => void) | null = null;
    error: DOMException | null = null;
    result: string | ArrayBuffer | null = null;

    readAsDataURL(): void {
      const outcome = outcomes.shift();
      if (outcome === undefined) throw new Error("Unexpected FileReader.readAsDataURL call");
      if (outcome.kind === "error") {
        this.error = outcome.error;
        this.onerror?.();
        return;
      }
      this.result = outcome.result;
      this.onload?.();
    }
  }

  vi.stubGlobal("FileReader", StubFileReader);
}


function pasteEventWithFiles(files: readonly File[]): Event {
  const event = new Event("paste", { cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { files } });
  return event;
}

async function flushMicrotasks(): Promise<void> {
  for (let remaining = 0; remaining < 10; remaining += 1) await Promise.resolve();
}
