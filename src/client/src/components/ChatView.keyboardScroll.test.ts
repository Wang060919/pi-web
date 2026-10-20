// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CHAT_BEHAVIORS } from "../chatBehaviors";
import { chatScrollStorageKey } from "../chatScrollPosition";
import { ChatView, chatMessageAnchorKey } from "./ChatView";
import { controlledChatViewport, manualChatFrames } from "./chatScroll.testSupport";
import type { ChatLine } from "./shared";

const earlier: ChatLine = { entryId: "earlier", role: "user", parts: [{ type: "text", text: "Earlier question" }] };
const recent: ChatLine = { entryId: "recent", role: "user", parts: [{ type: "text", text: "Recent question" }] };
const navigation: KeyboardEventInit[] = [
  { key: "ArrowUp" }, { key: "ArrowDown" }, { key: "PageUp" }, { key: "PageDown" },
  { key: "Home" }, { key: "End" }, { key: " " }, { key: " ", shiftKey: true },
];

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function restoringChat() {
  const flush = manualChatFrames();
  const view = new ChatView();
  view.sessionId = "keyboard-restore";
  view.behaviors = { ...DEFAULT_CHAT_BEHAVIORS, automaticHistory: false };
  view.messages = [recent];
  view.messageStart = 1;
  view.messageTotal = 2;
  view.hasMore = true;
  view.onLoadMore = vi.fn();
  localStorage.setItem(chatScrollStorageKey(view.sessionId), JSON.stringify({
    mode: "anchor", anchorId: chatMessageAnchorKey(0, earlier), offset: 12,
  }));
  document.body.append(view);
  await view.updateComplete;
  const viewport = controlledChatViewport(view);
  const chat = view.renderRoot.querySelector<HTMLDivElement>(".chat");
  if (!chat) throw new Error("Expected transcript");
  chat.focus();
  flush();
  expect(view.onLoadMore).toHaveBeenCalledOnce();
  async function finishHistory() {
    view.messages = [earlier, recent];
    view.messageStart = 0;
    view.hasMore = false;
    await view.updateComplete;
    const anchor = view.renderRoot.querySelector<HTMLElement>('article[data-index="0"]');
    if (!anchor) throw new Error("Expected earlier message");
    // Controlled geometry only: happy-dom does not perform native scrolling.
    vi.spyOn(anchor, "getBoundingClientRect").mockImplementation(() => new DOMRect(0, 200 - viewport.metrics.top, 600, 100));
    flush();
  }
  return { view, chat, ...viewport, finishHistory };
}

function keydown(target: HTMLElement, init: KeyboardEventInit, prevented = false) {
  const event = new KeyboardEvent("keydown", { bubbles: true, composed: true, cancelable: true, ...init });
  if (prevented) event.preventDefault();
  target.dispatchEvent(event);
  return event;
}

describe("transcript keyboard scroll intent", () => {
  it.each(navigation)("keeps keyboard reading after delayed history arrives (%j)", async (init) => {
    const { chat, metrics, write, finishHistory } = await restoringChat();
    expect(keydown(chat, init).defaultPrevented).toBe(false);
    metrics.top = 350;
    chat.dispatchEvent(new Event("scroll"));
    await finishHistory();
    expect(write).not.toHaveBeenCalled();
    expect(metrics.top).toBe(350);
  });

  it.each(["PageUp", "PageDown"])("only pauses live following for upward navigation (%s)", async (key) => {
    const flush = manualChatFrames();
    const view = new ChatView();
    view.sessionId = "keyboard-follow";
    view.messages = [recent];
    document.body.append(view);
    await view.updateComplete;
    const { metrics, write } = controlledChatViewport(view);
    const chat = view.renderRoot.querySelector<HTMLElement>(".chat");
    if (!chat) throw new Error("Expected transcript");
    flush();
    await view.updateComplete;
    write.mockClear();
    chat.focus();
    keydown(chat, { key });
    metrics.height += 100;
    window.dispatchEvent(new Event("resize"));
    flush();
    if (key === "PageUp") expect(write).not.toHaveBeenCalled();
    else expect(write).toHaveBeenCalledExactlyOnceWith(metrics.height);
  });

  it.each([
    { key: "ArrowUp", isComposing: true }, { key: "ArrowUp", ctrlKey: true },
    { key: "ArrowUp", metaKey: true }, { key: "ArrowUp", altKey: true },
    { key: "ArrowUp", shiftKey: true }, { key: "a" },
  ])("leaves composition, shortcuts and selection keys alone (%j)", async (init) => {
    const { chat, write, finishHistory } = await restoringChat();
    keydown(chat, init);
    await finishHistory();
    expect(write).toHaveBeenCalledExactlyOnceWith(88);
  });

  it.each(["prevented", "input", "button", "shadow-input"])("leaves %s events alone", async (kind) => {
    const { chat, write, finishHistory } = await restoringChat();
    let target: HTMLElement = chat;
    if (kind === "shadow-input") {
      const host = document.createElement("div");
      chat.append(host);
      target = document.createElement("input");
      host.attachShadow({ mode: "open" }).append(target);
    } else if (kind !== "prevented") {
      target = document.createElement(kind);
      chat.append(target);
    }
    keydown(target, { key: "ArrowUp" }, kind === "prevented");
    await finishHistory();
    expect(write).toHaveBeenCalledExactlyOnceWith(88);
  });
});
