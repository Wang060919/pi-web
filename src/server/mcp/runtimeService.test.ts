import { afterEach, describe, expect, it, vi } from "vitest";
import type { McpServerEntry } from "@earendil-works/pi-coding-agent";
import { McpRuntimeService } from "./runtimeService.js";
import type { ManagedMcpConnection, ManagedMcpSdk } from "./sdkAdapter.js";

function fakeConnection(): ManagedMcpConnection {
  return { state: "connected", tools: [{ name: "search", description: "Search docs", inputSchema: { type: "object" } }], oauthUrl: "https://example.com/mcp", challenge: undefined,
    getClient: vi.fn(() => Promise.resolve({})), oauthSettings: () => ({}), close: vi.fn(() => Promise.resolve()) };
}
function fakeSdk(connection: ManagedMcpConnection): ManagedMcpSdk {
  return { validate: () => ({ command: "node" }), loadConfig: () => ({ servers: [], errors: [] }),
    credentials: () => ({ forServer: () => ({}), remove: () => true }), connection: vi.fn(() => connection), signIn: vi.fn(() => Promise.resolve()) };
}
const entry: McpServerEntry = { name: "docs", config: { url: "https://example.com/mcp" }, source: "/tmp/agent/mcp.json", scope: "global" };
const runtimes: McpRuntimeService[] = [];
afterEach(async () => { await Promise.all(runtimes.splice(0).map((runtime) => runtime.close())); vi.useRealTimers(); });
function runtime(timeout = 100) { const instance = new McpRuntimeService(timeout, 1000); runtimes.push(instance); return instance; }

describe("isolated MCP operations", () => {
  it("runs in the selected cwd and closes a successful connection", async () => {
    const connection = fakeConnection();
    const sdk = fakeSdk(connection);
    const result = await runtime().probe(sdk, entry, "/worktree", "/active-agent");
    expect(result.state).toBe("connected");
    expect(result.tools).toMatchObject([{ name: "search" }]);
    expect(sdk.connection).toHaveBeenCalledWith(expect.objectContaining({ name: "docs" }), "/worktree", expect.anything(), "/active-agent");
    expect(connection.close).toHaveBeenCalledOnce();
  });

  it("times out and closes a stalled connection", async () => {
    vi.useFakeTimers();
    const connection = fakeConnection();
    connection.getClient = () => new Promise(() => { /* Deliberately stalled transport. */ });
    const pending = runtime(20).probe(fakeSdk(connection), entry, "/worktree", "/agent");
    await vi.advanceTimersByTimeAsync(21);
    expect((await pending).state).toBe("timeout");
    expect(connection.close).toHaveBeenCalledOnce();
  });

  it("never includes server exception text in a failed probe", async () => {
    const connection = fakeConnection();
    connection.state = "needs-auth";
    connection.getClient = () => Promise.reject(new Error("Authorization: Bearer private-secret"));
    const result = await runtime().probe(fakeSdk(connection), entry, "/worktree", "/agent");
    expect(result.state).toBe("needs-auth");
    expect(JSON.stringify(result)).not.toContain("private-secret");
    expect(connection.close).toHaveBeenCalledOnce();
  });

  it("completes sign-in using a pasted redirect and clears authorization data", async () => {
    const connection = fakeConnection();
    const sdk = fakeSdk(connection);
    sdk.signIn = async (options) => {
      options.prompt.showAuthorizationUrl(new URL("https://example.com/authorize?state=opaque"));
      const redirect = await options.prompt.promptForRedirectUrl(options.signal);
      expect(redirect).toBe("http://127.0.0.1:3000/callback?code=private&state=opaque");
    };
    const service = runtime();
    const flow = service.startLogin(sdk, entry, "/worktree", "/agent", "owner");
    await vi.waitFor(() => { expect(service.login(flow.id, "owner").state).toBe("waiting"); });
    expect(() => service.login(flow.id, "other-owner")).toThrow("not found");
    service.submitRedirect(flow.id, "owner", "http://127.0.0.1:3000/callback?code=private&state=opaque");
    await vi.waitFor(() => { expect(service.login(flow.id, "owner").state).toBe("complete"); });
    expect(service.login(flow.id, "owner").authorizationUrl).toBeUndefined();
    expect(connection.close).toHaveBeenCalledOnce();
  });

  it("cancels a pending login and shuts down its transport", async () => {
    const connection = fakeConnection();
    const sdk = fakeSdk(connection);
    sdk.signIn = async (options) => { options.prompt.showAuthorizationUrl(new URL("https://example.com/authorize")); await options.prompt.promptForRedirectUrl(options.signal); if (options.signal.aborted) throw new Error("cancelled"); };
    const service = runtime();
    const flow = service.startLogin(sdk, entry, "/worktree", "/agent", "owner");
    await vi.waitFor(() => { expect(service.login(flow.id, "owner").state).toBe("waiting"); });
    service.cancelLogin(flow.id, "owner");
    await vi.waitFor(() => { expect(service.login(flow.id, "owner").state).toBe("cancelled"); });
    expect(connection.close).toHaveBeenCalledOnce();
  });
});
