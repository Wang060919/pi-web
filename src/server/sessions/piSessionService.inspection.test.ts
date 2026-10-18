import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { expect, it, vi } from "vitest";
import { PiSessionService } from "./piSessionService.js";
import { CapturingSessionEventHub, fakeRuntime, runtimeCreator, sessionGateway, sessionRef, testModelRuntime } from "./piSessionService.testSupport.js";
import { registerSessionRoutes } from "./sessionRoutes.js";
import { parseSessionInspection } from "../../shared/runtimeInspection.js";

it("inspects only the matching live runtime, through the HTTP boundary, without opening or prompting", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-web-inspection-"));
  const state = { tools: [{ name: "read", description: "Runtime-transformed description", parameters: { type: "object", properties: { path: { type: "string" } } } }] };
  const fake = fakeRuntime("inspection", { systemPrompt: "Effective prompt", state });
  const create = vi.fn(runtimeCreator(fake.runtime));
  const prompt = vi.spyOn(fake.session, "prompt");
  const hub = new CapturingSessionEventHub();
  const service = new PiSessionService(hub, { agentDir: root, modelRuntime: testModelRuntime, createAgentRuntime: create, sessionManager: sessionGateway([]), heartbeatIntervalMs: 60_000 });
  const app = Fastify(); await app.register(fastifyWebsocket); registerSessionRoutes(app, service, hub);
  try {
    expect((await app.inject("/sessions/inspection/inspection")).statusCode).toBe(400);
    const url = "/sessions/inspection/inspection?cwd=%2Fworkspace";
    expect((await app.inject(url)).statusCode).toBe(409);
    expect(create).not.toHaveBeenCalled();
    await service.start("/workspace"); create.mockClear();
    const response = await app.inject(url);
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(parseSessionInspection(response.json<unknown>())).toMatchObject({ systemPrompt: "Effective prompt", tools: state.tools });
    expect(() => service.inspection(sessionRef("inspection", "/other"))).toThrow("No active runtime");
    state.tools = [];
    expect(service.inspection(sessionRef("inspection")).tools).toEqual([]);
    expect(create).not.toHaveBeenCalled(); expect(prompt).not.toHaveBeenCalled();
  } finally { await app.close(); await service.dispose(); await rm(root, { recursive: true, force: true }); }
});
