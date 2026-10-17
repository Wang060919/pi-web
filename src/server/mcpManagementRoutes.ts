import type { FastifyInstance, FastifyReply } from "fastify";
import { ProjectTrustStore, SettingsManager } from "@earendil-works/pi-coding-agent";
import { isMcpRecord, isMcpScope, type McpConfigScope, type McpManagementTarget } from "../shared/mcpManagement.js";
import type { ProjectService } from "./projects/projectService.js";
import type { WorkspaceCatalog } from "./workspaces/workspaceCatalog.js";
import { McpConfigStore, McpManagementError, type McpConfigContext } from "./mcp/configStore.js";
import { McpRuntimeService } from "./mcp/runtimeService.js";
import { loadManagedMcpSdk, type ManagedMcpSdk } from "./mcp/sdkAdapter.js";

export interface McpManagementRouteDeps {
  agentDir: () => Promise<string>;
  projects: Pick<ProjectService, "requireProject">;
  workspaces: Pick<WorkspaceCatalog, "resolve">;
  store?: McpConfigStore;
  runtime?: McpRuntimeService;
  loadSdk?: () => Promise<ManagedMcpSdk>;
  /** Trust is injected only by tests; production uses the same store as trust routes. */
  isTrusted?: (cwd: string, agentDir: string) => boolean;
}

interface McpQuery extends McpManagementTarget { scope?: unknown; revision?: unknown }

export function registerMcpManagementRoutes(app: FastifyInstance, deps: McpManagementRouteDeps, prefix = "/api"): void {
  const store = deps.store ?? new McpConfigStore();
  const runtime = deps.runtime ?? new McpRuntimeService();
  const loadSdk = deps.loadSdk ?? loadManagedMcpSdk;
  app.addHook("onClose", async () => { await runtime.close(); });

  async function context(query: McpQuery, execution = false): Promise<McpConfigContext> {
    const agentDir = await deps.agentDir();
    if (query.projectId === undefined && query.workspaceId === undefined) return { agentDir, cwd: agentDir, hasProject: false, projectTrusted: false };
    if (typeof query.projectId !== "string" || query.projectId === "" || typeof query.workspaceId !== "string" || query.workspaceId === "") throw new McpManagementError("A project and workspace must be selected together");
    await deps.projects.requireProject(query.projectId);
    const workspace = await deps.workspaces.resolve(query.projectId, query.workspaceId);
    const trusted = deps.isTrusted?.(workspace.path, agentDir)
      ?? (new ProjectTrustStore(agentDir).get(workspace.path) ?? SettingsManager.create(workspace.path, agentDir).getDefaultProjectTrust() === "always");
    if (execution && !trusted) throw new McpManagementError("Trust the selected project before testing or signing in to MCP servers", 403);
    return { agentDir, cwd: workspace.path, hasProject: true, projectTrusted: trusted };
  }

  function owner(target: McpConfigContext): string { return JSON.stringify([target.agentDir, target.cwd]); }
  function scope(value: unknown): McpConfigScope {
    if (!isMcpScope(value)) throw new McpManagementError("MCP scope must be global or project");
    return value;
  }
  function expectedRevision(value: unknown): string {
    if (typeof value !== "string" || value.length > 128) throw new McpManagementError("An MCP configuration revision is required");
    return value;
  }
  function bodyScope(value: unknown): McpConfigScope { return scope(isMcpRecord(value) ? value["scope"] : undefined); }
  function sendError(reply: FastifyReply, error: unknown): FastifyReply {
    return reply.code(error instanceof McpManagementError ? error.statusCode : 503).send({ error: error instanceof McpManagementError ? error.message : "MCP management is unavailable; check the active agent profile and configuration" });
  }
  function privateResponse(reply: FastifyReply): void { reply.header("Cache-Control", "no-store"); }

  app.get<{ Querystring: McpQuery }>(`${prefix}/mcp`, async (request, reply) => {
    privateResponse(reply);
    try { return await store.list(await context(request.query)); } catch (error) { return sendError(reply, error); }
  });

  app.put<{ Params: { name: string }; Querystring: McpQuery; Body: unknown }>(`${prefix}/mcp/:name`, { bodyLimit: 1024 * 1024 }, async (request, reply) => {
    privateResponse(reply);
    try {
      const body = request.body;
      if (!isMcpRecord(body) || !isMcpRecord(body["config"])) throw new McpManagementError("An MCP server configuration object is required");
      const target = await context(request.query);
      await store.write(target, scope(body["scope"]), request.params.name, body["config"], expectedRevision(body["revision"]), await loadSdk());
      return await store.list(target);
    } catch (error) { return sendError(reply, error); }
  });

  app.delete<{ Params: { name: string }; Querystring: McpQuery }>(`${prefix}/mcp/:name`, async (request, reply) => {
    privateResponse(reply);
    try {
      const target = await context(request.query);
      await store.write(target, scope(request.query.scope), request.params.name, undefined, expectedRevision(request.query.revision), await loadSdk());
      return await store.list(target);
    } catch (error) { return sendError(reply, error); }
  });

  for (const operation of ["test", "login", "logout"] as const) {
    app.post<{ Params: { name: string }; Querystring: McpQuery; Body: unknown }>(`${prefix}/mcp/:name/${operation}`, async (request, reply) => {
      privateResponse(reply);
      try {
        const target = await context(request.query, true);
        const sdk = await loadSdk();
        const entry = await store.entry(target, bodyScope(request.body), request.params.name, sdk);
        if (operation === "test") return await runtime.probe(sdk, entry, target.cwd, target.agentDir);
        if (operation === "login") return runtime.startLogin(sdk, entry, target.cwd, target.agentDir, owner(target));
        if (!("url" in entry.config)) throw new McpManagementError("Only HTTP MCP servers support OAuth sign-out");
        sdk.credentials(target.agentDir).remove(entry.name, entry.config.url);
        return { ok: true };
      } catch (error) { return sendError(reply, error); }
    });
  }

  app.get<{ Params: { flowId: string }; Querystring: McpQuery }>(`${prefix}/mcp/auth/flows/:flowId`, async (request, reply) => {
    privateResponse(reply);
    try { return runtime.login(request.params.flowId, owner(await context(request.query, true))); } catch (error) { return sendError(reply, error); }
  });
  app.post<{ Params: { flowId: string }; Querystring: McpQuery; Body: unknown }>(`${prefix}/mcp/auth/flows/:flowId`, async (request, reply) => {
    privateResponse(reply);
    try {
      if (!isMcpRecord(request.body) || typeof request.body["redirectUrl"] !== "string") throw new McpManagementError("A redirect URL is required");
      return runtime.submitRedirect(request.params.flowId, owner(await context(request.query, true)), request.body["redirectUrl"]);
    } catch (error) { return sendError(reply, error); }
  });
  app.delete<{ Params: { flowId: string }; Querystring: McpQuery }>(`${prefix}/mcp/auth/flows/:flowId`, async (request, reply) => {
    privateResponse(reply);
    try { return runtime.cancelLogin(request.params.flowId, owner(await context(request.query))); } catch (error) { return sendError(reply, error); }
  });
}
