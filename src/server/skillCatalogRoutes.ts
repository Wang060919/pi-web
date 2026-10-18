import type { FastifyInstance } from "fastify";
import { ProjectTrustStore, SettingsManager } from "@earendil-works/pi-coding-agent";
import type { ProjectService } from "./projects/projectService.js";
import type { WorkspaceCatalog } from "./workspaces/workspaceCatalog.js";
import { readSkillCatalog, readSkillDocument, SkillCatalogError, type SkillCatalogContext } from "./skills/skillCatalog.js";

interface SkillCatalogRouteDeps {
  agentDir: () => Promise<string>;
  projects: Pick<ProjectService, "requireProject">;
  workspaces: Pick<WorkspaceCatalog, "resolve">;
}
interface Query { projectId?: unknown; workspaceId?: unknown; id?: unknown; document?: unknown }

export function registerSkillCatalogRoutes(app: FastifyInstance, deps: SkillCatalogRouteDeps, prefix = "/api"): void {
  async function context(query: Query): Promise<SkillCatalogContext> {
    const agentDir = await deps.agentDir();
    if (query.projectId === undefined && query.workspaceId === undefined) return { agentDir, cwd: agentDir, projectTrusted: false };
    if (typeof query.projectId !== "string" || !query.projectId || typeof query.workspaceId !== "string" || !query.workspaceId) throw new SkillCatalogError("A project and workspace must be selected together");
    await deps.projects.requireProject(query.projectId);
    const workspace = await deps.workspaces.resolve(query.projectId, query.workspaceId);
    const projectTrusted = new ProjectTrustStore(agentDir).get(workspace.path) ?? SettingsManager.create(workspace.path, agentDir).getDefaultProjectTrust() === "always";
    return { agentDir, cwd: workspace.path, projectTrusted };
  }
  for (const operation of ["", "/document"] as const) {
    app.get<{ Querystring: Query }>(`${prefix}/skills${operation}`, async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      try {
        if (operation === "") return await readSkillCatalog(await context(request.query));
        const { id, document } = request.query;
        if (typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id)
          || (document !== undefined && (typeof document !== "string" || document.length > 2048))) throw new SkillCatalogError("Invalid skill document request");
        return await readSkillDocument(await readSkillCatalog(await context(request.query)), id, document);
      } catch (error) {
        return reply.code(error instanceof SkillCatalogError ? error.statusCode : 503).send({ error: error instanceof SkillCatalogError ? error.message : "Skill browser unavailable; check the active profile, configuration and document" });
      }
    });
  }
}
