import { afterEach, describe, expect, it, vi } from "vitest";
import { changeStagedImageCompression, type PromptImageCompressor } from "./promptImageCompression";
import { clearStagedAttachments, loadStagedAttachments, moveStagedAttachments, saveStagedAttachments } from "./promptAttachmentStaging";
import type { PromptImageData } from "./promptAttachmentCapture";

const original: PromptImageData = { name: "screenshot.png", mimeType: "image/png", data: "original", size: 4000 };
const compressed: PromptImageData = { name: "screenshot.webp", mimeType: "image/webp", data: "compressed", size: 1000 };
const origin = "local:compression-a";
const destination = "local:compression-real";

afterEach(() => {
  clearStagedAttachments(origin);
  clearStagedAttachments(destination);
});

function stage(): void {
  saveStagedAttachments(origin, [{ id: "image-a", kind: "image", ...original }]);
}

function pendingCompression() {
  let finish: ((value: PromptImageData) => void) | undefined;
  const compress: PromptImageCompressor = () => new Promise((resolve) => { finish = resolve; });
  return { compress, finish: () => { if (finish === undefined) throw new Error("Compression was not started"); finish(compressed); } };
}

describe("staged image compression", () => {
  it("keeps the original byte-for-byte and allows restoring it after compression", async () => {
    stage();
    await changeStagedImageCompression(origin, "image-a", "compressed", () => Promise.resolve(compressed));
    expect(loadStagedAttachments(origin)[0]).toMatchObject({ ...compressed, originalImage: original, imageCompression: "compressed" });
    await changeStagedImageCompression(origin, "image-a", "original");
    expect(loadStagedAttachments(origin)[0]).toMatchObject({ ...original, imageCompression: "original" });
  });

  it("never replaces an image with a larger encoding", async () => {
    stage();
    await changeStagedImageCompression(origin, "image-a", "compressed", () => Promise.resolve({ ...compressed, size: 5000 }));
    expect(loadStagedAttachments(origin)[0]).toMatchObject(original);
  });

  it("follows temporary-session handoffs during processing and keeps newer attachments", async () => {
    stage();
    const pending = pendingCompression();
    const operation = changeStagedImageCompression(origin, "image-a", "compressed", pending.compress);
    expect(loadStagedAttachments(origin)[0]).toMatchObject({ imageProcessing: true });
    moveStagedAttachments(origin, destination);
    saveStagedAttachments(destination, [...loadStagedAttachments(destination), { id: "newer", kind: "file", name: "notes.txt", mimeType: "text/plain", data: "newer", size: 5 }]);
    pending.finish();
    await operation;
    expect(loadStagedAttachments(origin)).toEqual([]);
    expect(loadStagedAttachments(destination)).toHaveLength(2);
    expect(loadStagedAttachments(destination)[0]).toMatchObject(compressed);
  });

  it("does not resurrect a removed or already sent attachment", async () => {
    stage();
    const pending = pendingCompression();
    const operation = changeStagedImageCompression(origin, "image-a", "compressed", pending.compress);
    clearStagedAttachments(origin);
    pending.finish();
    await operation;
    expect(loadStagedAttachments(origin)).toEqual([]);
  });

  it("retains the original and surfaces a processing error", async () => {
    stage();
    await changeStagedImageCompression(origin, "image-a", "compressed", () => Promise.reject(new Error("decode failed")));
    const attachment = loadStagedAttachments(origin)[0];
    expect(attachment).toMatchObject(original);
    expect(attachment?.kind === "image" && attachment.imageProcessingError).toBeTruthy();
    expect(attachment?.kind === "image" && attachment.imageProcessing).not.toBe(true);
  });

  it("preserves GIF animation by excluding it from compression", async () => {
    saveStagedAttachments(origin, [{ id: "image-a", kind: "image", ...original, mimeType: "image/gif" }]);
    const compress = vi.fn<PromptImageCompressor>();
    await changeStagedImageCompression(origin, "image-a", "compressed", compress);
    expect(compress).not.toHaveBeenCalled();
    expect(loadStagedAttachments(origin)[0]).toMatchObject({ mimeType: "image/gif" });
  });
});
