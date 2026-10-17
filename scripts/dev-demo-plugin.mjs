import { seedDevelopmentDemo } from "./dev-demo-data.mjs";

/** This route belongs to the isolated Vite server, never the application API. */
export function developmentDemoPlugin(repoRoot, enabled) {
  let pending;
  return {
    name: "pi-web-development-demo",
    apply: "serve",
    configureServer(server) {
      if (!enabled) return;
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?")[0] !== "/api/dev-demo") return next();
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");
        const reply = (status, body) => {
          response.statusCode = status;
          response.end(JSON.stringify(body));
        };
        if (request.method !== "POST") {
          response.setHeader("Allow", "POST");
          reply(405, { error: "Use POST to load development demo data." });
          return;
        }
        // A cross-origin form must not mutate local development state.
        const origin = request.headers.origin;
        const host = request.headers.host;
        const address = request.socket.remoteAddress;
        if (!(["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address))
          || typeof origin !== "string" || origin !== `http://${host}`
          || !/^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/u.test(origin)
          || request.headers["content-type"]?.split(";")[0] !== "application/json") {
          reply(403, { error: "Demo data can only be loaded from this local development page." });
          return;
        }
        // Repeated clicks share one seed operation instead of racing the project file.
        pending ??= seedDevelopmentDemo(repoRoot).finally(() => { pending = undefined; });
        void pending.then((catalog) => reply(200, catalog), (error) => {
          reply(500, { error: error instanceof Error ? error.message : String(error) });
        });
      });
    },
  };
}
