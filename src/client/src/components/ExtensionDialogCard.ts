import { localizedTemplate, localizedText, t } from "../../../shared/i18n";
import { LitElement, css, html, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import {
  EXTENSION_DIALOG_INPUT_MAX_LENGTH,
  type ExtensionDialogAnswer,
  type ExtensionDialogCloseReason,
  type PendingExtensionDialog,
} from "../../../shared/apiTypes";
import type { ClosedExtensionDialog } from "../appState";

export type ExtensionDialogAnswerCallback = (dialogId: string, value: ExtensionDialogAnswer) => void | Promise<void>;
export type ExtensionDialogCancelCallback = (dialogId: string) => void | Promise<void>;
export type ExtensionDialogDismissCallback = (dialogId: string) => void;

const COUNTDOWN_TICK_MS = 1_000;

/** Header status label for a closed extension dialog. */
export function extensionDialogCloseLabel(reason: ExtensionDialogCloseReason): string {
  switch (reason) {
    case "answered": return t("ExtensionDialogCard.answered.9dcbf01a");
    case "cancelled": return t("ExtensionDialogCard.cancelled.4c11d896");
    case "timeout": return t("ExtensionDialogCard.timed_out.db6c2ca3");
    case "aborted": return t("ExtensionDialogCard.aborted.64e1cad1");
    case "session-ended": return t("ExtensionDialogCard.session_ended.d1650384");
  }
}

/** One-line summary of what a closed dialog resolved to, for the outcome card. */
export function extensionDialogCloseSummary(closed: ClosedExtensionDialog): string {
  switch (closed.reason) {
    case "answered": {
      const answer = closed.answer;
      // An answered close without an answer value breaks the wire contract;
      // the card still renders rather than crashing the transcript.
      if (answer === undefined) return t("ExtensionDialogCard.closed_without_an_answer.ae5451b6");
      if (typeof answer === "boolean") return localizedText("ExtensionDialogCard.answered.be968566")`Answered: ${answer ? t("ExtensionDialogCard.yes.9f70286c") : t("ExtensionDialogCard.no.18fe4d07")}`;
      return answer === "" ? t("ExtensionDialogCard.answered_with_an_empty_response.c2f28c9a") : localizedText("ExtensionDialogCard.answered.d6bca1f1")`Answered: ${answer}`;
    }
    case "cancelled": return t("ExtensionDialogCard.dismissed_without_an_answer.27f8c8e5");
    case "timeout": return t("ExtensionDialogCard.no_answer_was_given_before_the_dialog.c7d92685");
    case "aborted": return t("ExtensionDialogCard.the_run_ended_before_this_dialog_was.d29f671c");
    case "session-ended": return t("ExtensionDialogCard.the_session_ended_before_this_dialog_was.b8aa184b");
  }
}

/**
 * Remaining-time label for an open dialog's auto-cancel deadline. Display
 * only: the daemon owns the real timeout and publishes `dialog.closed`, so a
 * card whose countdown reaches zero simply waits for that event.
 */
export function extensionDialogCountdownText(timeoutAt: string | undefined, nowMs: number): string | undefined {
  if (timeoutAt === undefined) return undefined;
  const deadline = Date.parse(timeoutAt);
  if (!Number.isFinite(deadline)) return undefined;
  const remainingMs = deadline - nowMs;
  if (remainingMs <= 0) return t("ExtensionDialogCard.auto_cancel_imminent.d92a9e17");
  const seconds = Math.ceil(remainingMs / 1000);
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    // Floor, not round: rounding yields "1h 60m" in the last half-minute of an hour.
    const minutes = Math.floor((seconds % 3600) / 60);
    return localizedText("ExtensionDialogCard.auto_cancels_in_h_m.f0c36706")`Auto-cancels in ${String(hours)}h ${String(minutes)}m`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    return localizedText("ExtensionDialogCard.auto_cancels_in_m_s.9cef84e5")`Auto-cancels in ${String(minutes)}m ${String(seconds % 60)}s`;
  }
  return localizedText("ExtensionDialogCard.auto_cancels_in_s.999a7ae0")`Auto-cancels in ${String(seconds)}s`;
}

/**
 * One extension dialog opened by `ctx.ui.confirm()`, `ctx.ui.select()`, or
 * `ctx.ui.input()`.
 *
 * The card owns only browser-local form state (the half-typed input, the
 * in-flight close flag, the display-only countdown); the daemon remains the
 * source of truth for whether the dialog is open. Closed mode renders the
 * settled outcome — a browser-local record that stays until dismissed — for a
 * browser that saw the dialog open.
 */
@customElement("extension-dialog-card")
export class ExtensionDialogCard extends LitElement {
  @property({ attribute: false }) dialog?: PendingExtensionDialog;
  @property({ attribute: false }) outcome?: ClosedExtensionDialog;
  @property({ attribute: false }) onAnswer?: ExtensionDialogAnswerCallback;
  @property({ attribute: false }) onCancel?: ExtensionDialogCancelCallback;
  @property({ attribute: false }) onDismiss?: ExtensionDialogDismissCallback;

  @state() private inputValue = "";
  @state() private closing = false;
  @state() private countdownNow = 0;
  private dialogIdentity: string | undefined;
  private countdownTimer: number | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this.syncCountdownTimer();
  }

  override disconnectedCallback(): void {
    this.stopCountdownTimer();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has("dialog") && !changed.has("outcome")) return;
    // Identity is keyed by dialogId, not object identity: status refreshes
    // re-project the same open dialog as a new object and must not wipe a
    // half-typed answer or an in-flight close.
    const identity = this.currentIdentity();
    if (identity !== this.dialogIdentity) {
      this.dialogIdentity = identity;
      this.inputValue = "";
      this.closing = false;
    }
    this.syncCountdownTimer();
  }

  override render(): TemplateResult | null {
    if (this.outcome !== undefined) return this.renderClosed(this.outcome);
    if (this.dialog !== undefined) return this.renderOpen(this.dialog);
    return null;
  }

  private renderOpen(dialog: PendingExtensionDialog): TemplateResult {
    const countdown = extensionDialogCountdownText(dialog.timeoutAt, this.countdownNow === 0 ? Date.now() : this.countdownNow);
    return html`
      <article class="card open-card" aria-labelledby="extension-dialog-heading">
        <header class="card-header">
          <h2 id="extension-dialog-heading">${dialog.title}</h2>
          ${countdown === undefined
            ? null
            // Decorative only — no live region: a polite region would queue one
            // announcement per second. The daemon-owned dialog.closed event is
            // the real signal, and the settled card announces the outcome.
            : html`<span class="header-status countdown">${countdown}</span>`}
        </header>
        ${this.renderOpenBody(dialog)}
      </article>
    `;
  }

  private renderOpenBody(dialog: PendingExtensionDialog): TemplateResult {
    if (dialog.kind === "select") return this.renderSelectBody(dialog);
    if (dialog.kind === "input") return this.renderInputBody(dialog);
    return this.renderConfirmBody(dialog);
  }

  private renderConfirmBody(dialog: PendingExtensionDialog): TemplateResult {
    return localizedTemplate("ExtensionDialogCard.cancel_no_yes.a6d8971a", html)`
      ${dialog.message === undefined ? null : html`<p class="dialog-message">${dialog.message}</p>`}
      <footer class="dialog-footer">
        <button class="secondary-action" type="button" ?disabled=${this.closing} @click=${() => { this.cancelDialog(dialog); }}>Cancel</button>
        <button class="secondary-action" type="button" ?disabled=${this.closing} @click=${() => { this.answerDialog(dialog, false); }}>No</button>
        <button class="primary-action" type="button" ?disabled=${this.closing} @click=${() => { this.answerDialog(dialog, true); }}>Yes</button>
      </footer>
    `;
  }

  private renderSelectBody(dialog: PendingExtensionDialog): TemplateResult {
    return localizedTemplate("ExtensionDialogCard.cancel.37322fb4", html)`
      <div class="dialog-options" role="group" aria-label="Choices">
        ${(dialog.options ?? []).map((option) => html`
          <button class="option-button" type="button" ?disabled=${this.closing} @click=${() => { this.answerDialog(dialog, option); }}>${option}</button>
        `)}
      </div>
      <footer class="dialog-footer">
        <button class="secondary-action" type="button" ?disabled=${this.closing} @click=${() => { this.cancelDialog(dialog); }}>Cancel</button>
      </footer>
    `;
  }

  private renderInputBody(dialog: PendingExtensionDialog): TemplateResult {
    return localizedTemplate("ExtensionDialogCard.cancel.936a1f9b", html)`
      <form class="dialog-input-form" @submit=${(event: SubmitEvent) => { this.submitInput(event, dialog); }}>
        <input
          class="dialog-input"
          type="text"
          name="dialog-answer"
          aria-label="Your answer"
          placeholder=${ifDefined(dialog.placeholder)}
          maxlength=${String(EXTENSION_DIALOG_INPUT_MAX_LENGTH)}
          .value=${this.inputValue}
          ?disabled=${this.closing}
          @input=${(event: Event) => { this.changeInput(event); }}
        />
        <footer class="dialog-footer">
          <button class="secondary-action" type="button" ?disabled=${this.closing} @click=${() => { this.cancelDialog(dialog); }}>Cancel</button>
          <button class="primary-action" type="submit" ?disabled=${this.closing}>${this.closing ? t("ExtensionDialogCard.sending.a3ebadaa") : t("ExtensionDialogCard.send.8e1da356")}</button>
        </footer>
      </form>
    `;
  }

  private renderClosed(closed: ClosedExtensionDialog): TemplateResult {
    return localizedTemplate("ExtensionDialogCard.dismiss.3525aa13", html)`
      <article class="card closed-card" aria-labelledby="extension-dialog-closed-heading">
        <header class="card-header">
          <h2 id="extension-dialog-closed-heading">${closed.dialog.title}</h2>
          <span class=${`header-status ${closed.reason}`}>${extensionDialogCloseLabel(closed.reason)}</span>
        </header>
        <p class="closed-summary">${extensionDialogCloseSummary(closed)}</p>
        <footer class="dialog-footer">
          <button class="secondary-action" type="button" @click=${() => { this.dismissClosed(closed); }}>Dismiss</button>
        </footer>
      </article>
    `;
  }

  private answerDialog(dialog: PendingExtensionDialog, value: ExtensionDialogAnswer): void {
    this.closeWith(dialog, () => this.onAnswer?.(dialog.dialogId, value));
  }

  private cancelDialog(dialog: PendingExtensionDialog): void {
    this.closeWith(dialog, () => this.onCancel?.(dialog.dialogId));
  }

  private submitInput(event: SubmitEvent, dialog: PendingExtensionDialog): void {
    event.preventDefault();
    // An empty string is a valid input answer, so Send stays enabled.
    this.answerDialog(dialog, this.inputValue);
  }

  private closeWith(dialog: PendingExtensionDialog, close: () => void | Promise<void>): void {
    if (this.closing) return;
    this.closing = true;
    const dialogId = dialog.dialogId;
    void Promise.resolve()
      .then(close)
      .catch(() => {
        // The parent controller owns the visible transport error. Keeping this
        // card usable is the only recovery needed at this boundary.
      })
      .finally(() => {
        if (this.dialog?.dialogId === dialogId) this.closing = false;
      });
  }

  private changeInput(event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    this.inputValue = input.value;
  }

  private dismissClosed(closed: ClosedExtensionDialog): void {
    this.onDismiss?.(closed.dialog.dialogId);
  }

  private currentIdentity(): string | undefined {
    if (this.outcome !== undefined) return `closed:${this.outcome.dialog.dialogId}`;
    if (this.dialog !== undefined) return `open:${this.dialog.dialogId}`;
    return undefined;
  }

  private syncCountdownTimer(): void {
    const needsTick = this.isConnected && this.outcome === undefined && this.dialog?.timeoutAt !== undefined;
    if (needsTick && this.countdownTimer === undefined) {
      this.countdownNow = Date.now();
      this.countdownTimer = window.setInterval(() => { this.countdownNow = Date.now(); }, COUNTDOWN_TICK_MS);
      return;
    }
    if (!needsTick) this.stopCountdownTimer();
  }

  private stopCountdownTimer(): void {
    if (this.countdownTimer === undefined) return;
    window.clearInterval(this.countdownTimer);
    this.countdownTimer = undefined;
  }

  static override styles = css`
    :host {
      display: block;
      box-sizing: border-box;
      width: 100%;
      margin: 0 0 14px;
      color: var(--pi-text);
      font: 400 14px/20px var(--pi-font-family, system-ui, sans-serif);
      container-type: inline-size;
    }
    .card {
      border: 0;
      border-radius: 10px;
      background: var(--pi-surface);
    }
    .card-header {
      position: sticky;
      top: var(--pi-chat-sticky-top, 0px);
      z-index: 6;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 22px;
      padding: 8px 16px 7px;
      border-bottom: 0;
      border-radius: 9px 9px 0 0;
      background: var(--pi-surface);
      box-shadow: none;
    }
    h2, p { margin-top: 0; }
    h2 {
      min-width: 0;
      margin-bottom: 0;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .header-status { flex: 0 0 auto; color: var(--pi-muted); font-size: 11px; text-align: end; }
    .header-status.answered { color: var(--pi-success); }
    .header-status.timeout, .header-status.aborted, .header-status.session-ended { color: var(--pi-warning); }
    .dialog-message {
      margin: 0;
      padding: 12px 16px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }
    .dialog-options { display: grid; gap: 7px; padding: 12px 16px; }
    .option-button {
      display: block;
      width: 100%;
      text-align: start;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .option-button:hover:not(:disabled) { background: var(--pi-surface-hover); }
    .dialog-input-form { display: grid; }
    .dialog-input {
      box-sizing: border-box;
      width: calc(100% - 32px);
      margin: 12px 16px 0;
      border: 1px solid var(--pi-border);
      border-radius: 8px;
      background: var(--pi-bg);
      color: var(--pi-text);
      padding: 8px;
      font: var(--pi-control-font-size, 16px)/1.428571 var(--pi-control-font-family, system-ui, sans-serif);
    }
    .dialog-footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      border-top: 1px solid var(--pi-border-muted);
      padding: 12px 16px;
    }
    .dialog-message + .dialog-footer, .dialog-options + .dialog-footer { border-top: 0; }
    button {
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--pi-text);
      padding: 7px 12px;
      font: inherit;
      cursor: pointer;
    }
    button:hover:not(:disabled) { background: var(--pi-surface-hover); }
    button:disabled { cursor: wait; opacity: .65; }
    button:focus-visible, .dialog-input:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    .primary-action { background: var(--pi-selection-bg); color: var(--pi-text); font-weight: 500; }
    .primary-action:hover:not(:disabled) { background: var(--pi-surface-hover); }
    .closed-summary {
      margin: 0;
      padding: 12px 16px;
      color: var(--pi-muted);
      font-size: 13px;
      line-height: 1.4;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    @media (pointer: coarse) { button { min-height: 44px; box-sizing: border-box; } }
    @container (max-width: 580px) {
      .primary-action { min-height: 44px; }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "extension-dialog-card": ExtensionDialogCard;
  }
}
