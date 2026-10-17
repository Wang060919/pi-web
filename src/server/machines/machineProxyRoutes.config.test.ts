import Fastify, { type FastifyInstance } from "fastify";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFilePiWebConfigService, registerConfigRoutes } from "../configRoutes.js";
import type { MachineClient } from "./machineClient.js";
import { registerMachineProxyRoutes } from "./machineProxyRoutes.js";

const apps: FastifyInstance[] = [];
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});
function app(): FastifyInstance { const instance = Fastify({ logger: false }); apps.push(instance); return instance; }
function remoteClient(requestJson: MachineClient["requestJson"]): MachineClient {
  return {
    requestJson,
    request: () => Promise.reject(new Error("Unexpected streaming request")),
    connectWebSocket: () => { throw new Error("Unexpected WebSocket request"); },
  };
}
async function gateway(client: MachineClient): Promise<FastifyInstance> {
  const instance = app();
  registerMachineProxyRoutes(instance, { remoteClient: () => Promise.resolve(client) });
  await instance.ready();
  return instance;
}

describe("remote config mutations", () => {
  it("preserves independent patches sent concurrently through separate gateways", async () => {
    const directory = await mkdtemp(join(tmpdir(), "pi-web-remote-config-"));
    directories.push(directory);
    const path = join(directory, "config.json");
    await writeFile(path, JSON.stringify({ host: "127.0.0.1", spawnSessions: false, askUser: false }));
    const target = app();
    registerConfigRoutes(target, createFilePiWebConfigService({ env: { PI_WEB_CONFIG: path } }));
    await target.ready();
    // Hold old-protocol GET replies until both gateways have the same snapshot.
    // Atomic PATCH requests need no inter-gateway coordination.
    const readers: (() => void)[] = [];
    const requestJson = vi.fn<MachineClient["requestJson"]>(async (method, url, body) => {
      if (method !== "GET" && method !== "PUT" && method !== "PATCH") throw new Error("Unexpected method");
      const response = await target.inject({ method, url, ...(body === undefined ? {} : { payload: JSON.stringify(body), headers: { "content-type": "application/json" } }) });
      if (method === "GET") await new Promise<void>((resolve) => { readers.push(resolve); if (readers.length === 2) readers.forEach((release) => { release(); }); });
      return { statusCode: response.statusCode, headers: {}, body: response.json<unknown>() };
    });
    const client = remoteClient(requestJson);
    const first = await gateway(client);
    const second = await gateway(client);

    const results = await Promise.all([
      first.inject({ method: "PUT", url: "/api/machines/target/config", payload: { config: { spawnSessions: true } } }),
      second.inject({ method: "PUT", url: "/api/machines/target/config", payload: { config: { askUser: true } } }),
    ]);

    expect(results.map((result) => result.statusCode)).toEqual([200, 200]);
    expect(JSON.parse(await readFile(path, "utf8"))).toMatchObject({ host: "127.0.0.1", spawnSessions: true, askUser: true });
    expect(requestJson).toHaveBeenCalledTimes(2);
    expect(requestJson).toHaveBeenCalledWith("PATCH", "/api/config", { config: { spawnSessions: true } });
    expect(requestJson).toHaveBeenCalledWith("PATCH", "/api/config", { config: { askUser: true } });
  });

  it.each([404, 405])("reports old target incompatibility without a full-config fallback after HTTP %s", async (statusCode) => {
    const requestJson = vi.fn<MachineClient["requestJson"]>(() => Promise.resolve({ statusCode, headers: {}, body: { error: "Not Found" } }));
    const instance = await gateway(remoteClient(requestJson));
    const response = await instance.inject({ method: "PUT", url: "/api/machines/old-target/config", payload: { config: { spawnSessions: true } } });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: "selected-machine-config-incompatible", machineId: "old-target" });
    expect(requestJson).toHaveBeenCalledExactlyOnceWith("PATCH", "/api/config", { config: { spawnSessions: true } });
  });
});
