import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { afterEach, expect, it } from "vitest";
import { seedDevelopmentDemo } from "./dev-demo-data.mjs";
import { developmentDemoPlugin } from "./dev-demo-plugin.mjs";

const roots = [];
const servers = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve, reject) => {
    server.closeAllConnections();
    server.close((error) => error ? reject(error) : resolve());
  })));
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function temporaryRoot() {
  const root = await mkdtemp(join(tmpdir(), "pi-web-demo-test-"));
  roots.push(root);
  return root;
}

it("loads SDK-readable conversations and preserves existing projects, sessions, and sample edits on repeat", async () => {
  const root = await temporaryRoot();
  const local = join(root, ".local/dev");
  await mkdir(join(local, "state"), { recursive: true });
  await mkdir(join(local, "sessions"), { recursive: true });
  const existing = { id: "existing", name: "Existing project", path: root, createdAt: "2026-10-01T00:00:00Z" };
  await writeFile(join(local, "state/projects.json"), JSON.stringify({ projects: [existing] }));
  await writeFile(join(local, "sessions/existing.jsonl"), "existing session\n");

  const catalog = await seedDevelopmentDemo(root);
  expect(catalog.projects).toHaveLength(2);
  expect(catalog.sessions.length).toBeGreaterThanOrEqual(7);
  for (const session of catalog.sessions) {
    expect(session.url).toMatch(/^\?project=/);
    for (const base of ["http://127.0.0.1:8517/", "http://localhost:8515/pi/"]) {
      const destination = new URL(session.url, base);
      expect(destination.origin).toBe(new URL(base).origin);
      expect(destination.pathname).toBe(new URL(base).pathname);
      expect(destination.searchParams.get("session")).toBe(session.id);
    }
  }
  const files = (await readdir(join(local, "sessions"))).filter((name) => name !== "existing.jsonl");
  for (const file of files) {
    const manager = SessionManager.open(join(local, "sessions", file));
    expect(catalog.sessions.some((session) => session.id === manager.getSessionId() && session.name === manager.getSessionName())).toBe(true);
    expect(manager.buildSessionContext().messages.length).toBeGreaterThan(1);
  }
  expect(files).toHaveLength(catalog.sessions.length);
  const sample = join(catalog.projects[0].path, "README.md");
  await writeFile(sample, "User edited this sample.\n");
  const sessionPath = join(local, "sessions", files[0]);
  const before = await readFile(sessionPath, "utf8");
  const repeated = await seedDevelopmentDemo(root);
  expect(repeated.sessions).toEqual(catalog.sessions);
  expect(await readFile(sample, "utf8")).toBe("User edited this sample.\n");
  expect(await readFile(sessionPath, "utf8")).toBe(before);
  expect(await readFile(join(local, "sessions/existing.jsonl"), "utf8")).toBe("existing session\n");
  const projects = JSON.parse(await readFile(join(local, "state/projects.json"), "utf8")).projects;
  expect(projects).toHaveLength(3);
  expect(projects).toContainEqual(existing);
});

it("refuses a symlinked development directory without writing into its target", async () => {
  const root = await temporaryRoot();
  const outside = await temporaryRoot();
  await mkdir(join(root, ".local"));
  await symlink(outside, join(root, ".local/dev"));
  await expect(seedDevelopmentDemo(root)).rejects.toThrow();
  expect(await readdir(outside)).toEqual([]);
});

async function demoServer(root, enabled = true) {
  let middleware;
  developmentDemoPlugin(root, enabled).configureServer({ middlewares: { use: (handler) => { middleware = handler; } } });
  const server = createServer((request, response) => {
    const next = () => { response.statusCode = 404; response.end(); };
    if (middleware === undefined) next();
    else middleware(request, response, next);
  });
  servers.push(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

it("exposes the seed action only to a same-origin local JSON POST", async () => {
  const root = await temporaryRoot();
  const origin = await demoServer(root);
  const url = `${origin}/api/dev-demo`;
  expect((await fetch(url)).status).toBe(405);
  expect((await fetch(url, { method: "POST", headers: { Origin: "https://external.example", "Content-Type": "application/json" }, body: "{}" })).status).toBe(403);
  expect((await fetch(url, { method: "POST", headers: { Origin: origin }, body: "{}" })).status).toBe(403);
  await expect(readFile(join(root, ".local/dev/state/projects.json"))).rejects.toHaveProperty("code", "ENOENT");
  const response = await fetch(url, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: "{}" });
  expect(response.status).toBe(200);
  expect((await response.json()).sessions.length).toBeGreaterThanOrEqual(7);
});

it("does not install the seed endpoint outside the isolated development server", async () => {
  const root = await temporaryRoot();
  const origin = await demoServer(root, false);
  expect((await fetch(`${origin}/api/dev-demo`, { method: "POST" })).status).toBe(404);
  await expect(readFile(join(root, ".local/dev/state/projects.json"))).rejects.toHaveProperty("code", "ENOENT");
});
