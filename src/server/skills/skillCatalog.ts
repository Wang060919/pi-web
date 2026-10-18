import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { DefaultPackageManager, loadSkills, SettingsManager } from "@earendil-works/pi-coding-agent";
import type { SkillCatalog, SkillDocument } from "../../shared/runtimeInspection.js";

export interface SkillCatalogContext { agentDir: string; cwd: string; projectTrusted: boolean }
export class SkillCatalogError extends Error {
  constructor(message: string, readonly statusCode = 400) { super(message); }
}

/** SDK discovery without importing extensions or installing missing packages. */
export async function readSkillCatalog(context: SkillCatalogContext): Promise<SkillCatalog> {
  const settings = SettingsManager.create(context.cwd, context.agentDir, { projectTrusted: context.projectTrusted });
  const manager = new DefaultPackageManager({ cwd: context.cwd, agentDir: context.agentDir, settingsManager: settings });
  const diagnostics: string[] = [];
  const paths = await manager.resolve((source) => {
    diagnostics.push(`Package is not installed: ${source}`);
    return Promise.resolve("skip");
  });
  // Project resources stay excluded until trust is granted, including SDK
  // auto-discovery entries which are independent of project settings.
  const resources = paths.skills.filter((entry) => entry.enabled && (entry.metadata.scope === "user" || context.projectTrusted));
  const loaded = loadSkills({ cwd: context.cwd, agentDir: context.agentDir, includeDefaults: false, skillPaths: resources.map((entry) => entry.path) });
  diagnostics.push(...loaded.diagnostics.map((entry) => entry.message));
  const settingsErrors = settings.drainErrors();
  if (settingsErrors.length > 0) throw new SkillCatalogError("Skill configuration could not be read", 503);
  return {
    projectTrusted: context.projectTrusted,
    diagnostics,
    skills: loaded.skills.map((skill) => {
      const resource = resources.find((entry) => inside(entry.path, skill.filePath));
      if (resource === undefined) throw new SkillCatalogError("Skill source is unavailable", 503);
      return { id: createHash("sha256").update(skill.filePath).digest("hex"), name: skill.name, description: skill.description,
        path: skill.filePath, scope: resource.metadata.scope === "project" ? "project" : "user", source: resource.metadata.source,
        modelInvocation: !skill.disableModelInvocation };
    }),
  };
}

function inside(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`));
}

/** Only catalogued skills and Markdown documents inside their real directory. */
export async function readSkillDocument(catalog: SkillCatalog, id: string, document?: string): Promise<SkillDocument> {
  const skill = catalog.skills.find((entry) => entry.id === id);
  if (skill === undefined) throw new SkillCatalogError("Skill not found; refresh the catalog", 404);
  if (document !== undefined && (isAbsolute(document) || document.includes("\\") || !/\.md$/i.test(document))) throw new SkillCatalogError("Only relative Markdown documents are supported");
  const root = await realpath(dirname(skill.path));
  const target = await realpath(document === undefined ? skill.path : resolve(root, document));
  if (!inside(root, target)) throw new SkillCatalogError("Document is outside the skill directory", 403);
  const file = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await file.stat();
    const limit = 512 * 1024;
    if (!stat.isFile() || stat.size > limit) throw new SkillCatalogError("Skill document must be a regular file of at most 512 KiB", 413);
    const buffer = Buffer.alloc(limit + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, length);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    if (length > limit) throw new SkillCatalogError("Skill document exceeds 512 KiB", 413);
    return { path: relative(root, target).split(sep).join("/"), content: new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, length)) };
  } finally { await file.close(); }
}
