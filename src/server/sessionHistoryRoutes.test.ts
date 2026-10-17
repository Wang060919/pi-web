import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { SessionHistoryService } from "./sessions/sessionHistoryService.js";
import type { SessionInfo } from "../shared/apiTypes.js";
import { registerSessionHistoryRoutes } from "./sessionHistoryRoutes.js";

const session: SessionInfo = { id: "one/a", cwd: "/repo/a &中", path: "/sessions/one.jsonl", created: "2026-10-17T01:00:00Z", modified: "2026-10-17T01:00:00Z", firstMessage: "fixture", messageCount: 1 };

function history() {
  return {
    search: vi.fn<SessionHistoryService["search"]>().mockResolvedValue({ results: [], truncated: false, scannedSessions: 2 }),
    exportHtml: vi.fn<SessionHistoryService["exportHtml"]>().mockResolvedValue({ html: "<!doctype html><p>exported</p>", filename: "中文 '()*.html" }),
    entry: vi.fn<SessionHistoryService["entry"]>().mockResolvedValue({ session, entryId: "entry/a", role: "assistant", text: "full original" }),
  };
}

describe("session history routes", () => {
  it("serves encoded search and off-branch reads through the specified route prefix", async () => {
    const app = Fastify();
    const service = history();
    registerSessionHistoryRoutes(app, service, "/api/machines/local");
    try {
      const search = await app.inject({ url: `/api/machines/local/sessions/search?${new URLSearchParams({ q: "[needle]*", cwd: session.cwd })}` });
      expect(search.statusCode).toBe(200);
      expect(search.headers["cache-control"]).toBe("no-store");
      expect(service.search.mock.calls[0]?.slice(0, 2)).toEqual(["[needle]*", session.cwd]);
      expect(service.search.mock.calls[0]?.[2]).toBeInstanceOf(AbortSignal);
      expect(service.search.mock.calls[0]?.[2]?.aborted).toBe(false);
      const entry = await app.inject({ url: `/api/machines/local/sessions/${encodeURIComponent(session.id)}/history-entry?${new URLSearchParams({ cwd: session.cwd, entryId: "entry/a" })}` });
      expect(entry.statusCode).toBe(200);
      expect(entry.headers["cache-control"]).toBe("no-store");
      expect(service.entry).toHaveBeenCalledExactlyOnceWith({ id: session.id, cwd: session.cwd }, "entry/a");
      expect(entry.json<unknown>()).toEqual({ session, entryId: "entry/a", role: "assistant", text: "full original" });
    } finally { await app.close(); }
  });

  it("rejects missing, duplicate and excessive parameters before reading any transcript", async () => {
    const app = Fastify();
    const service = history();
    registerSessionHistoryRoutes(app, service);
    try {
      for (const query of ["", "q=+", "q=one&q=two", `q=${"x".repeat(201)}`, "q=one&cwd=%2Fa&cwd=%2Fb"]) {
        expect((await app.inject({ url: `/sessions/search?${query}` })).statusCode).toBe(400);
      }
      expect((await app.inject({ url: "/sessions/one/history-entry?cwd=%2Frepo" })).statusCode).toBe(400);
      expect((await app.inject({ url: "/sessions/one/export" })).statusCode).toBe(400);
      expect(service.search).not.toHaveBeenCalled();
      expect(service.entry).not.toHaveBeenCalled();
      expect(service.exportHtml).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });

  it("downloads HTML as an uncached attachment with an encoded Unicode filename", async () => {
    const app = Fastify();
    const service = history();
    registerSessionHistoryRoutes(app, service);
    try {
      const response = await app.inject({ url: `/sessions/${encodeURIComponent(session.id)}/export?${new URLSearchParams({ cwd: session.cwd })}` });
      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toBe("text/html; charset=utf-8");
      expect(response.headers["content-disposition"]).toBe("attachment; filename=\"session.html\"; filename*=UTF-8''%E4%B8%AD%E6%96%87%20%27%28%29%2A.html");
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.body).toBe("<!doctype html><p>exported</p>");
      expect(service.exportHtml).toHaveBeenCalledExactlyOnceWith({ id: session.id, cwd: session.cwd });
    } finally { await app.close(); }
  });

  it("reports storage failures instead of returning an empty successful result", async () => {
    const app = Fastify();
    const service = history();
    service.search.mockRejectedValue(new Error("Search unavailable"));
    service.entry.mockRejectedValue(new Error("Message no longer exists"));
    service.exportHtml.mockRejectedValue(new Error("Corrupt transcript"));
    registerSessionHistoryRoutes(app, service);
    try {
      const search = await app.inject({ url: "/sessions/search?q=needle" });
      expect(search.statusCode).toBe(400);
      expect(search.json<unknown>()).toEqual({ error: "Search unavailable" });
      expect((await app.inject({ url: "/sessions/one/history-entry?cwd=%2Frepo&entryId=entry" })).statusCode).toBe(404);
      expect((await app.inject({ url: "/sessions/one/export?cwd=%2Frepo" })).statusCode).toBe(400);
    } finally { await app.close(); }
  });
});
