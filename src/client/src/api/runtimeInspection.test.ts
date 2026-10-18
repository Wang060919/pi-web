import { describe, expect, it } from "vitest";
import { parseSessionInspection, parseSkillCatalog, parseSkillDocument } from "../../../shared/runtimeInspection";
import { sessionInspectionPath, skillCatalogPath } from "./runtimeInspection";

describe("inspection API boundaries", () => {
  it("encodes machine and session segments and query values without root-relative URLs", () => {
    expect(sessionInspectionPath("remote/a", { id: "s/#", cwd: "/repo ?#" })).toBe("api/machines/remote%2Fa/sessions/s%2F%23/inspection?cwd=%2Frepo+%3F%23");
    expect(skillCatalogPath("remote/a", { projectId: "p#", workspaceId: "w/" }, { id: "id", path: "refs/a b.md" })).toBe("api/machines/remote%2Fa/skills/document?projectId=p%23&workspaceId=w%2F&id=id&document=refs%2Fa+b.md");
  });
  it("rejects malformed or unavailable data instead of displaying an empty success", () => {
    expect(() => parseSessionInspection({ systemPrompt: "", tools: [] })).toThrow();
    expect(() => parseSessionInspection({ source: "active-runtime", systemPrompt: "", tools: [{ name: "tool", description: "", parameters: null }] })).toThrow();
    expect(() => parseSkillCatalog({ skills: [], diagnostics: [] })).toThrow();
    expect(() => parseSkillDocument({ path: "SKILL.md" })).toThrow();
    expect(parseSessionInspection({ source: "active-runtime", systemPrompt: "", tools: [] })).toEqual({ source: "active-runtime", systemPrompt: "", tools: [] });
  });
});
