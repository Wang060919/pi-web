import type { FastifyInstance } from "fastify";
import type { SessionHistoryService } from "./sessions/sessionHistoryService.js";
import { requestCancellation } from "./requestCancellation.js";

export function registerSessionHistoryRoutes(app: FastifyInstance, history: Pick<SessionHistoryService, "search" | "exportHtml" | "entry">, prefix = ""): void {
  app.get<{ Querystring: { q?: unknown; cwd?: unknown } }>(`${prefix}/sessions/search`, async (request, reply) => {
    if (typeof request.query.q !== "string" || !request.query.q.trim() || request.query.q.length > 200 || (request.query.cwd !== undefined && typeof request.query.cwd !== "string")) return await reply.code(400).send({ error: "A search query of 1–200 characters is required" });
    const cancellation = requestCancellation(request, reply);
    reply.header("Cache-Control", "no-store");
    try { return await history.search(request.query.q, request.query.cwd, cancellation.signal); }
    catch (error) { return await reply.code(400).send({ error: error instanceof Error ? error.message : String(error) }); }
    finally { cancellation.dispose(); }
  });
  app.get<{ Params: { sessionId: string }; Querystring: { cwd?: unknown; entryId?: unknown } }>(`${prefix}/sessions/:sessionId/history-entry`, async (request, reply) => {
    if (typeof request.query.cwd !== "string" || typeof request.query.entryId !== "string") return await reply.code(400).send({ error: "cwd and entryId are required" });
    reply.header("Cache-Control", "no-store");
    try { return await history.entry({ id: request.params.sessionId, cwd: request.query.cwd }, request.query.entryId); }
    catch (error) { return await reply.code(404).send({ error: error instanceof Error ? error.message : String(error) }); }
  });
  app.get<{ Params: { sessionId: string }; Querystring: { cwd?: unknown } }>(`${prefix}/sessions/:sessionId/export`, async (request, reply) => {
    if (typeof request.query.cwd !== "string") return await reply.code(400).send({ error: "cwd is required" });
    try {
      const result = await history.exportHtml({ id: request.params.sessionId, cwd: request.query.cwd });
      return await reply.type("text/html; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="session.html"; filename*=UTF-8''${encodeURIComponent(result.filename).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)}`)
        .header("Cache-Control", "no-store").header("X-Content-Type-Options", "nosniff").send(result.html);
    } catch (error) { return await reply.code(400).send({ error: error instanceof Error ? error.message : String(error) }); }
  });
}
