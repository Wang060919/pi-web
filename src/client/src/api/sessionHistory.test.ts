import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionInfo } from "../../../shared/apiTypes";
import { parseSessionHistoryEntry, parseSessionSearchResponse, sessionExportUrl, sessionHistoryApi, sessionHistoryEntryPath, sessionSearchPath } from "./sessionHistory";

const session: SessionInfo = { id: "session/a?中", cwd: "/work/a ?&中", path: "/sessions/one.jsonl", created: "2026-10-17T01:00:00Z", modified: "2026-10-17T02:00:00Z", messageCount: 2, firstMessage: "Hello" };
const response = { results: [{ session, entryId: "entry/a", before: "before ", match: "needle", after: " after" }], scannedSessions: 1, truncated: false };

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("session history API", () => {
  it("encodes search, machine and workspace through a nested deployment and forwards cancellation", async () => {
    const path = sessionSearchPath("a &中", "remote/a", session.cwd);
    expect(path).toBe("api/machines/remote%2Fa/sessions/search?q=a+%26%E4%B8%AD&cwd=%2Fwork%2Fa+%3F%26%E4%B8%AD");
    vi.stubGlobal("document", { baseURI: "https://example.test/nested/" });
    vi.stubEnv("BASE_URL", "/nested/");
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify(response)));
    vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();
    await expect(sessionHistoryApi.search("a &中", { machineId: "remote/a", cwd: session.cwd, signal: controller.signal })).resolves.toEqual(response);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(`https://example.test/nested/${path}`, expect.objectContaining({ signal: controller.signal, cache: "no-store" }));
    expect(sessionSearchPath("needle", "local")).toBe("api/machines/local/sessions/search?q=needle");
  });

  it("builds browser-ready exports and read-only history entry paths with encoded identities", async () => {
    vi.stubGlobal("document", { baseURI: "https://example.test/nested/" });
    vi.stubEnv("BASE_URL", "/nested/");
    expect(sessionExportUrl(session, "remote/a")).toBe("https://example.test/nested/api/machines/remote%2Fa/sessions/session%2Fa%3F%E4%B8%AD/export?cwd=%2Fwork%2Fa+%3F%26%E4%B8%AD");
    const path = sessionHistoryEntryPath(session, "entry/a ?", "remote/a");
    expect(path).toContain("session%2Fa%3F%E4%B8%AD/history-entry?cwd=");
    expect(path).toContain("&entryId=entry%2Fa+%3F");
    const entry = { session, entryId: "entry/a ?", role: "assistant", text: "original branch text" };
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify(entry)));
    vi.stubGlobal("fetch", fetch);
    await expect(sessionHistoryApi.entry(session, "entry/a ?", { machineId: "remote/a" })).resolves.toEqual(entry);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(`https://example.test/nested/${path}`, expect.objectContaining({ cache: "no-store" }));
  });

  it.each([
    { ...response, results: [null] },
    { ...response, results: [{ ...response.results[0], session: { id: "incomplete" } }] },
    { ...response, results: [{ ...response.results[0], entryId: "" }] },
    { ...response, results: [{ ...response.results[0], match: 7 }] },
    { ...response, truncated: "false" },
    { ...response, scannedSessions: -1 },
    { ...response, scannedSessions: 0.5 },
  ])("rejects malformed search responses", (value) => {
    expect(() => parseSessionSearchResponse(value)).toThrow();
  });

  it("rejects history entries without stable identities and message text", () => {
    expect(() => parseSessionHistoryEntry({ session, entryId: "a", role: "assistant", text: null })).toThrow();
    expect(() => parseSessionHistoryEntry({ session, entryId: "", role: "assistant", text: "hello" })).toThrow();
  });
});
