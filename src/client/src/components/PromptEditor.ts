import { localizedTemplate, localizedText, t } from "../../../shared/i18n";
import { defaultKeymap, history, historyKeymap, indentWithTab, insertNewlineAndIndent } from "@codemirror/commands";
import { markdown, deleteMarkupBackward, insertNewlineContinueMarkup } from "@codemirror/lang-markdown";
import { EditorSelection, EditorState, Compartment } from "@codemirror/state";
import { drawSelection, EditorView, keymap, placeholder } from "@codemirror/view";
import { defaultHighlightStyle, indentOnInput, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { LitElement, html, svg, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { api, DEFAULT_WORKSPACE_ATTACHMENTS_FOLDER, type FileSuggestion, type PromptAttachment, type SessionModel, type SessionStatus, type SlashCommand } from "../api";
import type { PromptAttachmentDelivery } from "../../../shared/apiTypes";
import { capturePromptAttachments, effectivePromptAttachmentDelivery, isInlinePromptAttachment, promptAttachmentsCanUseInlineDelivery } from "../promptAttachmentCapture";
import { thinkingDisplayLabel } from "../thinkingLevelPresentation";
import { KNOWN_THINKING_LEVELS } from "../../../shared/thinkingLevels";
import { inputModeForDraft, inputModesEqual, type InputMode } from "../inputModes";
import { machineSessionKey } from "../machineKeys";
import type { StagedPromptChip } from "../promptChips";
import { detectPromptCompletionTrigger, fileCompletionInsertText, modelCompletionChoices, type PromptCompletionTrigger } from "../promptCompletions";
import { promptArgumentHintExtension, setPromptArgumentHint } from "../promptArgumentHint";
import { clearDraft, loadDraft, saveDraft } from "../promptDraftStorage";
import { clearStagedAttachments, loadStagedAttachments, saveStagedAttachments, type PendingAttachment } from "../promptAttachmentStaging";
import { loadAttachmentDelivery, saveAttachmentDelivery } from "../attachmentPreferences";
import { createMobilePromptEnterMedia, shouldUsePromptEnterShiftShortcut } from "../promptEnterBehavior";
import { composerSendShortcut, matchesComposerSend } from "../composerShortcuts";
import type { ShortcutPreferenceConfig } from "../keyboardShortcuts";
import { promptEditorStyles, type CompletionItem } from "./shared";
import { promptAttachmentStyles } from "./promptAttachmentStyles";
import { renderQueueIcon, renderSteerIcon, renderStopIcon } from "./promptEditorIcons";
import { formatFileSize } from "../utils/format";
import "./AutocompleteMenu";
import "./AttachmentPreview";
import "./ThinkingLevelLabel";

const promptPlaceholder = t("ui.composer.placeholder");

// Text nodes inside contenteditable can become iOS keyboard context, even in
// non-editable placeholder widgets. Render the hint with CSS-generated content.
function createPromptPlaceholder(): HTMLElement {
  const hint = document.createElement("span");
  hint.className = "prompt-placeholder";
  hint.dataset["placeholder"] = promptPlaceholder;
  return hint;
}

type PromptSendArgs = [text: string, streamingBehavior?: "steer" | "followUp", attachments?: PromptAttachment[], delivery?: PromptAttachmentDelivery, folder?: string, chips?: readonly StagedPromptChip[]];
// Existing composer consumers may still send fire-and-forget; only a boolean
// promise confirms the new chip-bearing submission path.
type PromptSendHandler = ((...args: PromptSendArgs) => void | Promise<void>) | ((...args: PromptSendArgs) => Promise<boolean>);

@customElement("prompt-editor")
export class PromptEditor extends LitElement {
  @property({ type: Boolean }) disabled = false;
  @property({ attribute: false }) shortcuts: ShortcutPreferenceConfig = {};
  @property() defaultStreamingBehavior: "steer" | "followUp" = "steer";
  @property() sessionId?: string;
  @property() cwd?: string;
  @property() machineId = "local";
  @property() machineLabel?: string;
  @property() projectId?: string;
  @property() workspaceId?: string;
  /**
   * Workspace-effective folder for the "save to folder" attachment delivery.
   * Shown in the delivery label and sent explicitly with the save request, so
   * the save destination is always the folder the label advertised.
   */
  @property() attachmentsFolder = DEFAULT_WORKSPACE_ATTACHMENTS_FOLDER;
  @property({ type: Boolean }) canSteer = false;
  @property({ type: Boolean }) isCompacting = false;
  @property({ type: Boolean }) canStop = false;
  @property({ attribute: false }) status?: SessionStatus;
  @property({ type: Boolean }) sending = false;
  @property({ attribute: false }) promptChips: readonly StagedPromptChip[] = [];
  @property({ attribute: false }) onRemoveChip?: (chip: StagedPromptChip) => void;
  @property({ attribute: false }) onSend?: PromptSendHandler;
  @property({ attribute: false }) onStop?: () => void;
  @property({ attribute: false }) onSelectModel?: () => void;
  @property({ attribute: false }) onSelectThinking?: () => void;
  @property({ attribute: false }) onSelectMachine?: () => void;
  @property({ attribute: false }) onSelectWorkspace?: () => void;
  @query(".markdown-editor") private editorHost?: HTMLDivElement;
  @query(".attachment-input") private attachmentInput?: HTMLInputElement;
  // `draft` is the live document text but is intentionally NOT reactive: it
  // changes on every keystroke and the visible text is owned by CodeMirror, not
  // by Lit's render. Re-rendering the surrounding template on each keystroke is
  // wasted work and, on iOS, can interrupt an in-progress touch gesture (the
  // long-press edit/paste callout). Only `currentInputMode` (shell vs. normal)
  // is reactive, since that is the only draft-derived value the template shows.
  private draft = "";
  @state() private currentInputMode: InputMode = { kind: "normal" };
  @state() private completions: CompletionItem[] = [];
  @state() private selectedIndex = 0;
  @state() private attachments: readonly PendingAttachment[] = [];
  @state() private attachmentDelivery: PromptAttachmentDelivery = loadAttachmentDelivery();
  @state() private attachmentError: string | undefined = undefined;
  @state() private previewAttachmentId: string | undefined = undefined;
  @state() private chipSendingKey: string | undefined = undefined;
  @state() private chipError: string | undefined = undefined;
  private attachmentSeq = 0;
  private requestVersion = 0;
  private editor: EditorView | undefined;
  private readonly editableCompartment = new Compartment();
  private readonly readOnlyCompartment = new Compartment();
  private readonly mobilePromptEnterMedia = createMobilePromptEnterMedia();
  private explicitShiftKeyActive = false;

  protected override willUpdate(changed: PropertyValues<this>) {
    if (!changed.has("sessionId") && !changed.has("machineId")) return;
    const previousSessionId = changed.has("sessionId") ? changed.get("sessionId") : this.sessionId;
    const previousMachineId = changed.has("machineId") ? changed.get("machineId") : this.machineId;
    const previousKey = draftStorageKey(previousMachineId, previousSessionId);
    if (previousKey !== undefined) {
      saveDraft(previousKey, this.draft);
      saveStagedAttachments(previousKey, this.attachments);
    }
    const currentKey = draftStorageKey(this.machineId, this.sessionId);
    this.draft = currentKey !== undefined ? loadDraft(currentKey) : "";
    this.attachments = currentKey !== undefined ? loadStagedAttachments(currentKey) : [];
    this.previewAttachmentId = undefined;
    this.attachmentError = undefined;
    this.chipError = undefined;
    this.currentInputMode = inputModeForDraft(this.draft);
    this.completions = [];
    this.selectedIndex = 0;
  }

  protected override shouldUpdate(changed: PropertyValues<this>): boolean {
    // Status updates churn once per token during streaming and hand us a fresh
    // object reference each time. When nothing else changed, only re-render if a
    // status field the template actually displays differs, so streaming does not
    // disturb the editor DOM (and any in-progress touch gesture survives).
    if (changed.has("status") && changed.size === 1) {
      return !sessionStatusRenderEqual(changed.get("status"), this.status);
    }
    return true;
  }

  override firstUpdated(): void {
    this.createEditor();
  }

  protected override updated(changed: PropertyValues) {
    if (changed.has("disabled")) this.updateEditorDisabledState();
    if (changed.has("sessionId") || changed.has("machineId")) this.syncEditorDoc();
  }

  override disconnectedCallback(): void {
    this.editor?.destroy();
    this.editor = undefined;
    super.disconnectedCallback();
  }

  override render() {
    const shellInputMode = this.promptChips.length === 0 && this.currentInputMode.kind === "shell" ? this.currentInputMode : undefined;
    const shellMode = shellInputMode !== undefined;
    const queuesInput = this.canSteer || this.isCompacting;
    const keyboardSteers = this.defaultSendBehavior() === "steer";
    const submissionPending = this.sending || this.chipSendingKey === this.composerKey();
    const busy = this.disabled || submissionPending;
    const folderLabel = this.cwd?.split("/").filter((segment) => segment !== "").at(-1) ?? this.cwd;
    return html`
      <footer class=${shellMode ? "shell-mode" : ""} aria-busy=${submissionPending ? "true" : "false"} @paste=${(event: ClipboardEvent) => { void this.handlePaste(event); }} @dragover=${(event: DragEvent) => { this.handleDragOver(event); }} @drop=${(event: DragEvent) => { void this.handleDrop(event); }}>
        ${this.cwd === undefined ? null : html`
          <div class="composer-context">
            <button class="context-chip machine-chip" type="button" title=${this.machineLabel ?? this.machineId} aria-label=${t("ui.composer.machinePicker")} aria-haspopup="dialog" ?disabled=${this.onSelectMachine === undefined} @click=${() => this.onSelectMachine?.()}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2.5" width="10" height="8" rx="1"></rect><path d="M1.5 13h13l-1.5-2.5H3z"></path></svg>
              <span>${this.machineLabel ?? (this.machineId === "local" ? t("ui.composer.local") : this.machineId)}</span>
            </button>
            <button class="context-chip folder-chip" type="button" title=${this.cwd} aria-label=${t("ui.navigation.workspacePicker")} aria-haspopup="dialog" ?disabled=${this.onSelectWorkspace === undefined} @click=${() => this.onSelectWorkspace?.()}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3h4l1.5 2h5.5v8H2.5z"></path></svg>
              <span>${folderLabel}</span>
            </button>
          </div>
        `}
        <div class="editor-wrap">
          <div class="editor-row">
            <div class="editor-input">
              <div class=${`markdown-editor${this.disabled ? " markdown-editor-disabled" : ""}`} aria-label=${t("ui.composer.message")} aria-disabled=${this.disabled ? "true" : "false"}></div>
              <input class="attachment-input" type="file" multiple hidden @change=${(event: Event) => { void this.handleFileInput(event); }} />
              ${shellMode ? localizedTemplate("PromptEditor.shell_command.f0a1fde8", html)`<div class="mode-hint">Shell command${shellInputMode.excludeFromContext ? t("PromptEditor.excluded_from_context.77ba9e69") : ""}</div>` : null}
            </div>
            <div class="composer-buttons">
              <button class="icon-button composer-action send-button ${queuesInput ? "queue-button" : ""} ${keyboardSteers ? "" : "default-send-action"}" ?disabled=${busy} title=${queuesInput ? t("PromptEditor.queue_until_the_current_activity_finishes.2420ce17") : t("PromptEditor.send_message.0a862bc3")} aria-label=${queuesInput ? t("PromptEditor.queue_message.85941fe3") : t("PromptEditor.send_message.0f5782d0")} @click=${() => { this.send("followUp"); }}>${queuesInput ? renderQueueIcon() : renderComposerSendIcon()}<span class="composer-action-label">${queuesInput ? t("ui.composer.queue") : t("ui.composer.send")}</span></button>
              ${this.canSteer && !this.isCompacting ? localizedTemplate("PromptEditor.template.937eff61", html)`<button class="icon-button composer-action steer-button ${keyboardSteers ? "default-send-action" : ""}" ?disabled=${busy} title="Steer the current response before the next model call" aria-label="Steer current response" @click=${() => { this.send("steer"); }}>${renderSteerIcon()}<span class="composer-action-label">${t("ui.composer.steer")}</span></button>` : null}
              <button class="icon-button composer-action stop-button" ?hidden=${!this.canStop} ?disabled=${this.disabled || !this.canStop} title=${this.canStop ? t("PromptEditor.stop_current_work_and_clear_queued_messages.6018d1cd") : t("PromptEditor.nothing_running.c930593d")} aria-label=${t("ui.composer.stopWork")} @click=${() => this.onStop?.()}>${renderStopIcon()}<span class="composer-action-label">${t("ui.composer.stop")}</span></button>
            </div>
          </div>
          ${this.renderPromptChips()}
          ${this.renderAttachments()}
          <autocomplete-menu .items=${this.completions} .selectedIndex=${this.selectedIndex} .onPick=${(item: CompletionItem) => { this.pick(item); }}></autocomplete-menu>
        </div>
        <div class="actions">
          <button class="editor-attach icon-button" ?disabled=${busy} title=${t("ui.composer.attach")} aria-label=${t("ui.composer.attach")} @click=${() => { this.attachmentInput?.click(); }}><span class="attach-mark" aria-hidden="true">+</span></button>
          <div class="composer-controls">
            ${this.renderCompactStatus()}
            <slot name="status"></slot>
          </div>
        </div>
        ${submissionPending || (this.isCompacting && !shellMode) ? html`<div class="composer-state" role="status" aria-live="polite">${submissionPending ? t("ui.composer.sending") : t("ui.composer.compacting")}</div>` : null}
      </footer>
      ${this.renderAttachmentDialog()}
    `;
  }

  focusInput() {
    this.editor?.focus();
  }

  replaceText(text: string): void {
    this.draft = text;
    const key = draftStorageKey(this.machineId, this.sessionId);
    if (key !== undefined) saveDraft(key, text);

    const editor = this.editor;
    if (editor !== undefined) {
      const current = editor.state.doc.toString();
      editor.dispatch({
        ...(current === text ? {} : { changes: { from: 0, to: current.length, insert: text } }),
        selection: EditorSelection.cursor(text.length),
      });
    }

    // Invalidate completion requests started for either the previous document or
    // the replacement dispatch, then return the editor to a clean completion state.
    this.requestVersion += 1;
    this.currentInputMode = inputModeForDraft(text);
    this.completions = [];
    this.selectedIndex = 0;
  }

  /** Get the underlying CM6 EditorView, or undefined if not yet mounted. */
  get view(): EditorView | undefined {
    return this.editor;
  }

  /** Anchor the model menu to the model button in the composer toolbar. */
  get modelAnchor(): HTMLElement | undefined {
    return this.renderRoot.querySelector<HTMLElement>(".select-model") ?? undefined;
  }

  get thinkingAnchor(): HTMLElement | undefined {
    return this.renderRoot.querySelector<HTMLElement>(".select-thinking") ?? undefined;
  }

  private renderCompactStatus() {
    const status = this.status;
    if (status === undefined) return null;
    const model = status.model?.id ?? t("PromptEditor.no_model.0a560ca1");
    const provider = status.model?.provider !== undefined && status.model.provider !== "" ? `${status.model.provider}/` : "";
    const thinkingOptions = KNOWN_THINKING_LEVELS.map((value) => ({ value, label: thinkingDisplayLabel(value) }));
    return html`
      <div class="compact-status" aria-label=${t("ui.composer.status")}>
        <button class="select-model" type="button" title=${t("ui.composer.model")} aria-haspopup="dialog" @click=${() => this.onSelectModel?.()}><span class="model-label" title=${`${provider}${model}`}>${model}</span></button>
        ${status.thinkingLevel === undefined ? null : html`<button class="select-thinking thinking-button" type="button" title=${t("ui.thinkingPicker.title")} aria-label=${`${t("ui.thinkingPicker.title")}: ${thinkingDisplayLabel(status.thinkingLevel)}`} aria-haspopup="dialog" @click=${() => this.onSelectThinking?.()}><span class="thinking-label"><thinking-level-label .value=${status.thinkingLevel} .options=${thinkingOptions}>${thinkingDisplayLabel(status.thinkingLevel)}</thinking-level-label></span></button>`}
      </div>
    `;
  }

  private renderPromptChips() {
    if (this.promptChips.length === 0 && this.chipError === undefined) return null;
    return localizedTemplate("PromptEditor.template.d78f42ad", html)`
      <div class="prompt-chips" aria-label="Pending plugin context">
        ${this.promptChips.map((chip) => html`
          <div class="prompt-chip" title=${chip.text}>
            <span>${chip.label}</span>
            <button type="button" aria-label=${localizedText("PromptEditor.remove.2ff51610")`Remove ${chip.label}`} ?disabled=${this.disabled} @click=${() => this.onRemoveChip?.(chip)}>×</button>
          </div>
        `)}
        ${this.chipError === undefined ? null : html`<div class="chip-error" role="alert">${this.chipError}</div>`}
      </div>
    `;
  }

  private renderAttachments() {
    if (this.attachments.length === 0 && this.attachmentError === undefined) return null;
    const canUseInlineDelivery = promptAttachmentsCanUseInlineDelivery(this.attachments);
    const delivery = this.effectiveAttachmentDelivery();
    return localizedTemplate("PromptEditor.template.f006a493", html)`
      <div class="attachments" aria-label="Pending attachments">
        <div class="attachment-items">
          ${this.attachments.map((attachment) => localizedTemplate("PromptEditor.template.f6a5aa80", html)`
          <div class="attachment-chip attachment-card" title=${attachment.name}>
            <button class="attachment-preview-trigger" type="button" title=${t("ui.attachmentPreview.preview")} aria-label=${`${t("ui.attachmentPreview.preview")}: ${attachment.name}`} @click=${() => { this.previewAttachmentId = attachment.id; }}>
              <span class="attachment-thumbnail" aria-hidden="true">${this.renderAttachmentThumbnail(attachment)}</span>
              <span class="attachment-card-copy">
                <span class="attachment-card-name">${attachment.name}</span>
                <span class="attachment-card-info">${fileExtensionLabel(attachment.name)} · ${formatFileSize(attachment.size)}</span>
              </span>
            </button>
            <button type="button" class="attachment-remove" title="Remove attachment" aria-label=${localizedText("PromptEditor.remove.ee640944")`Remove ${attachment.name}`} @click=${() => { this.removeAttachment(attachment.id); }}>×</button>
          </div>
        `)}
        </div>
        ${this.attachments.length > 0 ? localizedTemplate("PromptEditor.attach_to_message.47fbc200", html)`
          <div class="attachment-controls">
            <span class="attachment-count">${t("ui.composer.attachments")} · ${this.attachments.length}</span>
            <label class="attachment-delivery" title=${canUseInlineDelivery ? t("PromptEditor.how_attachments_are_delivered_to_the_agent.41e0a0ea") : t("PromptEditor.general_files_are_saved_and_mentioned_from.559b9fea")}>
              <select aria-label=${t("PromptEditor.how_attachments_are_delivered_to_the_agent.41e0a0ea")} .value=${delivery} @change=${(event: Event) => { this.changeDelivery(event); }}>
                <option value="inline" ?disabled=${!canUseInlineDelivery}>Attach to message${canUseInlineDelivery ? "" : t("PromptEditor.images_only.76d1724e")}</option>
                <option value="folder">${attachmentFolderDeliveryLabel(this.attachmentsFolder)}</option>
              </select>
            </label>
          </div>
        ` : null}
        ${this.attachmentError !== undefined ? html`<div class="attachment-error" role="alert">${this.attachmentError}</div>` : null}
      </div>
    `;
  }

  private renderAttachmentThumbnail(attachment: PendingAttachment) {
    if (isInlinePromptAttachment(attachment)) {
      return html`<img src=${`data:${attachment.mimeType};base64,${attachment.data}`} alt=${attachment.name} />`;
    }
    return html`
      <div class="attachment-file-preview" aria-hidden="true">${fileExtensionLabel(attachment.name)}</div>
    `;
  }

  private renderAttachmentDialog() {
    const attachment = this.attachments.find((item) => item.id === this.previewAttachmentId);
    if (attachment === undefined) return null;
    return html`<attachment-preview
      .attachment=${attachment}
      .onClose=${() => { this.previewAttachmentId = undefined; }}
      .onRemove=${() => { this.removeAttachment(attachment.id); }}
    ></attachment-preview>`;
  }

  private changeDelivery(event: Event) {
    if (!(event.target instanceof HTMLSelectElement)) return;
    const requested = event.target.value === "folder" ? "folder" : "inline";
    if (requested === "inline" && !promptAttachmentsCanUseInlineDelivery(this.attachments)) {
      event.target.value = "folder";
      return;
    }
    this.attachmentDelivery = requested;
    saveAttachmentDelivery(this.attachmentDelivery);
  }

  private removeAttachment(id: string) {
    this.attachments = this.attachments.filter((attachment) => attachment.id !== id);
    if (this.previewAttachmentId === id) {
      this.previewAttachmentId = undefined;
      // The preview's opener is being removed, so restore focus to the composer.
      void this.updateComplete.then(() => { this.focusInput(); });
    }
  }

  private async handlePaste(event: ClipboardEvent) {
    const files = filesFromDataTransfer(event.clipboardData);
    if (files.length === 0) return;
    event.preventDefault();
    await this.addAttachmentFiles(files);
  }

  private handleDragOver(event: DragEvent) {
    if (event.dataTransfer === null) return;
    if (dataTransferHasFiles(event.dataTransfer)) event.preventDefault();
  }

  private async handleDrop(event: DragEvent) {
    const files = filesFromDataTransfer(event.dataTransfer);
    if (files.length === 0) return;
    event.preventDefault();
    await this.addAttachmentFiles(files);
  }

  private async handleFileInput(event: Event) {
    if (!(event.target instanceof HTMLInputElement) || event.target.files === null) return;
    const files = Array.from(event.target.files);
    event.target.value = "";
    await this.addAttachmentFiles(files);
  }

  private async addAttachmentFiles(files: File[]) {
    this.attachmentError = undefined;
    const { attachments, error } = await capturePromptAttachments(files, readFileAsBase64);
    if (attachments.length > 0) {
      this.attachments = [...this.attachments, ...attachments.map((attachment) => ({ id: `attachment-${String(++this.attachmentSeq)}`, ...attachment }))];
    }
    if (error !== undefined) this.attachmentError = error;
  }

  private currentAttachments(): PromptAttachment[] {
    return this.attachments.map((attachment) => pendingToPromptAttachment(attachment));
  }

  private effectiveAttachmentDelivery(): PromptAttachmentDelivery {
    return effectivePromptAttachmentDelivery(this.attachmentDelivery, this.attachments);
  }

  private createEditor() {
    if (!this.editorHost || this.editor !== undefined) return;
    this.editor = new EditorView({
      parent: this.editorHost,
      state: EditorState.create({
        doc: this.draft,
        extensions: [
          history(),
          markdown(),
          indentOnInput(),
          indentUnit.of("  "),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          EditorView.lineWrapping,
          drawSelection(),
          EditorView.contentAttributes.of((view) => inputAssistanceContentAttributes(view.state.sliceDoc(0, view.state.selection.main.head))),
          EditorView.domEventHandlers({
            keyup: (event) => this.handleEditorKeyUp(event),
            blur: () => this.resetEditorModifierState(),
          }),
          placeholder(createPromptPlaceholder),
          EditorView.contentAttributes.of({ "aria-placeholder": promptPlaceholder }),
          promptArgumentHintExtension,
          this.editableCompartment.of(EditorView.editable.of(!this.disabled)),
          this.readOnlyCompartment.of(EditorState.readOnly.of(this.disabled)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) this.updateDraft(update.state.doc.toString());
          }),
          keymap.of([
            { any: (view, event) => this.handleEditorKeyDown(event, view) },
            { key: "ArrowDown", run: () => this.moveCompletion(1) },
            { key: "ArrowUp", run: () => this.moveCompletion(-1) },
            { key: "Escape", run: () => this.closeCompletions() },
            { key: "Tab", run: (view) => this.handleEditorTab(view) },
            { key: "Shift-Tab", run: (view) => indentWithTab.shift?.(view) ?? false },
            { key: "Backspace", run: (view) => deleteMarkupBackward(view) },
            ...historyKeymap,
            ...defaultKeymap,
          ]),
        ],
      }),
    });
  }

  private syncEditorDoc() {
    const editor = this.editor;
    if (!editor) return;
    const current = editor.state.doc.toString();
    if (current === this.draft) return;
    editor.dispatch({
      changes: { from: 0, to: current.length, insert: this.draft },
      selection: EditorSelection.cursor(this.draft.length),
    });
  }

  private updateEditorDisabledState() {
    this.editor?.dispatch({
      effects: [
        this.editableCompartment.reconfigure(EditorView.editable.of(!this.disabled)),
        this.readOnlyCompartment.reconfigure(EditorState.readOnly.of(this.disabled)),
      ],
    });
  }

  private updateDraft(value: string) {
    this.draft = value;
    const key = draftStorageKey(this.machineId, this.sessionId);
    if (key !== undefined) saveDraft(key, this.draft);
    const nextInputMode = inputModeForDraft(this.draft);
    if (!inputModesEqual(nextInputMode, this.currentInputMode)) this.currentInputMode = nextInputMode;
    void this.refreshCompletions();
  }

  private async refreshCompletions() {
    const trigger = this.currentTrigger();
    const version = ++this.requestVersion;
    this.selectedIndex = 0;
    if (trigger === undefined) {
      this.completions = [];
      return;
    }
    if (trigger.kind === "command" && this.sessionId !== undefined && this.sessionId !== "" && this.cwd !== undefined && this.cwd !== "") {
      const commands = await api.commands({ id: this.sessionId, cwd: this.cwd }, this.machineId).catch(emptySlashCommands);
      if (version !== this.requestVersion) return;
      this.completions = commands
        .filter((command) => command.name.toLowerCase().includes(trigger.query.toLowerCase()))
        .map((command) => ({
          kind: "command",
          replaceFrom: trigger.from,
          replaceTo: trigger.to,
          insertText: `/${command.name}`,
          detail: command.source,
          ...(command.description === undefined ? {} : { description: command.description }),
          ...(command.argumentHint === undefined ? {} : { argumentHint: command.argumentHint }),
        }));
    } else if (trigger.kind === "file" && this.projectId !== undefined && this.workspaceId !== undefined) {
      const files = await api.files(trigger.query, { scope: trigger.fileScope, machineId: this.machineId, projectId: this.projectId, workspaceId: this.workspaceId }).catch(emptyFileSuggestions);
      if (version !== this.requestVersion) return;
      this.completions = files
        .slice(0, 12)
        .map((file) => {
          const insertText = fileCompletionInsertText(file.path, trigger.quoted === true, file.path.endsWith("/") ? trigger.allPrefix : undefined);
          return {
            kind: "file",
            replaceFrom: trigger.from,
            replaceTo: trigger.to,
            insertText,
            detail: file.kind,
            ...(file.path.endsWith("/") && insertText.endsWith("\"") ? { cursorOffset: insertText.length - 1 } : {}),
          };
        });
    } else if (trigger.kind === "model" && this.sessionId !== undefined && this.sessionId !== "" && this.cwd !== undefined && this.cwd !== "") {
      const models = await api.models({ id: this.sessionId, cwd: this.cwd }, this.machineId).then((response) => response.models).catch(emptySessionModels);
      if (version !== this.requestVersion) return;
      this.completions = modelCompletionChoices(models, trigger.query).map((choice) => ({
        kind: "model",
        replaceFrom: trigger.from,
        replaceTo: trigger.to,
        ...choice,
      }));
    }
  }

  private currentTrigger(): PromptCompletionTrigger | undefined {
    return detectPromptCompletionTrigger(this.draft, this.editor?.state.selection.main.head ?? this.draft.length);
  }

  private moveCompletion(delta: number): boolean {
    if (!this.completions.length) return false;
    this.selectedIndex = (this.selectedIndex + delta + this.completions.length) % this.completions.length;
    return true;
  }

  private closeCompletions(): boolean {
    if (!this.completions.length) return false;
    this.completions = [];
    return true;
  }

  /** The capture-phase app dispatcher must leave composer-owned keys to CodeMirror. */
  ownsKeyboardEvent(event: KeyboardEvent): boolean {
    if (this.editor === undefined || !event.composedPath().includes(this.editor.contentDOM)) return false;
    // Keep Enter/newline handling and IME composition inside the editor, too.
    return event.isComposing || this.editor.composing
      || (event.key === "Enter" && !event.ctrlKey && !event.metaKey && !event.altKey)
      || this.matchesSendShortcut(event);
  }

  private matchesSendShortcut(event: KeyboardEvent): boolean {
    const shiftKey = event.key === "Enter"
      ? shouldUsePromptEnterShiftShortcut(event.shiftKey, this.explicitShiftKeyActive, this.mobilePromptEnterMedia)
      : event.shiftKey;
    return matchesComposerSend({ key: event.key, ctrlKey: event.ctrlKey, metaKey: event.metaKey, altKey: event.altKey, shiftKey, isComposing: event.isComposing, target: event.target }, composerSendShortcut(this.shortcuts, this.mobilePromptEnterMedia));
  }

  private handleEditorKeyDown(event: KeyboardEvent, view: EditorView): boolean {
    if (event.key === "Shift") {
      this.explicitShiftKeyActive = true;
      return false;
    }
    if (event.defaultPrevented || event.isComposing || view.composing) return false;
    const send = this.matchesSendShortcut(event);
    const plainEnter = event.key === "Enter" && !event.ctrlKey && !event.metaKey && !event.altKey
      && !shouldUsePromptEnterShiftShortcut(event.shiftKey, this.explicitShiftKeyActive, this.mobilePromptEnterMedia);
    this.explicitShiftKeyActive = false;
    if (plainEnter && this.completions.length) {
      const completion = this.completions[this.selectedIndex];
      if (completion !== undefined) this.pick(completion);
      return true;
    }
    if (send) {
      this.send(this.defaultSendBehavior());
      return true;
    }
    if (event.key === "Enter" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      return insertNewlineContinueMarkup(view) || insertNewlineAndIndent(view);
    }
    return false;
  }

  private handleEditorKeyUp(event: KeyboardEvent): boolean {
    if (event.key === "Shift") this.explicitShiftKeyActive = false;
    return false;
  }

  private resetEditorModifierState(): boolean {
    this.explicitShiftKeyActive = false;
    return false;
  }

  private handleEditorTab(view: EditorView): boolean {
    if (this.completions.length) {
      const completion = this.completions[this.selectedIndex];
      if (completion !== undefined) this.pick(completion);
      return true;
    }
    const trigger = this.currentTrigger();
    if (trigger?.kind === "file") {
      void this.refreshCompletions();
      return true;
    }
    return indentWithTab.run?.(view) ?? false;
  }

  private pick(item: CompletionItem) {
    const editor = this.editor;
    if (!editor) return;
    const suffix = item.kind === "file" && (item.insertText.endsWith("/") || item.cursorOffset !== undefined) ? "" : " ";
    const cursor = item.replaceFrom + (item.cursorOffset ?? item.insertText.length) + suffix.length;
    const replaceTo = item.insertText.endsWith("\"") && this.draft.slice(item.replaceTo).startsWith("\"") ? item.replaceTo + 1 : item.replaceTo;
    editor.dispatch({
      changes: { from: item.replaceFrom, to: replaceTo, insert: `${item.insertText}${suffix}` },
      selection: EditorSelection.cursor(cursor),
      scrollIntoView: true,
      ...(item.argumentHint === undefined || item.argumentHint === "" ? {} : { effects: setPromptArgumentHint.of({ pos: cursor, text: item.argumentHint }) }),
    });
    this.completions = [];
  }

  private defaultSendBehavior(): "steer" | "followUp" | undefined {
    if (this.isCompacting) return "followUp";
    return this.canSteer ? this.defaultStreamingBehavior : undefined;
  }

  private send(streamingBehavior?: "steer" | "followUp") {
    if (this.disabled || this.sending || this.chipSendingKey === this.composerKey()) return;
    const text = this.draft.trim();
    const pending = this.attachments;
    const chips = this.promptChips;
    if (text === "" && pending.length === 0 && chips.length === 0) return;
    const behavior = this.canSteer || this.isCompacting ? streamingBehavior : undefined;
    const attachments = pending.length > 0 ? this.currentAttachments() : undefined;
    const delivery = this.effectiveAttachmentDelivery();
    // Folder delivery sends the displayed workspace-effective folder explicitly
    // (the uploads pattern): the save lands exactly where the label pointed,
    // independent of how the session cwd would resolve its own project config.
    const folder = attachments !== undefined && delivery === "folder" ? this.attachmentsFolder : undefined;
    if (chips.length > 0) {
      void this.sendWithChips(text, behavior, attachments, attachments === undefined ? undefined : delivery, folder, chips);
      return;
    }
    this.resetComposer();
    // Sending is owned by the controller (it drives the chat activity dock and,
    // for folder mode, orchestrates the upload + reference rewrite), so this is
    // fire-and-forget here.
    void this.onSend?.(text, behavior, attachments, attachments === undefined ? undefined : delivery, folder);
  }

  private composerKey(): string {
    return machineSessionKey(this.machineId, this.sessionId ?? "");
  }

  private async sendWithChips(text: string, behavior: "steer" | "followUp" | undefined, attachments: PromptAttachment[] | undefined, delivery: PromptAttachmentDelivery | undefined, folder: string | undefined, chips: readonly StagedPromptChip[]): Promise<void> {
    const key = this.composerKey();
    const draft = this.draft;
    const pending = this.attachments;
    this.chipSendingKey = key;
    this.chipError = undefined;
    try {
      const accepted = await this.onSend?.(text, behavior, attachments, delivery, folder, chips);
      if (key !== this.composerKey() || !this.isConnected) return;
      if (accepted === true) {
        // Do not erase edits made during delivery, or the next conversation.
        if (draft === this.draft && pending === this.attachments) this.resetComposer();
      } else {
        this.chipError = t("PromptEditor.message_not_submitted_context_kept_for_retry.9e178614");
      }
    } catch (error) {
      if (key === this.composerKey()) this.chipError = localizedText("PromptEditor.message_not_submitted.85a8ed36")`Message not submitted: ${String(error)}`;
    } finally {
      if (this.chipSendingKey === key) this.chipSendingKey = undefined;
    }
  }

  private resetComposer() {
    this.draft = "";
    this.currentInputMode = { kind: "normal" };
    const key = draftStorageKey(this.machineId, this.sessionId);
    if (key !== undefined) {
      clearDraft(key);
      clearStagedAttachments(key);
    }
    this.completions = [];
    this.attachments = [];
    this.previewAttachmentId = undefined;
    this.attachmentError = undefined;
    // `draft` is not reactive, so the cleared text will not flow to CodeMirror
    // via `updated()`; push it to the editor document explicitly.
    this.syncEditorDoc();
  }

  static override styles = [promptEditorStyles, promptAttachmentStyles];
}

// The model identity and thinking level are shown in renderCompactStatus.
// Everything else the editor
// cares about (canSteer/canStop/isCompacting/sending) is passed as a separate
// property that Lit already diffs by value. Comparing just these fields lets us
// ignore the per-token status churn that does not change anything on screen.
function sessionStatusRenderEqual(a: SessionStatus | undefined, b: SessionStatus | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return a.model?.id === b.model?.id
    && a.model?.provider === b.model?.provider
    && a.thinkingLevel === b.thinkingLevel;
}

function draftStorageKey(machineId: unknown, sessionId: unknown): string | undefined {
  if (typeof machineId !== "string" || machineId === "") return undefined;
  if (typeof sessionId !== "string" || sessionId === "") return undefined;
  return machineSessionKey(machineId, sessionId);
}

function emptySlashCommands(): SlashCommand[] {
  return [];
}

function emptyFileSuggestions(): FileSuggestion[] {
  return [];
}

function emptySessionModels(): SessionModel[] {
  return [];
}

function renderComposerSendIcon() {
  return svg`<svg class="prompt-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 5v7a3 3 0 0 1-3 3H5m4-4-4 4 4 4"></path></svg>`;
}

function filesFromDataTransfer(data: DataTransfer | null): File[] {
  if (data === null) return [];
  return Array.from(data.files);
}

function dataTransferHasFiles(data: DataTransfer): boolean {
  const items = Array.from(data.items);
  if (items.length > 0) return items.some((item) => item.kind === "file");
  return Array.from(data.types).includes("Files");
}

function pendingToPromptAttachment(attachment: PendingAttachment): PromptAttachment {
  if (attachment.kind === "image") {
    return { kind: "image", mimeType: attachment.mimeType, data: attachment.data, name: attachment.name };
  }
  return { kind: "file", mimeType: attachment.mimeType, data: attachment.data, name: attachment.name };
}

export function attachmentFolderDeliveryLabel(folder: string): string {
  return localizedText("PromptEditor.save_to.8caeb8d9")`Save to ${folder}`;
}

function fileExtensionLabel(name: string): string {
  const trimmed = name.trim();
  const dotIndex = trimmed.lastIndexOf(".");
  if (dotIndex >= 0 && dotIndex < trimmed.length - 1) return trimmed.slice(dotIndex + 1, dotIndex + 5).toUpperCase();
  return "FILE";
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => { reject(reader.error ?? new Error(t("PromptEditor.failed_to_read_file.76c972dd"))); };
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") { reject(new Error(t("PromptEditor.unexpected_file_reader_result.4f05cda8"))); return; }
      const commaIndex = result.indexOf(",");
      resolve(commaIndex === -1 ? result : result.slice(commaIndex + 1));
    };
    reader.readAsDataURL(file);
  });
}

const proseInputAssistanceAttributes: Record<string, string> = {
  spellcheck: "true",
  autocorrect: "on",
  autocapitalize: "sentences",
  writingsuggestions: "true",
  dir: "auto",
};

const codeLikeInputAssistanceAttributes: Record<string, string> = {
  spellcheck: "false",
  autocorrect: "off",
  autocapitalize: "off",
  writingsuggestions: "false",
  dir: "auto",
};

function inputAssistanceContentAttributes(draftBeforeCursor: string): Record<string, string> {
  // CodeMirror is optimized for code and disables these by default, but the chat prompt is usually prose.
  return inputModeForDraft(draftBeforeCursor).kind === "normal" ? proseInputAssistanceAttributes : codeLikeInputAssistanceAttributes;
}

