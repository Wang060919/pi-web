import { randomUUID } from "node:crypto";
import type { McpServerEntry } from "@earendil-works/pi-coding-agent";
import { isMcpRecord, type McpLoginFlow, type McpProbeResult } from "../../shared/mcpManagement.js";
import { McpManagementError } from "./configStore.js";
import type { ManagedMcpConnection, ManagedMcpSdk } from "./sdkAdapter.js";

interface LoginRun {
  view: McpLoginFlow;
  owner: string;
  abort: AbortController;
  timer: ReturnType<typeof setTimeout>;
  submit?: ((value: string | undefined) => void) | undefined;
  done: Promise<void>;
}

function publicTools(tools: unknown[]): McpProbeResult["tools"] {
  let characters = 0;
  return tools.slice(0, 500).flatMap((tool) => {
    if (!isMcpRecord(tool) || typeof tool["name"] !== "string") return [];
    const inputSchema = tool["inputSchema"];
    const description = typeof tool["description"] === "string" ? tool["description"].slice(0, 8000) : undefined;
    const next = { name: tool["name"].slice(0, 512), ...(description === undefined ? {} : { description }), ...(inputSchema === undefined ? {} : { inputSchema }) };
    characters += JSON.stringify(next).length;
    return characters <= 200_000 ? [next] : [];
  });
}

/** Explicit probes are isolated from live sessions and always close their transports. */
export class McpRuntimeService {
  private readonly connections = new Set<ManagedMcpConnection>();
  private readonly logins = new Map<string, LoginRun>();

  constructor(private readonly probeTimeoutMs = 12_000, private readonly loginTimeoutMs = 180_000) {}

  private open(sdk: ManagedMcpSdk, entry: McpServerEntry, cwd: string, agentDir: string): ManagedMcpConnection {
    const connection = sdk.connection({ ...entry, config: { ...entry.config, enabled: true, timeout: Math.min(entry.config.timeout ?? 12, 12) } }, cwd, sdk.credentials(agentDir), agentDir);
    this.connections.add(connection);
    return connection;
  }

  private async closeConnection(connection: ManagedMcpConnection): Promise<void> {
    try { await connection.close(); } finally { this.connections.delete(connection); }
  }

  async probe(sdk: ManagedMcpSdk, entry: McpServerEntry, cwd: string, agentDir: string): Promise<McpProbeResult> {
    if (this.connections.size >= 8) throw new McpManagementError("Too many MCP operations are running", 429);
    const connection = this.open(sdk, entry, cwd, agentDir);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = { expired: false };
    try {
      await Promise.race([
        connection.getClient(),
        new Promise<never>((_resolve, reject) => { timer = setTimeout(() => { deadline.expired = true; reject(new Error("MCP probe timed out")); }, this.probeTimeoutMs); }),
      ]);
      return { state: "connected", checkedAt: new Date().toISOString(), tools: publicTools(connection.tools) };
    } catch {
      // Server stderr and exception text can contain headers or credentials.
      return { state: deadline.expired ? "timeout" : connection.state === "needs-auth" ? "needs-auth" : "failed", checkedAt: new Date().toISOString(), tools: [] };
    } finally {
      clearTimeout(timer);
      await this.closeConnection(connection);
    }
  }

  startLogin(sdk: ManagedMcpSdk, entry: McpServerEntry, cwd: string, agentDir: string, owner: string): McpLoginFlow {
    if (this.connections.size >= 8 || this.logins.size >= 24) throw new McpManagementError("Too many MCP operations are running", 429);
    if (!("url" in entry.config) || entry.config.auth !== undefined || Object.keys(entry.config.headers ?? {}).some((key) => key.toLowerCase() === "authorization")) throw new McpManagementError("OAuth sign-in requires an HTTP server without an Authorization header or provider authentication");
    const connection = this.open(sdk, entry, cwd, agentDir);
    const id = randomUUID();
    const abort = new AbortController();
    const run: LoginRun = {
      owner, abort, view: { id, name: entry.name, state: "starting" },
      timer: setTimeout(() => { abort.abort(); }, this.loginTimeoutMs), done: Promise.resolve(),
    };
    this.logins.set(id, run);
    run.done = this.performLogin(sdk, connection, agentDir, entry.name, run);
    return { ...run.view };
  }

  private async performLogin(sdk: ManagedMcpSdk, connection: ManagedMcpConnection, agentDir: string, name: string, run: LoginRun): Promise<void> {
    try {
      // A failed unauthenticated connect supplies the server's OAuth challenge.
      await Promise.race([
        connection.getClient().catch(() => { /* Authentication challenges are expected before sign-in. */ }),
        new Promise<never>((_resolve, reject) => { run.abort.signal.addEventListener("abort", () => { reject(new Error("Sign-in cancelled")); }, { once: true }); }),
      ]);
      const url = connection.oauthUrl;
      if (url === undefined || run.abort.signal.aborted) throw new Error("Sign-in unavailable");
      await sdk.signIn({
        serverUrl: url, store: sdk.credentials(agentDir).forServer(name, url), settings: connection.oauthSettings(), challenge: connection.challenge, signal: run.abort.signal,
        prompt: {
          showAuthorizationUrl: (url) => {
            if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Unsupported authorization URL");
            run.view = { ...run.view, state: "waiting", authorizationUrl: url.href };
          },
          promptForRedirectUrl: (signal) => new Promise((resolve) => {
            const settle = (value: string | undefined) => { signal.removeEventListener("abort", onAbort); run.submit = undefined; resolve(value); };
            const onAbort = () => { settle(undefined); };
            run.submit = settle;
            if (signal.aborted) settle(undefined);
            else signal.addEventListener("abort", onAbort, { once: true });
          }),
        },
      });
      run.view = { id: run.view.id, name, state: "complete" };
    } catch {
      run.view = { id: run.view.id, name, state: run.abort.signal.aborted ? "cancelled" : "failed" };
    } finally {
      clearTimeout(run.timer);
      run.submit?.(undefined);
      try { await this.closeConnection(connection); } catch { run.view = { id: run.view.id, name, state: "failed" }; }
      // Completed authorization URLs and challenges are never retained.
      run.timer = setTimeout(() => { this.logins.delete(run.view.id); }, 5 * 60_000);
      run.timer.unref();
    }
  }

  private requireLogin(id: string, owner: string): LoginRun {
    const run = this.logins.get(id);
    if (run?.owner !== owner) throw new McpManagementError("MCP sign-in flow not found", 404);
    return run;
  }

  login(id: string, owner: string): McpLoginFlow { return { ...this.requireLogin(id, owner).view }; }

  submitRedirect(id: string, owner: string, redirectUrl: string): McpLoginFlow {
    const run = this.requireLogin(id, owner);
    if (run.submit === undefined || run.view.state !== "waiting") throw new McpManagementError("MCP sign-in is not awaiting a redirect URL", 409);
    if (redirectUrl.length > 16_384) throw new McpManagementError("Redirect URL is too long");
    let url: URL;
    try { url = new URL(redirectUrl); } catch { throw new McpManagementError("Enter the complete redirect URL"); }
    if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new McpManagementError("Redirect URL must use an HTTP loopback address");
    run.submit(redirectUrl);
    return { ...run.view };
  }

  cancelLogin(id: string, owner: string): McpLoginFlow {
    const run = this.requireLogin(id, owner);
    if (run.view.state !== "starting" && run.view.state !== "waiting") return { ...run.view };
    run.abort.abort();
    run.submit?.(undefined);
    return { id, name: run.view.name, state: "cancelled" };
  }

  async close(): Promise<void> {
    for (const run of this.logins.values()) { clearTimeout(run.timer); run.abort.abort(); run.submit?.(undefined); }
    await Promise.allSettled([...this.connections].map((connection) => this.closeConnection(connection)));
    await Promise.allSettled([...this.logins.values()].map((run) => run.done));
    for (const run of this.logins.values()) clearTimeout(run.timer);
    this.logins.clear();
  }
}
