import { isMcpRecord, parseMcpLoginFlow, parseMcpManagementSnapshot, parseMcpProbeResult, type McpConfigScope, type McpConfigWrite, type McpManagementTarget } from "../../../shared/mcpManagement";
import { request } from "./http";

export function mcpManagementPath(machineId = "local", suffix = "", target: McpManagementTarget = {}, values: Record<string, string> = {}): string {
  const query = new URLSearchParams(values);
  if (target.projectId !== undefined && target.workspaceId !== undefined) { query.set("projectId", target.projectId); query.set("workspaceId", target.workspaceId); }
  return `api/machines/${encodeURIComponent(machineId)}/mcp${suffix}${query.size === 0 ? "" : `?${query.toString()}`}`;
}

function parseOk(value: unknown): void { if (!isMcpRecord(value) || value["ok"] !== true) throw new Error("Invalid MCP action response"); }

export const mcpManagementApi = {
  list: (machineId: string, target: McpManagementTarget) => request(mcpManagementPath(machineId, "", target), parseMcpManagementSnapshot, { cache: "no-store" }),
  save: (machineId: string, target: McpManagementTarget, name: string, value: McpConfigWrite) => request(mcpManagementPath(machineId, `/${encodeURIComponent(name)}`, target), parseMcpManagementSnapshot, { method: "PUT", body: JSON.stringify(value) }),
  remove: (machineId: string, target: McpManagementTarget, name: string, scope: McpConfigScope, revision: string) => request(mcpManagementPath(machineId, `/${encodeURIComponent(name)}`, target, { scope, revision }), parseMcpManagementSnapshot, { method: "DELETE" }),
  test: (machineId: string, target: McpManagementTarget, name: string, scope: McpConfigScope) => request(mcpManagementPath(machineId, `/${encodeURIComponent(name)}/test`, target), parseMcpProbeResult, { method: "POST", body: JSON.stringify({ scope }) }),
  login: (machineId: string, target: McpManagementTarget, name: string, scope: McpConfigScope) => request(mcpManagementPath(machineId, `/${encodeURIComponent(name)}/login`, target), parseMcpLoginFlow, { method: "POST", body: JSON.stringify({ scope }) }),
  loginStatus: (machineId: string, target: McpManagementTarget, id: string) => request(mcpManagementPath(machineId, `/auth/flows/${encodeURIComponent(id)}`, target), parseMcpLoginFlow, { cache: "no-store" }),
  submitRedirect: (machineId: string, target: McpManagementTarget, id: string, redirectUrl: string) => request(mcpManagementPath(machineId, `/auth/flows/${encodeURIComponent(id)}`, target), parseMcpLoginFlow, { method: "POST", body: JSON.stringify({ redirectUrl }) }),
  cancelLogin: (machineId: string, target: McpManagementTarget, id: string) => request(mcpManagementPath(machineId, `/auth/flows/${encodeURIComponent(id)}`, target), parseMcpLoginFlow, { method: "DELETE" }),
  logout: (machineId: string, target: McpManagementTarget, name: string, scope: McpConfigScope) => request(mcpManagementPath(machineId, `/${encodeURIComponent(name)}/logout`, target), parseOk, { method: "POST", body: JSON.stringify({ scope }) }),
};
