import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { McpServerEntry } from "@earendil-works/pi-coding-agent";
import { MCP_REDACTED_VALUE, isMcpRecord, type McpConfigScope, type McpManagedServer, type McpManagementSnapshot } from "../../shared/mcpManagement.js";
import { ensureInside, isNodeErrorWithCode } from "../workspaces/pathSafety.js";
import type { ManagedMcpSdk } from "./sdkAdapter.js";

const CONFIG_LIMIT_BYTES = 1024 * 1024;
const CONFIG_KEYS = new Set(["command", "args", "cwd", "type", "url", "headers", "env", "oauth", "auth", "enabled", "exposure", "toolExposure", "timeout", "description"]);
const PUBLIC_KEYS = new Set(["command", "cwd", "type", "enabled", "exposure", "toolExposure", "timeout", "description"]);
const pendingWrites = new Map<string, Promise<void>>();

export class McpManagementError extends Error {
  constructor(message: string, readonly statusCode = 400) { super(message); }
}

export interface McpConfigContext {
  agentDir: string;
  cwd: string;
  hasProject: boolean;
  projectTrusted: boolean;
}

interface ConfigFile { path: string; revision: string; text: string; value: Record<string, unknown>; servers: Record<string, unknown> }

function revision(text: string): string { return createHash("sha256").update(text).digest("hex"); }
function filePath(context: McpConfigContext, scope: McpConfigScope): string {
  if (scope === "project" && (!context.hasProject || !context.projectTrusted)) throw new McpManagementError("Trust the selected project before managing its MCP configuration", 403);
  return scope === "global" ? join(context.agentDir, "mcp.json") : join(context.cwd, ".pi", "mcp.json");
}

async function scopedConfigPath(context: McpConfigContext, scope: McpConfigScope): Promise<string> {
  const requested = filePath(context, scope);
  if (scope === "global") return requested;
  const root = await realpath(context.cwd);
  const parent = join(root, ".pi");
  try {
    // lstat distinguishes an absent directory from a dangling symlink: the
    // latter must not become permission to create a path outside the project.
    await lstat(parent);
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) return join(parent, "mcp.json");
    throw error;
  }
  let resolved: string;
  try { resolved = await realpath(parent); }
  catch { throw new McpManagementError("The project MCP configuration directory is not accessible"); }
  try { ensureInside(root, resolved); }
  catch { throw new McpManagementError("The project MCP configuration directory must stay inside the selected project", 403); }
  return join(resolved, "mcp.json");
}

async function readConfig(context: McpConfigContext, scope: McpConfigScope): Promise<ConfigFile> {
  const path = await scopedConfigPath(context, scope);
  let text = "";
  const entry = await lstat(path).catch((error: unknown) => {
    if (isNodeErrorWithCode(error, "ENOENT")) return undefined;
    throw error;
  });
  if (entry?.isSymbolicLink() === true) throw new McpManagementError("MCP configuration symbolic links must be edited at their target; this panel reads regular files only");
  const noFollow = process.platform === "win32" ? 0 : constants.O_NOFOLLOW;
  const nonBlocking = process.platform === "win32" ? 0 : constants.O_NONBLOCK;
  // Nonblocking open cannot wait forever for a FIFO writer. Never follow a
  // final symlink, including a user's global config link: report it clearly.
  const handle = await open(path, constants.O_RDONLY | noFollow | nonBlocking).catch((error: unknown) => {
    if (isNodeErrorWithCode(error, "ENOENT")) return undefined;
    if (isNodeErrorWithCode(error, "ELOOP")) throw new McpManagementError("MCP configuration symbolic links must be edited at their target; this panel reads regular files only");
    throw error;
  });
  if (handle !== undefined) {
    try {
      const opened = await handle.stat();
      if (!opened.isFile()) throw new McpManagementError("MCP configuration must be a regular file; devices, directories and FIFOs are not supported");
      if (opened.size > CONFIG_LIMIT_BYTES) throw new McpManagementError("MCP configuration is too large");
      // Recheck the parent and inode before reading, so replacing a directory
      // or final path while open was pending cannot redirect the byte read.
      if (await scopedConfigPath(context, scope) !== path) throw new McpManagementError("MCP configuration directory changed; reload before continuing", 409);
      const current = await lstat(path);
      if (current.isSymbolicLink()) throw new McpManagementError("MCP configuration symbolic links must be edited at their target; this panel reads regular files only");
      if (!current.isFile() || current.dev !== opened.dev || current.ino !== opened.ino) throw new McpManagementError("MCP configuration changed while opening; reload before continuing", 409);
      const buffer = Buffer.alloc(CONFIG_LIMIT_BYTES + 1);
      let length = 0;
      for (;;) {
        const result = await handle.read(buffer, length, Math.min(64 * 1024, buffer.length - length), length);
        length += result.bytesRead;
        if (length > CONFIG_LIMIT_BYTES) throw new McpManagementError("MCP configuration is too large");
        if (result.bytesRead === 0) break;
      }
      text = buffer.subarray(0, length).toString("utf8");
    } finally { await handle.close(); }
  }
  let value: unknown;
  try { value = text === "" ? {} : JSON.parse(text); } catch { throw new McpManagementError("MCP configuration contains invalid JSON"); }
  if (!isMcpRecord(value) || (value["mcpServers"] !== undefined && !isMcpRecord(value["mcpServers"]))) throw new McpManagementError("MCP configuration must contain an mcpServers object");
  return { path, text, revision: revision(text), value, servers: isMcpRecord(value["mcpServers"]) ? value["mcpServers"] : {} };
}

function maskValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskValue);
  if (isMcpRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, maskValue(item)]));
  return value === null || typeof value === "boolean" || typeof value === "number" ? value : MCP_REDACTED_VALUE;
}

/** No env/header/argument/extension-owned string values cross the browser boundary. */
export function redactMcpConfig(config: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(config).map(([key, value]) => {
    if (PUBLIC_KEYS.has(key)) return [key, value];
    if (key === "url" && typeof value === "string") {
      try {
        const url = new URL(value);
        if (url.username === "" && url.password === "" && url.search === "" && url.hash === "") return [key, value];
      } catch { /* Invalid URLs are kept confidential and reported during validation. */ }
    }
    return [key, maskValue(value)];
  }));
}

function restoreMasked(value: unknown, previous: unknown): unknown {
  if (value === MCP_REDACTED_VALUE) {
    if (previous === undefined) throw new McpManagementError("A masked value has no previous value; enter its replacement");
    return previous;
  }
  if (Array.isArray(value)) return value.map((item: unknown, index) => restoreMasked(item, Array.isArray(previous) ? previous[index] : undefined));
  if (isMcpRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, restoreMasked(item, isMcpRecord(previous) ? previous[key] : undefined)]));
  return value;
}

function preservedConfig(previous: unknown, submitted: Record<string, unknown>): Record<string, unknown> {
  const previousRecord = isMcpRecord(previous) ? previous : {};
  const unknownFields = Object.fromEntries(Object.entries(previousRecord).filter(([key]) => !CONFIG_KEYS.has(key)));
  const next = restoreMasked({ ...unknownFields, ...submitted }, previousRecord);
  if (!isMcpRecord(next)) throw new McpManagementError("Invalid MCP server configuration");
  return next;
}

function assertName(name: string): void {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(name)) throw new McpManagementError("MCP server names may contain only letters, numbers, underscores and hyphens");
}

function namespaceConflict(name: string, others: Iterable<string>): string | undefined {
  for (const other of others) if (other !== name && other.replaceAll("-", "_") === name.replaceAll("-", "_")) return other;
  return undefined;
}

async function assertWritablePath(path: string, scope: McpConfigScope): Promise<void> {
  for (const candidate of scope === "project" ? [dirname(path), path] : [path]) {
    try {
      if ((await lstat(candidate)).isSymbolicLink()) throw new McpManagementError("MCP configuration links must be edited at their target; this panel will not replace a symbolic link");
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
  }
}

/** Profile-wide serialization keeps global/project namespaces consistent across API aliases. */
export class McpConfigStore {
  async list(context: McpConfigContext): Promise<McpManagementSnapshot> {
    const servers: McpManagedServer[] = [];
    const errors: McpManagementSnapshot["errors"] = [];
    const revisions: McpManagementSnapshot["revisions"] = { global: "" };
    for (const scope of ["global", "project"] as const) {
      if (scope === "project" && (!context.hasProject || !context.projectTrusted)) continue;
      try {
        const data = await readConfig(context, scope);
        revisions[scope] = data.revision;
        for (const [name, config] of Object.entries(data.servers)) {
          if (!isMcpRecord(config)) { errors.push({ scope, message: "An MCP server entry is invalid" }); continue; }
          servers.push({ name, scope, source: data.path, revision: data.revision, config: redactMcpConfig(config), enabled: config["enabled"] !== false, overridden: false });
        }
      } catch (error) { errors.push({ scope, message: error instanceof McpManagementError ? error.message : "MCP configuration could not be read; check the file before editing" }); }
    }
    const effectiveNames = new Set<string>();
    for (const server of servers) {
      const conflict = namespaceConflict(server.name, effectiveNames);
      if (conflict !== undefined) errors.push({ scope: server.scope, message: `MCP server "${server.name}" conflicts with "${conflict}" in the effective tool namespace` });
      else effectiveNames.add(server.name);
      server.overridden = server.scope === "global" && servers.some((other) => other.scope === "project" && other.name === server.name);
      if (server.scope === "project" && server.config["command"] === undefined && server.config["url"] === undefined && server.config["enabled"] === undefined) {
        server.enabled = servers.find((other) => other.scope === "global" && other.name === server.name)?.enabled ?? true;
      }
    }
    return { servers, errors, revisions, hasProject: context.hasProject, projectTrusted: context.projectTrusted, requiresReload: true };
  }

  async write(context: McpConfigContext, scope: McpConfigScope, name: string, submitted: Record<string, unknown> | undefined, expectedRevision: string, sdk: Pick<ManagedMcpSdk, "validate">): Promise<void> {
    assertName(name);
    const path = await scopedConfigPath(context, scope);
    const writeKey = filePath(context, "global");
    const operation = (pendingWrites.get(writeKey) ?? Promise.resolve()).then(async () => {
      await assertWritablePath(path, scope);
      const data = await readConfig(context, scope);
      if (data.path !== path) throw new McpManagementError("MCP configuration directory changed; reload before saving", 409);
      if (data.revision !== expectedRevision && !(expectedRevision === "" && data.text === "")) throw new McpManagementError("MCP configuration changed; reload before saving", 409);
      if (submitted === undefined) data.servers = Object.fromEntries(Object.entries(data.servers).filter(([key]) => key !== name));
      else {
        const next = preservedConfig(Object.hasOwn(data.servers, name) ? data.servers[name] : undefined, submitted);
        const override = scope === "project" && next["command"] === undefined && next["url"] === undefined && next["type"] === undefined;
        if (override) {
          if (Object.keys(next).some((key) => !["enabled", "exposure", "toolExposure"].includes(key))) throw new McpManagementError("Project overrides may change only enabled, exposure and toolExposure");
          const global = await readConfig(context, "global");
          const base = global.servers[name];
          if (!isMcpRecord(base) || typeof sdk.validate(name, { ...base, ...next }) === "string") throw new McpManagementError("Invalid project MCP override");
        } else if (typeof sdk.validate(name, next) === "string") throw new McpManagementError("Invalid MCP server configuration; check its transport, arguments and authentication fields");
        if (scope === "project" && next["auth"] !== undefined) throw new McpManagementError("Provider credentials may only be configured globally");
        const peerNames = (await this.list(context)).servers.filter((server) => server.scope !== scope).map((server) => server.name);
        if (namespaceConflict(name, [...Object.keys(data.servers), ...peerNames]) !== undefined) throw new McpManagementError("MCP server name conflicts with an existing tool namespace");
        data.servers = Object.fromEntries([...Object.entries(data.servers).filter(([key]) => key !== name), [name, next]]);
      }
      data.value["mcpServers"] = data.servers;
      await mkdir(dirname(path), { recursive: true });
      if (await scopedConfigPath(context, scope) !== path) throw new McpManagementError("MCP configuration directory changed; reload before saving", 409);
      const temporary = `${path}.${randomUUID()}.tmp`;
      try {
        const indent = /^([ \t]+)\S/m.exec(data.text)?.[1] ?? "  ";
        await writeFile(temporary, `${JSON.stringify(data.value, null, indent)}\n`, { flag: "wx", mode: 0o600 });
        const latest = await readConfig(context, scope);
        if (latest.path !== path || latest.revision !== data.revision) throw new McpManagementError("MCP configuration changed; reload before saving", 409);
        await rename(temporary, path);
      } finally { await rm(temporary, { force: true }); }
    });
    const settled = operation.then(() => undefined, () => undefined);
    pendingWrites.set(writeKey, settled);
    void settled.then(() => { if (pendingWrites.get(writeKey) === settled) pendingWrites.delete(writeKey); });
    await operation;
  }

  async entry(context: McpConfigContext, scope: McpConfigScope, name: string, sdk: Pick<ManagedMcpSdk, "validate">): Promise<McpServerEntry> {
    assertName(name);
    const data = await readConfig(context, scope);
    let raw = Object.hasOwn(data.servers, name) ? data.servers[name] : undefined;
    let source = data.path;
    let override: string | undefined;
    if (scope === "project" && isMcpRecord(raw) && raw["command"] === undefined && raw["url"] === undefined && raw["type"] === undefined) {
      if (Object.keys(raw).some((key) => !["enabled", "exposure", "toolExposure"].includes(key))) throw new McpManagementError("Project overrides may change only enabled, exposure and toolExposure");
      const global = await readConfig(context, "global");
      const base = Object.hasOwn(global.servers, name) ? global.servers[name] : undefined;
      if (!isMcpRecord(base)) throw new McpManagementError("The global MCP server for this project override is unavailable", 404);
      raw = { ...base, ...raw };
      source = global.path;
      override = data.path;
    }
    if (!isMcpRecord(raw)) throw new McpManagementError("MCP server is unavailable in the selected scope", 404);
    if (scope === "project" && override === undefined && raw["auth"] !== undefined) throw new McpManagementError("Provider credentials may only be configured globally");
    const config = sdk.validate(name, raw);
    if (typeof config === "string") throw new McpManagementError("Invalid MCP server configuration; check its transport, arguments and authentication fields");
    return { name, config, source, scope: override === undefined ? scope : "global", ...(override === undefined ? {} : { override }) };
  }
}
