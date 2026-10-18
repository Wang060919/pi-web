import { renderUiIcon } from "./uiIcons";
import { localizedTemplate, t } from "../../../shared/i18n";
import { LitElement, css, html, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { ContentRendererContribution } from "../../../plugin-api";
import type { ContentRendererChoice } from "../plugins/contentRenderers";
import { renderIntentMemory } from "../formatting/renderIntentMemory";
import { writeClipboardText } from "../clipboard";
import type { CodeBlockSourcePolicy } from "../formatting/codeBlockPolicy";
import { codeBlockFrameStyles } from "./codeBlockFrameStyles";

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return value !== null && typeof value === "object" && "then" in value && typeof value.then === "function";
}

function isTemplateResult(value: unknown): value is TemplateResult {
  return value !== null && typeof value === "object" && "_$litType$" in value;
}

/** Owns source access independently of the plugin's rendering success. */
@customElement("pi-web-content-renderer")
export class ContentRendererHost extends LitElement {
  // Chat-private source controls; public plugin consumers retain legacy defaults.
  @property({ attribute: false }) codeBlocks: CodeBlockSourcePolicy | undefined;
  @property({ type: Boolean, reflect: true, attribute: "external-controls" }) externalControls = false;
  @property() text = "";
  @property() intentKey: string | undefined;
  private restoreIntent = true;
  @property({ attribute: false }) choices: readonly ContentRendererChoice[] = [];
  @property() rendererId: string | undefined;
  @property({ type: Boolean }) allowManualPreview = false;
  @state() private manuallyActivated = false;
  @state() private selectedId: string | undefined;
  private renderer: ContentRendererContribution | undefined;
  @state() private raw = false;
  @state() private failure: string | undefined;
  @state() private copyStatus = t("ContentRendererHost.copy_source.0521b5bf");
  private controller: AbortController | undefined;
  private preview: TemplateResult | undefined;
  private ancestorDetails: HTMLDetailsElement[] = [];
  private readonly onAncestorDetailsToggle = (): void => { this.requestUpdate(); };

  protected override willUpdate(changes: PropertyValues<this>): void {
    const identityChanged = this.restoreIntent || changes.has("intentKey") || changes.has("text");
    const unavailable = this.selectedId !== undefined && !this.choices.some(({ id }) => id === this.selectedId);
    if (identityChanged || unavailable) {
      const intent = this.intentKey === undefined ? undefined : renderIntentMemory.read(this.intentKey, this.text, this.choices.map(({ id }) => id));
      this.selectedId = intent?.rendererId;
      this.raw = intent?.raw ?? false;
      this.manuallyActivated = intent !== undefined && !intent.raw;
      this.restoreIntent = false;
      this.renderer = undefined;
      this.cancelPreview();
    }
    const choice = this.choices.find(({ id }) => id === ((this.externalControls ? this.rendererId : undefined) ?? this.selectedId)) ?? this.choices[0];
    this.selectedId = choice?.id;
    if (changes.has("text") || this.renderer !== choice?.renderer) {
      if (!identityChanged && !unavailable) this.manuallyActivated = false;
      this.renderer = choice?.renderer;
      this.cancelPreview();
      this.failure = undefined;
      this.copyStatus = t("ContentRendererHost.copy_source.89d602e9");
    }
    if (this.externalControls) this.manuallyActivated = this.allowManualPreview;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeAncestorDetailsListeners();
    this.restoreIntent = true;
    this.manuallyActivated = false;
    this.cancelPreview();
  }

  override connectedCallback(): void {
    this.restoreIntent = true;
    this.removeAncestorDetailsListeners();
    // Disclosure bodies stay mounted; only renderer work follows their open state.
    // Walk through shadow hosts because native toggle events do not cross them.
    for (let ancestor: Node | null = this.parentNode; ancestor !== null; ancestor = ancestor instanceof ShadowRoot ? ancestor.host : ancestor.parentNode) {
      if (ancestor instanceof HTMLDetailsElement) {
        this.ancestorDetails.push(ancestor);
        ancestor.addEventListener("toggle", this.onAncestorDetailsToggle);
      }
    }
    super.connectedCallback();
    this.requestUpdate();
  }

  private removeAncestorDetailsListeners(): void {
    for (const details of this.ancestorDetails) details.removeEventListener("toggle", this.onAncestorDetailsToggle);
    this.ancestorDetails = [];
  }

  private cancelPreview(): void {
    this.controller?.abort();
    this.controller = undefined;
    this.preview = undefined;
  }

  private remember(raw: boolean): void {
    if (this.intentKey !== undefined && this.selectedId !== undefined) {
      renderIntentMemory.choose(this.intentKey, this.text, { rendererId: this.selectedId, raw });
    }
  }

  private selectRenderer(id: string): void {
    this.selectedId = id;
    this.raw = this.raw || (!this.allowManualPreview && this.choices.find((choice) => choice.id === id)?.renderer.renderMode !== "automatic");
    this.remember(this.raw);
  }

  private setRaw(raw: boolean): void {
    this.remember(raw);
    if (this.raw === raw && (raw || (this.manuallyActivated && this.failure === undefined))) return;
    this.raw = raw;
    this.manuallyActivated = !raw;
    if (!raw) this.failure = undefined;
    this.cancelPreview();
  }

  private renderPreview(): TemplateResult | undefined {
    if (this.preview !== undefined || this.renderer === undefined || this.failure !== undefined) return this.preview;
    const controller = new AbortController();
    this.controller = controller;
    const fail = (error: unknown): void => {
      if (controller.signal.aborted || this.controller !== controller) return;
      console.warn(`Content renderer ${this.renderer?.id ?? "unknown"} failed`, error);
      this.failure = t("ContentRendererHost.preview_failed_raw_source_is_shown_below.0ed9badd");
      this.cancelPreview();
    };
    try {
      const preview: unknown = this.renderer.render({ text: this.text, signal: controller.signal, fail });
      // Plugin JS may violate the synchronous public contract. Consume a
      // rejected promise as well, so fallback never leaves an unhandled error.
      if (isPromiseLike(preview)) void Promise.resolve(preview).catch(fail);
      if (!isTemplateResult(preview)) throw new Error("Content renderer must return a Lit template synchronously");
      if (!controller.signal.aborted) this.preview = preview;
    } catch (error) {
      fail(error);
    }
    return this.preview;
  }

  private async copy(): Promise<void> {
    const text = this.text;
    const copied = await writeClipboardText(text);
    if (this.isConnected && text === this.text) this.copyStatus = copied ? t("ContentRendererHost.copied_source.02f3ab73") : t("ContentRendererHost.failed_to_copy_source.5a0b0301");
  }

  override render() {
    const active = this.isConnected && this.ancestorDetails.every((details) => details.open)
      && (this.renderer?.renderMode === "automatic" || this.allowManualPreview || this.manuallyActivated);
    if (!active) this.cancelPreview();
    const preview = !this.raw && active ? this.renderPreview() : undefined;
    const diagnostic = this.failure;
    const showingRaw = preview === undefined || diagnostic !== undefined;
    const sourceClass = this.codeBlocks?.overflow === "wrap" ? "source-wrap" : "source-scroll";
    const choice = this.choices.find(({ id }) => id === this.selectedId);
    return html`<div class=${this.externalControls ? "" : "code-block-frame"}>
      ${this.externalControls ? null : localizedTemplate("ContentRendererHost.template.629c2610", html)`<div class="controls code-block-header" role="group" aria-label="Code block controls">
        ${this.choices.length < 2
          ? choice === undefined ? null : html`<span class="code-block-label" title=${choice.label}>${choice.label}</span>`
          : localizedTemplate("ContentRendererHost.template.95814392", html)`
          <select class="code-block-label" aria-label="Diagram renderer" @change=${(event: Event) => { if (event.target instanceof HTMLSelectElement) this.selectRenderer(event.target.value); }}>
            ${this.choices.map(({ id, label }) => html`<option value=${id} .selected=${id === this.selectedId}>${label}</option>`)}
          </select>
        `}
        ${this.renderer === undefined ? null : localizedTemplate("ContentRendererHost.raw.025d8adb", html)`
          <button type="button" aria-controls="content" aria-pressed=${!showingRaw} @click=${() => { this.setRaw(false); }}>${this.renderer.renderMode === "automatic" ? t("ContentRendererHost.preview.1e9a6cbb") : t("ContentRendererHost.render.9d8e085c")}</button>
          <button type="button" aria-controls="content" aria-pressed=${showingRaw} @click=${() => { this.setRaw(true); }}>Raw</button>
        `}
        ${this.codeBlocks?.copy === false ? null : html`
          <button class="copy code-block-copy" type="button" title=${this.copyStatus} aria-label=${this.copyStatus} @click=${() => { void this.copy(); }}><span aria-hidden="true">${renderUiIcon(this.copyStatus === t("ContentRendererHost.copied_source.d92c9bc8") ? "check" : "copy")}</span></button>
          <span class="sr-only" role="status">${this.copyStatus === t("ContentRendererHost.copy_source.6c1cb102") ? "" : this.copyStatus}</span>
        `}
      </div>`}
      <div id="content">
        ${diagnostic === undefined ? null : html`<p role="status">${diagnostic}</p>`}
        ${showingRaw
          ? this.codeBlocks?.presentation === "plain"
            ? localizedTemplate("ContentRendererHost.template.35c94939", html)`<div class=${`plain-code-block ${sourceClass}`} tabindex="0" aria-label="Raw source">${this.text}</div>`
            : localizedTemplate("ContentRendererHost.template.21921372", html)`<pre class=${sourceClass} tabindex="0" aria-label="Raw source"><code>${this.text}</code></pre>`
          : localizedTemplate("ContentRendererHost.template.5787b0d5", html)`<div class="preview" tabindex="0" aria-label="Diagram preview">${preview}</div>`}
      </div>
    </div>`;
  }

  static override styles = [codeBlockFrameStyles, css`
    /* Keep natural height so the surrounding flex viewer owns the scroll range. */
    :host { display: block; flex-shrink: 0; margin: 0 0 10px; min-width: 0; color: var(--pi-text); }
    :host([external-controls]) { margin: 0; background: var(--pi-bg); }
    #content { border-radius: 0 0 7px 7px; }
    select { max-width: 100%; color: var(--pi-text); background: var(--pi-bg); border: 1px solid var(--pi-border); border-radius: 6px; padding: 3px; font: 12px/16px var(--pi-font-family, system-ui, sans-serif); }
    button { color: var(--pi-muted); background: transparent; border: 0; border-radius: 6px; padding: 3px 8px; font: 12px/16px var(--pi-font-family, system-ui, sans-serif); cursor: pointer; }
    button:not([aria-pressed="true"]):hover { color: var(--pi-text); background: var(--pi-surface-hover); }
    button[aria-pressed="true"] { color: var(--pi-text); background: var(--pi-selection-bg); }
    :is(button, select, pre, .plain-code-block, .preview):focus-visible { outline: 2px solid var(--pi-accent); outline-offset: -2px; }
    pre { overflow: auto; white-space: pre; text-align: left; direction: ltr; padding: 12px; margin: 0; }
    /* Raw-source policy must not restyle elements produced by a plugin preview. */
    #content > .plain-code-block { padding: 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
    #content > pre.source-wrap { overflow: visible; white-space: pre-wrap; overflow-wrap: anywhere; }
    #content > .plain-code-block.source-scroll { overflow: auto; white-space: pre; overflow-wrap: normal; }
    code { font: 12px/17.5px var(--pi-font-monospace, ui-monospace, monospace); }
    .preview { overflow: auto; padding: 12px; }
    p { color: var(--pi-muted); margin: 0; padding: 10px 12px; font: 12px/16px var(--pi-font-family, system-ui, sans-serif); }
    @media (pointer: coarse) { button, select { min-height: 44px; } }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  `];
}
