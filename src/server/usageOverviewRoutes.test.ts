import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type { UsageOverviewResponse } from "../shared/usageOverview.js";
import { ActiveAgentProfileAccessError } from "./activeAgentProfileProvider.js";
import { buildApp } from "./app.js";
import type { SessionProxyDaemon } from "./sessiond/sessionProxyRoutes.js";
import { UsageOverviewService } from "./sessions/usageOverviewService.js";
import { registerUsageOverviewRoutes } from "./usageOverviewRoutes.js";

const overview: UsageOverviewResponse = { records: [], today: "2026-10-17", timeZone: "Asia/Shanghai", scope: "workspace", warnings: [] };

describe("usage overview routes", () => {
  it("requires explicit machine scope for a request without cwd", async () => {
    const read = vi.fn((): Promise<UsageOverviewResponse> => Promise.resolve({ ...overview, scope: "machine" }));
    const app = Fastify(); registerUsageOverviewRoutes(app, { read });
    try {
      for (const query of ["scope=unknown", "scope=machine&cwd=%2Ftmp", "scope=machine&timeZone=invalid"]) {
        expect((await app.inject({ url: `/api/usage-overview?${query}` })).statusCode).toBe(400);
      }
      expect(read).not.toHaveBeenCalled();
      const response = await app.inject({ url: "/api/usage-overview?scope=machine&timeZone=UTC" });
      expect(response.statusCode).toBe(200);
      expect(response.json<UsageOverviewResponse>().scope).toBe("machine");
      expect(read).toHaveBeenCalledExactlyOnceWith(undefined, "UTC");
    } finally { await app.close(); }
  });

  it("serves both local API paths with an absolute cwd and reporting time zone", async () => {
    const read = vi.fn(() => Promise.resolve(overview));
    const app = Fastify();
    registerUsageOverviewRoutes(app, { read });
    registerUsageOverviewRoutes(app, { read }, "/api/machines/local");
    try {
      for (const prefix of ["/api", "/api/machines/local"]) {
        const query = new URLSearchParams({ cwd: "/tmp/project space/", timeZone: "Asia/Shanghai" });
        const response = await app.inject({ url: `${prefix}/usage-overview?${query}` });
        expect(response.statusCode).toBe(200);
        expect(response.json<UsageOverviewResponse>()).toEqual(overview);
        expect(response.headers["cache-control"]).toBe("no-store");
      }
      expect(read).toHaveBeenCalledWith(resolve("/tmp/project space"), "Asia/Shanghai");
    } finally { await app.close(); }
  });

  it("rejects invalid paths and time zones before touching history", async () => {
    const read = vi.fn(() => Promise.resolve(overview));
    const app = Fastify();
    registerUsageOverviewRoutes(app, { read });
    try {
      for (const query of ["", "cwd=relative", "cwd=%2Ftmp&timeZone=not-a-time-zone", "cwd=%2Ftmp&timeZone=UTC&timeZone=Asia%2FShanghai"]) {
        expect((await app.inject({ url: `/api/usage-overview?${query}` })).statusCode).toBe(400);
      }
      expect(read).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });

  it("reports unavailable history without falling back to a different profile or leaking server errors", async () => {
    const read = vi.fn(() => Promise.reject(new ActiveAgentProfileAccessError({ status: "unavailable", error: "private-profile-details" })));
    const app = Fastify();
    registerUsageOverviewRoutes(app, { read });
    try {
      const response = await app.inject({ url: "/api/usage-overview?cwd=%2Ftmp" });
      expect(response.statusCode).toBe(503);
      expect(response.json<unknown>()).toEqual({ error: "Usage history is unavailable" });
      expect(read).toHaveBeenCalledOnce();
    } finally { await app.close(); }
  });

  it("uses the daemon's session and archive stores despite different web process overrides", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-web-usage-proxy-"));
    const daemonSessions = join(root, "daemon-sessions");
    const webSessions = join(root, "web-sessions");
    const agentDir = join(root, "agent");
    const cwd = join(root, "workspace");
    const daemon = Fastify({ logger: false });
    let app: Awaited<ReturnType<typeof buildApp>> | undefined;
    const transcript = (id: string, input: number) => [
      { type: "session", id, timestamp: "2026-10-16T00:00:00Z", cwd },
      { type: "message", id: `${id}-reply`, timestamp: "2026-10-16T01:00:00Z", message: { role: "assistant", provider: "test", model: "model", content: "fixture", usage: { input, output: 0, cacheRead: 0, cacheWrite: 0 } } },
    ].map((entry) => JSON.stringify(entry)).join("\n");
    try {
      await Promise.all([mkdir(daemonSessions), mkdir(webSessions)]);
      const archivePath = join(root, "archived.jsonl");
      await Promise.all([
        writeFile(join(daemonSessions, "active.jsonl"), transcript("active", 111)),
        writeFile(archivePath, transcript("archived", 222)),
        writeFile(join(webSessions, "decoy.jsonl"), transcript("decoy", 999)),
      ]);
      registerUsageOverviewRoutes(daemon, new UsageOverviewService({
        agentDir: () => Promise.resolve(agentDir),
        env: { PI_CODING_AGENT_SESSION_DIR: daemonSessions },
        archiveStore: { list: () => Promise.resolve([{ sessionId: "archived", cwd, archivedAt: "2026-10-16T02:00:00Z", originalPath: join(daemonSessions, "archived.jsonl"), archivePath }]) },
        now: () => new Date("2026-10-17T00:00:00Z"),
      }), "");
      vi.stubEnv("PI_CODING_AGENT_SESSION_DIR", webSessions);
      vi.stubEnv("PI_WEB_AGENT_SESSION_DIR", webSessions);
      vi.stubEnv("PI_WEB_DATA_DIR", join(root, "web-data"));
      const request = vi.fn<SessionProxyDaemon["request"]>(async (method, path) => {
        if (method !== "GET") throw new Error("Unexpected daemon mutation");
        const response = await daemon.inject({ method, url: path });
        return { statusCode: response.statusCode, headers: { "content-type": "application/json" }, body: response.body };
      });
      app = await buildApp({
        sessionDaemon: { request, requestStream: () => { throw new Error("Unexpected stream"); }, connectWebSocket: () => { throw new Error("Unexpected socket"); } },
        agentProfileProvider: { getActiveAgentProfile: () => Promise.resolve({ status: "available", profile: { schemaVersion: 2, dir: agentDir } }) },
        clientDist: false, logger: false,
      });
      const response = await app.inject({ url: `/api/machines/local/usage-overview?${new URLSearchParams({ cwd, timeZone: "UTC" })}` });
      expect(response.statusCode).toBe(200);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.json<UsageOverviewResponse>().records.reduce((sum, record) => sum + record.tokens.input, 0)).toBe(333);
      expect(request).toHaveBeenCalledExactlyOnceWith("GET", `/usage-overview?${new URLSearchParams({ cwd, timeZone: "UTC" })}`);
      request.mockClear();
      const global = await app.inject({ url: "/api/machines/local/usage-overview?scope=machine&timeZone=UTC" });
      expect(global.statusCode).toBe(200);
      expect(global.json<UsageOverviewResponse>().scope).toBe("machine");
      expect(global.json<UsageOverviewResponse>().records.reduce((sum, record) => sum + record.tokens.input, 0)).toBe(333);
      expect(request).toHaveBeenCalledExactlyOnceWith("GET", "/usage-overview?scope=machine&timeZone=UTC");
    } finally {
      vi.unstubAllEnvs();
      await app?.close();
      await daemon.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports an older daemon's missing usage route as unavailable and rejects invalid public queries before proxying", async () => {
    const request = vi.fn<SessionProxyDaemon["request"]>(() => Promise.resolve({ statusCode: 404, headers: {}, body: JSON.stringify({ error: "Route not found" }) }));
    const app = await buildApp({
      sessionDaemon: { request, requestStream: () => { throw new Error("Unexpected stream"); }, connectWebSocket: () => { throw new Error("Unexpected socket"); } },
      agentProfileProvider: { getActiveAgentProfile: () => Promise.resolve({ status: "available", profile: { schemaVersion: 2, dir: "/missing-usage-profile" } }) },
      clientDist: false, logger: false,
    });
    try {
      expect((await app.inject({ url: "/api/usage-overview?cwd=relative" })).statusCode).toBe(400);
      expect((await app.inject({ url: "/api/usage-overview?cwd=%2Fworkspace&timeZone=invalid" })).statusCode).toBe(400);
      expect(request).not.toHaveBeenCalled();
      const response = await app.inject({ url: "/api/usage-overview?cwd=%2Fworkspace&timeZone=UTC" });
      expect(response.statusCode).toBe(503);
      expect(response.json<unknown>()).toEqual({ error: "Usage history is unavailable" });
      expect(request).toHaveBeenCalledExactlyOnceWith("GET", `/usage-overview?${new URLSearchParams({ cwd: resolve("/workspace"), timeZone: "UTC" })}`);
    } finally { await app.close(); }
  });
});
