import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify from "fastify";
import { expect, it } from "vitest";
import { parseSkillCatalog, parseSkillDocument } from "../shared/runtimeInspection.js";
import { registerSkillCatalogRoutes } from "./skillCatalogRoutes.js";

it("serves selected-profile skills, resolves workspace ids, and validates requests", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-web-skill-routes-"));
  const app = Fastify();
  try {
    await mkdir(join(root, "skills/review"), { recursive: true });
    await writeFile(join(root, "skills/review/SKILL.md"), "---\nname: review\ndescription: Review\n---\nRead only");
    registerSkillCatalogRoutes(app, {
      agentDir: () => Promise.resolve(root),
      projects: { requireProject: () => Promise.reject(new Error("Unknown project")) },
      workspaces: { resolve: () => Promise.reject(new Error("Unknown workspace")) },
    }, "/api/machines/local");
    const result = await app.inject("/api/machines/local/skills");
    expect(result.statusCode).toBe(200); expect(result.headers["cache-control"]).toBe("no-store");
    const catalog = parseSkillCatalog(result.json<unknown>());
    const id = catalog.skills[0]?.id;
    if (id === undefined) throw new Error("Missing review skill");
    const read = await app.inject(`/api/machines/local/skills/document?id=${id}`);
    expect(read.statusCode).toBe(200); expect(parseSkillDocument(read.json<unknown>()).content).toContain("Read only");
    expect((await app.inject("/api/machines/local/skills?projectId=one")).statusCode).toBe(400);
    expect((await app.inject("/api/machines/local/skills?projectId=one&workspaceId=two")).statusCode).toBe(503);
    expect((await app.inject("/api/machines/local/skills/document?id=../../secret")).statusCode).toBe(400);
    expect((await app.inject({ method: "PUT", url: "/api/machines/local/skills", payload: {} })).statusCode).toBe(404);
  } finally { await app.close(); await rm(root, { recursive: true, force: true }); }
});
