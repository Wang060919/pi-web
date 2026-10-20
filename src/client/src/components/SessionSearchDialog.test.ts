// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { setLocalePreference, t } from "../../../shared/i18n";
import { sessionHistoryApi, type SessionHistoryEntry, type SessionSearchHit, type SessionSearchResponse } from "../api/sessionHistory";
import { SessionSearchDialog } from "./SessionSearchDialog";
import { dialogSurface, pressKey, requiredElement, settleRenderedDialog } from "./modalSurfaceTestSupport";

const hit: SessionSearchHit = {
  session: { id: "one", cwd: "/repo/current", path: "/sessions/one.jsonl", name: "Fix editor", firstMessage: "hello", created: "2026-10-17T01:00:00Z", modified: "2026-10-17T02:00:00Z", messageCount: 3, archived: true },
  entryId: "entry-one", before: "Look for ", match: "needle", after: " here",
};
const response: SessionSearchResponse = { results: [hit, { ...hit, entryId: "entry-two", match: "Needle" }], truncated: true, scannedSessions: 12 };
const entry: SessionHistoryEntry = { session: hit.session, entryId: hit.entryId, role: "assistant", text: "Complete original needle message\nfrom another branch." };

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
});

async function mount(): Promise<SessionSearchDialog> {
  const dialog = new SessionSearchDialog();
  dialog.machineId = "remote";
  dialog.cwd = "/repo/current";
  document.body.append(dialog);
  await settleRenderedDialog(dialog);
  return dialog;
}

function queryInput(dialog: SessionSearchDialog): HTMLInputElement {
  return requiredElement(dialog.renderRoot.querySelector<HTMLInputElement>(".search-input"), "search input");
}

function setQuery(dialog: SessionSearchDialog, text: string): void {
  const input = queryInput(dialog);
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function search(dialog: SessionSearchDialog): Promise<void> {
  setQuery(dialog, "needle");
  pressKey(dialogSurface(dialog), "Enter");
  await settleRenderedDialog(dialog);
}

function deferred<T>() {
  let resolve: ((value: T) => void) | undefined;
  const promise = new Promise<T>((finish) => { resolve = finish; });
  return { promise, finish: (value: T) => { if (resolve === undefined) throw new Error("Missing deferred resolver"); resolve(value); } };
}

describe("quick conversation search", () => {
  it("filters recent names without a server search and opens the keyboard-selected conversation", async () => {
    const load = vi.spyOn(sessionHistoryApi, "search");
    const dialog = await mount();
    const open = vi.fn().mockResolvedValue(true); const close = vi.fn();
    dialog.onOpenSession = open; dialog.onClose = close;
    dialog.recentSessions = [hit.session, { ...hit.session, id: "two", name: "Another editor", modified: "2026-10-18T01:00:00Z" }, { ...hit.session, id: "elsewhere", cwd: "/other" }];
    await settleRenderedDialog(dialog);
    expect(dialog.renderRoot.querySelectorAll(".quick-result")).toHaveLength(2);
    setQuery(dialog, "EDITOR"); await settleRenderedDialog(dialog);
    pressKey(dialogSurface(dialog), "ArrowDown"); await settleRenderedDialog(dialog);
    pressKey(dialogSurface(dialog), "Enter"); await settleRenderedDialog(dialog);
    expect(open).toHaveBeenCalledExactlyOnceWith(hit.session);
    expect(load).not.toHaveBeenCalled(); expect(close).toHaveBeenCalledOnce();
  });

  it("keeps the picker open when navigation is cancelled and reports navigation errors", async () => {
    const dialog = await mount(); const close = vi.fn();
    dialog.onClose = close; dialog.recentSessions = [hit.session];
    const open = vi.fn().mockResolvedValueOnce(false).mockRejectedValueOnce(new Error("Workspace removed")); dialog.onOpenSession = open;
    await settleRenderedDialog(dialog);
    requiredElement(dialog.renderRoot.querySelector<HTMLButtonElement>(".quick-result"), "recent conversation").click(); await settleRenderedDialog(dialog);
    expect(close).not.toHaveBeenCalled();
    requiredElement(dialog.renderRoot.querySelector<HTMLButtonElement>(".quick-result"), "recent conversation").click(); await settleRenderedDialog(dialog);
    expect(dialog.renderRoot.querySelector('[role="alert"]')?.textContent).toContain("Workspace removed");
    expect(close).not.toHaveBeenCalled();
  });

  it("retains full message search and does not reset its mode when callbacks refresh", async () => {
    const load = vi.spyOn(sessionHistoryApi, "search").mockResolvedValue(response);
    const dialog = await mount(); dialog.onOpenSession = vi.fn().mockResolvedValue(true);
    await settleRenderedDialog(dialog);
    const messages = [...dialog.renderRoot.querySelectorAll<HTMLButtonElement>(".search-modes button")].find((button) => button.textContent === t("ui.sessionSearch.messages"));
    requiredElement(messages, "message search mode").click(); await settleRenderedDialog(dialog);
    dialog.onOpenSession = vi.fn().mockResolvedValue(true); await settleRenderedDialog(dialog);
    await search(dialog);
    expect(load).toHaveBeenCalledOnce(); expect(dialog.renderRoot.querySelectorAll(".search-result")).toHaveLength(2);
  });
});

describe("session history search dialog", () => {
  it.each([
    ["assistant", "Pi"],
    ["user", "你"],
    ["tool", "工具"],
    ["custom-role", "custom-role"],
  ])("uses the shared display label for a %s preview", async (role, label) => {
    setLocalePreference("zh-CN");
    vi.spyOn(sessionHistoryApi, "search").mockResolvedValue(response);
    vi.spyOn(sessionHistoryApi, "entry").mockResolvedValue({ ...entry, role });
    const dialog = await mount();
    await search(dialog);
    dialog.renderRoot.querySelector<HTMLButtonElement>(".search-result")?.click();
    await settleRenderedDialog(dialog);
    expect(dialog.renderRoot.querySelector(".preview-role")?.textContent).toBe(`${t("ui.sessionSearch.sourceRole")}: ${label}`);
  });

  it("searches the selected workspace and renders highlighted archived results with scan limits", async () => {
    const load = vi.spyOn(sessionHistoryApi, "search").mockResolvedValue(response);
    const dialog = await mount();
    await search(dialog);
    expect(load).toHaveBeenCalledWith("needle", expect.objectContaining({ machineId: "remote", cwd: "/repo/current" }));
    expect(load.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(dialog.renderRoot.querySelectorAll(".search-result")).toHaveLength(2);
    expect(dialog.renderRoot.querySelector("mark")?.textContent).toBe("needle");
    expect(dialog.renderRoot.querySelector(".archived")).not.toBeNull();
    expect(dialog.renderRoot.querySelector(".search-truncated")).not.toBeNull();
    expect(dialog.renderRoot.querySelector(".search-state")?.textContent).toContain("12");
  });

  it("aborts and ignores stale workspace results after switching to all projects", async () => {
    const old = deferred<SessionSearchResponse>();
    const load = vi.spyOn(sessionHistoryApi, "search").mockReturnValueOnce(old.promise).mockResolvedValueOnce({ ...response, results: [{ ...hit, before: "machine-wide " }] });
    const dialog = await mount();
    setQuery(dialog, "needle");
    pressKey(dialogSurface(dialog), "Enter");
    const firstSignal = load.mock.calls[0]?.[1]?.signal;
    await settleRenderedDialog(dialog);
    const scope = requiredElement(dialog.renderRoot.querySelector<HTMLSelectElement>("select"), "scope selector");
    scope.value = "machine";
    scope.dispatchEvent(new Event("change", { bubbles: true }));
    await settleRenderedDialog(dialog);
    expect(firstSignal?.aborted).toBe(true);
    expect(load.mock.calls[1]?.[1]?.cwd).toBeUndefined();
    old.finish(response);
    await settleRenderedDialog(dialog);
    expect(dialog.renderRoot.querySelector(".result-summary")?.textContent).toBe("machine-wide needle here");
  });

  it("uses arrows and Enter to read the original message without navigating or changing its branch", async () => {
    vi.spyOn(sessionHistoryApi, "search").mockResolvedValue(response);
    const loadEntry = vi.spyOn(sessionHistoryApi, "entry").mockResolvedValue({ ...entry, entryId: "entry-two" });
    const dialog = await mount();
    const onSelect = vi.fn<(result: SessionSearchHit) => Promise<void>>().mockResolvedValue(undefined);
    const onClose = vi.fn();
    dialog.onSelect = onSelect;
    dialog.onClose = onClose;
    await search(dialog);
    pressKey(dialogSurface(dialog), "ArrowDown");
    await settleRenderedDialog(dialog);
    expect(dialog.renderRoot.querySelector(".selected")?.id).toBe("session-search-result-1");
    pressKey(dialogSurface(dialog), "Enter");
    await settleRenderedDialog(dialog);
    expect(loadEntry).toHaveBeenCalledWith(hit.session, "entry-two", expect.objectContaining({ machineId: "remote" }));
    expect(dialog.renderRoot.querySelector(".message-preview pre")?.textContent).toBe(entry.text);
    expect(dialog.renderRoot.querySelector(".message-preview mark")?.textContent).toBe("needle");
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    dialog.renderRoot.querySelector<HTMLButtonElement>(".preview-locate")?.click();
    await settleRenderedDialog(dialog);
    expect(onSelect).toHaveBeenCalledWith(response.results[1]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps the complete original visible when locating another branch fails", async () => {
    vi.spyOn(sessionHistoryApi, "search").mockResolvedValue(response);
    vi.spyOn(sessionHistoryApi, "entry").mockResolvedValue(entry);
    const dialog = await mount();
    dialog.onSelect = vi.fn<(result: SessionSearchHit) => Promise<void>>().mockRejectedValue(new Error("Not on current branch"));
    dialog.onClose = vi.fn();
    await search(dialog);
    dialog.renderRoot.querySelector<HTMLButtonElement>(".search-result")?.click();
    await settleRenderedDialog(dialog);
    dialog.renderRoot.querySelector<HTMLButtonElement>(".preview-locate")?.click();
    await settleRenderedDialog(dialog);
    expect(dialog.renderRoot.querySelector(".message-preview pre")?.textContent).toBe(entry.text);
    expect(dialog.renderRoot.querySelector('[role="alert"]')?.textContent).toContain("Not on current branch");
    expect(dialog.onClose).not.toHaveBeenCalled();
    dialog.renderRoot.querySelector<HTMLButtonElement>(".preview-back")?.click();
    await settleRenderedDialog(dialog);
    expect(dialog.renderRoot.querySelectorAll(".search-result")).toHaveLength(2);
  });

  it("cancels preview loading when returning to results and ignores its late response", async () => {
    vi.spyOn(sessionHistoryApi, "search").mockResolvedValue(response);
    const pending = deferred<SessionHistoryEntry>();
    const loadEntry = vi.spyOn(sessionHistoryApi, "entry").mockReturnValue(pending.promise);
    const dialog = await mount();
    await search(dialog);
    dialog.renderRoot.querySelector<HTMLButtonElement>(".search-result")?.click();
    await settleRenderedDialog(dialog);
    dialog.renderRoot.querySelector<HTMLButtonElement>(".preview-back")?.click();
    await settleRenderedDialog(dialog);
    expect(loadEntry.mock.calls[0]?.[2]?.signal?.aborted).toBe(true);
    pending.finish(entry);
    await settleRenderedDialog(dialog);
    expect(dialog.renderRoot.querySelector(".message-preview")).toBeNull();
    expect(dialog.renderRoot.querySelectorAll(".search-result")).toHaveLength(2);
  });

  it("shows search errors and preserves IME Enter without submitting", async () => {
    const load = vi.spyOn(sessionHistoryApi, "search").mockRejectedValue(new Error("Machine offline"));
    const dialog = await mount();
    setQuery(dialog, "needle");
    dialogSurface(dialog).dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", isComposing: true, cancelable: true }));
    expect(load).not.toHaveBeenCalled();
    pressKey(dialogSurface(dialog), "Enter");
    await settleRenderedDialog(dialog);
    expect(dialog.renderRoot.querySelector('[role="alert"]')?.textContent).toContain("Machine offline");
  });

  it("clears old results and cancels requests when the selected machine changes", async () => {
    const pending = deferred<SessionSearchResponse>();
    const load = vi.spyOn(sessionHistoryApi, "search").mockReturnValue(pending.promise);
    const dialog = await mount();
    setQuery(dialog, "needle");
    pressKey(dialogSurface(dialog), "Enter");
    await settleRenderedDialog(dialog);
    dialog.machineId = "another";
    await settleRenderedDialog(dialog);
    expect(load.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    pending.finish(response);
    await settleRenderedDialog(dialog);
    expect(dialog.renderRoot.querySelectorAll(".search-result")).toHaveLength(0);
  });
});
