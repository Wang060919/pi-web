/** MCP configuration belongs to Pi, independently of PI WEB's own config. */
export type McpConfigScope = "global" | "project";
export const MCP_REDACTED_VALUE = "__PI_WEB_MCP_SECRET_UNCHANGED__";

export interface McpManagedServer {
  name: string;
  scope: McpConfigScope;
  source: string;
  revision: string;
  config: Record<string, unknown>;
  enabled: boolean;
  overridden: boolean;
}

export interface McpManagementSnapshot {
  servers: McpManagedServer[];
  revisions: { global: string; project?: string };
  projectTrusted: boolean;
  hasProject: boolean;
  errors: { scope: McpConfigScope; message: string }[];
  requiresReload: true;
}

export interface McpManagementTarget {
  projectId?: string | undefined;
  workspaceId?: string | undefined;
}

export interface McpConfigWrite {
  scope: McpConfigScope;
  config: Record<string, unknown>;
  revision: string;
}

export interface McpProbeResult {
  state: "connected" | "needs-auth" | "failed" | "timeout";
  checkedAt: string;
  tools: { name: string; description?: string; inputSchema?: unknown }[];
}

export interface McpLoginFlow {
  id: string;
  name: string;
  state: "starting" | "waiting" | "complete" | "failed" | "cancelled";
  authorizationUrl?: string;
}

export function isMcpRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isMcpScope(value: unknown): value is McpConfigScope {
  return value === "global" || value === "project";
}

export function parseMcpManagementSnapshot(value: unknown): McpManagementSnapshot {
  if (!isMcpRecord(value) || !Array.isArray(value["servers"]) || !Array.isArray(value["errors"])
    || !isMcpRecord(value["revisions"]) || typeof value["revisions"]["global"] !== "string"
    || typeof value["projectTrusted"] !== "boolean" || typeof value["hasProject"] !== "boolean" || value["requiresReload"] !== true) {
    throw new Error("Invalid MCP configuration response");
  }
  const servers = value["servers"].map((raw: unknown): McpManagedServer => {
    if (!isMcpRecord(raw) || typeof raw["name"] !== "string" || !isMcpScope(raw["scope"])
      || typeof raw["source"] !== "string" || typeof raw["revision"] !== "string" || !isMcpRecord(raw["config"])
      || typeof raw["enabled"] !== "boolean" || typeof raw["overridden"] !== "boolean") throw new Error("Invalid MCP server response");
    return { name: raw["name"], scope: raw["scope"], source: raw["source"], revision: raw["revision"], config: raw["config"], enabled: raw["enabled"], overridden: raw["overridden"] };
  });
  const errors = value["errors"].map((raw: unknown) => {
    if (!isMcpRecord(raw) || !isMcpScope(raw["scope"]) || typeof raw["message"] !== "string") throw new Error("Invalid MCP diagnostic response");
    return { scope: raw["scope"], message: raw["message"] };
  });
  const revisions = { global: value["revisions"]["global"], ...(typeof value["revisions"]["project"] === "string" ? { project: value["revisions"]["project"] } : {}) };
  return { servers, errors, revisions, projectTrusted: value["projectTrusted"], hasProject: value["hasProject"], requiresReload: true };
}

export function parseMcpProbeResult(value: unknown): McpProbeResult {
  if (!isMcpRecord(value) || !["connected", "needs-auth", "failed", "timeout"].includes(String(value["state"]))
    || typeof value["checkedAt"] !== "string" || !Array.isArray(value["tools"])) throw new Error("Invalid MCP connection response");
  const state = value["state"];
  if (state !== "connected" && state !== "needs-auth" && state !== "failed" && state !== "timeout") throw new Error("Invalid MCP connection state");
  const tools = value["tools"].map((raw: unknown) => {
    if (!isMcpRecord(raw) || typeof raw["name"] !== "string") throw new Error("Invalid MCP tool response");
    return { name: raw["name"], ...(typeof raw["description"] === "string" ? { description: raw["description"] } : {}), ...(raw["inputSchema"] === undefined ? {} : { inputSchema: raw["inputSchema"] }) };
  });
  return { state, checkedAt: value["checkedAt"], tools };
}

export function parseMcpLoginFlow(value: unknown): McpLoginFlow {
  if (!isMcpRecord(value) || typeof value["id"] !== "string" || typeof value["name"] !== "string") throw new Error("Invalid MCP sign-in response");
  const state = value["state"];
  if (state !== "starting" && state !== "waiting" && state !== "complete" && state !== "failed" && state !== "cancelled") throw new Error("Invalid MCP sign-in state");
  const authorizationUrl = value["authorizationUrl"];
  if (authorizationUrl !== undefined && (typeof authorizationUrl !== "string" || !/^https?:\/\//i.test(authorizationUrl))) throw new Error("Invalid MCP authorization URL");
  return { id: value["id"], name: value["name"], state, ...(authorizationUrl === undefined ? {} : { authorizationUrl }) };
}
