import { describe, expect, it } from "vitest";
import { PiSessionService } from "./piSessionService.js";
import { CapturingSessionEventHub, fakeRuntime, runtimeCreator, sessionGateway, sessionRef, testModelRuntime } from "./piSessionService.testSupport.js";

describe("PiSessionService context sources", () => {
  it("publishes loaded resources with status and refreshes them after runtime reload", async () => {
    let agentFiles = [{ path: "/workspace/AGENTS.md", content: "private instructions" }];
    const fake = fakeRuntime("context-session", {
      resourceLoader: {
        getAgentsFiles: () => ({ agentsFiles: agentFiles }),
        getSkills: () => ({ skills: [{ name: "review", filePath: "/skills/review/SKILL.md" }] }),
        getSystemPromptSource: () => undefined,
        getAppendSystemPromptSources: () => [],
      },
      reload: () => {
        agentFiles = [];
        return Promise.resolve();
      },
    });
    const hub = new CapturingSessionEventHub();
    const service = new PiSessionService(hub, {
      agentDir: "/tmp/pi-web-test-agent",
      modelRuntime: testModelRuntime,
      createAgentRuntime: runtimeCreator(fake.runtime),
      sessionManager: sessionGateway([]),
      heartbeatIntervalMs: 60_000,
    });

    try {
      await service.start("/workspace");
      const initial = await service.status(sessionRef("context-session"));
      expect(initial.contextSources).toEqual({
        source: "runtime-resource-loader",
        agentFiles: [{ path: "/workspace/AGENTS.md" }],
        systemPromptFiles: [],
        availableSkills: [{ name: "review", path: "/skills/review/SKILL.md" }],
      });
      expect(hub.globalEvents).toContainEqual({ type: "status.update", status: initial });

      await service.runCommand(sessionRef("context-session"), "/reload");

      expect((await service.status(sessionRef("context-session"))).contextSources?.agentFiles).toEqual([]);
    } finally {
      await service.dispose();
    }
  });
});
