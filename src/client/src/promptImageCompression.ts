import { t } from "../../shared/i18n";
import type { PromptImageData } from "./promptAttachmentCapture";
import { beginStagedAttachmentCapture, loadStagedAttachments, saveStagedAttachments, type PendingAttachment } from "./promptAttachmentStaging";

type PendingImage = Extract<PendingAttachment, { kind: "image" }>;
export type PromptImageCompressor = (image: PromptImageData) => Promise<PromptImageData>;

/** The capture's key follows temporary-session handoffs until processing finishes. */
export async function changeStagedImageCompression(key: string, id: string, mode: "original" | "compressed", compress: PromptImageCompressor = compressPromptImage): Promise<void> {
  const attachment = loadStagedAttachments(key).find((item): item is PendingImage => item.id === id && item.kind === "image");
  if (attachment === undefined || attachment.imageProcessing === true) return;
  const original = attachment.originalImage ?? imageData(attachment);
  if (mode === "original") {
    replaceImage(key, id, { kind: "image", id, ...original, originalImage: original, imageCompression: "original" });
    return;
  }
  if (original.mimeType === "image/gif") return;
  const capture = beginStagedAttachmentCapture(key);
  const processing = { ...attachment, originalImage: original, imageProcessing: true };
  delete processing.imageProcessingError;
  replaceImage(key, id, processing);
  try {
    const processed = await compress(original);
    // A larger encoding must never inflate the user's selected image.
    const selected = processed.size < original.size ? processed : original;
    replaceImage(capture.key, id, { kind: "image", id, ...selected, originalImage: original, imageCompression: "compressed" });
  } catch {
    replaceImage(capture.key, id, { ...attachment, originalImage: original, imageProcessingError: t("ui.composer.imageCompressionFailed") });
  } finally {
    capture.dispose();
  }
}

function replaceImage(key: string, id: string, image: PendingImage): void {
  const current = loadStagedAttachments(key);
  if (!current.some((item) => item.id === id)) return;
  saveStagedAttachments(key, current.map((item) => item.id === id ? image : item));
}

function imageData(image: PromptImageData): PromptImageData {
  return { name: image.name, mimeType: image.mimeType, data: image.data, size: image.size };
}

/** WebP keeps transparency; GIFs are excluded by the caller to preserve animation. */
export async function compressPromptImage(original: PromptImageData): Promise<PromptImageData> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => { resolve(); };
    image.onerror = () => { reject(new Error("Unable to decode image")); };
    image.src = `data:${original.mimeType};base64,${original.data}`;
  });
  if (image.naturalWidth < 1 || image.naturalHeight < 1) throw new Error("Invalid image dimensions");
  const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("Image processing is unavailable");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result === null) reject(new Error("Unable to encode image"));
        else resolve(result);
      }, "image/webp", 0.85);
    });
    if (blob.type !== "image/webp" && blob.type !== "image/png") throw new Error("Unsupported image encoding");
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => { reject(reader.error ?? new Error("Unable to read processed image")); };
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result.slice(reader.result.indexOf(",") + 1));
        else reject(new Error("Invalid processed image"));
      };
      reader.readAsDataURL(blob);
    });
    const extension = blob.type === "image/webp" ? "webp" : "png";
    return { name: `${original.name.replace(/\.[^.]+$/, "")}.${extension}`, mimeType: blob.type, data, size: blob.size };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
