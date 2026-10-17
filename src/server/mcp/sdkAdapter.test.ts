import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { McpServerEntry } from "@earendil-works/pi-coding-agent";
import { isMcpRecord } from "../../shared/mcpManagement.js";
import { McpRuntimeService } from "./runtimeService.js";
import { loadManagedMcpSdk } from "./sdkAdapter.js";

const directories: string[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function profile(key?: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "pi-web-mcp-provider-auth-"));
  directories.push(directory);
  await writeFile(join(directory, "models.json"), JSON.stringify({ providers: { "mcp-test-provider": { api: "openai-completions", baseUrl: "https://models.example.invalid/v1", models: [{ id: "test-model", contextWindow: 4096, maxTokens: 100 }] } } }));
  await writeFile(join(directory, "auth.json"), JSON.stringify(key === undefined ? {} : { "mcp-test-provider": { type: "api_key", key } }));
  return directory;
}

/** Fake only HTTP: exercise the installed SDK's credential and MCP transport paths offline. */
function httpFixture(expectedAuthorization: string): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetcher = vi.fn<typeof fetch>((_input, init) => {
    if (new Headers(init?.headers).get("authorization") !== expectedAuthorization) return Promise.resolve(new Response("Unauthorized", { status: 401 }));
    if (init?.method === "GET") return Promise.resolve(new Response(null, { status: 405 }));
    const parsed: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    if (!isMcpRecord(parsed) || parsed["id"] === undefined) return Promise.resolve(new Response(null, { status: 204 }));
    const params = parsed["params"];
    return Promise.resolve(Response.json({ jsonrpc: "2.0", id: parsed["id"], result: { protocolVersion: isMcpRecord(params) ? params["protocolVersion"] : undefined, capabilities: {}, serverInfo: { name: "offline-fixture", version: "1" } } }));
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

const entry: McpServerEntry = { name: "provider-auth", config: { url: "https://mcp.example.invalid/mcp", auth: { provider: "mcp-test-provider" } }, source: "/unused/mcp.json", scope: "global" };

describe("managed MCP provider authentication", () => {
  it("resolves the selected profile's stored provider token without copying it into MCP state", async () => {
    const sdk = await loadManagedMcpSdk();
    const runtime = new McpRuntimeService();
    try {
      for (const key of ["first-profile-key", "second-profile-key"]) {
        const agentDir = await profile(key);
        const original = await readFile(join(agentDir, "auth.json"), "utf8");
        const fetcher = httpFixture(`Bearer ${key}`);
        const result = await runtime.probe(sdk, entry, agentDir, agentDir);
        expect(result.state).toBe("connected");
        expect(fetcher).toHaveBeenCalled();
        expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${key}`);
        expect(JSON.stringify(result)).not.toContain(key);
        expect(await readFile(join(agentDir, "auth.json"), "utf8")).toBe(original);
      }
    } finally { await runtime.close(); }
  });

  it("does not reuse another profile's credential when the selected profile is signed out", async () => {
    const otherAgentDir = await profile("different-profile-key");
    const agentDir = await profile();
    const sdk = await loadManagedMcpSdk();
    const runtime = new McpRuntimeService();
    try {
      httpFixture("Bearer different-profile-key");
      expect((await runtime.probe(sdk, entry, otherAgentDir, otherAgentDir)).state).toBe("connected");
      const fetcher = httpFixture("Bearer unavailable-key");
      const result = await runtime.probe(sdk, entry, agentDir, agentDir);
      expect(result.state).toBe("needs-auth");
      expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).has("authorization")).toBe(false);
      expect(await readFile(join(agentDir, "auth.json"), "utf8")).toBe("{}");
    } finally { await runtime.close(); }
  });
});
