import { t } from "../../../shared/i18n";
import { LitElement, html } from "lit";
import type { ChatContentRendering } from "../formatting/contentRendering";
import { customElement, property } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { writeClipboardText } from "../clipboard";
import { toSafeMarkdownHtml } from "../formatting/markdown";
import { DEFAULT_CODE_BLOCK_POLICY, type CodeBlockPolicy } from "../formatting/codeBlockPolicy";
import { rememberExternalMarkdownImageDimensions, restoreExternalMarkdownImageDimensions } from "../formatting/externalMarkdownImages";
import type { MarkdownWorkspaceContext, WorkspaceFileOpenRequest } from "../formatting/workspaceLinks";
import { formattedTextStyles } from "./shared";
import { codeBlockFrameStyles } from "./codeBlockFrameStyles";
import { workspaceFileCards } from "../formatting/workspaceFileCards";
import { workspaceFilePreviewUrl } from "../api/urls";
import { workspaceFileCardStyles } from "./workspaceFileCardStyles";

@customElement("formatted-text")
export class FormattedText extends LitElement {
  @property() text = "";
  @property() intentKey: string | undefined;
  @property({ type: Boolean }) imagesEnabled = true;
  @property({ attribute: false }) codeBlocks: CodeBlockPolicy = DEFAULT_CODE_BLOCK_POLICY;
  @property({ attribute: false }) contentRendering: ChatContentRendering | undefined;
  @property() machineId = "local";
  @property({ attribute: false }) workspaceContext: MarkdownWorkspaceContext | undefined;
  @property({ type: Boolean }) fileCards = false;
  @property({ type: Boolean }) documentLinks = false;

  override render() {
    const toSafeHtml = (text: string) => toSafeMarkdownHtml(text, this.workspaceContext, this.intentKey, this.imagesEnabled, this.codeBlocks, this.documentLinks);
    // Disabling previews bypasses inspection as well as renderer mounting.
    const content = (this.codeBlocks.previews ? this.contentRendering?.renderMarkdown({
      text: this.text,
      machineId: this.workspaceContext?.machineId ?? this.machineId,
      toSafeHtml,
    }, this.intentKey, this.codeBlocks) : undefined) ?? unsafeHTML(toSafeHtml(this.text));
    const className = this.codeBlocks.overflow === "scroll" ? "formatted code-blocks-scroll" : "formatted";
    const files = this.fileCards ? workspaceFileCards(this.text, this.workspaceContext) : [];
    const context = this.workspaceContext;
    return html`<div class=${className} dir="auto" @load=${this.onImageLoad} @click=${this.onFormattedClick}>${content}</div>
      ${context === undefined || files.length === 0 ? null : html`
        <section class="file-cards" aria-label=${t("ui.fileCards.heading")} @click=${this.onFormattedClick}>
          <h4 class="file-cards-heading">${t("ui.fileCards.heading")}</h4>
          <div class="file-card-list">
            ${files.map((file) => html`
              <a class="file-card" data-workspace-file=${file.path} title=${file.path}
                href=${workspaceFilePreviewUrl(context.projectId, context.workspaceId, file.path, { machineId: context.machineId, download: true })}>
                <span class="file-card-type" aria-hidden="true">${file.extension || t("ui.fileCards.file")}</span>
                <span class="file-card-copy"><strong>${file.name}</strong><small>${t("ui.fileCards.open")}</small></span>
                <span class="file-card-open" aria-hidden="true">↗</span>
              </a>
            `)}
          </div>
        </section>
      `}`;
  }

  override updated(): void {
    // HTML is memoized independently of geometry; apply hints on every DOM mount,
    // in this update's microtask before paint or the chat's position-restoration frame.
    restoreExternalMarkdownImageDimensions(this.renderRoot);
  }

  private readonly onImageLoad = {
    // Native image loads do not bubble. Capture only inside this formatting root.
    capture: true,
    handleEvent: (event: Event): void => {
      if (event.target instanceof HTMLImageElement) rememberExternalMarkdownImageDimensions(event.target);
    },
  };

  private readonly onFormattedClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const anchor = event.target.closest("a[data-workspace-file]");
    if (anchor instanceof HTMLAnchorElement && this.workspaceContext !== undefined
      && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
      && (!anchor.target || anchor.target === "_self")) {
      const path = anchor.getAttribute("data-workspace-file");
      if (path !== null) {
        const request = new CustomEvent<WorkspaceFileOpenRequest>("workspace-file-open", {
          detail: { ...this.workspaceContext, path }, bubbles: true, composed: true, cancelable: true,
        });
        if (!this.dispatchEvent(request)) event.preventDefault();
      }
      return;
    }
    const button = event.target.closest(".code-copy-button");
    if (!(button instanceof HTMLButtonElement)) return;
    const wrapper = button.closest(".code-block-wrapper");
    if (!(wrapper instanceof HTMLElement)) return;
    const code = wrapper.querySelector("pre code, .plain-code-block");
    if (!(code instanceof HTMLElement)) return;
    void this.copyCode(code.textContent, button);
  };

  private async copyCode(text: string, button: HTMLButtonElement): Promise<void> {
    const copied = await writeClipboardText(text);
    this.setCopyButtonState(button, copied ? "copied" : "failed");
    window.setTimeout(() => {
      this.setCopyButtonState(button, "idle");
    }, 1200);
  }

  private setCopyButtonState(button: HTMLButtonElement, state: "idle" | "copied" | "failed"): void {
    const icon = button.querySelector("span");
    if (icon !== null) icon.textContent = state === "copied" ? "✓" : "⧉";
    const label = state === "copied" ? t("FormattedText.copied_code_block.1b9e03c5") : state === "failed" ? t("FormattedText.failed_to_copy_code_block.bf5a1ad5") : t("FormattedText.copy_code_block.d31aaa3e");
    button.title = label;
    button.setAttribute("aria-label", label);
  }

  static override styles = [formattedTextStyles, codeBlockFrameStyles, workspaceFileCardStyles];
}
