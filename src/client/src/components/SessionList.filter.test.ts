// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionInfo } from "../api";
import { SessionList } from "./SessionList";

afterEach(() => { document.body.replaceChildren(); localStorage.clear(); vi.restoreAllMocks(); });
const conversation = (id: string, name: string, extra: Partial<SessionInfo> = {}): SessionInfo => ({ id, name, cwd: "/work", path: `/sessions/${id}`, created: "2026-10-20T10:00:00Z", modified: "2026-10-20T11:00:00Z", messageCount: 1, persisted: true, firstMessage: "First message", ...extra });
function required<T>(value: T | null | undefined): T { if (value == null) throw new Error("Missing control"); return value; }
async function mount(sessions: SessionInfo[]) {
  const list = new SessionList(); list.sessions = sessions; list.workspaceLabel = "main";
  document.body.append(list); await list.updateComplete; return list;
}
async function filter(list: SessionList, value: string) {
  if (list.shadowRoot?.querySelector('input[type="search"]') == null) {
    required(list.shadowRoot?.querySelector<HTMLButtonElement>(".filter-toggle")).click(); await list.updateComplete;
  }
  const input = required(list.shadowRoot?.querySelector<HTMLInputElement>('input[type="search"]'));
  input.value = value; input.dispatchEvent(new Event("input", { bubbles: true })); await list.updateComplete; return input;
}
function button(list: SessionList, label: string) { return required([...list.shadowRoot?.querySelectorAll<HTMLButtonElement>("button") ?? []].find((item) => item.textContent.trim() === label)); }
function ids(list: SessionList) { return [...list.shadowRoot?.querySelectorAll<HTMLElement>("[data-session-id]") ?? []].map((row) => row.dataset["sessionId"]); }

describe("conversation-name filtering", () => {
  it("keeps only search and filters in the heading and opens selection from a collapsed list", async () => {
    vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => undefined);
    const selected = conversation("a", "Current conversation");
    const list = await mount([selected]);
    const search = vi.fn();
    const cleanup = vi.fn();
    list.collapsible = true;
    list.selected = selected;
    list.onSearchHistory = search;
    list.onCleanup = cleanup;
    list.onToggleCollapsed = () => { list.collapsed = !list.collapsed; };
    await list.updateComplete;
    expect(list.shadowRoot?.querySelectorAll("h2 .session-tools button")).toHaveLength(2);
    expect(list.shadowRoot?.querySelector("h2 .bulk-select-entry, h2 .cleanup-entry")).toBeNull();
    required(list.shadowRoot?.querySelector<HTMLButtonElement>("h2 .section-toggle")).click();
    await list.updateComplete;
    expect(list.shadowRoot?.querySelector(".list-body")).toBeNull();
    expect(list.shadowRoot?.querySelector(".section-selected")?.textContent).toBe("Current conversation");
    required(list.shadowRoot?.querySelector<HTMLButtonElement>(".session-search-entry")).click();
    expect(search).toHaveBeenCalledOnce();
    required(list.shadowRoot?.querySelector<HTMLButtonElement>(".filter-toggle")).click();
    await list.updateComplete;
    required(list.shadowRoot?.querySelector<HTMLButtonElement>(".session-filter-popover .bulk-select-entry")).click();
    await list.updateComplete;
    expect(list.collapsed).toBe(false);
    expect(list.shadowRoot?.querySelector(".bulk-row.selecting")).not.toBeNull();
    expect(list.shadowRoot?.querySelector(".session-filter-popover")).toBeNull();
    required(list.shadowRoot?.querySelector<HTMLButtonElement>(".filter-toggle")).click();
    await list.updateComplete;
    required(list.shadowRoot?.querySelector<HTMLButtonElement>(".cleanup-entry")).click();
    await list.updateComplete;
    expect(cleanup).toHaveBeenCalledOnce();
    expect(list.shadowRoot?.querySelector(".session-filter-popover")).toBeNull();
  });

  it("keeps the heading compact and applies status, activity, and sorting from the filter menu", async () => {
    const recent = new Date().toISOString();
    const list = await mount([conversation("z", "Zulu", { modified: recent }), conversation("a", "Alpha", { modified: recent }), conversation("old", "Old", { modified: new Date(Date.now() - 40 * 86400000).toISOString() })]);
    expect(list.shadowRoot?.querySelector('input[type="search"]')).toBeNull();
    required(list.shadowRoot?.querySelector<HTMLButtonElement>(".filter-toggle")).click(); await list.updateComplete;
    const change = async (index: number, value: string) => {
      const select = required(list.shadowRoot?.querySelectorAll<HTMLSelectElement>(".session-filter-popover select")[index]);
      select.value = value; select.dispatchEvent(new Event("change", { bubbles: true })); await list.updateComplete;
    };
    await change(1, "week"); expect(ids(list)).toEqual(["z", "a"]);
    await change(2, "name"); expect(ids(list)).toEqual(["a", "z"]);
    list.unreadSessionIds = new Set(["z"]); await change(0, "unread"); expect(ids(list)).toEqual(["z"]);
    list.unreadSessionIds = new Set(["a"]); await list.updateComplete; expect(ids(list)).toEqual(["a"]);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await list.updateComplete;
    expect(list.shadowRoot?.querySelector(".session-filter-popover")).toBeNull();
    expect(list.shadowRoot?.activeElement).toBe(list.shadowRoot?.querySelector(".filter-toggle"));
    expect(ids(list)).toEqual(["a"]);
  });

  it("filters immediately by title and first-message fallback, and opens the first match with Enter", async () => {
    const match = conversation("a", "Release planning");
    const list = await mount([match, conversation("b", "Other")]); const select = vi.fn(); list.onSelect = select;
    const input = await filter(list, "PLANNING"); expect(ids(list)).toEqual(["a"]);
    expect(list.shadowRoot?.querySelector(".filter-result-meta")?.textContent).toContain("main");
    expect(list.shadowRoot?.querySelector("time")?.getAttribute("datetime")).toBe(match.modified);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); expect(select).toHaveBeenCalledWith(match);
    await list.updateComplete;
    required(list.shadowRoot?.querySelector<HTMLButtonElement>(".filter-toggle")).click(); await list.updateComplete;
    button(list, "Reset filters").click(); await list.updateComplete;
    expect(ids(list)).toHaveLength(2); expect(required(list.shadowRoot?.querySelector<HTMLInputElement>('input[type="search"]')).value).toBe("");
    list.sessions = [conversation("fallback", "", { firstMessage: "Find this prompt" })]; await list.updateComplete;
    await filter(list, "this prompt"); expect(ids(list)).toEqual(["fallback"]);
  });

  it("includes archived matches without changing archive expansion after clearing", async () => {
    const list = await mount([conversation("active", "Other"), conversation("archived", "Old plan", { archived: true })]);
    expect(ids(list)).toEqual(["active"]);
    await filter(list, "Old"); expect(ids(list)).toEqual(["archived"]);
    await filter(list, ""); expect(ids(list)).toEqual(["active"]);
  });

  it("limits bulk actions to matches and clears selection when the filter changes", async () => {
    const list = await mount([conversation("a", "Match A"), conversation("b", "Match B"), conversation("hidden", "Unrelated")]);
    const archive = vi.fn(); list.onArchiveMany = archive;
    await filter(list, "Match"); required(list.shadowRoot?.querySelector<HTMLButtonElement>(".session-filter-popover .bulk-select-entry")).click(); await list.updateComplete;
    button(list, "Select all").click(); await list.updateComplete;
    button(list, "Archive").click(); expect(archive).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: "a" }), expect.objectContaining({ id: "b" })]));
    expect(archive.mock.calls[0]?.[0]).toHaveLength(2);
    await filter(list, "Unrelated"); expect(list.shadowRoot?.querySelector(".bulk-row.selecting")).toBeNull();
  });

  it("resets the filter when moving to another workspace and keeps message search separate", async () => {
    const list = await mount([conversation("a", "Alpha")]); const search = vi.fn(); list.onSearchHistory = search;
    await filter(list, "missing"); expect(ids(list)).toHaveLength(0);
    expect(list.shadowRoot?.textContent).toContain("No matching conversations"); required(list.shadowRoot?.querySelector<HTMLButtonElement>(".session-search-entry")).click(); expect(search).toHaveBeenCalledOnce();
    list.scopeKey = "other-workspace"; await list.updateComplete; expect(ids(list)).toEqual(["a"]);
  });
});
