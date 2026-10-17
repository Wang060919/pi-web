// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MANUAL_CHAT_BEHAVIORS } from "../chatBehaviors.testSupport";
import type { QuotedChatSelection } from "../quotedSelection";
import { ChatView } from "./ChatView";
import { FormattedText } from "./FormattedText";

beforeEach(() => {
  // happy-dom has no text layout; provide only the browser geometry boundary.
  const rect = new DOMRect(120, 180, 160, 20);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 600));
  vi.spyOn(Range.prototype, "getBoundingClientRect").mockReturnValue(rect);
  vi.spyOn(Range.prototype, "getClientRects").mockReturnValue(Object.assign([rect], {
    item: (index: number) => index === 0 ? rect : null,
  }));
});

afterEach(() => {
  document.getSelection()?.removeAllRanges();
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
});

async function mount() {
  const view = new ChatView();
  view.behaviors = MANUAL_CHAT_BEHAVIORS;
  view.machineId = "remote";
  view.sessionId = "conversation";
  view.messageStart = 40;
  view.workspaceContext = { machineId: "remote", projectId: "project", workspaceId: "workspace", root: "/repo" };
  document.body.append(view);
  await view.updateComplete;
  return view;
}

async function selectAssistantText(view: ChatView): Promise<void> {
  const formatted = view.renderRoot.querySelector('[data-index="41"] formatted-text');
  if (!(formatted instanceof FormattedText)) throw new Error("Paginated assistant text missing");
  await formatted.updateComplete;
  const content = formatted.renderRoot.querySelector(".formatted");
  if (content === null) throw new Error("Formatted source missing");
  const selection = document.getSelection();
  if (selection === null) throw new Error("DOM selection missing");
  const range = document.createRange();
  range.selectNodeContents(content);
  selection.removeAllRanges();
  selection.addRange(range);
  formatted.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, composed: true }));
  await view.updateComplete;
}

async function showQuoteActions(view: ChatView, text = "Selected original answer"): Promise<void> {
  view.messages = [{ role: "user", entryId: "user-40", parts: [{ type: "text", text: "Question" }] }, { role: "assistant", entryId: "assistant-41", parts: [{ type: "text", text }] }];
  await view.updateComplete;
  await selectAssistantText(view);
}

function quoteButtons(view: ChatView): HTMLButtonElement[] {
  return [...view.renderRoot.querySelectorAll<HTMLButtonElement>(".selection-quote-bar button")];
}

function pendingQuote() {
  let resolve: (() => void) | undefined;
  let reject: ((error: Error) => void) | undefined;
  const promise = new Promise<void>((finish, fail) => { resolve = finish; reject = fail; });
  return {
    promise,
    resolve: () => { if (resolve === undefined) throw new Error("Missing quote resolver"); resolve(); },
    reject: (error: Error) => { if (reject === undefined) throw new Error("Missing quote rejection"); reject(error); },
  };
}

describe("chat transcript selection and written files", () => {
  it.each([false, true])("quotes the selected assistant with its original entry at nonzero messageStart (newSession=%s)", async (newSession) => {
    const view = await mount();
    const quote = vi.fn<(selection: QuotedChatSelection, newSession: boolean) => Promise<void>>().mockResolvedValue(undefined);
    view.onQuoteSelection = quote;
    await showQuoteActions(view);
    const actions = quoteButtons(view);
    expect(actions).toHaveLength(2);
    actions[newSession ? 1 : 0]?.click();
    await view.updateComplete;
    expect(quote).toHaveBeenCalledExactlyOnceWith({ machineId: "remote", sessionId: "conversation", entryId: "assistant-41", text: "Selected original answer" }, newSession);
  });

  it.each(["outside pointerdown", "Escape", "transcript scroll"])("closes selected-text actions on %s even when automatic chat behaviors are disabled", async (cause) => {
    const view = await mount();
    view.onQuoteSelection = vi.fn<(selection: QuotedChatSelection, newSession: boolean) => Promise<void>>().mockResolvedValue(undefined);
    await showQuoteActions(view);
    expect(quoteButtons(view)).toHaveLength(2);

    if (cause === "outside pointerdown") {
      const outside = document.createElement("button");
      document.body.append(outside);
      outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
    } else if (cause === "Escape") {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    } else {
      const transcript = view.renderRoot.querySelector(".chat");
      if (transcript === null) throw new Error("Transcript missing");
      transcript.dispatchEvent(new Event("scroll"));
    }
    await view.updateComplete;
    expect(view.renderRoot.querySelector(".selection-quote-bar")).toBeNull();
    expect(view.onQuoteSelection).not.toHaveBeenCalled();
  });

  it("preserves the selected text when pressing an action inside the floating toolbar", async () => {
    const view = await mount();
    view.onQuoteSelection = vi.fn<(selection: QuotedChatSelection, newSession: boolean) => Promise<void>>().mockResolvedValue(undefined);
    await showQuoteActions(view);
    const action = quoteButtons(view)[0];
    if (action === undefined) throw new Error("Quote action missing");
    const selectedText = document.getSelection()?.toString();
    expect(selectedText?.trim()).toBe("Selected original answer");
    const down = new PointerEvent("pointerdown", { bubbles: true, composed: true, cancelable: true });
    action.dispatchEvent(down);
    await view.updateComplete;
    expect(down.defaultPrevented).toBe(true);
    expect(document.getSelection()?.toString()).toBe(selectedText);
    expect(quoteButtons(view)).toHaveLength(2);
  });

  it.each(["resolve", "reject"] as const)("ignores a previous session's pending quote %s after selecting text in a different session", async (outcome) => {
    const view = await mount();
    const pending = pendingQuote();
    const quote = vi.fn<(selection: QuotedChatSelection, newSession: boolean) => Promise<void>>()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(undefined);
    view.onQuoteSelection = quote;
    await showQuoteActions(view);
    quoteButtons(view)[0]?.click();
    await view.updateComplete;
    expect(quote).toHaveBeenCalledOnce();

    view.sessionId = "replacement-session";
    await showQuoteActions(view, "New session selection");
    expect(quoteButtons(view)).toHaveLength(2);
    expect(quoteButtons(view).every((button) => !button.disabled)).toBe(true);

    if (outcome === "resolve") pending.resolve();
    else pending.reject(new Error("Old session quote failed"));
    await pending.promise.catch(() => undefined);
    await view.updateComplete;
    expect(view.renderRoot.querySelector('[role="alert"]')).toBeNull();
    expect(quoteButtons(view)).toHaveLength(2);
    quoteButtons(view)[0]?.click();
    await view.updateComplete;
    expect(quote).toHaveBeenLastCalledWith({ machineId: "remote", sessionId: "replacement-session", entryId: "assistant-41", text: "New session selection" }, false);
  });

  it("shows successful written files once at the turn's final reply and opens them in the source workspace", async () => {
    const view = await mount();
    view.messages = [
      { role: "user", entryId: "request", parts: [{ type: "text", text: "write files" }] },
      { role: "assistant", entryId: "working", parts: [{ type: "text", text: "Working" }] },
      { role: "tool", parts: [
        { type: "toolExecution", toolName: "write", summary: "write", status: "success", args: { path: "/repo/src/a #?.ts" } },
        { type: "toolExecution", toolName: "edit", summary: "edit", status: "success", args: { path: "src/a #?.ts" } },
        { type: "toolExecution", toolName: "write", summary: "failed", status: "error", args: { path: "failed.ts" } },
      ] },
      { role: "assistant", entryId: "done", parts: [{ type: "text", text: "Finished. I also mentioned not-written.ts" }] },
    ];
    await view.updateComplete;
    const lists = view.renderRoot.querySelectorAll(".turn-written-files");
    const buttons = view.renderRoot.querySelectorAll<HTMLButtonElement>(".turn-written-files button");
    expect(lists).toHaveLength(1);
    expect(lists[0]?.closest("[data-index]")?.getAttribute("data-index")).toBe("43");
    expect([...buttons].map((button) => button.textContent)).toEqual(["src/a #?.ts"]);
    const opened = vi.fn<(event: Event) => void>();
    view.addEventListener("workspace-file-open", opened);
    buttons[0]?.click();
    expect(opened).toHaveBeenCalledOnce();
    const event = opened.mock.calls[0]?.[0];
    if (!(event instanceof CustomEvent)) throw new Error("Expected workspace file event");
    const detail: unknown = event.detail;
    expect(detail).toEqual({ machineId: "remote", projectId: "project", workspaceId: "workspace", root: "/repo", path: "src/a #?.ts" });
  });
});
