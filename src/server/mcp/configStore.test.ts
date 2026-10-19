import { mkdtemp, mkdir, readFile, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MCP_REDACTED_VALUE } from "../../shared/mcpManagement.js";
import { McpConfigStore, type McpConfigContext } from "./configStore.js";
import { loadManagedMcpSdk, type ManagedMcpSdk } from "./sdkAdapter.js";

let directory: string;
let context: McpConfigContext;
let sdk: ManagedMcpSdk;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "pi-web-mcp-config-"));
  context = { agentDir: join(directory, "agent"), cwd: join(directory, "project"), hasProject: true, projectTrusted: true };
  await Promise.all([mkdir(context.agentDir), mkdir(join(context.cwd, ".pi"), { recursive: true })]);
  sdk = await loadManagedMcpSdk();
});
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

describe("MCP config management", () => {
  it("redacts credentials and arguments, and preserves them and unrelated fields on save", async () => {
    const path = join(context.agentDir, "mcp.json");
    const original = { autoEnableCodemode: false, future: { keep: true }, mcpServers: {
      docs: { url: "https://example.com/mcp?api_key=private", headers: { Authorization: "Bearer secret" }, oauth: { clientSecret: "oauth-secret" }, customFuture: { token: "future-secret" } },
      local: { command: "node", args: ["server.js", "--token=argument-secret"], env: { TOKEN: "env-secret" } },
    } };
    await writeFile(path, JSON.stringify(original));
    const store = new McpConfigStore();
    const snapshot = await store.list(context);
    const serialized = JSON.stringify(snapshot);
    for (const secret of ["private", "Bearer secret", "oauth-secret", "future-secret", "argument-secret", "env-secret"]) expect(serialized).not.toContain(secret);
    const entry = snapshot.servers.find((server) => server.name === "local");
    expect(entry).toBeDefined();
    expect(entry?.config["args"]).toEqual([MCP_REDACTED_VALUE, MCP_REDACTED_VALUE]);
    await store.write(context, "global", "local", { ...entry?.config, enabled: false }, snapshot.revisions.global, sdk);
    const updated: unknown = JSON.parse(await readFile(path, "utf8"));
    expect(updated).toEqual({ ...original, mcpServers: { ...original.mcpServers, local: { ...original.mcpServers.local, enabled: false } } });
    if (process.platform !== "win32") expect((await stat(path)).mode & 0o777).toBe(0o600);
  });

  it("does not read project configuration until trust has been granted", async () => {
    await writeFile(join(context.cwd, ".pi", "mcp.json"), '{"mcpServers":{"unsafe":{"command":"must-not-run"}}}');
    const snapshot = await new McpConfigStore().list({ ...context, projectTrusted: false });
    expect(snapshot.servers).toEqual([]);
    expect(snapshot.projectTrusted).toBe(false);
    expect(snapshot.revisions.project).toBeUndefined();
  });

  it("rejects stale saves without destroying external edits", async () => {
    const store = new McpConfigStore();
    const first = await store.list(context);
    const path = join(context.agentDir, "mcp.json");
    const external = '{"external":true,"mcpServers":{}}';
    await writeFile(path, external);
    await expect(store.write(context, "global", "new", { command: "node" }, first.revisions.global, sdk)).rejects.toMatchObject({ statusCode: 409 });
    expect(await readFile(path, "utf8")).toBe(external);
  });

  it("supports trusted project enabled overrides without copying global secrets", async () => {
    await writeFile(join(context.agentDir, "mcp.json"), JSON.stringify({ mcpServers: { docs: { url: "https://example.com/mcp", headers: { Authorization: "Bearer secret" } } } }));
    const store = new McpConfigStore();
    const first = await store.list(context);
    await store.write(context, "project", "docs", { enabled: false }, first.revisions.project ?? "", sdk);
    expect(await readFile(join(context.cwd, ".pi", "mcp.json"), "utf8")).not.toContain("secret");
    const entry = await store.entry(context, "project", "docs", sdk);
    expect(entry.config.enabled).toBe(false);
    expect((await new McpConfigStore().entry(context, "global", "docs", sdk)).config.enabled).toBeUndefined();
  });

  it.each(["global", "project"] as const)("rejects namespace collisions with the other scope before a %s save", async (scope) => {
    const global = join(context.agentDir, "mcp.json");
    const project = join(context.cwd, ".pi", "mcp.json");
    await writeFile(global, JSON.stringify({ mcpServers: scope === "global" ? {} : { "my-tools": { command: "node" } } }));
    await writeFile(project, JSON.stringify({ mcpServers: scope === "project" ? {} : { my_tools: { command: "node" } } }));
    const before = await Promise.all([readFile(global, "utf8"), readFile(project, "utf8")]);
    const store = new McpConfigStore();
    const snapshot = await store.list(context);
    await expect(store.write(context, scope, scope === "global" ? "my-tools" : "my_tools", { command: "node" }, snapshot.revisions[scope] ?? "", sdk)).rejects.toThrow("existing tool namespace");
    expect(await Promise.all([readFile(global, "utf8"), readFile(project, "utf8")])).toEqual(before);
  });

  it("reports existing cross-scope collisions that cause Pi to omit the project server", async () => {
    await writeFile(join(context.agentDir, "mcp.json"), JSON.stringify({ mcpServers: { "my-tools": { command: "node" } } }));
    await writeFile(join(context.cwd, ".pi", "mcp.json"), JSON.stringify({ mcpServers: { my_tools: { command: "node" } } }));
    const store = new McpConfigStore();
    const snapshot = await store.list(context);
    expect(snapshot.errors.find((error) => error.scope === "project")?.message).toContain('"my_tools" conflicts with "my-tools"');
    const actual = sdk.loadConfig({ agentDir: context.agentDir, cwd: context.cwd, projectTrusted: true });
    expect(actual.servers.map((server) => server.name)).toEqual(["my-tools"]);
    expect(actual.errors[0]).toContain("conflicts");
    const untrusted = await store.list({ ...context, projectTrusted: false });
    expect(untrusted.servers.map((server) => server.name)).toEqual(["my-tools"]);
    expect(untrusted.errors).toEqual([]);
  });

  it("serializes concurrent cross-scope saves across store instances for the same profile", async () => {
    const globalStore = new McpConfigStore();
    const projectStore = new McpConfigStore();
    const snapshot = await globalStore.list(context);
    const outcomes = await Promise.allSettled([
      globalStore.write(context, "global", "my-tools", { command: "node" }, snapshot.revisions.global, sdk),
      projectStore.write(context, "project", "my_tools", { command: "node" }, snapshot.revisions.project ?? "", sdk),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === "rejected");
    expect(rejected?.status === "rejected" ? rejected.reason : undefined).toMatchObject({ message: "MCP server name conflicts with an existing tool namespace" });
    expect((await globalStore.list(context)).errors).toEqual([]);
    const actual = sdk.loadConfig({ agentDir: context.agentDir, cwd: context.cwd, projectTrusted: true });
    expect(actual.servers).toHaveLength(1);
    expect(actual.errors).toEqual([]);
  });

  it("keeps independent global and project saves usable when they arrive together", async () => {
    const globalStore = new McpConfigStore();
    const projectStore = new McpConfigStore();
    const snapshot = await globalStore.list(context);
    await Promise.all([
      globalStore.write(context, "global", "global-tools", { command: "node" }, snapshot.revisions.global, sdk),
      projectStore.write(context, "project", "project-tools", { command: "node" }, snapshot.revisions.project ?? "", sdk),
    ]);
    const actual = sdk.loadConfig({ agentDir: context.agentDir, cwd: context.cwd, projectTrusted: true });
    expect(actual.servers.map((server) => server.name)).toEqual(["global-tools", "project-tools"]);
    expect(actual.errors).toEqual([]);
  });

  it("allows the same exact name to replace the global server in a trusted project", async () => {
    await writeFile(join(context.agentDir, "mcp.json"), JSON.stringify({ mcpServers: { "my-tools": { command: "global-command" } } }));
    const store = new McpConfigStore();
    const snapshot = await store.list(context);
    await store.write(context, "project", "my-tools", { command: "project-command" }, snapshot.revisions.project ?? "", sdk);
    expect((await store.list(context)).errors).toEqual([]);
    const actual = sdk.loadConfig({ agentDir: context.agentDir, cwd: context.cwd, projectTrusted: true });
    expect(actual.errors).toEqual([]);
    expect(actual.servers).toMatchObject([{ name: "my-tools", scope: "project", config: { command: "project-command" } }]);
  });

  it("rejects project writes before trust and malformed existing files without overwriting them", async () => {
    const store = new McpConfigStore();
    await expect(store.write({ ...context, projectTrusted: false }, "project", "x", { command: "node" }, "", sdk)).rejects.toMatchObject({ statusCode: 403 });
    const path = join(context.agentDir, "mcp.json");
    await writeFile(path, "broken JSON");
    await expect(store.write(context, "global", "x", { command: "node" }, "", sdk)).rejects.toThrow("invalid JSON");
    expect(await readFile(path, "utf8")).toBe("broken JSON");
  });

  it("does not replace a user's symlink with a regular configuration file", async () => {
    const destination = join(directory, "shared-mcp.json");
    const original = '{"mcpServers":{"docs":{"command":"node"}}}';
    await writeFile(destination, original);
    await symlink(destination, join(context.agentDir, "mcp.json"));
    const store = new McpConfigStore();
    const snapshot = await store.list(context);
    expect(snapshot.servers).toEqual([]);
    expect(snapshot.errors.find((error) => error.scope === "global")?.message).toContain("symbolic links");
    await expect(store.entry(context, "global", "docs", sdk)).rejects.toThrow("symbolic links");
    await expect(store.write(context, "global", "docs", { command: "node", enabled: false }, snapshot.revisions.global, sdk)).rejects.toThrow("symbolic link");
    expect(await readFile(destination, "utf8")).toBe(original);
  });

  it.skipIf(process.platform === "win32")("rejects a FIFO without waiting for a writer and does not replace it", async () => {
    const path = join(context.agentDir, "mcp.json");
    execFileSync("mkfifo", [path], { timeout: 1000 });
    const store = new McpConfigStore();
    const snapshot = await store.list(context);
    expect(snapshot.servers).toEqual([]);
    expect(snapshot.errors.find((error) => error.scope === "global")?.message).toContain("regular file");
    await expect(store.entry(context, "global", "docs", sdk)).rejects.toThrow("regular file");
    await expect(store.write(context, "global", "docs", { command: "node" }, "", sdk)).rejects.toThrow("regular file");
    expect((await stat(path)).isFIFO()).toBe(true);
  }, 2000);

  it("does not read or write through a project configuration directory outside the project", async () => {
    const outside = join(directory, "outside");
    await mkdir(outside);
    const original = '{"mcpServers":{"outside-secret-name":{"command":"outside-secret-command"}}}';
    await writeFile(join(outside, "mcp.json"), original);
    await rm(join(context.cwd, ".pi"), { recursive: true });
    await symlink(outside, join(context.cwd, ".pi"));
    const store = new McpConfigStore();
    const snapshot = await store.list(context);
    expect(snapshot.servers).toEqual([]);
    expect(JSON.stringify(snapshot)).not.toContain("outside-secret");
    expect(snapshot.errors.find((error) => error.scope === "project")?.message).toContain("inside the selected project");
    await expect(store.entry(context, "project", "outside-secret-name", sdk)).rejects.toMatchObject({ statusCode: 403 });
    await expect(store.write(context, "project", "docs", { command: "node" }, "", sdk)).rejects.toMatchObject({ statusCode: 403 });
    expect(await readFile(join(outside, "mcp.json"), "utf8")).toBe(original);
  });

  it("rejects project file links before reading their target", async () => {
    const outside = join(directory, "private.json");
    await writeFile(outside, '{"mcpServers":{"outside-secret-name":{"command":"node"}}}');
    await symlink(outside, join(context.cwd, ".pi", "mcp.json"));
    const store = new McpConfigStore();
    const snapshot = await store.list(context);
    expect(snapshot.servers).toEqual([]);
    expect(JSON.stringify(snapshot)).not.toContain("outside-secret-name");
    expect(snapshot.errors.find((error) => error.scope === "project")?.message).toContain("symbolic links");
    await expect(store.entry(context, "project", "outside-secret-name", sdk)).rejects.toThrow("symbolic links");
  });

  it("accepts a project configuration directory link whose canonical target stays in the project", async () => {
    const inside = join(context.cwd, "configuration");
    await mkdir(inside);
    await writeFile(join(inside, "mcp.json"), '{"mcpServers":{"local":{"command":"node"}}}');
    await rm(join(context.cwd, ".pi"), { recursive: true });
    await symlink(inside, join(context.cwd, ".pi"));
    const store = new McpConfigStore();
    const snapshot = await store.list(context);
    expect(snapshot.servers.map((server) => server.name)).toEqual(["local"]);
    expect((await store.entry(context, "project", "local", sdk)).source).toBe(await realpath(join(inside, "mcp.json")));
    await store.write(context, "project", "local", { command: "node", enabled: false }, snapshot.revisions.project ?? "", sdk);
    expect((await store.list(context)).servers[0]?.enabled).toBe(false);
  });

  it("stores a valid prototype-like server name as an own JSON key", async () => {
    const store = new McpConfigStore();
    const snapshot = await store.list(context);
    await store.write(context, "global", "__proto__", { command: "node" }, snapshot.revisions.global, sdk);
    expect((await store.list(context)).servers.map((server) => server.name)).toEqual(["__proto__"]);
  });
});
