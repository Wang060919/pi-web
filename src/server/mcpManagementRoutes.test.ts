import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseMcpManagementSnapshot } from "../shared/mcpManagement.js";
import { registerMcpManagementRoutes } from "./mcpManagementRoutes.js";
import { loadManagedMcpSdk, type ManagedMcpSdk } from "./mcp/sdkAdapter.js";

let directory: string;
let app: FastifyInstance;
let trusted = false;
let sdk: ManagedMcpSdk;
const close = vi.fn(() => Promise.resolve());
const connect = vi.fn(() => Promise.resolve({}));
const load = vi.fn(() => Promise.resolve(sdk));
const query = "?projectId=p1&workspaceId=w1";
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "pi-web-mcp-routes-"));
  const agent = join(directory, "agent");
  const project = join(directory, "project");
  await Promise.all([mkdir(agent), mkdir(join(project, ".pi"), { recursive: true })]);
  await writeFile(join(agent, "mcp.json"), JSON.stringify({ mcpServers: { docs: { url: "https://example.com/mcp", headers: { Authorization: "Bearer secret" } } } }));
  await writeFile(join(project, ".pi", "mcp.json"), JSON.stringify({ mcpServers: { local: { command: "never-execute-this-project-command" } } }));
  const actual = await loadManagedMcpSdk();
  sdk = { ...actual, connection: () => ({ state: "connected", tools: [{ name: "read" }], oauthUrl: undefined, challenge: undefined, getClient: connect, close, oauthSettings: () => ({}) }) };
  trusted = false;
  connect.mockClear(); close.mockClear(); load.mockClear();
  app = Fastify({ logger: false });
  registerMcpManagementRoutes(app, {
    agentDir: () => Promise.resolve(agent),
    projects: { requireProject: () => Promise.resolve({ id: "p1", name: "project", path: project, createdAt: "2026-01-01T00:00:00Z" }) },
    workspaces: { resolve: () => Promise.resolve({ id: "w1", projectId: "p1", path: project, label: "main", isMain: true }) },
    isTrusted: () => trusted, loadSdk: load,
  });
  await app.ready();
});
afterEach(async () => { await app.close(); await rm(directory, { recursive: true, force: true }); });

describe("MCP management HTTP boundary", () => {
  it("lists global config without loading the MCP runtime or running untrusted commands", async () => {
    const response = await app.inject({ method: "GET", url: `/api/mcp${query}` });
    expect(response.statusCode).toBe(200);
    const body = parseMcpManagementSnapshot(response.json<unknown>());
    expect(body.servers.map((server) => server.name)).toEqual(["docs"]);
    expect(response.body).not.toContain("Bearer secret");
    expect(load).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("blocks probes and project writes while the project is untrusted", async () => {
    const test = await app.inject({ method: "POST", url: `/api/mcp/docs/test${query}`, payload: { scope: "global" } });
    expect(test.statusCode).toBe(403);
    const write = await app.inject({ method: "PUT", url: `/api/mcp/unsafe${query}`, payload: { scope: "project", revision: "", config: { command: "node" } } });
    expect(write.statusCode).toBe(403);
    expect(connect).not.toHaveBeenCalled();
  });

  it("reports an isolated trusted probe result and closes its transport", async () => {
    trusted = true;
    const response = await app.inject({ method: "POST", url: `/api/mcp/local/test${query}`, payload: { scope: "project" } });
    expect(response.statusCode).toBe(200);
    expect(response.json<unknown>()).toMatchObject({ state: "connected", tools: [{ name: "read" }] });
    expect(connect).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it("rejects malformed scope and requires project/workspace identifiers together", async () => {
    expect((await app.inject({ method: "POST", url: "/api/mcp/docs/test", payload: { scope: "other" } })).statusCode).toBe(400);
    expect((await app.inject({ method: "GET", url: "/api/mcp?projectId=p1" })).statusCode).toBe(400);
  });
});
