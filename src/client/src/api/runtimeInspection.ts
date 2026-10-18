import type { SessionRef } from "../../../shared/apiTypes";
import { parseSessionInspection, parseSkillCatalog, parseSkillDocument } from "../../../shared/runtimeInspection";
import { request } from "./http";

export interface SkillBrowserTarget { projectId?: string | undefined; workspaceId?: string | undefined }

export function skillCatalogPath(machineId: string, target: SkillBrowserTarget, document?: { id: string; path?: string }): string {
  const query = new URLSearchParams();
  if (target.projectId !== undefined) query.set("projectId", target.projectId);
  if (target.workspaceId !== undefined) query.set("workspaceId", target.workspaceId);
  if (document !== undefined) { query.set("id", document.id); if (document.path !== undefined) query.set("document", document.path); }
  return `api/machines/${encodeURIComponent(machineId)}/skills${document === undefined ? "" : "/document"}?${query.toString()}`;
}
export function sessionInspectionPath(machineId: string, session: SessionRef): string {
  return `api/machines/${encodeURIComponent(machineId)}/sessions/${encodeURIComponent(session.id)}/inspection?${new URLSearchParams({ cwd: session.cwd }).toString()}`;
}
export const runtimeInspectionApi = {
  skills: (machineId: string, target: SkillBrowserTarget, signal: AbortSignal) => request(skillCatalogPath(machineId, target), parseSkillCatalog, { signal, cache: "no-store" }),
  document: (machineId: string, target: SkillBrowserTarget, id: string, signal: AbortSignal, path?: string) => request(skillCatalogPath(machineId, target, { id, ...(path === undefined ? {} : { path }) }), parseSkillDocument, { signal, cache: "no-store" }),
  session: (machineId: string, session: SessionRef, signal: AbortSignal) => request(sessionInspectionPath(machineId, session), parseSessionInspection, { signal, cache: "no-store" }),
};
