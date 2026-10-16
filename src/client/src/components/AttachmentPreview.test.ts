// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PendingAttachment } from "../promptAttachmentStaging";
import { AttachmentPreview } from "./AttachmentPreview";
import type { ModalSurface } from "./ModalSurface";

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

function textAttachment(text: string, name = "notes.txt", mimeType = "text/plain"): PendingAttachment {
  const bytes = new TextEncoder().encode(text);
  return { id: "file", kind: "file", name, mimeType, size: bytes.length, data: btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")) };
}

async function mount(attachment: PendingAttachment) {
  const preview = new AttachmentPreview();
  preview.attachment = attachment;
  document.body.append(preview);
  await preview.updateComplete;
  await preview.renderRoot.querySelector<ModalSurface>("modal-surface")?.updateComplete;
  return preview;
}

describe("local attachment preview", () => {
  it.each([
    ["report.html", "text/html", '<script>alert("unsafe")</script><iframe src="https://example.com"></iframe>'],
    ["drawing.svg", "image/svg+xml", '<svg onload="alert(1)"><script>alert(1)</script></svg>'],
  ])("renders %s as escaped text", async (name, mimeType, content) => {
    const preview = await mount(textAttachment(content, name, mimeType));
    expect(preview.renderRoot.querySelector("pre")?.textContent).toBe(content);
    expect(preview.renderRoot.querySelector("script, iframe, svg, img")).toBeNull();
  });

  it("bounds large UTF-8 previews without replacing a partial character", async () => {
    const prefix = "a".repeat(64 * 1024 - 1);
    const preview = await mount(textAttachment(`${prefix}你好`));
    expect(preview.renderRoot.querySelector("pre")?.textContent).toBe(prefix);
    expect(preview.renderRoot.querySelector(".preview-notice")?.textContent).toContain("first 64 KB");
  });

  it("shows malformed UTF-8 as a readable error with file details", async () => {
    const preview = await mount({ ...textAttachment(""), data: btoa(String.fromCharCode(0xc3, 0x28)), size: 2 });
    expect(preview.renderRoot.querySelector("pre")).toBeNull();
    expect(preview.renderRoot.querySelector('[role="status"]')?.textContent).toContain("could not be decoded");
    expect(preview.renderRoot.querySelector<HTMLDetailsElement>("details")?.open).toBe(true);
  });

  it("shows unknown binary file details without rendering an embedded document", async () => {
    const preview = await mount({ ...textAttachment("binary", "archive.zip", "application/zip"), size: 2048 });
    expect(preview.renderRoot.querySelector('[role="status"]')?.textContent).toContain("not available");
    expect(preview.renderRoot.querySelector("dl")?.textContent).toContain("application/zip");
    expect(preview.renderRoot.querySelector("dl")?.textContent).toContain("2.0 KB");
    expect(preview.renderRoot.querySelector("img, iframe, object, embed, pre")).toBeNull();
  });

  it("rejects NUL-containing content even when the extension suggests text", async () => {
    const preview = await mount(textAttachment("hello\0world"));
    expect(preview.renderRoot.querySelector("pre")).toBeNull();
    expect(preview.renderRoot.querySelector('[role="status"]')?.textContent).toContain("not available");
  });

  it("shows image loading failures and resets them for the next attachment", async () => {
    const preview = await mount({ ...textAttachment("png", "shot.png", "image/png"), kind: "image" });
    const image = preview.renderRoot.querySelector("img");
    expect(image?.getAttribute("src")).toBe("data:image/png;base64,cG5n");
    image?.dispatchEvent(new Event("error"));
    await preview.updateComplete;
    expect(preview.renderRoot.querySelector('[role="status"]')?.textContent).toContain("could not be displayed");
    preview.attachment = { ...textAttachment("gif", "next.gif", "image/gif"), kind: "image" };
    await preview.updateComplete;
    expect(preview.renderRoot.querySelector("img")?.getAttribute("alt")).toBe("next.gif");
  });

  it("routes close and removal through explicit callbacks", async () => {
    const preview = await mount(textAttachment("hello"));
    preview.onClose = vi.fn();
    preview.onRemove = vi.fn();
    await preview.updateComplete;
    preview.renderRoot.querySelector<HTMLButtonElement>(".preview-close")?.click();
    preview.renderRoot.querySelector<HTMLButtonElement>(".preview-remove")?.click();
    expect(preview.onClose).toHaveBeenCalledOnce();
    expect(preview.onRemove).toHaveBeenCalledOnce();
  });
});
