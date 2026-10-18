import { Readable } from "node:stream";
import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { expect, it, vi } from "vitest";
import type { MachineClient } from "./machineClient.js";
import { registerMachineProxyRoutes } from "./machineProxyRoutes.js";

it.each(["/skills?projectId=p&workspaceId=w", "/skills/document?id=abc&document=refs%2Fguide.md", "/sessions/s%201/inspection?cwd=%2Frepo"])("federates the read-only inspection route %s with cancellation and cache policy", async (path) => {
  const app = Fastify();
  await app.register(fastifyWebsocket);
  const request = vi.fn<MachineClient["request"]>().mockResolvedValue({ statusCode: 200, headers: { "content-type": "application/json", "cache-control": "no-store" }, body: Readable.from(['{"ok":true}']) });
  const client: MachineClient = { request, requestJson: () => Promise.reject(new Error("Unexpected JSON request")), connectWebSocket: () => { throw new Error("Unexpected WebSocket"); } };
  const remoteClient = vi.fn(() => Promise.resolve(client));
  registerMachineProxyRoutes(app, { remoteClient });
  try {
    const response = await app.inject(`/api/machines/remote%20one${path}`);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(remoteClient).toHaveBeenCalledWith("remote one");
    expect(request.mock.calls[0]?.slice(0, 3)).toEqual(["GET", `/api${path}`, undefined]);
    expect(request.mock.calls[0]?.[3]?.signal).toBeInstanceOf(AbortSignal);
  } finally { await app.close(); }
});
