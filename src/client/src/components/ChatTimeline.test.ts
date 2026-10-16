// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatTimelineEntry } from "../chatTimeline";
import { ChatTimeline } from "./ChatTimeline";
import { manualChatFrames } from "./chatScroll.testSupport";

class ControlledResizeObserver implements ResizeObserver {
  static instances: ControlledResizeObserver[] = [];
  readonly targets = new Set<Element>();
  observe = vi.fn((target: Element) => { this.targets.add(target); });
  unobserve = vi.fn((target: Element) => { this.targets.delete(target); });
  disconnect = vi.fn(() => { this.targets.clear(); });
  constructor(private readonly callback: ResizeObserverCallback) { ControlledResizeObserver.instances.push(this); }
  emit(): void { this.callback([], this); }
}

class ControlledMutationObserver implements MutationObserver {
  static instances: ControlledMutationObserver[] = [];
  observe = vi.fn<(target: Node, options?: MutationObserverInit) => void>();
  disconnect = vi.fn();
  constructor(private readonly callback: MutationCallback) { ControlledMutationObserver.instances.push(this); }
  takeRecords(): MutationRecord[] { return []; }
  emit(): void { this.callback([], this); }
}

let flushFrames: () => void;
beforeEach(() => {
  ControlledResizeObserver.instances = [];
  ControlledMutationObserver.instances = [];
  vi.stubGlobal("ResizeObserver", ControlledResizeObserver);
  vi.stubGlobal("MutationObserver", ControlledMutationObserver);
  flushFrames = manualChatFrames();
});
afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function entries(count = 4): ChatTimelineEntry[] {
  return Array.from({ length: count }, (_, index) => ({ key: `entry-${String(index)}`, index, title: `Question ${String(index)}`, preview: `Answer ${String(index)}` }));
}

function viewportFixture(count = 4) {
  const viewport = document.createElement("div");
  const metrics = { top: 0, height: count * 100 + 100, clientHeight: 100 };
  Object.defineProperties(viewport, {
    scrollTop: { get: () => metrics.top, set: (value: number) => { metrics.top = value; } },
    scrollHeight: { get: () => metrics.height },
    clientHeight: { get: () => metrics.clientHeight },
  });
  const bounds = vi.spyOn(viewport, "getBoundingClientRect").mockImplementation(() => new DOMRect(0, 0, 600, metrics.clientHeight));
  const addTarget = (index: number, offset = index * 100) => {
    const target = document.createElement("article");
    target.dataset["index"] = String(index);
    vi.spyOn(target, "getBoundingClientRect").mockImplementation(() => new DOMRect(0, offset - metrics.top, 600, 80));
    viewport.append(target);
    return target;
  };
  for (let index = 0; index < count; index += 1) addTarget(index);
  document.body.append(viewport);
  return { viewport, metrics, bounds, addTarget };
}

async function mount(count = 4) {
  const fixture = viewportFixture(count);
  const timeline = new ChatTimeline();
  timeline.entries = entries(count);
  timeline.viewport = fixture.viewport;
  timeline.onNavigate = vi.fn();
  vi.spyOn(timeline, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 600, 300));
  document.body.append(timeline);
  await settle(timeline);
  return { timeline, ...fixture };
}

async function settle(timeline: ChatTimeline): Promise<void> {
  await timeline.updateComplete;
  flushFrames();
  await timeline.updateComplete;
  await timeline.updateComplete;
}

function buttons(timeline: ChatTimeline): HTMLButtonElement[] {
  return [...timeline.renderRoot.querySelectorAll<HTMLButtonElement>("button[data-entry-key]")];
}

function button(timeline: ChatTimeline, key: string): HTMLButtonElement {
  const target = buttons(timeline).find((candidate) => candidate.dataset["entryKey"] === key);
  if (target === undefined) throw new Error(`Missing timeline entry ${key}`);
  return target;
}

function current(timeline: ChatTimeline): string | undefined {
  return timeline.renderRoot.querySelector<HTMLButtonElement>('button[aria-current="location"]')?.dataset["entryKey"];
}

function press(target: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe("chat-timeline", () => {
  it("shows navigation only for an overflowing conversation with entries", async () => {
    const { timeline, metrics } = await mount();
    expect(timeline.renderRoot.querySelector("nav")?.getAttribute("aria-label")).toBe("Conversation navigation");
    expect(buttons(timeline)).toHaveLength(4);
    metrics.height = metrics.clientHeight + 2;
    ControlledResizeObserver.instances[0]?.emit();
    await settle(timeline);
    expect(timeline.renderRoot.querySelector("nav")).toBeNull();
    metrics.height = 500;
    timeline.entries = [];
    await settle(timeline);
    expect(timeline.renderRoot.querySelector("nav")).toBeNull();
  });

  it("uses the last direct target for each message index and cached offsets during scrolling", async () => {
    const { timeline, viewport, metrics, bounds, addTarget } = await mount();
    addTarget(1, 250);
    ControlledMutationObserver.instances[0]?.emit();
    await settle(timeline);
    metrics.top = 150;
    viewport.dispatchEvent(new Event("scroll"));
    await settle(timeline);
    expect(current(timeline)).toBe("entry-0");
    const targets = [...viewport.children].filter((target): target is HTMLElement => target instanceof HTMLElement);
    const targetBounds = targets.map((target) => vi.spyOn(target, "getBoundingClientRect"));
    bounds.mockClear();
    for (const target of targetBounds) target.mockClear();
    metrics.top = 260;
    viewport.dispatchEvent(new Event("scroll"));
    viewport.dispatchEvent(new Event("scroll"));
    await settle(timeline);
    expect(current(timeline)).toBe("entry-2");
    expect(bounds).not.toHaveBeenCalled();
    for (const target of targetBounds) expect(target).not.toHaveBeenCalled();
    expect(timeline.onNavigate).not.toHaveBeenCalled();
  });

  it("previews plain message text on hover or focus and navigates only on click", async () => {
    const { timeline } = await mount();
    const entry = timeline.entries[1];
    if (entry === undefined) throw new Error("Missing fixture entry");
    timeline.entries = timeline.entries.map((candidate) => candidate.key === entry.key ? { ...candidate, title: "<img src=x>", preview: "<script>bad()</script>" } : candidate);
    await settle(timeline);
    const trigger = button(timeline, entry.key);
    trigger.dispatchEvent(new Event("pointerenter"));
    await settle(timeline);
    const preview = timeline.renderRoot.querySelector('[role="tooltip"]');
    expect(preview?.getAttribute("aria-label")).toBe("Message preview");
    expect(preview?.textContent).toContain("<img src=x>");
    expect(preview?.textContent).toContain("<script>bad()</script>");
    expect(preview?.querySelector("img, script")).toBeNull();
    expect(trigger.getAttribute("aria-describedby")).toBe("timeline-preview");
    expect(timeline.onNavigate).not.toHaveBeenCalled();
    trigger.dispatchEvent(new Event("pointerleave"));
    await settle(timeline);
    expect(timeline.renderRoot.querySelector('[role="tooltip"]')).toBeNull();
    trigger.focus();
    await settle(timeline);
    expect(timeline.renderRoot.querySelector('[role="tooltip"]')).not.toBeNull();
    trigger.click();
    await settle(timeline);
    expect(timeline.onNavigate).toHaveBeenCalledExactlyOnceWith(timeline.entries[1]);
    expect(timeline.renderRoot.querySelector('[role="tooltip"]')).toBeNull();
  });

  it("shows the empty reply label and dismisses focus previews with Escape", async () => {
    const { timeline } = await mount();
    timeline.entries = timeline.entries.map((entry) => ({ ...entry, preview: "" }));
    await settle(timeline);
    const trigger = button(timeline, "entry-0");
    trigger.focus();
    await settle(timeline);
    expect(timeline.renderRoot.querySelector('[role="tooltip"] p')?.textContent).toBe("No reply text yet");
    expect(press(trigger, "Escape").defaultPrevented).toBe(true);
    await settle(timeline);
    expect(timeline.renderRoot.querySelector('[role="tooltip"]')).toBeNull();
    expect(timeline.onNavigate).not.toHaveBeenCalled();
    expect(timeline.shadowRoot?.activeElement).toBe(trigger);
  });

  it("moves keyboard focus through unsampled entries without scrolling or navigating", async () => {
    const { timeline, viewport, metrics } = await mount(100);
    expect(buttons(timeline).length).toBeLessThanOrEqual(31);
    const first = button(timeline, "entry-0");
    first.focus();
    await settle(timeline);
    expect(press(first, "ArrowDown").defaultPrevented).toBe(true);
    await settle(timeline);
    const second = button(timeline, "entry-1");
    expect(timeline.shadowRoot?.activeElement).toBe(second);
    expect(second.tabIndex).toBe(0);
    expect(buttons(timeline).length).toBeLessThanOrEqual(31);
    expect(current(timeline)).toBe("entry-0");
    press(second, "End");
    await settle(timeline);
    const last = button(timeline, "entry-99");
    expect(timeline.shadowRoot?.activeElement).toBe(last);
    press(last, "ArrowUp");
    await settle(timeline);
    const previous = button(timeline, "entry-98");
    expect(timeline.shadowRoot?.activeElement).toBe(previous);
    press(previous, "Home");
    await settle(timeline);
    expect(timeline.shadowRoot?.activeElement).toBe(button(timeline, "entry-0"));
    expect(metrics.top).toBe(0);
    expect(viewport.scrollTop).toBe(0);
    expect(timeline.onNavigate).not.toHaveBeenCalled();
  });

  it("observes only direct children and releases removed targets", async () => {
    const { viewport, addTarget, timeline } = await mount();
    const resize = ControlledResizeObserver.instances[0];
    const mutation = ControlledMutationObserver.instances[0];
    if (resize === undefined || mutation === undefined) throw new Error("Missing observer fixtures");
    expect(mutation.observe).toHaveBeenCalledWith(viewport, { childList: true });
    expect(resize.targets.has(viewport)).toBe(true);
    const first = viewport.children[0];
    if (first === undefined) throw new Error("Missing first target");
    const nested = document.createElement("span");
    first.append(nested);
    expect(resize.targets.has(nested)).toBe(false);
    first.remove();
    const replacement = addTarget(0);
    mutation.emit();
    await settle(timeline);
    expect(resize.unobserve).toHaveBeenCalledWith(first);
    expect(resize.targets.has(first)).toBe(false);
    expect(resize.targets.has(replacement)).toBe(true);
  });

  it("detaches old viewport effects and clears previews when the viewport changes", async () => {
    const { timeline, viewport } = await mount();
    button(timeline, "entry-0").focus();
    await settle(timeline);
    const resize = ControlledResizeObserver.instances[0];
    const mutation = ControlledMutationObserver.instances[0];
    const next = viewportFixture();
    next.metrics.top = 200;
    timeline.viewport = next.viewport;
    await settle(timeline);
    expect(resize?.disconnect).toHaveBeenCalledOnce();
    expect(mutation?.disconnect).toHaveBeenCalledOnce();
    expect(timeline.renderRoot.querySelector('[role="tooltip"]')).toBeNull();
    expect(current(timeline)).toBe("entry-2");
    const request = vi.spyOn(globalThis, "requestAnimationFrame");
    viewport.dispatchEvent(new Event("scroll"));
    expect(request).not.toHaveBeenCalled();
  });

  it("cancels scheduled work and disconnects observers and listeners on removal", async () => {
    const { timeline, viewport, bounds } = await mount();
    const resize = ControlledResizeObserver.instances[0];
    const mutation = ControlledMutationObserver.instances[0];
    const cancel = vi.spyOn(globalThis, "cancelAnimationFrame");
    resize?.emit();
    bounds.mockClear();
    timeline.remove();
    expect(cancel).toHaveBeenCalledOnce();
    expect(resize?.disconnect).toHaveBeenCalledOnce();
    expect(mutation?.disconnect).toHaveBeenCalledOnce();
    expect(resize?.targets.size).toBe(0);
    const request = vi.spyOn(globalThis, "requestAnimationFrame");
    viewport.dispatchEvent(new Event("scroll"));
    resize?.emit();
    mutation?.emit();
    flushFrames();
    expect(request).not.toHaveBeenCalled();
    expect(bounds).not.toHaveBeenCalled();
  });
});
