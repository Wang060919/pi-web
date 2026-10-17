import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ModelRuntime } from "@earendil-works/pi-coding-agent";
import type { LoadedMcpConfig, McpServerConfig, McpServerEntry, McpTransportFactory } from "@earendil-works/pi-coding-agent";
import { isMcpRecord } from "../../shared/mcpManagement.js";

export interface ManagedMcpConnection {
  state: string;
  tools: unknown[];
  oauthUrl: string | undefined;
  challenge: unknown;
  getClient: () => Promise<unknown>;
  oauthSettings(): unknown;
  close: () => Promise<void>;
}

export interface ManagedMcpCredentials {
  forServer(name: string, url: string): unknown;
  remove(name: string, url: string): boolean;
}

export interface ManagedMcpSdk {
  validate(name: string, config: unknown): McpServerConfig | string;
  loadConfig(options: { agentDir: string; cwd: string; projectTrusted: boolean }): LoadedMcpConfig;
  credentials(agentDir: string): ManagedMcpCredentials;
  connection: (entry: McpServerEntry, cwd: string, credentials: ManagedMcpCredentials, agentDir: string) => ManagedMcpConnection;
  signIn(options: { serverUrl: string; store: unknown; settings: unknown; challenge: unknown; signal: AbortSignal; prompt: { showAuthorizationUrl(url: URL): void; promptForRedirectUrl(signal: AbortSignal): Promise<string | undefined> } }): Promise<void>;
}

interface RuntimeModule {
  createDefaultTransport: McpTransportFactory;
  McpServerConnection: new (options: { entry: McpServerEntry; cwd: string; createTransport: McpTransportFactory; credentials: ManagedMcpCredentials; providerToken: (provider: string) => Promise<string | undefined>; onTools: () => void }) => ManagedMcpConnection;
  McpOAuthCredentialStore: new (backend: unknown, lockDir: string) => ManagedMcpCredentials;
  signInMcpServer: ManagedMcpSdk["signIn"];
}
interface ConfigModule { loadMcpConfig: ManagedMcpSdk["loadConfig"] }
interface ValidationModule { validateMcpServerConfig: ManagedMcpSdk["validate"] }
interface AuthModule { FileAuthStorageBackend: new (path: string) => unknown }

function isRuntime(value: unknown): value is RuntimeModule {
  return isMcpRecord(value) && ["createDefaultTransport", "McpServerConnection", "McpOAuthCredentialStore", "signInMcpServer"].every((key) => typeof value[key] === "function");
}
function isConfig(value: unknown): value is ConfigModule { return isMcpRecord(value) && typeof value["loadMcpConfig"] === "function"; }
function isValidation(value: unknown): value is ValidationModule { return isMcpRecord(value) && typeof value["validateMcpServerConfig"] === "function"; }
function isAuth(value: unknown): value is AuthModule { return isMcpRecord(value) && typeof value["FileAuthStorageBackend"] === "function"; }

/**
 * Pi 1.2 publicly exposes config types and an extension factory, but no standalone
 * connection/OAuth API. Keep this version-sensitive boundary in one lazy adapter;
 * never start a session or load project extensions merely to inspect MCP servers.
 */
export async function loadManagedMcpSdk(): Promise<ManagedMcpSdk> {
  const root = dirname(fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent")));
  async function load(path: string): Promise<unknown> { const value: unknown = await import(path); return value; }
  const [runtime, config, validation, auth]: unknown[] = await Promise.all([
    load(join(root, "extensions/mcp/runtime.js")), load(join(root, "extensions/mcp/config.js")),
    load(join(root, "core/mcp-servers.js")), load(join(root, "core/auth-storage.js")),
  ]);
  if (!isRuntime(runtime) || !isConfig(config) || !isValidation(validation) || !isAuth(auth)) throw new Error("This Pi version does not support MCP management");
  return {
    validate: validation.validateMcpServerConfig,
    loadConfig: config.loadMcpConfig,
    credentials: (agentDir) => new runtime.McpOAuthCredentialStore(new auth.FileAuthStorageBackend(join(agentDir, "mcp-auth.json")), agentDir),
    connection: (entry, cwd, credentials, agentDir) => {
      let modelRuntime: Promise<ModelRuntime> | undefined;
      return new runtime.McpServerConnection({
        entry, cwd, credentials, createTransport: runtime.createDefaultTransport,
        providerToken: async (provider) => {
          // Match Pi's MCP provider-auth path. The SDK reads and refreshes the
          // selected profile's credentials; MCP never retains a token copy.
          modelRuntime ??= ModelRuntime.create({ authPath: join(agentDir, "auth.json"), modelsPath: join(agentDir, "models.json"), allowModelNetwork: false, refreshOnCreate: false });
          return (await (await modelRuntime).getAuth(provider))?.auth.apiKey;
        },
        onTools: () => { /* Tool snapshots are read after initialization. */ },
      });
    },
    signIn: (options) => runtime.signInMcpServer(options),
  };
}
