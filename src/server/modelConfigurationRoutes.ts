import type { FastifyInstance } from "fastify";
import { modelConfigurationRecord, parseConfiguredProvider, parseModelConfigurationResponse } from "../shared/modelConfiguration.js";
import type { ModelConfigurationService } from "./models/modelConfigurationService.js";
import { ModelConfigurationError } from "./models/modelConfigurationStore.js";

export function registerModelConfigurationRoutes(app: FastifyInstance, service: Pick<ModelConfigurationService, "read" | "write" | "discover" | "test">, prefix = ""): void {
  const errorResponse = (error: unknown): { status: number; error: string } => ({
    status: error instanceof ModelConfigurationError ? error.statusCode : 400,
    error: error instanceof ModelConfigurationError ? error.message : "Invalid model configuration request",
  });
  app.get(`${prefix}/models/configuration`, async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
    try { return await service.read(); }
    catch (error) { const failure = errorResponse(error); return reply.code(failure.status).send({ error: failure.error }); }
  });
  app.put<{ Body: unknown }>(`${prefix}/models/configuration`, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    try {
      const configuration = parseModelConfigurationResponse(request.body);
      return await service.write(configuration.revision, configuration.providers);
    } catch (error) { const failure = errorResponse(error); return reply.code(failure.status).send({ error: failure.error }); }
  });
  app.post<{ Body: unknown }>(`${prefix}/models/configuration/discover`, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    try { return await service.discover(parseConfiguredProvider(modelConfigurationRecord(request.body)["provider"])); }
    catch (error) { const failure = errorResponse(error); return reply.code(failure.status).send({ error: failure.error }); }
  });
  app.post<{ Body: unknown }>(`${prefix}/models/configuration/test`, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    try {
      const body = modelConfigurationRecord(request.body);
      const modelId = body["modelId"];
      if (typeof modelId !== "string" || modelId === "" || modelId.length > 300) throw new ModelConfigurationError("A model ID is required");
      return await service.test(parseConfiguredProvider(body["provider"]), modelId);
    } catch (error) { const failure = errorResponse(error); return reply.code(failure.status).send({ error: failure.error }); }
  });
}
