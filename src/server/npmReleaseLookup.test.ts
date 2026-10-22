import { createServer, request as httpRequest, type RequestListener, type Server } from "node:http";
import type { Duplex } from "node:stream";
import { gzipSync } from "node:zlib";
import { EnvHttpProxyAgent, getGlobalDispatcher } from "undici";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLatestNpmVersion } from "./npmReleaseLookup.js";

const servers: Server[] = [];
const sockets = new Set<Duplex>();

beforeEach(() => {
  for (const name of ["HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "no_proxy"]) vi.stubEnv(name, undefined);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const socket of sockets) socket.destroy();
  sockets.clear();
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => {
    server.close(() => { resolve(); });
    server.closeAllConnections();
  })));
});

async function listen(server: Server): Promise<string> {
  servers.push(server);
  server.on("connection", (socket) => { sockets.add(socket); });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => { resolve(); });
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Expected TCP address");
  return `http://127.0.0.1:${String(address.port)}`;
}

function registryServer(listener?: RequestListener): Server {
  return createServer(listener ?? ((_request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ version: "1.202610.8" }));
  }));
}

async function startProxy(target?: string): Promise<{ origin: string; destinations: string[] }> {
  const destinations: string[] = [];
  const server = createServer((request, response) => {
    destinations.push(new URL(request.url ?? "http://invalid").host);
    if (target === undefined) {
      response.writeHead(502).end();
      return;
    }
    const upstream = httpRequest(new URL(request.url ?? target), { method: request.method, headers: request.headers }, (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    });
    upstream.on("error", () => { response.writeHead(502).end(); });
    request.pipe(upstream);
  });
  server.on("connect", (request, client) => {
    sockets.add(client);
    destinations.push(request.url ?? "");
    client.end("HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n");
  });
  return { origin: await listen(server), destinations };
}

describe("fetchLatestNpmVersion", () => {
  it("reads a compressed release response without replacing the global dispatcher", async () => {
    const savedDispatcher = getGlobalDispatcher();
    const origin = await listen(registryServer((request, response) => {
      expect(request.url).toBe("/%40wang060919%2Fpi-web/latest");
      expect(request.headers["cache-control"]).toBe("no-cache");
      response.writeHead(200, { "content-type": "application/json", "content-encoding": "gzip" });
      response.end(gzipSync(JSON.stringify({ version: "1.202610.8" })));
    }));

    await expect(fetchLatestNpmVersion("@wang060919/pi-web", "1.202610.6", origin)).resolves.toBe("1.202610.8");
    expect(getGlobalDispatcher()).toBe(savedDispatcher);
  });

  it.each(["HTTP_PROXY", "http_proxy"])("routes a registry query through %s", async (name) => {
    const registry = await listen(registryServer());
    const proxy = await startProxy(registry);
    vi.stubEnv(name, proxy.origin);

    await expect(fetchLatestNpmVersion("@wang060919/pi-web", "1.202610.6", registry)).resolves.toBe("1.202610.8");
    expect(proxy.destinations).toEqual([new URL(registry).host]);
  });

  it("prefers the lowercase HTTPS proxy over HTTP and uppercase HTTPS proxies", async () => {
    const unused = await startProxy();
    const selected = await startProxy();
    vi.stubEnv("HTTP_PROXY", unused.origin);
    vi.stubEnv("HTTPS_PROXY", unused.origin);
    vi.stubEnv("https_proxy", selected.origin);

    await expect(fetchLatestNpmVersion("@wang060919/pi-web", "1.202610.6", "https://registry.example.invalid"))
      .rejects.toThrow(/fetch failed:/);
    expect(selected.destinations).toEqual(["registry.example.invalid:443"]);
    expect(unused.destinations).toEqual([]);
  });

  it.each(["NO_PROXY", "no_proxy"])("bypasses a proxy for an origin covered by %s", async (name) => {
    const registry = await listen(registryServer());
    const proxy = await startProxy();
    vi.stubEnv("HTTP_PROXY", proxy.origin);
    vi.stubEnv(name, "127.0.0.1");

    await expect(fetchLatestNpmVersion("@wang060919/pi-web", "1.202610.6", registry)).resolves.toBe("1.202610.8");
    expect(proxy.destinations).toEqual([]);
  });

  it("preserves the five-second request bound and closes the local dispatcher on failure", async () => {
    const close = vi.spyOn(EnvHttpProxyAgent.prototype, "close");
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(AbortSignal.abort(new DOMException("update timeout", "TimeoutError")));

    await expect(fetchLatestNpmVersion("@wang060919/pi-web", "1.202610.6"))
      .rejects.toThrow("update timeout");
    expect(timeout).toHaveBeenCalledWith(5000);
    expect(close).toHaveBeenCalled();
  });

  it("includes the underlying connection failure in the displayed error", async () => {
    const server = registryServer();
    const origin = await listen(server);
    await new Promise<void>((resolve) => { server.close(() => { resolve(); }); });

    await expect(fetchLatestNpmVersion("@wang060919/pi-web", "1.202610.6", origin))
      .rejects.toThrow(/fetch failed: connect ECONNREFUSED/);
  });

  it("closes an error response body before releasing the dispatcher", async () => {
    const close = vi.spyOn(EnvHttpProxyAgent.prototype, "close");
    const origin = await listen(registryServer((_request, response) => {
      response.writeHead(503, { "content-type": "text/plain" });
      response.end("registry temporarily unavailable");
    }));

    await expect(fetchLatestNpmVersion("@wang060919/pi-web", "1.202610.6", origin))
      .rejects.toThrow("npm registry returned HTTP 503");
    expect(close).toHaveBeenCalled();
  });

  it("keeps invalid proxy credentials out of the displayed configuration error", async () => {
    vi.stubEnv("HTTPS_PROXY", "http://secret-user:secret-token@[invalid");

    await expect(fetchLatestNpmVersion("@wang060919/pi-web", "1.202610.6"))
      .rejects.toThrow(/^Invalid npm update-check proxy configuration$/);
  });
});
