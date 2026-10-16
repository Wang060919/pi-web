import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { t } from "../../../shared/i18n";
import { sampleChatTimelineEntries, type ChatTimelineEntry } from "../chatTimeline";

interface MeasuredEntry {
  entry: ChatTimelineEntry;
  offset: number;
}

@customElement("chat-timeline")
export class ChatTimeline extends LitElement {
  @property({ attribute: false }) entries: readonly ChatTimelineEntry[] = [];
  @property({ attribute: false }) viewport: HTMLElement | undefined = undefined;
  @property({ attribute: false }) onNavigate: ((entry: ChatTimelineEntry) => void) | undefined = undefined;
  @state() private activeKey: string | undefined = undefined;
  @state() private focusedKey: string | undefined = undefined;
  @state() private previewKey: string | undefined = undefined;
  @state() private overflowing = false;
  @state() private previewTop = 8;
  private attachedViewport: HTMLElement | undefined;
  private resizeObserver: ResizeObserver | undefined;
  private mutationObserver: MutationObserver | undefined;
  private observedChildren = new Set<Element>();
  private measuredEntries: MeasuredEntry[] = [];
  private frame: number | undefined;
  private measurementPending = false;
  private focusGeneration = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.detachViewport();
    super.disconnectedCallback();
  }

  protected override updated(changed: Map<string, unknown>): void {
    if (this.attachedViewport !== this.viewport && this.isConnected) this.attachViewport();
    if (changed.has("entries")) {
      this.focusGeneration += 1;
      if (!this.entries.some((entry) => entry.key === this.focusedKey)) this.focusedKey = undefined;
      if (!this.entries.some((entry) => entry.key === this.previewKey)) this.previewKey = undefined;
      this.scheduleRefresh(true);
    }
    if (this.previewKey !== undefined && (changed.has("previewKey") || changed.has("focusedKey") || changed.has("entries") || changed.has("overflowing"))) this.positionPreview();
  }

  override render() {
    if (!this.overflowing || this.entries.length === 0) return nothing;
    const sampled = this.sampledEntries();
    const activeIndex = this.entries.findIndex((entry) => entry.key === this.activeKey);
    const preview = this.entries.find((entry) => entry.key === this.previewKey);
    return html`
      <nav aria-label=${t("ui.chatTimeline.navigation")} style=${`--tick-count: ${String(sampled.length)}`} @keydown=${(event: KeyboardEvent) => { this.handleKeyDown(event); }}>
        ${sampled.map((entry) => {
          const index = this.entries.indexOf(entry);
          const current = entry.key === this.activeKey;
          return html`<button
            type="button"
            data-entry-key=${entry.key}
            class=${current ? "current" : Math.abs(index - activeIndex) <= 2 ? "nearby" : ""}
            aria-label=${`${t("ui.chatTimeline.jump")}: ${entry.title}`}
            aria-current=${current ? "location" : nothing}
            aria-describedby=${preview?.key === entry.key ? "timeline-preview" : nothing}
            tabindex=${entry.key === (this.focusedKey ?? this.activeKey ?? sampled[0]?.key) ? "0" : "-1"}
            @pointerenter=${() => { this.previewKey = entry.key; }}
            @pointerleave=${() => { if (this.focusedKey !== entry.key) this.previewKey = undefined; }}
            @focus=${() => { this.focusedKey = entry.key; this.previewKey = entry.key; }}
            @blur=${() => { if (this.focusedKey === entry.key) { this.focusedKey = undefined; this.previewKey = undefined; } }}
            @click=${() => { this.previewKey = undefined; this.onNavigate?.(entry); }}
          ><span aria-hidden="true"></span></button>`;
        })}
      </nav>
      ${preview === undefined ? nothing : html`
        <section id="timeline-preview" class="preview" role="tooltip" aria-label=${t("ui.chatTimeline.preview")} style=${`top: ${String(this.previewTop)}px`}>
          <strong>${preview.title}</strong>
          <p>${preview.preview || t("ui.chatTimeline.emptyReply")}</p>
        </section>
      `}
    `;
  }

  private sampledEntries(): readonly ChatTimelineEntry[] {
    const sampled = sampleChatTimelineEntries(this.entries, this.activeKey);
    const focused = this.entries.find((entry) => entry.key === this.focusedKey);
    if (focused === undefined || sampled.some((entry) => entry.key === focused.key)) return sampled;
    const focusedIndex = this.entries.indexOf(focused);
    const replaceable = sampled
      .map((entry, index) => ({ entry, index, distance: Math.abs(this.entries.indexOf(entry) - focusedIndex) }))
      .filter(({ entry, index }) => index > 0 && index < sampled.length - 1 && entry.key !== this.activeKey)
      .sort((left, right) => left.distance - right.distance)[0];
    const keys = new Set(sampled.map((entry) => entry.key));
    if (replaceable !== undefined) keys.delete(replaceable.entry.key);
    keys.add(focused.key);
    return this.entries.filter((entry) => keys.has(entry.key));
  }

  private attachViewport(): void {
    this.detachViewport();
    const viewport = this.viewport;
    if (viewport === undefined) return;
    this.attachedViewport = viewport;
    viewport.addEventListener("scroll", this.handleScroll, { passive: true });
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => { this.scheduleRefresh(true); });
      this.resizeObserver.observe(viewport);
    }
    if (typeof MutationObserver !== "undefined") {
      this.mutationObserver = new MutationObserver(() => { this.syncObservedChildren(); this.scheduleRefresh(true); });
      this.mutationObserver.observe(viewport, { childList: true });
    }
    this.syncObservedChildren();
    this.scheduleRefresh(true);
  }

  private detachViewport(): void {
    this.focusGeneration += 1;
    this.attachedViewport?.removeEventListener("scroll", this.handleScroll);
    this.attachedViewport = undefined;
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.mutationObserver?.disconnect();
    this.mutationObserver = undefined;
    this.observedChildren.clear();
    this.measuredEntries = [];
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.measurementPending = false;
    this.activeKey = undefined;
    this.focusedKey = undefined;
    this.previewKey = undefined;
    this.overflowing = false;
  }

  private syncObservedChildren(): void {
    const children = new Set(this.attachedViewport?.children ?? []);
    for (const child of this.observedChildren) if (!children.has(child)) this.resizeObserver?.unobserve(child);
    for (const child of children) if (!this.observedChildren.has(child)) this.resizeObserver?.observe(child);
    this.observedChildren = children;
  }

  private readonly handleScroll = (): void => { this.scheduleRefresh(false); };

  private scheduleRefresh(measure: boolean): void {
    if (!this.isConnected || this.attachedViewport === undefined) return;
    this.measurementPending ||= measure;
    if (this.frame !== undefined) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined;
      if (!this.isConnected || this.attachedViewport === undefined) return;
      if (this.measurementPending) {
        this.measurementPending = false;
        this.measureEntries();
      }
      this.updateActiveEntry();
      if (this.previewKey !== undefined) this.positionPreview();
    });
  }

  private measureEntries(): void {
    const viewport = this.attachedViewport;
    if (viewport === undefined) return;
    this.overflowing = viewport.clientHeight > 0 && viewport.scrollHeight > viewport.clientHeight + 2;
    const top = viewport.getBoundingClientRect().top;
    const scrollTop = viewport.scrollTop;
    const targets = new Map<number, HTMLElement>();
    for (const child of viewport.children) {
      if (!(child instanceof HTMLElement)) continue;
      const index = child.dataset["index"];
      if (index !== undefined && index !== "" && Number.isInteger(Number(index))) targets.set(Number(index), child);
    }
    this.measuredEntries = this.entries.flatMap((entry) => {
      const rect = targets.get(entry.index)?.getBoundingClientRect();
      return rect === undefined || rect.bottom <= rect.top ? [] : [{ entry, offset: rect.top - top + scrollTop }];
    });
  }

  private updateActiveEntry(): void {
    const top = this.attachedViewport?.scrollTop;
    if (top === undefined) return;
    let current = this.measuredEntries[0]?.entry.key;
    for (const measured of this.measuredEntries) {
      if (measured.offset > top + 32) break;
      current = measured.entry.key;
    }
    this.activeKey = current;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape" && this.previewKey !== undefined) {
      event.preventDefault();
      event.stopPropagation();
      this.previewKey = undefined;
      return;
    }
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key) || this.entries.length === 0) return;
    const button = event.target;
    if (!(button instanceof HTMLButtonElement)) return;
    const index = this.entries.findIndex((entry) => entry.key === button.dataset["entryKey"]);
    if (index < 0) return;
    event.preventDefault();
    event.stopPropagation();
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? this.entries.length - 1 : Math.max(0, Math.min(this.entries.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
    const next = this.entries[nextIndex];
    if (next === undefined) return;
    this.focusedKey = next.key;
    this.previewKey = next.key;
    const generation = this.focusGeneration;
    void this.updateComplete.then(() => {
      if (!this.isConnected || generation !== this.focusGeneration) return;
      this.entryButton(next.key)?.focus({ preventScroll: true });
    });
  }

  private entryButton(key: string): HTMLButtonElement | undefined {
    return [...this.renderRoot.querySelectorAll<HTMLButtonElement>("button[data-entry-key]")].find((button) => button.dataset["entryKey"] === key);
  }

  private positionPreview(): void {
    const button = this.previewKey === undefined ? undefined : this.entryButton(this.previewKey);
    const preview = this.renderRoot.querySelector<HTMLElement>(".preview");
    if (button === undefined || preview === null) return;
    const host = this.getBoundingClientRect();
    const trigger = button.getBoundingClientRect();
    const height = preview.getBoundingClientRect().height;
    const top = trigger.top + trigger.height / 2 - host.top - height / 2;
    this.previewTop = Math.max(8, Math.min(top, Math.max(8, host.height - height - 8)));
  }

  static override styles = css`
    :host { position: absolute; inset: 0; z-index: 22; display: block; min-width: 0; pointer-events: none; color: var(--pi-text); font: 12px var(--pi-font-family, system-ui, sans-serif); }
    nav { position: absolute; top: 50%; right: 1px; display: flex; flex-direction: column; justify-content: space-between; width: 30px; height: min(320px, 60%, calc(var(--tick-count) * 10px)); transform: translateY(-50%); pointer-events: auto; }
    button { display: grid; flex: 1 1 0; min-height: 0; place-items: center; width: 30px; padding: 0; border: 0; background: transparent; color: var(--pi-muted); cursor: pointer; }
    button span { display: block; width: 7px; height: 1px; border-radius: 1px; background: currentColor; opacity: .5; transition: width .12s ease, opacity .12s ease; }
    button.nearby span { width: 12px; opacity: .72; }
    button.current span, button:hover span, button:focus-visible span { width: 19px; color: var(--pi-text); opacity: 1; }
    button:focus-visible { border-radius: 4px; outline: 1px solid var(--pi-accent); outline-offset: -2px; }
    .preview { position: absolute; right: 38px; box-sizing: border-box; width: 320px; max-width: calc(100% - 56px); max-height: calc(100% - 16px); overflow: hidden; padding: 12px 14px; border: 1px solid var(--pi-border-muted); border-radius: 10px; background: color-mix(in srgb, var(--pi-surface) 94%, #b2a99b); box-shadow: 0 5px 20px color-mix(in srgb, var(--pi-shadow-soft) 55%, transparent); }
    strong, p { display: -webkit-box; overflow: hidden; overflow-wrap: anywhere; -webkit-box-orient: vertical; }
    strong { -webkit-line-clamp: 2; font-size: 13px; font-weight: 500; line-height: 1.5; }
    p { margin: 8px 0 0; color: var(--pi-muted); font-size: 12px; line-height: 1.5; white-space: pre-line; -webkit-line-clamp: 4; }
    @media (prefers-reduced-motion: reduce) { button span { transition: none; } }
  `;
}
