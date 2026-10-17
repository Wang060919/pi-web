import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { loadManagedMcpSdk } from "./sdkAdapter.js";
import { McpRuntimeService } from "./runtimeService.js";

it("probes an actual local stdio MCP server with the installed Pi SDK and terminates it", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pi-web-mcp-stdio-"));
  const script = join(directory, "fixture.cjs");
  const runtime = new McpRuntimeService(3000);
  try {
    await writeFile(script, `
const fs = require('node:fs');
const readline = require('node:readline');
fs.writeFileSync('process.json', JSON.stringify({pid:process.pid,cwd:process.cwd()}));
readline.createInterface({input:process.stdin}).on('line', line => {
  const message = JSON.parse(line);
  if (message.id === undefined) return;
  let result = {};
  if (message.method === 'initialize') result = {protocolVersion:message.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'fixture',version:'1'}};
  if (message.method === 'tools/list') result = {tools:[{name:'echo',description:'Echo tool',inputSchema:{type:'object',properties:{}}}]};
  process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,result})+'\\n');
});
`);
    const sdk = await loadManagedMcpSdk();
    const result = await runtime.probe(sdk, { name: "fixture", config: { command: process.execPath, args: [script] }, source: join(directory, "mcp.json"), scope: "global" }, directory, directory);
    expect(result.state).toBe("connected");
    expect(result.tools).toMatchObject([{ name: "echo" }]);
    const observed: unknown = JSON.parse(await readFile(join(directory, "process.json"), "utf8"));
    expect(observed).toMatchObject({ cwd: directory });
    if (typeof observed !== "object" || observed === null || !("pid" in observed) || typeof observed.pid !== "number") throw new Error("Missing fixture process id");
    const pid = observed.pid;
    expect(() => process.kill(pid, 0)).toThrow();
  } finally {
    await runtime.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 10_000);
