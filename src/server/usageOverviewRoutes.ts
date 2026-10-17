import type { FastifyInstance } from "fastify";
import type { SessionDaemonRequestClient } from "../sessiond/sessionDaemonClient.js";
import { ActiveAgentProfileAccessError } from "./activeAgentProfileProvider.js";
import type { UsageOverviewService } from "./sessions/usageOverviewService.js";
import { normalizeRequestCwd } from "./workingDirectory.js";

export function registerUsageOverviewRoutes(app: FastifyInstance, usage: Pick<UsageOverviewService, "read">, prefix = "/api"): void {
  registerUsageOverviewReadRoute(app, (cwd, timeZone) => usage.read(cwd, timeZone), prefix);
}

/** The daemon owns session-directory overrides and the archive index. */
export function registerUsageOverviewProxyRoutes(app: FastifyInstance, daemon: SessionDaemonRequestClient, prefix = "/api"): void {
  registerUsageOverviewReadRoute(app, async (cwd, timeZone) => {
    const response = await daemon.request("GET", `/usage-overview?${new URLSearchParams({ cwd, timeZone }).toString()}`);
    // Older daemons have no metering endpoint. Report unavailability rather
    // than falling back to the web process's unrelated session environment.
    if (response.statusCode !== 200) throw new Error(`Session daemon usage request returned HTTP ${String(response.statusCode)}`);
    const value: unknown = JSON.parse(response.body);
    return value;
  }, prefix);
}

function registerUsageOverviewReadRoute(app: FastifyInstance, read: (cwd: string, timeZone: string) => Promise<unknown>, prefix: string): void {
  app.get<{ Querystring: { cwd?: unknown; timeZone?: unknown } }>(`${prefix}/usage-overview`, async (request, reply) => {
    let cwd: string;
    let timeZone: string;
    try {
      cwd = normalizeRequestCwd(request.query.cwd);
      if (cwd.length > 32 * 1024) throw new Error("cwd is too long");
      const requestedZone = request.query.timeZone ?? "UTC";
      if (typeof requestedZone !== "string" || requestedZone.length > 128) throw new Error("Invalid timeZone");
      timeZone = new Intl.DateTimeFormat("en", { timeZone: requestedZone }).resolvedOptions().timeZone;
    } catch {
      return reply.code(400).send({ error: "An absolute cwd and a valid timeZone are required" });
    }
    reply.header("Cache-Control", "no-store");
    try {
      return await read(cwd, timeZone);
    } catch (error) {
      if (!(error instanceof ActiveAgentProfileAccessError)) request.log.warn({ err: error }, "Failed to read usage history");
      return reply.code(503).send({ error: "Usage history is unavailable" });
    }
  });
}
