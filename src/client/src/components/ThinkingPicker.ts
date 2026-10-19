import { renderUiIcon } from "./uiIcons";
import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { t } from "../../../shared/i18n";
import type { CommandOption } from "../api";
import { ModalSurface } from "./ModalSurface";
import "./ThinkingLevelLabel";

@customElement("thinking-picker")
export class ThinkingPicker extends LitElement {
  @property() override title = t("ui.thinkingPicker.title");
  @property({ attribute: false }) options: CommandOption[] = [];
  @property({ attribute: false }) selectedValue: string | undefined = undefined;
  @property({ attribute: false }) defaultValue: string | undefined = undefined;
  @property({ type: Boolean }) defaultsLoading = false;
  @property({ type: Boolean, reflect: true }) embedded = false;
  @property({ type: Boolean }) disabled = false;
  @property({ attribute: false }) onPick?: (value: string) => Promise<boolean>;
  @property({ attribute: false }) onCancel?: () => void;
  @property({ attribute: false }) onSetDefault?: (value: string) => Promise<unknown>;
  @property({ attribute: false }) onBusyChange?: (busy: boolean) => void;
  @property({ attribute: false }) anchor?: HTMLElement;
  @state() private previewValue: string | undefined = undefined;
  @state() private pickPending = false;
  @state() private defaultPending = false;
  @state() private pickError: string | undefined = undefined;
  @state() private defaultError: string | undefined = undefined;
  @state() private showSavingFeedback = false;
  private savingFeedbackTimer: number | undefined = undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("resize", this.updateAnchorPosition);
    window.addEventListener("scroll", this.updateAnchorPosition, true);
  }

  override disconnectedCallback(): void {
    this.clearSavingFeedback();
    window.removeEventListener("resize", this.updateAnchorPosition);
    window.removeEventListener("scroll", this.updateAnchorPosition, true);
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("options") || (changed.has("selectedValue") && !this.pickPending)) {
      // Preview is local to the current set of choices; the host owns saved values.
      this.previewValue = undefined;
      this.pickError = undefined;
    }
  }

  protected override firstUpdated(): void {
    this.updateAnchorPosition();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("anchor")) this.updateAnchorPosition();
  }

  override render() {
    const busy = this.disabled || this.pickPending || this.defaultPending;
    const pendingClass = !this.disabled && (this.pickPending || this.defaultPending) ? "save-pending" : "";
    if (this.embedded) return html`<section class=${`embedded-body ${pendingClass}`} role="group" aria-label=${this.title} aria-busy=${busy ? "true" : "false"}>${this.renderContent()}</section>`;
    const rangeDisabled = busy || this.options.length < 2 || this.onPick === undefined;
    return html`
      <modal-surface
        class=${pendingClass}
        .label=${this.title}
        .busy=${busy}
        .initialFocus=${rangeDisabled ? ".close" : "input[type=range]"}
        .onClose=${() => this.onCancel?.()}
      >
        <header>
          <div class="current-value">
            <strong>${this.title}</strong>
            <output for="thinking-strength" aria-label=${t(this.previewValue === undefined ? "ui.thinkingPicker.current" : "ui.thinkingPicker.preview")}>${this.renderLevelLabel(this.previewValue ?? this.selectedValue)}</output>
          </div>
          <button class="close" type="button" aria-label=${t("ui.thinkingPicker.close")} ?disabled=${busy} @click=${() => this.onCancel?.()}>${renderUiIcon("close")}</button>
        </header>
        ${this.renderContent()}
      </modal-surface>
    `;
  }

  private renderContent() {
    const busy = this.disabled || this.pickPending || this.defaultPending;
    const value = this.previewValue ?? this.selectedValue;
    const index = this.options.findIndex((option) => option.value === value);
    const option = this.options[index];
    const label = option?.label ?? value ?? t("ui.thinkingPicker.none");
    const rangeDisabled = busy || this.options.length < 2 || this.onPick === undefined;
    const highUsage = option?.value === "max";
    const description = html`<p id="strength-description" class="description">${option?.description ?? (index < 0 && this.options.length > 0 ? t("ui.thinkingPicker.unknown") : nothing)}</p>`;
    return html`
        <div class="content">
          ${this.embedded ? html`<div class="current-value">
            <span>${this.title}</span>
            <output for="thinking-strength">${this.renderLevelLabel(value)}</output>
          </div>` : nothing}
          <div class="strength-scale" aria-hidden="true"><span>${t("ui.thinkingPicker.faster")}</span><span>${t("ui.thinkingPicker.smarter")}</span></div>
          <div class=${`slider${index < 0 ? " unknown" : ""}`} style=${`--strength-position: ${String(this.options.length < 2 ? 0 : Math.max(0, index) / (this.options.length - 1))}`}>
            <input
              id="thinking-strength"
              type="range"
              min="0"
              max=${String(Math.max(0, this.options.length - 1))}
              step="1"
              .value=${String(Math.max(0, index))}
              aria-label=${this.title}
              aria-valuetext=${label}
              aria-describedby=${`${highUsage ? "strength-usage" : "strength-description"} strength-help`}
              ?disabled=${rangeDisabled}
              @input=${(event: Event) => { this.preview(event); }}
              @change=${(event: Event) => { void this.commitRange(event); }}
            />
            <div class="level-labels">
              ${this.options.map((level, levelIndex) => html`
                <button
                  class=${level.value === value ? "level selected" : "level"}
                  type="button"
                  tabindex="-1"
                  style=${`--level-position: ${String(this.options.length < 2 ? 50 : levelIndex / (this.options.length - 1) * 100)}%`}
                  title=${level.label}
                  aria-label=${level.label}
                  aria-pressed=${level.value === value ? "true" : "false"}
                  ?disabled=${busy || this.onPick === undefined}
                  @click=${() => { void this.pick(level.value); }}
                ><span>${level.label}</span></button>
              `)}
            </div>
          </div>
          ${highUsage ? html`<p id="strength-usage" class="usage-warning"><strong>${t("ui.thinkingPicker.highUsage")}</strong><span>${t("ui.thinkingPicker.highUsageHint")}</span></p>` : description}
          <p id="strength-help" class=${this.showSavingFeedback ? "help saving" : this.options.length < 2 ? "help" : "help visually-hidden"} role="status">${this.showSavingFeedback ? t("ui.thinkingPicker.saving") : this.options.length === 0 ? t("ui.thinkingPicker.unavailable") : this.options.length === 1 ? t("ui.thinkingPicker.fixed") : t("ui.thinkingPicker.hint")}</p>
          ${this.pickError === undefined ? nothing : html`<p class="error" role="alert">${this.pickError}</p>`}
          ${this.onSetDefault !== undefined || this.defaultValue !== undefined || this.defaultsLoading ? html`
            <div class="default-section">
              <div class="stored-default">
                <span>${t("ui.thinkingPicker.defaultStored")}</span>
                <strong>${this.defaultsLoading ? t("ui.thinkingPicker.defaultLoading") : this.renderLevelLabel(this.defaultValue)}</strong>
              </div>
              ${this.onSetDefault === undefined ? nothing : html`
                <button class="set-default" type="button" ?disabled=${busy || this.defaultsLoading || option === undefined || value === this.defaultValue} @click=${() => { if (option !== undefined) void this.setDefault(option.value); }}>${t("ui.thinkingPicker.defaultAction")}</button>
              `}
              ${this.defaultError === undefined ? nothing : html`<p class="error" role="alert">${this.defaultError}</p>`}
            </div>
          ` : nothing}
        </div>
    `;
  }

  private labelFor(value: string | undefined): string {
    return this.options.find((option) => option.value === value)?.label ?? value ?? t("ui.thinkingPicker.none");
  }

  private renderLevelLabel(value: string | undefined) {
    return html`<thinking-level-label .value=${value} .options=${this.options}>${this.labelFor(value)}</thinking-level-label>`;
  }

  private rangeOption(event: Event): CommandOption | undefined {
    if (!(event.target instanceof HTMLInputElement)) return undefined;
    const index = Number(event.target.value);
    return Number.isInteger(index) ? this.options[index] : undefined;
  }

  private preview(event: Event): void {
    if (this.disabled || this.pickPending || this.defaultPending || this.options.length < 2 || this.onPick === undefined) return;
    const option = this.rangeOption(event);
    if (option === undefined) return;
    this.previewValue = option.value;
    this.pickError = undefined;
    this.defaultError = undefined;
  }

  private async commitRange(event: Event): Promise<void> {
    const option = this.rangeOption(event);
    if (option !== undefined) await this.pick(option.value);
  }

  private async pick(value: string): Promise<void> {
    if (this.disabled || this.pickPending || this.defaultPending || this.onPick === undefined || !this.options.some((option) => option.value === value)) return;
    this.pickError = undefined;
    if (value === this.selectedValue) {
      this.previewValue = undefined;
      return;
    }
    this.previewValue = value;
    const focusTarget = this.renderRoot.querySelector<HTMLInputElement>('input[type="range"]') ?? undefined;
    this.pickPending = true;
    this.scheduleSavingFeedback();
    try {
      this.onBusyChange?.(true);
      if (!await this.onPick(value)) this.pickError = t("ui.thinkingPicker.saveFailed");
    } catch {
      this.pickError = t("ui.thinkingPicker.saveFailed");
    } finally {
      this.previewValue = undefined;
      this.pickPending = false;
      this.clearSavingFeedback();
      this.onBusyChange?.(false);
      await this.restoreControlFocus(focusTarget);
    }
  }

  private async setDefault(value: string): Promise<void> {
    if (this.disabled || this.pickPending || this.defaultPending || this.defaultsLoading || this.onSetDefault === undefined || value === this.defaultValue || !this.options.some((option) => option.value === value)) return;
    // A controlled default update can disable the clicked button in a later
    // parent render. Return to the stable range instead of refocusing that button.
    const focusTarget = this.embedded ? this.renderRoot.querySelector<HTMLInputElement>('input[type="range"]') ?? undefined : undefined;
    this.defaultPending = true;
    this.scheduleSavingFeedback();
    this.defaultError = undefined;
    try {
      this.onBusyChange?.(true);
      if (await this.onSetDefault(value) === false) this.defaultError = t("ui.thinkingPicker.defaultFailed");
    } catch {
      this.defaultError = t("ui.thinkingPicker.defaultFailed");
    } finally {
      this.defaultPending = false;
      this.clearSavingFeedback();
      this.onBusyChange?.(false);
      await this.restoreControlFocus(focusTarget);
    }
  }

  private scheduleSavingFeedback(): void {
    this.clearSavingFeedback();
    this.savingFeedbackTimer = window.setTimeout(() => {
      this.savingFeedbackTimer = undefined;
      this.showSavingFeedback = true;
    }, 300);
  }

  private clearSavingFeedback(): void {
    if (this.savingFeedbackTimer !== undefined) window.clearTimeout(this.savingFeedbackTimer);
    this.savingFeedbackTimer = undefined;
    this.showSavingFeedback = false;
  }

  private async restoreControlFocus(target: HTMLElement | undefined): Promise<void> {
    if (target === undefined || !this.isConnected) return;
    await this.updateComplete;
    await this.updateComplete;
    if (this.disabled) return;
    if (!this.embedded) {
      const surface = this.renderRoot.querySelector("modal-surface");
      if (surface instanceof ModalSurface) surface.focusDialog();
      return;
    }
    const focusTarget = target.isConnected && !target.matches(":disabled")
      ? target
      : this.renderRoot.querySelector<HTMLInputElement>('input[type="range"]:not(:disabled)');
    // The owning surface checks top-modal ownership before focusing a control
    // inside this shadow root; embedded content never registers another layer.
    const ownerRoot = this.getRootNode();
    let ancestor: Element | null = this.assignedSlot ?? this.parentElement ?? (ownerRoot instanceof ShadowRoot ? ownerRoot.host : null);
    while (ancestor !== null) {
      if (ancestor instanceof ModalSurface) {
        if (focusTarget === null) ancestor.focusDialog();
        else ancestor.focusDialog(focusTarget);
        return;
      }
      const root = ancestor.getRootNode();
      ancestor = ancestor.assignedSlot ?? ancestor.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
    }
  }

  private readonly updateAnchorPosition = (): void => {
    const anchor = this.anchor;
    if (this.embedded || anchor === undefined || !anchor.isConnected || window.innerWidth <= 640) {
      this.removeAttribute("anchored");
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const availableHeight = rect.top - 20;
    if (availableHeight < 160 || rect.top > window.innerHeight) {
      this.removeAttribute("anchored");
      return;
    }
    const width = Math.min(220, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
    this.style.setProperty("--thinking-picker-left", `${String(left)}px`);
    this.style.setProperty("--thinking-picker-bottom", `${String(window.innerHeight - rect.top + 8)}px`);
    this.style.setProperty("--thinking-picker-height", `${String(availableHeight)}px`);
    this.setAttribute("anchored", "");
  };

  static override styles = css`
    :host { position: fixed; inset: 0; z-index: 10; color: var(--pi-text); font: var(--pi-font-weight-regular, 360) 13px/18px var(--pi-font-family, system-ui, sans-serif); }
    :host([embedded]) { position: static; inset: auto; z-index: auto; display: block; min-width: 0; }
    * { box-sizing: border-box; }
    modal-surface { --pi-overlay: transparent; --pi-surface: #fff; --pi-bg: #252524; --modal-surface-width: min(220px, calc(100vw - 24px)); --modal-surface-max-height: calc(100dvh - 24px); --modal-surface-backdrop-padding: 12px; --modal-surface-radius: 10px; }
    :host([anchored]) modal-surface { --modal-surface-place-items: end start; --modal-surface-backdrop-padding: 12px 12px var(--thinking-picker-bottom) var(--thinking-picker-left); --modal-surface-max-height: var(--thinking-picker-height); }
    header { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 24px; padding: 12px 12px 0; }
    .current-value { display: flex; align-items: baseline; justify-content: flex-start; gap: 8px; min-width: 0; }
    header strong, .current-value > span { color: var(--pi-muted); font-size: 12px; font-weight: var(--pi-font-weight-regular, 360); }
    output { color: var(--pi-text); font-size: 13px; font-weight: var(--pi-font-weight-medium, 460); overflow-wrap: anywhere; }
    button { color: var(--pi-text); font: inherit; cursor: pointer; }
    button:disabled { cursor: not-allowed; opacity: .5; }
    button:focus-visible, input:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 3px; }
    .close { display: grid; place-items: center; flex: none; width: 20px; height: 24px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--pi-muted); }
    .close:not(:disabled):hover { background: var(--pi-selection-bg); }
    .content { min-height: 0; padding: 16px 12px 12px; overflow-y: auto; }
    .embedded-body .content { padding: 12px 14px; overflow: visible; }
    .embedded-body .current-value { margin-bottom: 16px; }
    .strength-scale { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; color: var(--pi-muted); font-size: 12px; line-height: 15px; }
    .slider { --strength-track: light-dark(#0000001a, #ffffff1a); --strength-fill: light-dark(#00000059, #ffffff59); --strength-handle: #fff; position: relative; height: 24px; }
    input[type=range] { position: relative; display: block; width: 100%; height: 24px; margin: 0; padding: 0; appearance: none; -webkit-appearance: none; background: transparent; cursor: pointer; }
    input[type=range]:disabled { opacity: .45; cursor: not-allowed; }
    .save-pending button:disabled, .save-pending input[type=range]:disabled { opacity: 1; cursor: pointer; }
    input[type=range]::-webkit-slider-runnable-track { height: 20px; border-radius: 6px; background: linear-gradient(to right, var(--strength-fill) 0 calc(8px + var(--strength-position) * (100% - 16px)), transparent calc(8px + var(--strength-position) * (100% - 16px)) 100%), var(--strength-track); }
    input[type=range]::-moz-range-track { height: 20px; border-radius: 6px; background: linear-gradient(to right, var(--strength-fill) 0 calc(8px + var(--strength-position) * (100% - 16px)), transparent calc(8px + var(--strength-position) * (100% - 16px)) 100%), var(--strength-track); }
    input[type=range]::-webkit-slider-thumb { width: 16px; height: 20px; margin-top: 0; border: 0; border-radius: 6px; appearance: none; -webkit-appearance: none; background: var(--strength-handle); box-shadow: 0 0 12px #0000003d; transition: scale 120ms cubic-bezier(.34, 1.3, .64, 1); }
    input[type=range]::-moz-range-thumb { width: 16px; height: 20px; border: 0; border-radius: 6px; background: var(--strength-handle); box-shadow: 0 0 12px #0000003d; transition: scale 120ms cubic-bezier(.34, 1.3, .64, 1); }
    input[type=range]:active::-webkit-slider-thumb { scale: 1.12; }
    input[type=range]:active::-moz-range-thumb { scale: 1.12; }
    .unknown { --strength-fill: transparent; --strength-handle: var(--pi-muted); }
    .level-labels { position: absolute; inset: 0 8px; height: 100%; pointer-events: none; }
    .level { position: absolute; top: 0; left: var(--level-position); width: 20px; height: 100%; padding: 0; transform: translateX(-50%); border: 0; border-radius: 4px; background: transparent; pointer-events: auto; }
    .level::before { position: absolute; top: calc(50% - 1.5px); left: calc(50% - 1.5px); width: 3px; height: 3px; border-radius: 50%; background: light-dark(#00000040, #ffffff40); content: ""; pointer-events: none; }
    .level.selected { pointer-events: none; }
    .level.selected::before { top: calc(50% - 4.5px); height: 9px; border-radius: 1px; background: var(--strength-handle); }
    .level > span, .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    p { margin: 0; }
    .description { margin-top: 6px; color: var(--pi-muted); font-size: 12px; line-height: 15px; overflow-wrap: anywhere; }
    .description:empty { display: none; }
    .help { margin-top: 6px; color: var(--pi-muted); font-size: 11px; line-height: 15px; }
    .saving { color: var(--pi-accent); }
    .error { margin-top: 8px; color: var(--pi-danger); font-size: 12px; line-height: 1.5; }
    .usage-warning { display: flex; align-items: baseline; gap: 6px; margin-top: 6px; color: var(--pi-warning); font-size: 12px; line-height: 15px; }
    .usage-warning strong { flex-shrink: 0; font-weight: var(--pi-font-weight-medium, 460); }
    .default-section { display: grid; gap: 6px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--pi-border-muted); }
    .stored-default { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 11px; }
    .stored-default > span { color: var(--pi-muted); }
    .stored-default strong { font-weight: var(--pi-font-weight-medium, 460); overflow-wrap: anywhere; text-align: right; }
    .set-default { width: 100%; padding: 6px 8px; border: 0; border-radius: 6px; background: var(--pi-selection-bg); font-size: 11px; transition: background 120ms ease; }
    .set-default:not(:disabled):hover { background: var(--pi-surface-hover); }
    @media (max-width: 640px) {
      modal-surface, :host([anchored]) modal-surface { --pi-overlay: inherit; --modal-surface-place-items: end stretch; --modal-surface-backdrop-padding: 0; --modal-surface-width: 100%; --modal-surface-max-height: min(520px, calc(100dvh - 12px)); --modal-surface-radius: 16px 16px 0 0; }
      .content { padding-bottom: max(20px, env(safe-area-inset-bottom)); }
      .slider, input[type=range] { height: 44px; }
    }
    @media (max-width: 760px), (pointer: coarse) { .close { width: 44px; height: 44px; } .set-default { min-height: 44px; } }
    @media (prefers-reduced-motion: reduce) {
      .set-default { transition: none; }
      input[type=range]::-webkit-slider-thumb { transition: none; }
      input[type=range]::-moz-range-thumb { transition: none; }
      input[type=range]:active::-webkit-slider-thumb { scale: none; }
      input[type=range]:active::-moz-range-thumb { scale: none; }
    }
  `;
}
