import { renderUiIcon } from "./uiIcons";
import { roleDisplayLabel, localizedTemplate, localizedText, t } from "../../../shared/i18n";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { keyed } from "lit/directives/keyed.js";
import { styleMap } from "lit/directives/style-map.js";
import { ChatDisclosureController } from "../chatDisclosure";
import { writeClipboardText } from "../clipboard";
import { queuedMessageAttachmentLabel, type QueuedMessageAction, type QueuedMessageActionTarget } from "../queuedMessageActions";
import type { DisplayedMessageActionAvailabilityContext, MessageActionAvailabilityContext, MessageActionFeedback, MessageActionResult } from "../../../plugin-api";
import { displayedMessageActionMessage, messageActionMessage, MessageActionAvailabilityCache, type RegisteredMessageAction } from "../plugins/messageActions";
import { machineSessionKey } from "../machineKeys";
import { canonicalEntryActionHeaders, chatMessageHasHeader, groupChatMessages, type ChatGroup } from "../chatGroups";
import { chatGroupProgress, type ChatGroupProgress } from "../chatGroupProgress";
import { openTranscriptQuestion, transcriptQuestionOutcomes } from "../chatQuestions";
import { chatTimelineEntries, type ChatTimelineEntry } from "../chatTimeline";
import { ChatTimeline } from "./ChatTimeline";
import { ChatScrollFlows } from "../ChatScrollFlows";
import { turnWrittenFiles } from "../toolPresentation";
import { selectedContentIn, type QuotedChatSelection } from "../quotedSelection";
import { selectionQuotePosition, type QuoteAnchorRect, type QuotePopoverPosition } from "../selectionQuotePosition";
import { ChatRenderKeys } from "../chatRenderKeys";
import { DEFAULT_CHAT_BEHAVIORS, type ChatBehaviors } from "../chatBehaviors";
import type { AskUserSubmission, PendingExtensionDialog, QueuedSessionMessage, SessionActivity, SessionRef, SessionStatus, SessionWarningSeverity } from "../api";
import type { ClosedExtensionDialog } from "../appState";
import {
  notificationAnnouncementLabel,
  notificationDismissLabel,
  notificationFocusTargetAfterDismiss,
  notificationInboxOverflowLabel,
  notificationInboxTotalCount,
  notificationMessageTruncationLabel,
  notificationSeverityLabel,
  notificationTargetKey,
  notificationTrayHeading,
  notificationTrayIsCollapsed,
  setNotificationTrayCollapsed,
  type NotificationFocusTarget,
  type SelectedSessionNotificationView,
  type SessionNotificationTarget,
} from "../sessionNotifications";
import type { ChatLine, ChatPart } from "./shared";
import { chatStyles, renderSessionWarningIcon } from "./shared";
import { renderCopyIcon, renderGoBackIcon, renderTrashIcon } from "./messageActionIcons";
import { renderQueueIcon, renderSteerIcon } from "./promptEditorIcons";
import "./AskUserCard";
import "./ExtensionDialogCard";
import type { ExtensionDialogAnswerCallback, ExtensionDialogCancelCallback, ExtensionDialogDismissCallback } from "./ExtensionDialogCard";
import { registerRenderedModal, type RenderedModalRegistration } from "./modalLayerRegistry";
import "./FormattedText";
import type { MarkdownWorkspaceContext } from "../formatting/workspaceLinks";
import "./ToolExecutionView";
import { transcriptImageSource } from "./TranscriptImage";
import type { ImageOpenDetail } from "./ImagePresentation";

const messageTimestampFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" });
const notificationTimestampFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });

function renderNotificationDisclosureIcon(collapsed: boolean) {
  return html`
    <svg class=${`notification-icon notification-disclosure-icon${collapsed ? "" : " expanded"}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m9 18 6-6-6-6"></path>
    </svg>
  `;
}

function renderNotificationCloseIcon() {
  return html`
    <svg class="notification-icon notification-close-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6l12 12"></path>
      <path d="M18 6 6 18"></path>
    </svg>
  `;
}

function isSessionNotificationTarget(value: unknown): value is SessionNotificationTarget {
  return typeof value === "object"
    && value !== null
    && typeof Reflect.get(value, "machineId") === "string"
    && typeof Reflect.get(value, "cwd") === "string"
    && typeof Reflect.get(value, "sessionId") === "string";
}

interface PendingNotificationFocus {
  chatKey: string;
  focusTarget: NotificationFocusTarget;
}

export interface QueuedMessageSection {
  source: "client" | "server";
  heading: string;
  detail: string;
  messages: QueuedSessionMessage[];
}

export function chatQueuedMessageSections(clientQueued: QueuedSessionMessage[], serverQueued: QueuedSessionMessage[]): QueuedMessageSection[] {
  return [
    clientQueued.length === 0 ? undefined : { source: "client", heading: t("ChatView.queued_until_session_starts.5b54250c"), detail: t("ChatView.will_send_once_the_backend_session_is.e6be2b4e"), messages: clientQueued },
    serverQueued.length === 0 ? undefined : { source: "server", heading: t("ChatView.queued_messages.904505cc"), detail: localizedText("ChatView.pending.b2266fa7")`${String(serverQueued.length)} pending`, messages: serverQueued },
  ].filter((section): section is QueuedMessageSection => section !== undefined);
}

export type ChatImagePart = Extract<ChatPart, { type: "image" }>;

/** Derive the `<img>` source URL and alt text for a rendered image part. */
export function chatImagePartSource(part: ChatImagePart, session?: SessionRef, machineId = "local"): { src: string; alt: string } | undefined {
  return transcriptImageSource(part, session, machineId);
}

/** The message-header label used when a tool message renders as an image output. */
export function chatToolOutputLabel(toolName?: string): string {
  return toolName === undefined || toolName === "" ? t("ChatView.tool_output.81a5fb0b") : localizedText("ChatView.output.d2396e67")`${toolName} output`;
}

function chatLineIdentity(index: number, message?: ChatLine): string {
  return chatLineScrollIdentity(message) ?? String(index);
}

function chatLineScrollIdentity(message?: ChatLine): string | undefined {
  if (message?.entryId === undefined || message.entryId === "") return undefined;
  // Page offsets count raw entries, whereas display indexes count normalized
  // lines. Only durable entry identity survives coalescing during a prepend.
  // Skill invocations can also produce a user-text line from the same entry.
  const slice = message.parts.some((part) => part.type === "skillInvocation") ? "skill-invocation" : "message";
  return JSON.stringify([message.entryId, message.role, slice]);
}

/** Scroll identities never fall back to normalized display indexes. */
export function chatMessageAnchorKey(_index: number, message?: ChatLine): string | undefined {
  const identity = chatLineScrollIdentity(message);
  return identity === undefined ? undefined : `m:${identity}`;
}

export function chatGroupAnchorKey(_startIndex: number, message?: ChatLine): string | undefined {
  const identity = chatLineScrollIdentity(message);
  return identity === undefined ? undefined : `g:${identity}`;
}

/** Event identity is separate from the readable slice of the same entry. */
export function chatEventAnchorKey(_index: number, message?: ChatLine): string | undefined {
  const identity = chatLineScrollIdentity(message);
  return identity === undefined ? undefined : `e:${identity}`;
}

/** The CSS class list for an event-group `<details>`, distinguishing the live tail. */
export function chatMessageGroupClassName(defaultOpen: boolean): string {
  return defaultOpen ? "msg event-group live" : "msg event-group";
}

/** The disclosure summary label for an event group, distinguishing the live tail. */
export function chatMessageGroupLabel(defaultOpen: boolean): string {
  return defaultOpen ? t("ChatView.process_running") : t("ChatView.process_steps");
}

function chatMessageGroupSummary(progress: ChatGroupProgress): string {
  return [
    progress.toolCount === 0 ? undefined : `${String(progress.toolCount)} ${t(progress.toolCount === 1 ? "ChatView.process_tool" : "ChatView.process_tools")}`,
    progress.thinkingCount === 0 ? undefined : `${String(progress.thinkingCount)} ${t(progress.thinkingCount === 1 ? "ChatView.process_thought" : "ChatView.process_thoughts")}`,
    progress.recordCount === 0 ? undefined : `${String(progress.recordCount)} ${t(progress.recordCount === 1 ? "ChatView.process_record" : "ChatView.process_records")}`,
  ].filter((part) => part !== undefined).join(" · ");
}

/** Whether a queued-message section shows the server clear-queue action. */
export function chatQueuedSectionShowsClearAction(section: QueuedMessageSection, hasClearHandler: boolean): boolean {
  return section.source === "server" && hasClearHandler;
}

/** A rendered session-warning row derived from live status warnings. */
export interface ChatSessionWarningRow {
  severity: SessionWarningSeverity;
  severityClass: string;
  message: string;
  source?: string;
  path?: string;
  dismissId?: string;
}

/** Derive one severity-tagged warning row per live status warning, in order. */
export function chatSessionWarningRows(status: SessionStatus | undefined): ChatSessionWarningRow[] {
  return (status?.warnings ?? []).map((warning) => ({
    severity: warning.severity,
    severityClass: `session-warning ${warning.severity}`,
    message: warning.message,
    ...(warning.source === undefined ? {} : { source: warning.source }),
    ...(warning.path === undefined ? {} : { path: warning.path }),
    ...(warning.dismiss === undefined ? {} : { dismissId: warning.dismiss.id }),
  }));
}

export function chatMessageMetadataLabel(message: ChatLine): string {
  const timestamp = message.meta?.timestamp;
  const time = timestamp === undefined ? undefined : formatMessageTimestamp(timestamp);
  const model = chatMessageModelLabel(message);
  const parts = [time, model, message.meta?.thinkingLevel].filter((part): part is string => part !== undefined && part !== "");
  return parts.length === 0 ? t("ChatView.no_pi_message_metadata_available.11cd8ccc") : parts.join(" · ");
}

function formatMessageTimestamp(timestamp: string): string | undefined {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return undefined;
  return messageTimestampFormatter.format(date);
}

function chatMessageModelLabel(message: ChatLine): string | undefined {
  const model = message.meta?.model;
  if (model === undefined) return undefined;
  const id = model.responseId ?? model.id;
  if (id === undefined || id === "") return model.provider;
  return model.provider !== undefined && model.provider !== "" ? `${model.provider}/${id}` : id;
}

@customElement("chat-view")
export class ChatView extends LitElement {
  @property({ attribute: false }) onQuoteSelection?: (selection: QuotedChatSelection, newSession: boolean) => Promise<void>;
  @state() private quotedSelection: QuotedChatSelection | undefined;
  @state() private quotePosition: QuotePopoverPosition | undefined;
  @state() private quoting = false;
  @state() private quoteError = "";
  private quoteAnchor: QuoteAnchorRect | undefined;

  private dismissQuoteSelection(): void {
    this.quotedSelection = undefined;
    this.quotePosition = undefined;
    this.quoteAnchor = undefined;
    this.quoteError = "";
    this.quoting = false;
  }

  private readonly handleQuoteOutsidePointer = (event: PointerEvent): void => {
    if (!event.composedPath().some((node) => node instanceof HTMLElement && node.classList.contains("selection-quote-bar"))) this.dismissQuoteSelection();
  };

  private readonly handleQuoteEscape = (event: KeyboardEvent): void => {
    if (event.key === "Escape") this.dismissQuoteSelection();
  };

  private captureTextSelection(event: Event): void {
    if (this.quoting) return;
    const source = event.composedPath().find((node): node is HTMLElement => node instanceof HTMLElement && node.localName === "formatted-text");
    const container = source?.closest<HTMLElement>("[data-index]");
    const index = Number(container?.dataset["index"]);
    const message = this.messages[index - this.messageStart];
    this.dismissQuoteSelection();
    if (!source?.shadowRoot || !container || message?.role !== "assistant" || message.entryId === undefined || message.entryId === "") return;
    const content = selectedContentIn(source.shadowRoot);
    if (content === undefined || content.text === "" || content.text.length > 64_000) return;
    const bounds = this.chat?.getBoundingClientRect();
    if (!bounds) return;
    // Anchor to the first visible selected line, including multi-line selections.
    const anchor = Array.from(content.range.getClientRects()).find((rect) => rect.width > 0 && rect.height > 0
      && rect.bottom > bounds.top && rect.top < bounds.bottom && rect.right > bounds.left && rect.left < bounds.right);
    if (!anchor) return;
    const selected = { text: content.text, entryId: message.entryId, machineId: this.machineId, sessionId: this.sessionId };
    this.quoteAnchor = { left: Math.max(anchor.left, bounds.left), right: Math.min(anchor.right, bounds.right), top: Math.max(anchor.top, bounds.top), bottom: Math.min(anchor.bottom, bounds.bottom) };
    this.quotedSelection = selected;
    void this.positionQuotePopover(selected);
  }

  private async positionQuotePopover(selected: QuotedChatSelection): Promise<void> {
    await this.updateComplete;
    if (!this.isConnected || this.quotedSelection !== selected || !this.quoteAnchor) return;
    const toolbar = this.renderRoot.querySelector<HTMLElement>(".selection-quote-bar");
    const wrap = this.renderRoot.querySelector<HTMLElement>(".chat-wrap");
    if (!toolbar || !wrap) return;
    this.quotePosition = selectionQuotePosition(this.quoteAnchor, wrap.getBoundingClientRect(), toolbar.getBoundingClientRect());
  }

  private async useQuotedSelection(newSession: boolean): Promise<void> {
    const selected = this.quotedSelection;
    if (!selected || !this.onQuoteSelection || this.quoting) return;
    this.quoting = true;
    try {
      await this.onQuoteSelection(selected, newSession);
      if (this.quotedSelection === selected) this.dismissQuoteSelection();
    } catch (error) {
      if (this.quotedSelection === selected) {
        this.quoteError = error instanceof Error ? error.message : String(error);
        void this.positionQuotePopover(selected);
      }
    } finally {
      if (this.quotedSelection === selected) this.quoting = false;
    }
  }

  /** Scroll only; never changes the model's active session branch. */
  async revealEntry(entryId: string): Promise<boolean> {
    const index = this.messages.findIndex((message) => message.entryId === entryId);
    if (index < 0) return false;
    await this.updateComplete;
    const target = this.renderRoot.querySelector<HTMLElement>(`[data-index="${String(index + this.messageStart)}"]`);
    if (!target) return false;
    let ancestor = target.parentElement;
    while (ancestor && ancestor !== this.chat) {
      if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
      ancestor = ancestor.parentElement;
    }
    this.scrollFlows.jumpToAnchor(target);
    target.animate([{ backgroundColor: "var(--pi-selection-bg)" }, { backgroundColor: "transparent" }], { duration: 1800 });
    return true;
  }

  private renderWrittenFiles(index: number) {
    const files = turnWrittenFiles(this.messages, index - this.messageStart, this.workspaceContext);
    if (!files.length || !this.workspaceContext) return nothing;
    const context = this.workspaceContext;
    return html`<nav class="turn-written-files" aria-label=${t("ui.tools.writtenFiles")}><span>${t("ui.tools.writtenFiles")}</span>${files.map((path) => html`<button type="button" @click=${() => { this.dispatchEvent(new CustomEvent("workspace-file-open", { detail: { ...context, path }, bubbles: true, composed: true })); }}>${path}</button>`)}</nav>`;
  }

  private renderQuoteToolbar() {
    const selection = this.quotedSelection;
    if (selection?.sessionId !== this.sessionId || selection.machineId !== this.machineId || !this.onQuoteSelection) return nothing;
    return html`<aside class="selection-quote-bar" role="group" aria-label=${t("ui.quote.actions")}
      style=${styleMap({ left: `${String(this.quotePosition?.left ?? 0)}px`, top: `${String(this.quotePosition?.top ?? 0)}px`, visibility: this.quotePosition ? "visible" : "hidden" })}
      @pointerdown=${(event: PointerEvent) => { event.preventDefault(); }}>
      <button type="button" ?disabled=${this.quoting} @click=${() => { void this.useQuotedSelection(false); }}>${t("ui.quote.askHere")}</button>
      <button type="button" ?disabled=${this.quoting} @click=${() => { void this.useQuotedSelection(true); }}>${t("ui.quote.askNew")}</button>
      ${this.quoteError ? html`<small role="alert">${this.quoteError}</small>` : nothing}
    </aside>`;
  }
  @property({ attribute: false }) messages: ChatLine[] = [];
  @property() sessionId = "";
  @property() sessionCwd = "";
  @property({ attribute: false }) workspaceContext: MarkdownWorkspaceContext | undefined;
  @property({ attribute: false }) contentRendering: import("../formatting/contentRendering").ChatContentRendering | undefined;
  @property() machineId = "local";
  @property({ attribute: false }) messageActions: readonly RegisteredMessageAction[] = [];
  @property({ attribute: false }) messageActionContext?: Omit<MessageActionAvailabilityContext, "message">;
  @property({ attribute: false }) onMessageAction?: (input: MessageActionAvailabilityContext, actionId: string) => Promise<MessageActionResult>;
  @property({ attribute: false }) onDisplayedMessageAction?: (input: DisplayedMessageActionAvailabilityContext, actionId: string) => Promise<MessageActionResult>;
  private readonly messageActionAvailability = new MessageActionAvailabilityCache();
  @state() private messageActionPending = false;
  @state() private displayedMessageActionsPending: ReadonlySet<string> = new Set();
  @state() private messageActionError: { machineId: string; sessionId: string; key: string; message: string } | undefined;
  @state() private messageActionFeedback: { machineId: string; sessionId: string; key: string; actionId: string; presentation: MessageActionFeedback } | undefined;
  private messageActionFeedbackTimer: number | undefined;
  private messageActionGeneration = 0;
  @property({ type: Number }) messageStart = 0;
  @property({ type: Number }) messageEnd = 0;
  @property({ type: Number }) messageTotal = 0;
  @property({ type: Boolean }) hasMore = false;
  @property({ type: Boolean }) historyReady = true;
  @property({ type: Boolean }) showWelcome = false;
  @property({ type: Boolean }) loadingMore = false;
  @property({ type: Boolean }) isSendingPrompt = false;
  @property({ type: Boolean }) isCompacting = false;
  @property({ type: Number }) pendingMessageCount = 0;
  @property({ attribute: false }) clientQueuedMessages: QueuedSessionMessage[] = [];
  @property({ attribute: false }) status?: SessionStatus;
  @property({ type: Boolean }) suggestedInputPending = false;
  @property({ attribute: false }) suppressedSuggestedInput: string | undefined;
  @property({ attribute: false }) onUseSuggestedInput: ((machineId: string, sessionId: string) => void) | undefined;
  @property({ attribute: false }) onDismissSuggestedInput: ((machineId: string, sessionId: string, text: string) => void) | undefined;
  @property({ attribute: false }) activity?: SessionActivity;
  @property({ attribute: false }) askDraftSessionId = "";
  @property({ attribute: false }) onSubmitAsk: ((askId: string, submission: AskUserSubmission) => void | Promise<void>) | undefined;
  @property({ attribute: false }) pendingDialogs: PendingExtensionDialog[] = [];
  @property({ attribute: false }) closedDialogs: ClosedExtensionDialog[] = [];
  @property({ attribute: false }) onAnswerDialog?: ExtensionDialogAnswerCallback;
  @property({ attribute: false }) onCancelDialog?: ExtensionDialogCancelCallback;
  @property({ attribute: false }) onDismissClosedDialog?: ExtensionDialogDismissCallback;
  @property({ attribute: false }) notificationInbox?: SelectedSessionNotificationView;
  @property({ attribute: false }) onClearServerQueue?: () => void;
  @property({ attribute: false }) onQueuedMessageAction?: (target: QueuedMessageActionTarget) => Promise<void>;
  @property({ type: Boolean }) queuedMessageActionPending = false;
  @state() private queuedCopyFeedback = "";
  @property({ attribute: false }) onDismissWarning?: (dismissId: string) => void;
  @property({ attribute: false }) onDismissNotification?: (notificationId: string) => void;
  @property({ attribute: false }) onDismissAllNotifications?: () => void;
  @property({ type: Boolean }) warningsVisible = true;
  @property({ attribute: false }) onToggleWarnings?: () => void;
  @property({ attribute: false }) onLoadMore?: () => void;
  @property({ attribute: false }) behaviors: ChatBehaviors = DEFAULT_CHAT_BEHAVIORS;
  @query(".chat") private chat?: HTMLDivElement;
  @query("chat-timeline") private timeline?: ChatTimeline;
  @query("dialog.image-zoom") private imageZoomDialog?: HTMLDialogElement;
  @state() private followingLive = false;
  @state() private zoomedImage: { src: string; alt: string } | undefined = undefined;
  @state() private expandedMetaKey: string | undefined;
  @state() private collapsedNotificationTargetKeys: ReadonlySet<string> = new Set();
  @state() private retainedEmptyNotificationTrayTargetKey: string | undefined;
  private pendingNotificationFocus: PendingNotificationFocus | undefined;
  private imageZoomModalRegistration: RenderedModalRegistration | undefined;
  private readonly disclosures = new ChatDisclosureController();
  private readonly scrollFlows = new ChatScrollFlows({
    getScroller: () => this.showWelcome ? undefined : this.chat ?? undefined,
    onFollowingChange: (following) => { this.followingLive = following; },
    getAnchors: () => this.scrollAnchorElements(),
    getSessionId: () => this.sessionId,
    getBehaviors: () => this.behaviors,
    hasMore: () => this.hasMore,
    isHistoryReady: () => this.historyReady,
    isLoadingMore: () => this.loadingMore || this.loadMoreRequested,
    canRequestEarlier: () => this.onLoadMore !== undefined,
    requestEarlier: () => { this.requestLoadMore(); },
    getOpenForm: (kind) => this.renderRoot.querySelector<HTMLElement>(kind === "dialog"
      ? ".chat > extension-dialog-card.open-dialog-card"
      : kind === "ask" ? ".chat ask-user-card.open-question-card"
      : ".chat ask-user-card.open-question-card, .chat > extension-dialog-card.open-dialog-card") ?? undefined,
  });
  private lastOpenQuestionId: string | undefined;
  private questionOutcomes = transcriptQuestionOutcomes([]);
  private questionIds: ReadonlySet<string> = new Set();
  private groupedMessagesInput?: ChatLine[];
  private groupedMessagesStart = 0;
  private groupedMessagesCache: ChatGroup[] = [];
  private timelineGroups: readonly ChatGroup[] | undefined;
  private timelineEntriesCache: ChatTimelineEntry[] = [];
  private readonly messageMetaCache = new WeakMap<ChatLine, string>();
  private imageSession: SessionRef | undefined;
  private touchY: number | undefined;
  private loadMoreRequested = false;
  private readonly onViewportResize = () => { this.dismissQuoteSelection(); this.scrollFlows.onViewportResize(); };
  private readonly handleScroll = () => {
    this.dismissQuoteSelection();
    if (this.behaviors.rememberPosition || this.behaviors.followTail || this.behaviors.automaticHistory) this.scrollFlows.onScroll();
  };
  // Native details toggles do not bubble; capture layout changes independently
  // of the listener that remembers a group's disclosure choice.
  private readonly handleDisclosureToggle = {
    capture: true,
    handleEvent: (event: Event): void => {
      if (event.target instanceof HTMLDetailsElement) this.scrollFlows.onContentLayoutChanged();
    },
  };
  private readonly handleWheel = (event: WheelEvent) => {
    if (event.deltaY !== 0) this.scrollFlows.onInteraction();
    if (event.deltaY < 0) this.scrollFlows.onUpIntent();
  };
  private readonly handleScrollKeyDown = (event: KeyboardEvent) => {
    // Only the focused transcript owns these native scroll keys. Descendant
    // controls (including shadow-root inputs) keep their keyboard behavior.
    if (event.composedPath()[0] !== event.currentTarget || event.defaultPrevented || event.isComposing
      || event.ctrlKey || event.metaKey || event.altKey || (event.shiftKey && event.key !== " ")) return;
    const upward = event.key === "ArrowUp" || event.key === "PageUp" || event.key === "Home"
      || (event.key === " " && event.shiftKey);
    if (upward) this.scrollFlows.onUpIntent();
    else if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === "End" || event.key === " ") this.scrollFlows.onInteraction();
    // Let the browser perform the scroll; this only cancels competing restores.
  };
  private readonly handleTouchStart = (event: TouchEvent) => {
    this.touchY = event.touches[0]?.clientY;
    this.scrollFlows.onInteraction();
  };
  private readonly handleTouchMove = (event: TouchEvent) => {
    const y = event.touches[0]?.clientY;
    if (this.touchY !== undefined && y !== undefined && y > this.touchY) this.scrollFlows.onUpIntent();
    this.touchY = y;
  };
  private readonly handleTouchEnd = () => { this.touchY = undefined; };
  private readonly handleJumpTop = () => { this.scrollFlows.jumpToTop(); };
  private readonly handleJumpEnd = () => { this.scrollFlows.jumpToEnd(); };
  private readonly handleTimelineNavigate = (entry: ChatTimelineEntry): void => {
    if (!this.timelineEntriesCache.some((item) => item.key === entry.key && item.index === entry.index)) return;
    const target = Array.from(this.chat?.children ?? []).find((element): element is HTMLElement => element instanceof HTMLElement
      && element.matches("article.user") && element.dataset["index"] === String(entry.index));
    if (target !== undefined) this.scrollFlows.jumpToAnchor(target);
  };
  private readonly openImageZoom = (src: string, alt: string): void => {
    this.zoomedImage = { src, alt };
  };
  private readonly closeImageZoom = (): void => {
    if (this.zoomedImage !== undefined) this.zoomedImage = undefined;
  };
  private readonly onImageZoomDialogClick = (event: MouseEvent): void => {
    if (event.target === this.imageZoomDialog) this.closeImageZoom();
  };
  private readonly onPageHide = () => {
    this.saveScrollPosition();
  };
  private readonly handleClearServerQueue = (): void => {
    this.onClearServerQueue?.();
  };
  private readonly handleToggleWarnings = (): void => {
    this.onToggleWarnings?.();
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this.ownerDocument.addEventListener("pointerdown", this.handleQuoteOutsidePointer, true);
    this.ownerDocument.addEventListener("keydown", this.handleQuoteEscape);
    window.addEventListener("resize", this.onViewportResize);
    window.addEventListener("pagehide", this.onPageHide);
    window.visualViewport?.addEventListener("resize", this.onViewportResize);
    window.visualViewport?.addEventListener("scroll", this.onViewportResize);
  }

  override disconnectedCallback(): void {
    this.dismissQuoteSelection();
    this.scrollFlows.dispose();
    this.releaseImageZoomModal();
    this.messageActionGeneration += 1;
    this.clearMessageActionFeedback();
    this.ownerDocument.removeEventListener("pointerdown", this.handleQuoteOutsidePointer, true);
    this.ownerDocument.removeEventListener("keydown", this.handleQuoteEscape);
    window.removeEventListener("resize", this.onViewportResize);
    window.removeEventListener("pagehide", this.onPageHide);
    window.visualViewport?.removeEventListener("resize", this.onViewportResize);
    window.visualViewport?.removeEventListener("scroll", this.onViewportResize);
    super.disconnectedCallback();
  }

  private prepareSessionUiState(): void {
    if (this.behaviors.rememberDisclosures) this.disclosures.syncSession(this.sessionId);
    this.pendingNotificationFocus = undefined;
    this.retainedEmptyNotificationTrayTargetKey = undefined;
    this.loadMoreRequested = false;
  }

  protected override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("sessionId") || changed.has("machineId")) {
      this.dismissQuoteSelection();
    }
    if (changed.has("messages")) {
      this.questionOutcomes = transcriptQuestionOutcomes(this.messages);
      this.questionIds = new Set(this.messages.flatMap((line) => line.parts.flatMap((part) => part.type === "askUserQuestion" ? [part.ask.askId] : [])));
    }
    if (changed.has("sessionId") || changed.has("machineId")) this.lastOpenQuestionId = undefined;
    if (changed.has("sessionId") || changed.has("machineId")) {
      this.messageActionGeneration += 1;
      this.clearMessageActionFeedback();
      this.messageActionError = undefined;
    }
    if (changed.has("sessionId")) {
      this.prepareSessionUiState();
    } else if (changed.has("notificationInbox") && this.notificationTargetChanged(changed.get("notificationInbox"))) {
      this.pendingNotificationFocus = undefined;
      this.retainedEmptyNotificationTrayTargetKey = undefined;
    }
    if (changed.has("behaviors")) {
      this.scrollFlows.configure();
      if (this.behaviors.rememberDisclosures) this.disclosures.syncSession(this.sessionId);
    }
  }

  protected override update(changed: Map<string, unknown>): void {
    const previousStart = changed.get("messageStart");
    this.scrollFlows.beforeRender({
      sessionChanged: changed.has("sessionId") || changed.has("machineId") || changed.has("showWelcome"),
      previousSessionId: changed.get("sessionId"),
      prepend: typeof previousStart === "number" && this.messageStart < previousStart,
    });
    super.update(changed);
  }

  protected override updated(changed: Map<string, unknown>): void {
    if (changed.has("loadingMore") && !this.loadingMore) this.loadMoreRequested = false;
    if (changed.has("hasMore") && !this.hasMore) this.loadMoreRequested = false;
    // The welcome dashboard has no message tail; opening it starts at its heading.
    if (changed.has("showWelcome") && this.showWelcome && this.chat !== undefined) this.chat.scrollTop = 0;
    const openQuestionId = this.openQuestion()?.askId;
    this.scrollFlows.afterRender({
      sessionChanged: changed.has("sessionId") || changed.has("machineId") || changed.has("showWelcome"),
      contentChanged: this.scrollContentChanged(changed),
      historyChanged: changed.has("messages") || changed.has("messageStart") || changed.has("hasMore") || changed.has("loadingMore") || changed.has("historyReady"),
      openedForm: changed.has("pendingDialogs") && this.isNewOpenDialog(changed.get("pendingDialogs")) ? "dialog"
        : openQuestionId !== undefined && openQuestionId !== this.lastOpenQuestionId ? "ask" : false,
    });
    this.lastOpenQuestionId = openQuestionId;
    if (this.timeline instanceof ChatTimeline) this.timeline.viewport = this.chat;
    if (changed.has("notificationInbox") && this.pendingNotificationFocus !== undefined) this.focusPendingNotificationTarget();
    if (changed.has("zoomedImage")) this.syncImageZoomDialog();
  }

  private syncImageZoomDialog(): void {
    const dialog = this.imageZoomDialog;
    if (dialog === undefined) return;
    if (this.zoomedImage !== undefined) {
      if (this.imageZoomModalRegistration === undefined) {
        const registration = registerRenderedModal({
          element: dialog,
          nativeTopLayer: true,
          focus: () => {
            const close = this.renderRoot.querySelector<HTMLElement>(".image-zoom-close");
            (close ?? dialog).focus();
          },
        });
        this.imageZoomModalRegistration = registration;
        try {
          if (!dialog.open) dialog.showModal();
        } catch (error) {
          this.imageZoomModalRegistration = undefined;
          registration.unregister();
          throw error;
        }
      }
      this.imageZoomModalRegistration.focus();
      return;
    }
    if (dialog.open) dialog.close();
    this.releaseImageZoomModal();
  }

  private releaseImageZoomModal(): void {
    const registration = this.imageZoomModalRegistration;
    this.imageZoomModalRegistration = undefined;
    registration?.unregister();
  }

  private notificationTargetChanged(previous: unknown): boolean {
    const currentInbox = this.notificationInbox;
    if (!isSessionNotificationTarget(previous) || currentInbox === undefined) return previous !== currentInbox;
    return notificationTargetKey(previous) !== notificationTargetKey(currentInbox);
  }

  private readonly renderKeys = new ChatRenderKeys();

  override render() {
    const groups = this.groupedMessages();
    if (this.timelineGroups !== groups) {
      this.timelineGroups = groups;
      this.timelineEntriesCache = chatTimelineEntries(groups);
    }
    const entryActionHeaders = canonicalEntryActionHeaders(groups);
    // Keep incremental updates within one transcript, but dispose the whole
    // repeat part when the transcript changes. Besides preventing cross-session
    // DOM reuse, clearing the part reclaims the end markers that the current Lit
    // build retains when repeat items are removed.
    const transcriptIdentity = machineSessionKey(this.machineId, this.sessionId);
    const keys = this.renderKeys.reconcile(transcriptIdentity, groups.map((group) => {
      const index = group.kind === "group" ? group.startIndex : group.index;
      const message = group.kind === "group" ? group.messages[0]?.message : group.message;
      const identity = chatLineScrollIdentity(message);
      return {
        slot: JSON.stringify([group.kind, index, message?.role]),
        ...(identity === undefined ? {} : { identity: JSON.stringify([group.kind, identity]) }),
      };
    }));
    const following = this.behaviors.followTail && this.followingLive;
    return html`
      ${this.renderTopNotices()}
      ${this.renderNotificationLiveRegions()}
      <div class=${this.behaviors.visualEffects ? "chat-wrap" : "chat-wrap plain"}>
        <div class=${this.showWelcome ? "chat welcome-chat" : this.timelineEntriesCache.length > 0 ? "chat timeline-scroll" : "chat"} tabindex="0" role="region" aria-label=${t("ui.chatTimeline.transcript")} @image-open=${(event: CustomEvent<ImageOpenDetail>) => { this.openImageZoom(event.detail.src, event.detail.alt); }}
          @scroll=${this.handleScroll}
          @toggle=${this.behaviors.followTail ? this.handleDisclosureToggle : undefined}
          @wheel=${this.handlesScrollIntent ? this.handleWheel : undefined}
          @keydown=${this.handlesScrollIntent ? this.handleScrollKeyDown : undefined}
          @touchstart=${this.handlesScrollIntent ? this.handleTouchStart : undefined}
          @touchmove=${this.handlesScrollIntent ? this.handleTouchMove : undefined}
          @touchend=${this.handlesScrollIntent ? this.handleTouchEnd : undefined}
          @touchcancel=${this.handlesScrollIntent ? this.handleTouchEnd : undefined}
          @mouseup=${(event: MouseEvent) => { this.captureTextSelection(event); }}
          @keyup=${(event: KeyboardEvent) => { if (event.shiftKey) this.captureTextSelection(event); }}>
          ${this.showWelcome ? html`<slot name="welcome"></slot>` : nothing}
          ${this.renderHistoryBoundary()}
          ${keyed(transcriptIdentity, repeat(
            groups,
            (_group, index) => keys[index],
            (group, index) => {
              if (group.kind === "group") return this.renderMessageGroup(group, this.isLiveTailGroup(groups, index), entryActionHeaders);
              if (group.kind === "tool-image") return this.renderToolImageOutput(group.message, group.index, entryActionHeaders, group.toolName);
              return this.renderMessage(group.message, group.index, entryActionHeaders);
            },
          ))}
          ${this.renderQueuedMessages()}
          ${this.renderSessionActivity()}
          ${this.renderSuggestedInput()}
          ${this.renderExtensionDialogs()}
        </div>
        ${this.renderActivityDock()}
        ${this.renderQuoteToolbar()}
        ${this.timelineEntriesCache.length === 0 ? nothing : html`<chat-timeline .entries=${this.timelineEntriesCache} .onNavigate=${this.handleTimelineNavigate}></chat-timeline>`}
        ${this.showWelcome ? nothing : html`<nav class="chat-jumps" aria-label=${t("ui.chatTimeline.controls")}>
          <button type="button" title=${t("ui.chatTimeline.top")} aria-label=${t("ui.chatTimeline.top")} @click=${this.handleJumpTop}>${renderUiIcon("arrowUp")}</button>
          <button type="button" class=${following ? "following" : ""}
            title=${!this.behaviors.followTail ? t("ChatView.jump_to_end.c37e7d58") : following ? t("ChatView.following_live_jump_to_end.9520bc45") : t("ChatView.jump_to_end_and_follow_live.db38db8e")}
            aria-label=${t("ui.chatTimeline.end")} aria-describedby="chat-follow-state" @click=${this.handleJumpEnd}>${renderUiIcon("arrowDown")}</button>
          <span id="chat-follow-state" class="visually-hidden">${!this.behaviors.followTail ? t("ChatView.automatic_following_disabled.0de38a22") : following ? t("ChatView.following_live.b062bdb4") : t("ChatView.live_following_paused.ecda395d")}</span>
        </nav>`}
      </div>
      ${this.renderImageZoom()}
    `;
  }

  private renderTopNotices() {
    const warnings = this.renderWarnings();
    const notifications = this.renderNotificationTray();
    if (warnings === null && notifications === null) return null;
    return html`<div class="top-notices">${warnings}${notifications}</div>`;
  }

  private renderNotificationTray() {
    const inbox = this.notificationInbox;
    if (inbox?.sessionId !== this.sessionId) return null;
    const chatKey = notificationTargetKey(inbox);
    const hasPendingOverlay = inbox.pendingDismissedIds.size > 0 || inbox.dismissAllPending;
    const retainsFocusTarget = this.retainedEmptyNotificationTrayTargetKey === chatKey;
    const totalCount = notificationInboxTotalCount(inbox);
    if (totalCount === 0 && !hasPendingOverlay && !retainsFocusTarget) return null;
    const collapsed = notificationTrayIsCollapsed(this.collapsedNotificationTargetKeys, inbox);
    const toggleLabel = collapsed ? t("ChatView.expand_notifications.6f42f8f6") : t("ChatView.collapse_notifications.48fb5653");
    return localizedTemplate("ChatView.clear.d121edb1", html)`
      <section class=${`notification-tray${collapsed ? " collapsed" : ""}`} role="region" aria-labelledby="session-notifications-heading" @focusout=${(event: FocusEvent) => { this.releaseEmptyNotificationTray(event); }}>
        <header class="notification-header" data-notification-focus="header" tabindex="-1">
          <strong class="notification-heading" id="session-notifications-heading">${notificationTrayHeading(inbox)}</strong>
          <div class="notification-header-actions">
            <button
              type="button"
              class="notification-control notification-clear"
              aria-label="Clear all notifications"
              title="Clear all notifications"
              ?disabled=${inbox.dismissAllPending || totalCount === 0 || this.onDismissAllNotifications === undefined}
              @click=${() => { this.dismissAllNotifications(); }}
            >Clear</button>
            <button
              type="button"
              class="notification-control notification-toggle"
              aria-label=${toggleLabel}
              title=${toggleLabel}
              aria-expanded=${String(!collapsed)}
              aria-controls="session-notification-list"
              @click=${() => { this.toggleNotificationTray(inbox, collapsed); }}
            >${renderNotificationDisclosureIcon(collapsed)}</button>
          </div>
        </header>
        <div class="notification-list" id="session-notification-list" ?hidden=${collapsed}>
          ${inbox.discardedCount === 0 ? null : html`
            <p class="notification-overflow">${notificationInboxOverflowLabel(inbox.discardedCount)}</p>
          `}
          ${inbox.notifications.map((notification) => {
            const label = notificationSeverityLabel(notification.severity);
            const truncationLabel = notificationMessageTruncationLabel(notification);
            return localizedTemplate("ChatView.template.3a3f9435", html)`
              <article class=${`notification-row ${notification.severity}`} data-notification-id=${notification.id} tabindex="-1">
                <div class="notification-metadata">
                  <strong class="notification-severity">${label}</strong>
                  <span aria-hidden="true">·</span>
                  <time datetime=${notification.receivedAt}>${notificationTimestampFormatter.format(new Date(notification.receivedAt))}</time>
                </div>
                <p class="notification-message" dir="auto">${notification.message}</p>
                ${truncationLabel === undefined ? null : html`<p class="notification-truncated">${truncationLabel}</p>`}
                <button
                  type="button"
                  class="notification-row-dismiss"
                  aria-label=${notificationDismissLabel(notification)}
                  title="Dismiss notification"
                  ?disabled=${inbox.pendingDismissedIds.has(notification.id) || inbox.dismissAllPending || this.onDismissNotification === undefined}
                  @click=${() => { this.dismissNotification(notification.id); }}
                >${renderNotificationCloseIcon()}</button>
              </article>
            `;
          })}
        </div>
      </section>
    `;
  }

  private renderNotificationLiveRegions() {
    const announcements = this.notificationInbox?.sessionId === this.sessionId ? this.notificationInbox.announcements : [];
    const polite = announcements.filter((announcement) => announcement.severity !== "error");
    const assertive = announcements.filter((announcement) => announcement.severity === "error");
    return html`
      <div class="visually-hidden notification-live" aria-live="polite" aria-atomic="false">${repeat(polite, (announcement) => announcement.id, (announcement) => html`<span data-announcement-id=${announcement.id}>${notificationAnnouncementLabel(announcement)}</span>`)}</div>
      <div class="visually-hidden notification-live" aria-live="assertive" aria-atomic="false">${repeat(assertive, (announcement) => announcement.id, (announcement) => html`<span data-announcement-id=${announcement.id}>${notificationAnnouncementLabel(announcement)}</span>`)}</div>
    `;
  }

  private toggleNotificationTray(inbox: SelectedSessionNotificationView, collapsed: boolean): void {
    this.collapsedNotificationTargetKeys = setNotificationTrayCollapsed(this.collapsedNotificationTargetKeys, inbox, !collapsed);
  }

  private dismissNotification(notificationId: string): void {
    const inbox = this.notificationInbox;
    if (inbox === undefined || this.onDismissNotification === undefined) return;
    const focusTarget = notificationFocusTargetAfterDismiss(inbox.notifications, notificationId);
    const chatKey = notificationTargetKey(inbox);
    this.pendingNotificationFocus = { chatKey, focusTarget };
    if (focusTarget.kind === "header") this.retainedEmptyNotificationTrayTargetKey = chatKey;
    this.onDismissNotification(notificationId);
  }

  private dismissAllNotifications(): void {
    const inbox = this.notificationInbox;
    if (inbox === undefined || this.onDismissAllNotifications === undefined) return;
    const chatKey = notificationTargetKey(inbox);
    this.pendingNotificationFocus = { chatKey, focusTarget: { kind: "header" } };
    this.retainedEmptyNotificationTrayTargetKey = chatKey;
    this.onDismissAllNotifications();
  }

  private releaseEmptyNotificationTray(event: FocusEvent): void {
    const tray = event.currentTarget;
    const next = event.relatedTarget;
    if (tray instanceof HTMLElement && next instanceof Node && tray.contains(next)) return;
    // Removing the activated row can emit focusout before updated() moves focus.
    if (this.pendingNotificationFocus !== undefined) return;
    const inbox = this.notificationInbox;
    if (inbox !== undefined
      && this.retainedEmptyNotificationTrayTargetKey === notificationTargetKey(inbox)
      && notificationInboxTotalCount(inbox) === 0) this.retainedEmptyNotificationTrayTargetKey = undefined;
  }

  private focusPendingNotificationTarget(): void {
    const pending = this.pendingNotificationFocus;
    this.pendingNotificationFocus = undefined;
    const inbox = this.notificationInbox;
    if (pending === undefined || inbox === undefined || notificationTargetKey(inbox) !== pending.chatKey) return;
    const target = pending.focusTarget;
    if (target.kind === "header") {
      this.renderRoot.querySelector<HTMLElement>("[data-notification-focus='header']")?.focus();
      return;
    }
    const row = Array.from(this.renderRoot.querySelectorAll<HTMLElement>("[data-notification-id]"))
      .find((candidate) => candidate.dataset["notificationId"] === target.notificationId);
    if (row !== undefined) {
      row.focus();
      return;
    }
    if (notificationInboxTotalCount(inbox) === 0) this.retainedEmptyNotificationTrayTargetKey = pending.chatKey;
    this.renderRoot.querySelector<HTMLElement>("[data-notification-focus='header']")?.focus();
  }

  private renderWarnings() {
    const rows = chatSessionWarningRows(this.status);
    if (!this.warningsVisible || rows.length === 0) return null;
    return html`
      <aside class="session-warnings" role="alert" aria-live="polite">
        ${this.onToggleWarnings === undefined ? null : localizedTemplate("ChatView.minimise.bec3fbef", html)`
          <div class="session-warnings-controls">
            <button
              type="button"
              class="session-warnings-collapse"
              title="Minimise warnings"
              aria-label="Minimise warnings"
              @click=${this.handleToggleWarnings}
            >
              <svg class="session-warnings-collapse-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="m18 15-6-6-6 6"></path>
              </svg>
              <span>Minimise</span>
            </button>
          </div>
        `}
        ${rows.map((row) => {
          const dismissId = row.dismissId;
          return html`
          <div class=${row.severityClass}>
            <div class="session-warning-head">
              ${renderSessionWarningIcon(row.severity, "session-warning-icon")}
              ${row.source === undefined ? null : html`<span class="session-warning-source">${row.source}</span>`}
            </div>
            <div class="session-warning-body">
              <p class="session-warning-message">${row.message}</p>
              ${row.path === undefined ? null : html`<p class="session-warning-path">${row.path}</p>`}
            </div>
            ${dismissId === undefined ? null : localizedTemplate("ChatView.template.f44ad199", html)`
              <button
                type="button"
                class="session-warning-dismiss"
                title="Don't show this warning again"
                aria-label="Dismiss warning"
                @click=${() => { this.onDismissWarning?.(dismissId); }}
              >${renderUiIcon("close")}</button>
            `}
          </div>
        `;
        })}
      </aside>
    `;
  }

  private renderImageZoom() {
    return html`
      <dialog class="image-zoom" @click=${this.onImageZoomDialogClick} @close=${this.closeImageZoom} @cancel=${this.closeImageZoom}>
        ${this.zoomedImage === undefined ? null : localizedTemplate("ChatView.template.c235a861", html)`
          <button type="button" class="image-zoom-close" aria-label="Close image" @click=${this.closeImageZoom}>${renderUiIcon("close")}</button>
          <img class="image-zoom-full" src=${this.zoomedImage.src} alt=${this.zoomedImage.alt} />
        `}
      </dialog>
    `;
  }

  private groupedMessages(): ChatGroup[] {
    if (this.groupedMessagesInput === this.messages && this.groupedMessagesStart === this.messageStart) return this.groupedMessagesCache;
    this.groupedMessagesInput = this.messages;
    this.groupedMessagesStart = this.messageStart;
    this.groupedMessagesCache = groupChatMessages(this.messages, this.messageStart);
    return this.groupedMessagesCache;
  }

  private isLiveTailGroup(groups: ChatGroup[], index: number): boolean {
    return index === groups.length - 1 && this.isSessionLive();
  }

  private isSessionLive(): boolean {
    return this.isSendingPrompt
      || this.status?.isStreaming === true
      || this.status?.isCompacting === true
      || this.status?.isBashRunning === true
      || this.activity?.phase === "active";
  }

  private renderActivityDock() {
    if (this.isSendingPrompt) {
      return localizedTemplate("ChatView.sending_your_message.b690fb4f", html)`
        <div class="activity-dock active" aria-live="polite">
          <span class="dot"></span>
          <span class="activity-text">Sending your message…</span>
        </div>
      `;
    }
    const state = this.activityState();
    if (state === undefined) return null;
    if (state === "idle" && this.activity?.phase !== "active") return null;
    return html`
      <div class="activity-dock active" aria-live="polite">
        <span class="dot"></span>
        <span class="activity-text">${this.activityText(state)}</span>
      </div>
    `;
  }

  private renderQueuedMessages() {
    const serverQueued = this.status?.queuedMessages ?? [];
    return html`${chatQueuedMessageSections(this.clientQueuedMessages, serverQueued).map((section) => this.renderQueuedMessageList(section))}
      ${this.queuedCopyFeedback === "" ? nothing : html`<small role="status">${this.queuedCopyFeedback}</small>`}`;
  }

  private renderQueuedMessageList(section: QueuedMessageSection) {
    const canClear = chatQueuedSectionShowsClearAction(section, this.onClearServerQueue !== undefined);
    const actionsUnavailable = section.source === "server" ? this.status?.queueMessageActionsUnavailable : undefined;
    const unavailableReason = actionsUnavailable === undefined ? undefined : actionsUnavailable === "" ? t("ChatView.individual_queue_controls_are_unavailable_with_this.71571b82") : actionsUnavailable;
    const actionsDisabled = this.queuedMessageActionPending || actionsUnavailable !== undefined;
    return html`
      <aside class="queued-messages" aria-live="polite">
        <div class="queued-header">
          <div class="queued-heading">
            <strong>${section.heading}</strong>
            <small>${section.detail}</small>
          </div>
          ${canClear ? localizedTemplate("ChatView.template.7fc930d1", html)`
            <button type="button" class="queued-clear-button" ?disabled=${this.queuedMessageActionPending} aria-label="Clear queue" title="Clear queued messages without stopping active work" @click=${this.handleClearServerQueue}>${renderTrashIcon()}</button>
          ` : null}
        </div>
        ${unavailableReason === undefined ? nothing : html`<small role="status">${unavailableReason}</small>`}
        ${section.messages.map((message, index) => localizedTemplate("ChatView.template.e0249d26", html)`
          <div class="queued-message">
            <div class="queued-message-header">
              <div class="queued-message-meta">
                <span class="queued-kind">${message.kind === "steer" ? t("ChatView.steer.ca8342d8") : t("ChatView.queue.b93d6e9f")} ${String(section.messages.slice(0, index + 1).filter((entry) => entry.kind === message.kind).length)}</span>
                ${queuedMessageAttachmentLabel(message) === undefined ? nothing : localizedTemplate("ChatView.template.4b41b982", html)`
                  <span class="queued-attachments" title="Attachments included with this queued message"><span aria-hidden="true">${renderUiIcon("paperclip")}</span> ${queuedMessageAttachmentLabel(message)}</span>
                `}
              </div>
              <div class="queued-message-actions">
                <button type="button" class="queued-action" aria-label="Copy queued message" title="Copy message" @click=${async () => {
                  this.queuedCopyFeedback = await writeClipboardText(message.text) ? t("ChatView.copied.490135e8") : t("ChatView.could_not_copy_message.00b88cb1");
                }}>${renderCopyIcon()}</button>
                ${section.source !== "server" || this.onQueuedMessageAction === undefined ? nothing : localizedTemplate("ChatView.template.29b9a192", html)`
                  <button type="button" class="queued-action" ?disabled=${actionsDisabled} title=${unavailableReason ?? (message.kind === "steer" ? t("ChatView.move_to_the_end_of_the_follow.1e709cf7") : t("ChatView.move_to_the_end_of_the_steering.074a4cf7"))} aria-label=${message.kind === "steer" ? t("ChatView.switch_to_queue.5cd3b8f2") : t("ChatView.switch_to_steer.4a0b2429")} @click=${() => { this.actOnQueuedMessage("toggle", index, section.messages); }}>${message.kind === "steer" ? renderQueueIcon() : renderSteerIcon()}</button>
                  <button type="button" class="queued-action" ?disabled=${actionsDisabled} aria-label="Recall queued message" title=${unavailableReason ?? t("ChatView.recall_this_message_s_text_and_clear.adbff4bc")} @click=${() => { this.actOnQueuedMessage("edit", index, section.messages); }}>${renderGoBackIcon()}</button>
                  <button type="button" class="queued-action" ?disabled=${actionsDisabled} aria-label="Remove queued message" title=${unavailableReason ?? t("ChatView.remove_only_this_message.5e747f11")} @click=${() => { this.actOnQueuedMessage("remove", index, section.messages); }}>${renderTrashIcon()}</button>
                `}
              </div>
            </div>
            <formatted-text .imagesEnabled=${this.behaviors.loadImages} .codeBlocks=${this.behaviors.codeBlocks} .intentKey=${JSON.stringify([this.machineId, this.sessionId, "queue", section.source, index, message.kind])} .contentRendering=${this.contentRendering} .machineId=${this.machineId} .workspaceContext=${this.workspaceContext} .text=${message.text}></formatted-text>
          </div>
        `)}
      </aside>
    `;
  }

  private actOnQueuedMessage(action: QueuedMessageAction, index: number, messages: QueuedSessionMessage[]): void {
    if (this.queuedMessageActionPending || this.status?.queueMessageActionsUnavailable !== undefined) return;
    void this.onQueuedMessageAction?.({ machineId: this.machineId, sessionId: this.sessionId, action, index, expectedQueue: messages.map((message) => ({ ...message })) });
  }

  private renderSuggestedInput() {
    const text = this.status?.sessionId === this.sessionId ? this.status.suggestedInput : undefined;
    if (text === undefined || this.onUseSuggestedInput === undefined
      || this.suggestedInputPending || this.suppressedSuggestedInput === text) return null;
    return localizedTemplate("ChatView.suggested_input_replaces_your_current_draft_nothing.1d449cdb", html)`
      <aside class="suggested-input">
        <div class="suggested-input-header">
          <strong>Suggested input</strong>
          ${this.onDismissSuggestedInput === undefined ? null : localizedTemplate("ChatView.template.928ca7f8", html)`
            <button type="button" class="suggested-input-dismiss" aria-label="Dismiss suggested input" title="Dismiss suggested input in this browser"
              @click=${() => { this.onDismissSuggestedInput?.(this.machineId, this.sessionId, text); }}>${renderUiIcon("close")}</button>
          `}
        </div>
        <p class="suggested-input-text" dir="auto">${text === "" ? t("ChatView.empty_input.902c5033") : text}</p>
        <small>Replaces your current draft. Nothing is sent.</small>
        <button type="button" class="suggested-input-use" @click=${() => { this.onUseSuggestedInput?.(this.machineId, this.sessionId); }}>Use suggested input</button>
      </aside>
    `;
  }

  private renderExtensionDialogs() {
    const open = this.pendingDialogs[0];
    if (open === undefined && this.closedDialogs.length === 0) return null;
    const queuedCount = this.pendingDialogs.length - 1;
    return html`
      ${repeat(
        this.closedDialogs,
        (closed) => closed.dialog.dialogId,
        (closed) => html`
          <extension-dialog-card
            class="closed-dialog-card"
            .outcome=${closed}
            .onDismiss=${this.onDismissClosedDialog}
          ></extension-dialog-card>
        `,
      )}
      ${open === undefined ? null : html`
        <extension-dialog-card
          class="open-dialog-card"
          .dialog=${open}
          .onAnswer=${this.onAnswerDialog}
          .onCancel=${this.onCancelDialog}
        ></extension-dialog-card>
        ${queuedCount > 0
          ? localizedTemplate("ChatView.more_extension_queued.9f0718e6", html)`<p class="queued-dialogs" role="status">${String(queuedCount)} more extension ${queuedCount === 1 ? "dialog" : "dialogs"} queued</p>`
          : null}
      `}
    `;
  }

  private renderSessionActivity() {
    if (!this.isCompacting) return null;
    return localizedTemplate("ChatView.compacting_history_the_agent_is_summarizing_earlier.96ff51f8", html)`
      <aside class="session-activity compacting" aria-live="polite">
        <strong>Compacting history…</strong>
        <span>The agent is summarizing earlier context. New prompts will be queued until compaction finishes.</span>
        ${this.pendingMessageCount > 0 ? localizedTemplate("ChatView.queued.ee85bfd1", html)`<small>${this.pendingMessageCount} queued ${this.pendingMessageCount === 1 ? "message" : "messages"}</small>` : null}
      </aside>
    `;
  }

  private activityState(): string | undefined {
    const status = this.status;
    if (status === undefined) return this.activity?.label;
    if (status.isCompacting) return "compacting";
    if (status.isBashRunning) return "bash";
    if (status.isStreaming) return "running";
    if (status.pendingMessageCount > 0) return "queued";
    return "idle";
  }

  private activityText(state: string): string {
    const activity = this.activity;
    if (activity === undefined) return state;
    if (state !== "idle" && activity.phase === "idle") return state;
    return activity.detail !== undefined && activity.detail !== "" ? `${activity.label}: ${activity.detail}` : activity.label;
  }

  private renderHistoryBoundary() {
    const range = this.historyRangeLabel();
    if (this.loadingMore) return localizedTemplate("ChatView.loading_earlier_messages.7cd28bec", html)`<div class="history-boundary"><span>Loading earlier messages…</span>${range}</div>`;
    if (this.hasMore) return localizedTemplate("ChatView.load_earlier_messages.5bea8e73", html)`
      <div class="history-boundary">
        <button type="button" class="history-load-button" ?disabled=${this.loadMoreRequested} @click=${() => { this.requestLoadMore(); }}>Load earlier messages</button>
        ${this.behaviors.automaticHistory ? localizedTemplate("ChatView.scroll_up_to_load_earlier_messages.ab9a8e61", html)`<span>Scroll up to load earlier messages</span>` : null}
        ${range}
      </div>
    `;
    if (this.messages.length) return localizedTemplate("ChatView.beginning_of_session.2244d192", html)`<div class="history-boundary"><span>Beginning of session</span>${range}</div>`;
    return null;
  }

  private historyRangeLabel() {
    if (!this.messages.length || this.messageTotal <= 0) return null;
    const from = this.messageStart + 1;
    const to = this.loadedRawMessageEnd();
    const total = Math.max(this.messageTotal, to);
    return localizedTemplate("ChatView.showing_messages_of.187d4d56", html)`<small>Showing messages ${from}–${to} of ${total}</small>`;
  }

  private loadedRawMessageEnd(): number {
    return Math.max(this.messageEnd, this.messageStart + this.messages.length);
  }

  private renderMessage(message: ChatLine, index: number, entryActionHeaders: ReadonlySet<ChatLine>) {
    const toolOnly = this.isToolExecutionOnlyMessage(message);
    const hasHeader = chatMessageHasHeader(message);
    const shellClass = toolOnly ? "msg tool-execution-shell" : "msg ask-user-record-shell";
    return html`
      <article class=${hasHeader ? `msg ${message.role}` : shellClass} data-index=${index} data-scroll-anchor-id=${chatMessageAnchorKey(index, message) ?? nothing}>
        ${hasHeader ? this.renderMessageHeader(message, String(index), index, entryActionHeaders) : null}
        ${message.parts.map((part, partIndex) => this.renderPart(part, message, index, partIndex))}
        ${this.renderWrittenFiles(index)}
      </article>
    `;
  }

  private renderToolImageOutput(message: ChatLine, index: number, entryActionHeaders: ReadonlySet<ChatLine>, toolName?: string) {
    const label = chatToolOutputLabel(toolName);
    return html`
      <article class="msg tool-image-output" data-index=${index} data-scroll-anchor-id=${chatMessageAnchorKey(index, message) ?? nothing}>
        ${this.renderMessageHeader(message, String(index), index, entryActionHeaders, label)}
        ${message.parts.map((part, partIndex) => this.renderPart(part, message, index, partIndex))}
      </article>
    `;
  }

  private isToolExecutionOnlyMessage(message: ChatLine): boolean {
    return message.role === "tool" && message.parts.length > 0 && message.parts.every((part) => part.type === "toolExecution");
  }

  private renderMessageGroup(group: Extract<ChatGroup, { kind: "group" }>, defaultOpen: boolean, entryActionHeaders: ReadonlySet<ChatLine> = new Set()) {
    const { messages, startIndex } = group;
    const lines = messages.map((event) => event.message);
    const progress = chatGroupProgress(lines);
    const summarySource = lines.every((message) => message.source === "compaction") ? "compaction"
      : lines.every((message) => message.source === "branch_summary") ? "branch" : undefined;
    const label = summarySource === "compaction" ? t("ChatView.process_compaction")
      : summarySource === "branch" ? t("ChatView.process_branch")
        : defaultOpen && progress.toolCount === 0 && progress.thinkingCount > 0 ? t("ChatView.process_thinking") : chatMessageGroupLabel(defaultOpen);
    const disclosureKey = this.groupDisclosureKey(group, defaultOpen);
    const open = this.behaviors.rememberDisclosures ? this.disclosures.isOpen(disclosureKey, defaultOpen) : defaultOpen;
    return html`
      <details class=${`${chatMessageGroupClassName(defaultOpen)}${progress.failedCount > 0 ? " has-errors" : ""}`} data-index=${startIndex} data-scroll-anchor-id=${this.groupAnchorKey(group, defaultOpen) ?? nothing} ?open=${open} @toggle=${this.behaviors.rememberDisclosures ? (event: Event) => { this.onGroupToggle(disclosureKey, event, defaultOpen); } : undefined}>
        <summary>
          <b class="label">${label}</b>
          <span class="group-summary-text">${chatMessageGroupSummary(progress)}</span>
          ${defaultOpen && progress.runningTools.length > 0 ? html`<span class="group-running-tool" title=${progress.runningTools.join(", ")}>${progress.runningTools.join(", ")}</span>` : null}
          ${progress.failedCount > 0 ? html`<span class="group-state error">${String(progress.failedCount)} ${t("ChatView.process_failed")}</span>` : null}
          ${!defaultOpen && progress.unfinishedCount > 0 ? html`<span class="group-state unfinished">${String(progress.unfinishedCount)} ${t("ChatView.process_unfinished")}</span>` : null}
        </summary>
        ${this.renderMessageGroupBody(group, entryActionHeaders)}
      </details>
    `;
  }

  private renderMessageGroupBody({ messages, startIndex }: Extract<ChatGroup, { kind: "group" }>, entryActionHeaders: ReadonlySet<ChatLine> = new Set()) {
    return html`
      <div class="group-body">
        ${messages.map(({ message, index }, offset) => {
          const toolOnly = this.isToolExecutionOnlyMessage(message);
          return html`
            <section class=${toolOnly ? "group-msg tool-execution-shell" : `group-msg ${message.role}`} data-index=${index} data-scroll-anchor-id=${chatEventAnchorKey(index, message) ?? nothing}>
              ${chatMessageHasHeader(message) ? this.renderMessageHeader(message, `${String(startIndex)}:${String(offset)}`, index, entryActionHeaders, message.role === "assistant" ? null : roleDisplayLabel(message.role)) : null}
              ${message.parts.map((part, partIndex) => this.renderPart(part, message, index, partIndex))}
              ${this.renderWrittenFiles(index)}
            </section>
          `;
        })}
      </div>
    `;
  }

  private renderMessageHeader(message: ChatLine, key: string, index: number, entryActionHeaders: ReadonlySet<ChatLine>, label: string | null = roleDisplayLabel(message.role)) {
    const meta = this.messageMetaLabel(message);
    const expanded = this.expandedMetaKey === key;
    return html`
      <div class=${label === null ? "msg-header compact-event-header" : "msg-header"}>
        ${label === null ? null : html`<b class="label">${label}</b>`}
        <div class="msg-header-trailing">
          ${this.renderMessageActions(message, key, this.messages[index - this.messageStart] ?? message, entryActionHeaders.has(message))}
          <span class=${expanded ? "msg-meta expanded" : "msg-meta"} role="button" tabindex="0" title=${meta} aria-label=${meta} aria-expanded=${String(expanded)} @click=${() => { this.expandedMetaKey = expanded ? undefined : key; }} @keydown=${(event: KeyboardEvent) => { this.onMetaKeydown(event, key, expanded); }}>${meta}</span>
        </div>
      </div>
    `;
  }

  private renderMessageActions(message: ChatLine, key: string, source: ChatLine, includeEntryActions: boolean) {
    const actions = this.messageActionContext === undefined ? []
      : this.messageActionAvailability.get(source, this.messageActions, this.messageActionContext, message, includeEntryActions)
        .filter(({ action }) => action.target === "display" ? this.onDisplayedMessageAction !== undefined : this.onMessageAction !== undefined);
    if (actions.length === 0) return null;
    const feedback = this.messageActionFeedback;
    return localizedTemplate("ChatView.template.795c3fae", html)`
      <div class="msg-actions" aria-label="Message actions">
        ${actions.map(({ action, enabled, ariaLabel }) => {
          const presentation = feedback?.machineId === this.machineId && feedback.sessionId === this.sessionId && feedback.key === key && feedback.actionId === action.id
            ? feedback.presentation : undefined;
          const pending = action.target === "display" ? this.displayedMessageActionsPending.has(this.messageActionKey(key, action.id)) : this.messageActionPending;
          return html`<button type="button" class="msg-action" title=${presentation?.title ?? action.title} aria-label=${presentation?.ariaLabel ?? presentation?.title ?? ariaLabel} ?disabled=${!enabled || pending} @click=${(event: MouseEvent) => { void this.actOnMessage(source, message, key, action, event); }}>${presentation?.icon ?? action.icon ?? action.title}</button>`;
        })}
        ${this.messageActionError?.machineId === this.machineId && this.messageActionError.sessionId === this.sessionId && this.messageActionError.key === key ? html`<span role="alert">${this.messageActionError.message}</span>` : null}
      </div>
    `;
  }

  private messageActionKey(key: string, actionId: string): string {
    return JSON.stringify([this.machineId, this.sessionId, this.messageActionGeneration, key, actionId]);
  }

  private async actOnMessage(source: ChatLine, displayed: ChatLine, key: string, action: RegisteredMessageAction, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    const context = this.messageActionContext;
    if (context === undefined) return;
    const pendingKey = this.messageActionKey(key, action.id);
    if (action.target === "display" ? this.displayedMessageActionsPending.has(pendingKey) : this.messageActionPending) return;
    const entry = messageActionMessage(source, displayed.role);
    const onEntry = this.onMessageAction;
    const onDisplay = this.onDisplayedMessageAction;
    const run = action.target === "display"
      ? onDisplay === undefined ? undefined : () => onDisplay({ ...context, message: displayedMessageActionMessage(displayed) }, action.id)
      : entry === undefined || onEntry === undefined ? undefined : () => onEntry({ ...context, message: entry }, action.id);
    if (run === undefined) return;
    const sessionId = this.sessionId;
    const machineId = this.machineId;
    const generation = this.messageActionGeneration;
    if (action.target === "display") this.displayedMessageActionsPending = new Set([...this.displayedMessageActionsPending, pendingKey]);
    else this.messageActionPending = true;
    this.messageActionError = undefined;
    try {
      const presentation = await run();
      if (presentation !== undefined && this.isConnected && this.messageActionGeneration === generation && this.sessionId === sessionId && this.machineId === machineId) {
        this.clearMessageActionFeedback();
        this.messageActionFeedback = { machineId, sessionId, key, actionId: action.id, presentation };
        this.messageActionFeedbackTimer = window.setTimeout(() => { this.clearMessageActionFeedback(); }, 1200);
      }
    } catch (error) {
      if (this.isConnected && this.messageActionGeneration === generation && this.sessionId === sessionId && this.machineId === machineId) this.messageActionError = { machineId, sessionId, key, message: error instanceof Error ? error.message : String(error) };
    } finally {
      if (action.target === "display") this.displayedMessageActionsPending = new Set([...this.displayedMessageActionsPending].filter((item) => item !== pendingKey));
      else this.messageActionPending = false;
    }
  }

  private clearMessageActionFeedback(): void {
    if (this.messageActionFeedbackTimer !== undefined) window.clearTimeout(this.messageActionFeedbackTimer);
    this.messageActionFeedbackTimer = undefined;
    this.messageActionFeedback = undefined;
  }

  private onMetaKeydown(event: KeyboardEvent, key: string, expanded: boolean) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    this.expandedMetaKey = expanded ? undefined : key;
  }

  private messageMetaLabel(message: ChatLine): string {
    const cached = this.messageMetaCache.get(message);
    if (cached !== undefined) return cached;
    const label = chatMessageMetadataLabel(message);
    this.messageMetaCache.set(message, label);
    return label;
  }

  private transcriptSession(): SessionRef {
    if (this.imageSession?.id !== this.sessionId || this.imageSession.cwd !== this.sessionCwd) {
      this.imageSession = { id: this.sessionId, cwd: this.sessionCwd };
    }
    return this.imageSession;
  }

  private renderPart(part: ChatPart, message: ChatLine, messageIndex: number, partIndex: number) {
    const intentKey = JSON.stringify([this.machineId, this.sessionId, message.entryId ?? messageIndex, partIndex]);
    if (part.type === "text" || part.type === "thinking") {
      const text = part.displayText ?? part.text;
      if (text === "") return null;
      if (part.type === "thinking") return localizedTemplate("ChatView.thinking.acdb2bf0", html)`<details class="part"><summary>thinking</summary><formatted-text .imagesEnabled=${this.behaviors.loadImages} .codeBlocks=${this.behaviors.codeBlocks} .intentKey=${intentKey} .contentRendering=${this.contentRendering} .machineId=${this.machineId} .workspaceContext=${this.workspaceContext} .text=${text}></formatted-text></details>`;
      if (message.role === "bash") return html`<pre class="part shell-output">${text}</pre>`;
      return html`<formatted-text .imagesEnabled=${this.behaviors.loadImages} .codeBlocks=${this.behaviors.codeBlocks} .intentKey=${intentKey} class="part" .contentRendering=${this.contentRendering} .machineId=${this.machineId} .workspaceContext=${this.workspaceContext} .fileCards=${message.role === "assistant"} .text=${text}></formatted-text>`;
    }
    if (part.type === "skillInvocation") return localizedTemplate("ChatView.skill.a1debad5", html)`
      <details class="part skill-invocation">
        <summary><b>[skill]</b> ${part.name}</summary>
        <small>${part.location}</small>
        <formatted-text .imagesEnabled=${this.behaviors.loadImages} .codeBlocks=${this.behaviors.codeBlocks} .intentKey=${intentKey} .contentRendering=${this.contentRendering} .machineId=${this.machineId} .workspaceContext=${this.workspaceContext} .text=${part.content}></formatted-text>
      </details>
    `;
    if (part.type === "skillRead") return localizedTemplate("ChatView.loaded_read.3e594809", html)`
      <div class="part skill-read">
        <strong>Loaded ${part.name}</strong>
        <small>read ${part.path}</small>
      </div>
    `;
    if (part.type === "askUserQuestion") {
      const open = this.openQuestion()?.askId === part.ask.askId;
      return html`<ask-user-card
        class=${open ? "part open-question-card" : "part closed-question-card"}
        .ask=${part.ask} .open=${open}
        .outcomes=${this.questionOutcomes.get(part.ask.askId) ?? []}
        .draftSessionId=${this.askDraftSessionId}
        .onSubmit=${open ? this.onSubmitAsk : undefined}
      ></ask-user-card>`;
    }
    if (part.type === "askUserRecord") return html`
      <ask-user-card
        class="part"
        .outcome=${part.outcome}
        .compact=${this.questionIds.has(part.outcome.askId)}
        .draftSessionId=${this.askDraftSessionId}
      ></ask-user-card>
    `;
    if (part.type === "image") {
      return html`<pi-web-transcript-image class="part chat-image" .imagePart=${part} .loadingDisabled=${!this.behaviors.loadImages}
        .session=${this.transcriptSession()} .machineId=${this.machineId}
      ></pi-web-transcript-image>`;
    }
    if (part.type === "toolCall") return html`<div class="part tool-line">▶ ${part.toolName}<span class="summary">${part.summary}</span></div>`;
    if (part.type === "toolExecution") return html`<tool-execution-view class="part" .execution=${part}></tool-execution-view>`;
    if (part.type === "toolResult") return html`
      <details class="part" ?open=${part.isError}>
        <summary>${renderUiIcon(part.isError ? "close" : "check")} ${part.toolName} result</summary>
        <formatted-text .imagesEnabled=${this.behaviors.loadImages} .codeBlocks=${this.behaviors.codeBlocks} .intentKey=${intentKey} .contentRendering=${this.contentRendering} .machineId=${this.machineId} .workspaceContext=${this.workspaceContext} .text=${part.text}></formatted-text>
      </details>
    `;
    return null;
  }

  private onGroupToggle(key: string, event: Event, defaultOpen: boolean) {
    const details = event.currentTarget;
    if (!(details instanceof HTMLDetailsElement)) return;
    // The browser owns disclosure visibility; retain the choice without rebuilding
    // its body (and its native lazy images) when it opens or closes.
    this.disclosures.applyToggle(key, details.open, defaultOpen);
  }

  private get handlesScrollIntent(): boolean {
    return this.behaviors.followTail || this.behaviors.rememberPosition;
  }

  private scrollContentChanged(changed: Map<string, unknown>): boolean {
    return changed.has("messages") || changed.has("historyReady") || changed.has("messageEnd") || changed.has("messageTotal") || changed.has("onSubmitAsk") || changed.has("pendingDialogs") || changed.has("closedDialogs");
  }

  private requestLoadMore(): void {
    if (this.loadMoreRequested || !this.hasMore || this.loadingMore || this.onLoadMore === undefined) return;
    this.loadMoreRequested = true;
    this.onLoadMore();
  }

  private openQuestion() {
    return openTranscriptQuestion(this.messages, {
      historyReady: this.historyReady,
      messageEnd: this.messageEnd,
      messageTotal: this.messageTotal,
      writable: this.onSubmitAsk !== undefined,
    });
  }

  private isNewOpenDialog(previous: unknown): boolean {
    const oldest = this.pendingDialogs[0];
    if (oldest === undefined) return false;
    if (!Array.isArray(previous)) return true;
    const previousOldest: unknown = previous[0];
    return typeof previousOldest !== "object" || previousOldest === null || Reflect.get(previousOldest, "dialogId") !== oldest.dialogId;
  }

  /** Public navigation hooks; the position-memory flow owns their effects. */
  restoreScrollPosition(): void {
    this.scrollFlows.restorePosition();
  }

  saveScrollPosition(sessionId = this.sessionId): void {
    this.scrollFlows.savePosition(sessionId);
  }

  private scrollAnchorElements(): HTMLElement[] {
    return Array.from(this.renderRoot.querySelectorAll<HTMLElement>("[data-scroll-anchor-id]"));
  }

  private groupDisclosureKey(group: Extract<ChatGroup, { kind: "group" }>, defaultOpen: boolean): string {
    return defaultOpen
      ? `${this.sessionId}:live:${chatLineIdentity(group.startIndex, group.messages[0]?.message)}`
      : `${this.sessionId}:${chatLineIdentity(group.endIndex, group.messages.at(-1)?.message)}`;
  }


  private groupAnchorKey(group: Extract<ChatGroup, { kind: "group" }>, live: boolean): string | undefined {
    // Historical groups can absorb earlier events; live groups grow at the end.
    // Skip transient members rather than persisting their display indexes.
    const durableIdentities = group.messages
      .map(({ message }) => chatLineScrollIdentity(message))
      .filter((identity): identity is string => identity !== undefined);
    const identity = live ? durableIdentities[0] : durableIdentities.at(-1);
    if (identity === undefined) return undefined;
    return live ? `g:${identity}` : `g-end:${identity}`;
  }

  static override styles = [chatStyles, css`
    .turn-written-files { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; min-width: 0; margin-top: 10px; color: var(--pi-muted); font: var(--pi-font-weight-regular, 360) 12px/18px var(--pi-control-font-family, var(--pi-font-family, system-ui, sans-serif)); }
    .turn-written-files button { max-width: 100%; border: 1px solid var(--pi-border-muted); border-radius: 6px; padding: 3px 7px; background: var(--pi-surface); color: var(--pi-text-secondary); font: inherit; text-align: start; overflow-wrap: anywhere; cursor: pointer; }
    .turn-written-files button:not(:disabled):hover { background: var(--pi-surface-hover); color: var(--pi-text); }
    .selection-quote-bar { position: absolute; z-index: 30; display: flex; align-items: center; flex-wrap: wrap; width: max-content; max-width: calc(100% - 16px); box-sizing: border-box; padding: 3px; border: 1px solid var(--pi-border-muted); border-radius: 8px; box-shadow: 0 3px 12px var(--pi-shadow); background: var(--pi-surface); font: var(--pi-font-weight-regular, 360) 13px/20px var(--pi-control-font-family, var(--pi-font-family, system-ui, sans-serif)); }
    .selection-quote-bar button { flex: 1 0 auto; border: 0; border-radius: 4px; padding: 2px 6px; background: transparent; color: var(--pi-text); font: inherit; cursor: pointer; white-space: nowrap; }
    .selection-quote-bar button + button { border-inline-start: 1px solid var(--pi-border-muted); border-start-start-radius: 0; border-end-start-radius: 0; }
    .selection-quote-bar button:not(:disabled):hover { background: var(--pi-surface-hover); }
    .selection-quote-bar button:disabled, .turn-written-files button:disabled { opacity: .5; cursor: not-allowed; }
    .selection-quote-bar small { flex-basis: 100%; max-width: 280px; padding: 3px 6px; overflow-wrap: anywhere; color: var(--pi-danger); }
    .selection-quote-bar button:focus-visible, .turn-written-files button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
  `];
}
