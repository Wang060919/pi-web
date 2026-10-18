export interface SkillCatalogEntry {
  id: string;
  name: string;
  description: string;
  path: string;
  scope: "user" | "project";
  source: string;
  modelInvocation: boolean;
}

export interface SkillCatalog {
  skills: SkillCatalogEntry[];
  diagnostics: string[];
  projectTrusted: boolean;
}

export interface SkillDocument { path: string; content: string }

export interface SessionInspection {
  source: "active-runtime";
  systemPrompt: string;
  tools: { name: string; description: string; parameters: Record<string, unknown> }[];
}

function isRecord(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error("Invalid inspection response");
  return value;
}
function string(value: unknown): string {
  if (typeof value !== "string") throw new Error("Invalid inspection text");
  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new Error("Invalid inspection flag");
  return value;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Invalid inspection list");
  return value;
}

export function parseSkillCatalog(value: unknown): SkillCatalog {
  const data = record(value);
  return {
    projectTrusted: boolean(data["projectTrusted"]),
    diagnostics: array(data["diagnostics"]).map(string),
    skills: array(data["skills"]).map((value) => {
      const skill = record(value);
      const scope = skill["scope"];
      if (scope !== "user" && scope !== "project") throw new Error("Invalid skill scope");
      return { id: string(skill["id"]), name: string(skill["name"]), description: string(skill["description"]), path: string(skill["path"]),
        scope, source: string(skill["source"]), modelInvocation: boolean(skill["modelInvocation"]) };
    }),
  };
}

export function parseSkillDocument(value: unknown): SkillDocument {
  const data = record(value);
  return { path: string(data["path"]), content: string(data["content"]) };
}

export function parseSessionInspection(value: unknown): SessionInspection {
  const data = record(value);
  if (data["source"] !== "active-runtime") throw new Error("Invalid session inspection source");
  return { source: "active-runtime", systemPrompt: string(data["systemPrompt"]), tools: array(data["tools"]).map((value) => {
    const tool = record(value);
    return { name: string(tool["name"]), description: string(tool["description"]), parameters: record(tool["parameters"]) };
  }) };
}
