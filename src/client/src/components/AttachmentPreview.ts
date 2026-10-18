import { renderUiIcon } from "./uiIcons";
import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { t } from "../../../shared/i18n";
import type { PendingAttachment } from "../promptAttachmentStaging";
import { isInlinePromptAttachment } from "../promptAttachmentCapture";
import { formatFileSize } from "../utils/format";
import "./ModalSurface";

const MAX_TEXT_PREVIEW_BYTES = 64 * 1024;
const TEXT_FILE_EXTENSION = /\.(?:txt|md|markdown|log|csv|tsv|jsonl?|ya?ml|toml|ini|conf|cfg|xml|html?|svg|css|[cm]?js|[jt]sx?|py|sh|bash|zsh|fish|sql|rs|go|c|h|cpp|hpp|java|kt|swift|rb|php|cs|vue|svelte|tex|bib|lean)$/i;
const TEXT_FILE_NAME = /^(?:readme|licen[cs]e|makefile|dockerfile|\.gitignore|\.env(?:\..*)?)$/i;

type TextPreview = { kind: "text"; text: string; truncated: boolean } | { kind: "unavailable" | "invalid" };

/** Decode a bounded local UTF-8 preview. Content is rendered as text, never markup. */
function localTextPreview(attachment: PendingAttachment): TextPreview {
  const mime = attachment.mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  const textMime = mime.startsWith("text/") || mime.endsWith("+json") || mime.endsWith("+xml")
    || ["application/json", "application/xml", "application/javascript", "application/x-yaml", "application/yaml", "application/toml"].includes(mime);
  if (!textMime && !TEXT_FILE_EXTENSION.test(attachment.name) && !TEXT_FILE_NAME.test(attachment.name)) return { kind: "unavailable" };
  try {
    // Read a few extra bytes so truncation is based on payload, not file metadata.
    const encodedLimit = Math.ceil((MAX_TEXT_PREVIEW_BYTES + 4) / 3) * 4;
    const bytes = Uint8Array.from(atob(attachment.data.slice(0, encodedLimit)), (character) => character.charCodeAt(0));
    const truncated = bytes.length > MAX_TEXT_PREVIEW_BYTES;
    const previewBytes = bytes.subarray(0, MAX_TEXT_PREVIEW_BYTES);
    if (previewBytes.includes(0)) return { kind: "unavailable" };
    // Streaming decode holds a partially cut UTF-8 code point at the boundary.
    const text = new TextDecoder("utf-8", { fatal: true }).decode(previewBytes, { stream: truncated });
    return { kind: "text", text, truncated };
  } catch {
    return { kind: "invalid" };
  }
}

@customElement("attachment-preview")
export class AttachmentPreview extends LitElement {
  @property({ attribute: false }) attachment: PendingAttachment | undefined = undefined;
  @property({ attribute: false }) onClose?: () => void;
  @property({ attribute: false }) onRemove?: () => void;
  @state() private imageFailed = false;

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("attachment")) this.imageFailed = false;
  }

  override render() {
    const attachment = this.attachment;
    if (attachment === undefined) return nothing;
    const image = isInlinePromptAttachment(attachment);
    const content = image ? undefined : localTextPreview(attachment);
    return html`
      <modal-surface .label=${attachment.name} .initialFocus=${".preview-close"} .onClose=${() => this.onClose?.()}>
        <header>
          <strong>${attachment.name}</strong>
          <button class="preview-close" type="button" aria-label=${t("ui.attachmentPreview.close")} @click=${() => this.onClose?.()}>${renderUiIcon("close")}</button>
        </header>
        <div class="preview-body">
          ${image ? this.imageFailed ? html`<p class="preview-notice" role="status">${t("ui.attachmentPreview.imageFailed")}</p>` : html`
            <div class="image-preview"><img src=${`data:${attachment.mimeType};base64,${attachment.data}`} alt=${attachment.name} @error=${() => { this.imageFailed = true; }} /></div>
          ` : content?.kind === "text" ? html`
            <pre class="text-preview" tabindex="0">${content.text}</pre>
            ${content.truncated ? html`<p class="preview-notice">${t("ui.attachmentPreview.truncated")}</p>` : nothing}
          ` : html`<p class="preview-notice" role="status">${t(content?.kind === "invalid" ? "ui.attachmentPreview.invalidText" : "ui.attachmentPreview.unavailable")}</p>`}
          <details class="file-details" ?open=${!image && content?.kind !== "text"}>
            <summary>${t("ui.attachmentPreview.details")}</summary>
            <dl>
              <dt>${t("ui.attachmentPreview.fileName")}</dt><dd>${attachment.name}</dd>
              <dt>${t("ui.attachmentPreview.type")}</dt><dd>${attachment.mimeType}</dd>
              <dt>${t("ui.attachmentPreview.size")}</dt><dd>${formatFileSize(attachment.size)}</dd>
            </dl>
          </details>
        </div>
        ${this.onRemove === undefined ? nothing : html`<footer><button class="preview-remove" type="button" @click=${() => this.onRemove?.()}>${t("ui.attachmentPreview.remove")}</button></footer>`}
      </modal-surface>
    `;
  }

  static override styles = css`
    :host { position: fixed; inset: 0; z-index: 10; color: var(--pi-text); font: 400 13px/18px var(--pi-font-family, system-ui, sans-serif); }
    modal-surface { --modal-surface-width: min(900px, calc(100vw - 32px)); --modal-surface-max-height: min(820px, calc(100dvh - 32px)); --modal-surface-backdrop-padding: 16px; --modal-surface-radius: 16px; }
    header { display: flex; flex: none; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 0; }
    header strong { min-width: 0; max-height: 4.5em; overflow: auto; overflow-wrap: anywhere; font-size: 14px; font-weight: 500; line-height: 20px; }
    button { border: 0; border-radius: 8px; background: transparent; color: var(--pi-text); font: inherit; cursor: pointer; }
    button:focus-visible, summary:focus-visible, pre:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: -2px; }
    .preview-close { display: grid; flex: none; place-items: center; width: 30px; height: 30px; padding: 0; color: var(--pi-muted); font-size: 23px; }
    .preview-close:hover { background: var(--pi-selection-bg); }
    .preview-body { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; min-height: 0; padding: 16px; overflow: auto; }
    .image-preview { display: grid; place-items: center; min-width: 0; border-radius: 8px; background: var(--pi-surface); }
    .image-preview img { display: block; max-width: 100%; max-height: min(65dvh, 640px); object-fit: contain; }
    .text-preview { box-sizing: border-box; max-height: min(60dvh, 560px); margin: 0; padding: 14px; overflow: auto; border: 0; border-radius: 8px; background: var(--pi-surface); color: var(--pi-text); font: 12px/17.5px var(--pi-font-monospace, ui-monospace, monospace); white-space: pre-wrap; overflow-wrap: anywhere; tab-size: 2; }
    .preview-notice { margin: 0; color: var(--pi-muted); font-size: 12px; line-height: 1.6; }
    .file-details { min-width: 0; color: var(--pi-muted); font-size: 12px; }
    summary { padding: 4px 0; cursor: pointer; }
    dl { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px 16px; margin: 10px 0 0; }
    dt { color: var(--pi-muted); }
    dd { margin: 0; color: var(--pi-text); overflow-wrap: anywhere; }
    footer { display: flex; flex: none; justify-content: flex-end; padding: 10px 16px; border-top: 0; }
    .preview-remove { padding: 7px 10px; color: var(--pi-danger); font-size: 12px; }
    .preview-remove:hover { background: color-mix(in srgb, var(--pi-danger) 14%, transparent); }
    @media (pointer: coarse) { .preview-close { width: 44px; height: 44px; } .preview-remove, summary { min-height: 44px; box-sizing: border-box; } }
    @media (max-width: 640px) {
      modal-surface { --modal-surface-width: calc(100vw - 16px); --modal-surface-max-height: calc(100dvh - 16px); --modal-surface-backdrop-padding: 8px; }
      header, .preview-body { padding: 12px; }
      dl { grid-template-columns: minmax(0, 1fr); gap: 4px; }
      dd + dt { margin-top: 6px; }
    }
  `;
}
