// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatScrollFlows } from "../ChatScrollFlows";
import { MANUAL_CHAT_BEHAVIORS } from "../chatBehaviors.testSupport";
import { ChatView } from "./ChatView";
import { ChatTimeline } from "./ChatTimeline";

let frames: Map<number, FrameRequestCallback>;
let frameId: number;

beforeEach(() => {
  frames = new Map();
  frameId = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frameId += 1;
    frames.set(frameId, callback);
    return frameId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => { frames.delete(id); });
});

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount() {
  const view = new ChatView();
  view.behaviors = MANUAL_CHAT_BEHAVIORS;
  view.sessionId = "timeline-integration";
  view.messageStart = 40;
  view.messages = [
    { entryId: "question", role: "user", parts: [{ type: "toolCall", toolName: "context", summary: "technical context" }, { type: "text", text: "First question" }] },
    { entryId: "answer", role: "assistant", parts: [{ type: "text", text: "First answer" }] },
    { entryId: "next", role: "user", parts: [{ type: "text", text: "Next question" }] },
  ];
  document.body.append(view);
  await view.updateComplete;
  const timeline = view.renderRoot.querySelector("chat-timeline");
  const viewport = view.renderRoot.querySelector<HTMLDivElement>(".chat");
  if (!(timeline instanceof ChatTimeline) || viewport === null) throw new Error("Chat timeline not mounted");
  Object.defineProperties(viewport, { clientHeight: { value: 300 }, scrollHeight: { value: 1000 } });
  vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 600, 300));
  for (const [index, element] of Array.from(viewport.children).entries()) {
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(0, index * 100, 600, 60));
  }
  await timeline.updateComplete;
  flushFrames();
  await timeline.updateComplete;
  return { view, timeline, viewport };
}

function flushFrames(): void {
  const callbacks = [...frames.values()];
  frames.clear();
  for (const callback of callbacks) callback(0);
}

describe("ChatView conversation timeline", () => {
  it("wires a real tick click to the readable user article and retains existing navigation", async () => {
    const jump = vi.spyOn(ChatScrollFlows.prototype, "jumpToAnchor").mockImplementation(() => undefined);
    const { view, timeline, viewport } = await mount();
    expect(timeline.viewport).toBe(viewport);
    expect(timeline.entries.map((entry) => entry.index)).toEqual([40, 42]);
    expect(viewport.classList.contains("timeline-scroll")).toBe(true);
    expect(viewport.getAttribute("tabindex")).toBe("0");
    expect(viewport.getAttribute("aria-label")).toBe("Conversation");
    const tick = timeline.renderRoot.querySelector<HTMLButtonElement>("button");
    if (tick === null) throw new Error("Conversation tick missing");
    tick.click();
    expect(jump).toHaveBeenCalledExactlyOnceWith(viewport.querySelector('article.user[data-index="40"]'));
    expect(view.renderRoot.querySelectorAll(".chat-jumps button")).toHaveLength(2);
  });

  it("keeps scroll updates inside the navigation component and drops stale entries on session change", async () => {
    const { view, timeline, viewport } = await mount();
    const render = vi.spyOn(view, "render");
    const jump = vi.spyOn(ChatScrollFlows.prototype, "jumpToAnchor").mockImplementation(() => undefined);
    const first = timeline.entries[0];
    if (first === undefined) throw new Error("First conversation entry missing");
    viewport.dispatchEvent(new Event("scroll"));
    flushFrames();
    await timeline.updateComplete;
    expect(render).not.toHaveBeenCalled();
    view.sessionId = "other-session";
    view.messages = [];
    await view.updateComplete;
    await timeline.updateComplete;
    timeline.onNavigate?.(first);
    expect(jump).not.toHaveBeenCalled();
    expect(view.renderRoot.querySelector("chat-timeline")).toBeNull();
    expect(viewport.classList.contains("timeline-scroll")).toBe(false);
  });
});
