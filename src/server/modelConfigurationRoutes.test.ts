import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerModelConfigurationRoutes } from "./modelConfigurationRoutes.js";
import { ModelConfigurationError } from "./models/modelConfigurationStore.js";

describe("model configuration routes", () => {
  it("keeps routing machine-scoped and maps stale saves to 409", async () => {
    const app = Fastify();
    const service = { read: vi.fn(() => Promise.resolve({ revision: "missing", providers: [] })), write: vi.fn(() => Promise.reject(new ModelConfigurationError("Reload before saving", 409))),
      test: vi.fn(() => Promise.resolve({ ok: true, latencyMs: 12 })), discover: vi.fn(() => Promise.resolve({ models: [], truncated: false })) };
    registerModelConfigurationRoutes(app, service, "/api/machines/local");
    try {
      const read = await app.inject({ url: "/api/machines/local/models/configuration" });
      expect(read.statusCode).toBe(200);
      expect(read.headers["cache-control"]).toBe("no-store");
      expect((await app.inject({ method: "PUT", url: "/api/machines/local/models/configuration", payload: { revision: "missing", providers: [] } })).statusCode).toBe(409);
      expect((await app.inject({ method: "POST", url: "/api/machines/local/models/configuration/test", payload: { provider: { id: "custom", models: [] } } })).statusCode).toBe(400);
      expect(service.test).not.toHaveBeenCalled();
      expect((await app.inject({ method: "POST", url: "/api/machines/local/models/configuration/test", payload: { provider: { id: "custom", models: [{ id: "one" }] }, modelId: "one" } })).statusCode).toBe(200);
      expect(service.test).toHaveBeenCalledWith({ id: "custom", models: [{ id: "one" }] }, "one");
      expect((await app.inject({ url: "/models/configuration" })).statusCode).toBe(404);
    } finally { await app.close(); }
  });
});
