#!/usr/bin/env node
// Linux-only local development owner. Importing this module never starts services.
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { access, chmod, lstat, mkdir, open, readFile, readlink, rename, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const script = fileURLToPath(import.meta.url);
const root = resolve(dirname(script), "..");
const runtime = join(root, ".local", "dev");
const recordFile = join(runtime, "instance.json");
const logFile = join(runtime, "services.log");
const API_PORT = 8514;
const UI_PORT = 8515;
const uid = process.getuid?.();
const socketDir = join("/tmp", `pi-web-dev-${uid}-${createHash("sha256").update(root).digest("hex").slice(0, 12)}`);

export function developmentEnvironment(repoRoot, socketPath, source = process.env) {
  const local = join(repoRoot, ".local", "dev");
  // An allowlist also prevents API keys, deprecated profile aliases, NODE_OPTIONS,
  // AppImage LD_LIBRARY_PATH, and production file/daemon overrides leaking in.
  return {
    PATH: source.PATH ?? "/usr/local/bin:/usr/bin:/bin",
    HOME: source.HOME ?? homedir(),
    USER: source.USER ?? String(uid),
    SHELL: "/usr/bin/zsh",
    LANG: source.LANG ?? "C.UTF-8",
    TERM: source.TERM ?? "xterm-256color",
    PI_WEB_CONFIG: join(local, "config.json"),
    PI_WEB_DATA_DIR: join(local, "state"),
    PI_WEB_HOST: "127.0.0.1",
    PI_WEB_PORT: String(API_PORT),
    PI_WEB_SESSIOND_SOCKET: socketPath,
    PI_CODING_AGENT_DIR: join(local, "agent"),
    PI_CODING_AGENT_SESSION_DIR: join(local, "sessions"),
    PI_WEB_OFFLINE: "1",
    PI_OFFLINE: "1",
    PI_WEB_SKIP_VERSION_CHECK: "1",
  };
}

export function parseProcessStat(value) {
  const end = value.lastIndexOf(")");
  if (end < 0) throw new Error("Invalid Linux process stat");
  const fields = value.slice(end + 2).trim().split(/\s+/u);
  return { group: Number(fields[2]), session: Number(fields[3]), startTime: fields[19] };
}

async function processIdentity(pid) {
  try {
    const [details, command, cwd, metadata] = await Promise.all([
      readFile(`/proc/${pid}/stat`, "utf8"), readFile(`/proc/${pid}/cmdline`, "utf8"),
      readlink(`/proc/${pid}/cwd`), stat(`/proc/${pid}`),
    ]);
    return { ...parseProcessStat(details), pid, args: command.split("\0").filter(Boolean), cwd, uid: metadata.uid };
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ESRCH") return undefined;
    throw error;
  }
}

export function ownsRunner(record, identity, expectedRoot = root, expectedScript = script, expectedUid = uid) {
  return identity !== undefined && record?.root === expectedRoot && Number.isInteger(record.pid) && record.pid > 1
    && record.pid === identity.pid && identity.uid === expectedUid && identity.cwd === expectedRoot
    && record.startTime === identity.startTime && identity.group === record.pid && identity.session === record.pid
    && identity.args.length === 4 && identity.args[1] === expectedScript && identity.args[2] === "--run"
    && typeof record.token === "string" && record.token.length > 0 && identity.args[3] === record.token;
}

async function readRecord() {
  try { return JSON.parse(await readFile(recordFile, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
}

async function ownedRecord() {
  const record = await readRecord();
  if (record === undefined) return undefined;
  const identity = await processIdentity(record.pid);
  if (identity === undefined) return undefined;
  if (!ownsRunner(record, identity)) throw new Error(`PID ${record.pid} does not match this development owner; no signal was sent. Inspect ${recordFile}.`);
  return record;
}

async function initialize() {
  for (const folder of [join(root, ".local"), runtime, ...["state", "agent", "sessions"].map((name) => join(runtime, name))]) {
    await mkdir(folder, { recursive: true, mode: 0o700 });
    const metadata = await lstat(folder);
    if (!metadata.isDirectory() || metadata.uid !== uid) throw new Error(`Development directory must be owned by this user and cannot be a symlink: ${folder}`);
  }
  for (const [name, contents] of [[".gitignore", "*\n"], ["config.json", "{}\n"]]) {
    try { await writeFile(join(runtime, name), contents, { flag: "wx", mode: 0o600 }); }
    catch (error) { if (error.code !== "EEXIST") throw error; }
    const metadata = await lstat(join(runtime, name));
    if (!metadata.isFile() || metadata.uid !== uid) throw new Error(`Development file must be owned by this user and cannot be a symlink: ${name}`);
  }
  try { await mkdir(socketDir, { mode: 0o700 }); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
  const socketMetadata = await lstat(socketDir);
  if (!socketMetadata.isDirectory() || socketMetadata.uid !== uid || (socketMetadata.mode & 0o077) !== 0) {
    throw new Error(`Socket directory must be a private directory owned by this user: ${socketDir}`);
  }
  await chmod(runtime, 0o700);
}

async function withActionLock(action) {
  const lockFile = join(runtime, "action.lock");
  const identity = await processIdentity(process.pid);
  let lock;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try { lock = await open(lockFile, "wx", 0o600); break; }
    catch (error) {
      if (error.code !== "EEXIST") throw error;
      const previous = JSON.parse(await readFile(lockFile, "utf8"));
      const live = await processIdentity(previous.pid);
      if (live !== undefined && live.startTime === previous.startTime) throw new Error("Another development start/stop operation is running.");
      await rm(lockFile);
    }
  }
  if (lock === undefined) throw new Error("Could not acquire development action lock.");
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, startTime: identity.startTime }));
    return await action();
  } finally { await lock.close(); await rm(lockFile); }
}

async function checkPort(port) {
  await new Promise((resolveCheck, reject) => {
    const server = createServer();
    server.once("error", (error) => reject(new Error(`Port ${port} is unavailable; its current owner was left running. ${error.message}`)));
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => server.close((error) => error ? reject(error) : resolveCheck()));
  });
}

async function healthy() {
  try {
    const results = await Promise.all([
      fetch(`http://127.0.0.1:${API_PORT}/api/sessiond/health`, { signal: AbortSignal.timeout(750) }),
      fetch(`http://127.0.0.1:${UI_PORT}/api/pi-web/health`, { signal: AbortSignal.timeout(750) }),
    ]);
    const bodies = await Promise.all(results.map((result) => result.json()));
    return results.every((result) => result.ok) && bodies.every((body) => body.ok === true);
  } catch { return false; } // An unready/missing server is an expected probe failure.
}

async function stopRecord(record) {
  if (!ownsRunner(record, await processIdentity(record.pid))) throw new Error("Development owner changed; refusing to signal it.");
  try { process.kill(-record.pid, "SIGTERM"); }
  catch (error) { if (error.code === "ESRCH") return; throw error; }
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    const identity = await processIdentity(record.pid);
    if (identity === undefined) return;
    if (!ownsRunner(record, identity)) throw new Error("Development owner changed while stopping; no further signals sent.");
    await delay(100);
  }
  // Only the verified, dedicated development group can reach this fallback.
  if (ownsRunner(record, await processIdentity(record.pid))) process.kill(-record.pid, "SIGKILL");
  await delay(100);
}

async function start() {
  if (await ownedRecord()) { console.log(`Already running: http://127.0.0.1:${UI_PORT}`); return; }
  for (const file of ["dist/server/index.js", "dist/server/sessiond.js", "dist/.plugins-ready", "node_modules/vite/bin/vite.js"]) {
    try { await access(join(root, file)); }
    catch (error) { throw new Error(`Missing ${file}. Run npm ci and npm run build first. ${error.message}`); }
  }
  await checkPort(API_PORT);
  await checkPort(UI_PORT);
  const token = randomUUID();
  const output = await open(logFile, "a", 0o600);
  let child;
  try {
    child = spawn(process.execPath, [script, "--run", token], {
      cwd: root, env: developmentEnvironment(root, join(socketDir, "sessiond.sock")),
      detached: true, stdio: ["ignore", output.fd, output.fd],
    });
    await new Promise((resolveSpawn, reject) => { child.once("spawn", resolveSpawn); child.once("error", reject); });
    child.unref();
  } finally { await output.close(); }
  let interrupted = false;
  const interrupt = () => { interrupted = true; };
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  try {
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline && !interrupted) {
      const record = await readRecord();
      if (record?.token === token && ownsRunner(record, await processIdentity(child.pid))) {
        if (await healthy()) {
          console.log(`Started: http://127.0.0.1:${UI_PORT}\nAPI: http://127.0.0.1:${API_PORT}\nOwner PID: ${record.pid}\nLogs: ${logFile}`);
          return;
        }
      } else if (await processIdentity(child.pid) === undefined) break;
      await delay(200);
    }
    const identity = await processIdentity(child.pid);
    // Ctrl+C can arrive before the owner has published instance.json. Its spawn
    // PID plus token/cmdline still identifies only the process we just created.
    const record = { root, pid: child.pid, startTime: identity?.startTime, token };
    if (ownsRunner(record, identity)) await stopRecord(record);
    throw new Error(`${interrupted ? "Startup interrupted" : "Development services did not become healthy within 45 seconds"}. Inspect ${logFile}.`);
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }
}

async function run(token) {
  if (!/^[0-9a-f-]{36}$/u.test(token ?? "")) throw new Error("Invalid development owner token.");
  const identity = await processIdentity(process.pid);
  const record = { root, pid: process.pid, startTime: identity.startTime, token, socket: join(socketDir, "sessiond.sock"), startedAt: new Date().toISOString() };
  if (!ownsRunner(record, identity)) throw new Error("Development owner must run in its own process group and session.");
  const temporaryRecord = `${recordFile}.${token}.tmp`;
  await writeFile(temporaryRecord, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryRecord, recordFile);
  const children = [];
  let finishing = false;
  let complete;
  const completed = new Promise((resolveRun) => { complete = resolveRun; });
  const finish = (code) => { if (!finishing) { finishing = true; complete(code); } };
  const onInterrupt = () => finish(130);
  const onTerminate = () => finish(0);
  process.once("SIGINT", onInterrupt);
  process.once("SIGTERM", onTerminate);
  console.log(`\n[dev-local] ${record.startedAt} owner=${record.pid}`);
  try {
    for (const [name, entry, args] of [
      ["sessiond", "dist/server/sessiond.js", []],
      ["api", "dist/server/index.js", []],
      ["vite", "node_modules/vite/bin/vite.js", ["--host", "127.0.0.1", "--port", String(UI_PORT), "--strictPort"]],
    ]) {
      const child = spawn(process.execPath, [join(root, entry), ...args], {
        cwd: root, env: developmentEnvironment(root, record.socket), stdio: "inherit",
      });
      children.push(child);
      child.once("error", (error) => { console.error(`[dev-local] ${name}:`, error); finish(1); });
      child.once("exit", (code, signal) => {
        if (!finishing) console.error(`[dev-local] ${name} exited: code=${code} signal=${signal}`);
        finish(code === 0 ? 1 : (code ?? 1));
      });
    }
    process.exitCode = await completed;
  } finally {
    const live = () => children.filter((child) => child.pid !== undefined && child.exitCode === null && child.signalCode === null);
    for (const child of live()) child.kill("SIGTERM");
    const deadline = Date.now() + 8_000;
    while (live().length > 0 && Date.now() < deadline) await delay(100);
    // These are still-live ChildProcess objects owned by this supervisor.
    for (const child of live()) child.kill("SIGKILL");
    await Promise.all(live().map((child) => new Promise((resolveExit) => child.once("exit", resolveExit))));
    if ((await readRecord())?.token === token) await rm(recordFile);
    process.removeListener("SIGINT", onInterrupt);
    process.removeListener("SIGTERM", onTerminate);
    console.log("[dev-local] stopped");
  }
}

async function main(command, token) {
  if (process.platform !== "linux") throw new Error("This local launcher currently supports Linux only.");
  if (command === "--run") { await run(token); return; }
  if (command === "status") {
    const record = await ownedRecord();
    if (record === undefined) { console.log("Stopped (no matching live development owner)."); return; }
    const ready = await healthy();
    console.log(`${ready ? "Running" : "Starting or unhealthy"}: http://127.0.0.1:${UI_PORT}\nOwner PID: ${record.pid}\nLogs: ${logFile}`);
    if (!ready) process.exitCode = 1;
    return;
  }
  if (command !== "start" && command !== "stop") throw new Error("Usage: node scripts/dev-local.mjs start|stop|status");
  await initialize();
  await withActionLock(async () => {
    if (command === "start") { await start(); return; }
    const record = await ownedRecord();
    if (record === undefined) { console.log("Already stopped."); return; }
    await stopRecord(record);
    console.log("Development services stopped.");
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { await main(process.argv[2], process.argv[3]); }
  catch (error) { console.error(`[dev-local] ${error.message}`); process.exitCode = 1; }
}
