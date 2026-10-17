import { describe, expect, it } from "vitest";
import { sessionContextSources, type RuntimeContextResourceLoader } from "./sessionContextSources.js";

describe("sessionContextSources", () => {
  it("reports only loaded paths and skill metadata without reading prompt contents", () => {
    const loader = {
      getAgentsFiles: () => ({ agentsFiles: [{
        path: "/workspace/AGENTS.md",
        get content(): string { throw new Error("Instruction bodies must stay private"); },
      }] }),
      getSystemPromptSource: () => ({ path: "/agent/SYSTEM.md" }),
      getAppendSystemPromptSources: () => [{ path: "/agent/APPEND_SYSTEM.md" }],
      getSkills: () => ({ skills: [
        { name: "review", description: "Review changes", filePath: "/skills/review/SKILL.md", disableModelInvocation: false, baseDir: "/skills/review" },
        { name: "manual", filePath: "/skills/manual/SKILL.md", disableModelInvocation: true },
      ] }),
      getSystemPrompt: () => { throw new Error("System prompt bodies must stay private"); },
    };

    expect(sessionContextSources(loader)).toEqual({
      source: "runtime-resource-loader",
      agentFiles: [{ path: "/workspace/AGENTS.md" }],
      systemPromptFiles: [
        { path: "/agent/SYSTEM.md", kind: "system" },
        { path: "/agent/APPEND_SYSTEM.md", kind: "append-system" },
      ],
      availableSkills: [
        { name: "review", description: "Review changes", path: "/skills/review/SKILL.md", modelInvocation: true },
        { name: "manual", path: "/skills/manual/SKILL.md", modelInvocation: false },
      ],
    });
  });

  it("keeps unavailable collections unknown on an older SDK", () => {
    const loader = { getSkills: () => ({ skills: [{ name: "legacy" }] }) };

    expect(sessionContextSources(loader)).toEqual({
      source: "runtime-resource-loader",
      availableSkills: [{ name: "legacy" }],
    });
  });

  it.each(["base", "append"])("does not present a partial %s prompt source list as complete", (supported) => {
    const loader: RuntimeContextResourceLoader = {
      getSkills: () => ({ skills: [] }),
      ...(supported === "base"
        ? { getSystemPromptSource: () => ({ path: "/agent/SYSTEM.md" }) }
        : { getAppendSystemPromptSources: () => [{ path: "/agent/APPEND_SYSTEM.md" }] }),
    };

    expect(sessionContextSources(loader)).not.toHaveProperty("systemPromptFiles");
  });

  it("distinguishes supported empty collections from unknown ones", () => {
    expect(sessionContextSources({
      getSkills: () => ({ skills: [] }),
      getAgentsFiles: () => ({ agentsFiles: [] }),
      getSystemPromptSource: () => undefined,
      getAppendSystemPromptSources: () => [],
    })).toEqual({
      source: "runtime-resource-loader",
      agentFiles: [],
      systemPromptFiles: [],
      availableSkills: [],
    });
  });

  it("reads refreshed loader collections on each snapshot without retaining references", () => {
    const firstFile = { path: "/workspace/AGENTS.md" };
    let agentsFiles = [firstFile];
    let skills = [{ name: "first", filePath: "/skills/first/SKILL.md" }];
    const loader = {
      getAgentsFiles: () => ({ agentsFiles }),
      getSkills: () => ({ skills }),
    };
    const first = sessionContextSources(loader);
    firstFile.path = "/workspace/CHANGED.md";
    agentsFiles = [];
    skills = [{ name: "second", filePath: "/skills/second/SKILL.md" }];

    expect(first.agentFiles).toEqual([{ path: "/workspace/AGENTS.md" }]);
    expect(sessionContextSources(loader)).toMatchObject({
      agentFiles: [],
      availableSkills: [{ name: "second", path: "/skills/second/SKILL.md" }],
    });
  });

  it("propagates loader errors rather than reporting a known-empty collection", () => {
    expect(() => sessionContextSources({
      getSkills: () => ({ skills: [] }),
      getAgentsFiles: () => { throw new Error("Runtime resource metadata unavailable"); },
    })).toThrow("Runtime resource metadata unavailable");
  });
});
