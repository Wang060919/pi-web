import { mkdtemp, mkdir, rm, symlink, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readSkillCatalog, readSkillDocument } from "./skillCatalog.js";

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "pi-web-skill-browser-"));
  for (const scope of ["agent", "project/.pi"]) {
    await mkdir(join(root, scope, "skills", scope === "agent" ? "review" : "project-review"), { recursive: true });
  }
  await writeFile(join(root, "agent/skills/review/SKILL.md"), "---\nname: review\ndescription: Review code\ndisable-model-invocation: true\n---\n# Review\n[Guide](guide.md)");
  await writeFile(join(root, "agent/skills/review/guide.md"), "# Guide");
  await writeFile(join(root, "project/.pi/skills/project-review/SKILL.md"), "---\nname: project-review\ndescription: Project review\n---\nInstructions");
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });
const context = (projectTrusted = false) => ({ agentDir: join(root, "agent"), cwd: join(root, "project"), projectTrusted });

describe("read-only skill browser", () => {
  it("uses SDK skill discovery and trust, preserving source and invocation metadata", async () => {
    const global = await readSkillCatalog(context());
    expect(global.skills.map((skill) => skill.name)).toEqual(["review"]);
    expect(global.skills[0]).toMatchObject({ scope: "user", modelInvocation: false });
    const trusted = await readSkillCatalog(context(true));
    expect(trusted.skills).toEqual(expect.arrayContaining([expect.objectContaining({ name: "project-review", scope: "project" })]));
    const skill = global.skills[0];
    if (skill === undefined) throw new Error("Missing review skill");
    const document = await readSkillDocument(global, skill.id);
    expect(document.path).toBe("SKILL.md");
    expect(document.content).toContain("# Review");
    expect(await readSkillDocument(global, skill.id, "guide.md")).toEqual({ path: "guide.md", content: "# Guide" });
  });

  it("skips missing packages without installing or executing extensions", async () => {
    const settings = JSON.stringify({ packages: ["npm:pi-web-intentionally-missing-browser-fixture@0.0.0"], extensions: ["./explode.ts"] });
    await writeFile(join(root, "agent/settings.json"), settings);
    await writeFile(join(root, "agent/explode.ts"), "throw new Error('must not import this extension');");
    const catalog = await readSkillCatalog(context());
    expect(catalog.diagnostics).toContain("Package is not installed: npm:pi-web-intentionally-missing-browser-fixture@0.0.0");
    expect(catalog.skills).toHaveLength(1);
    expect(await readFile(join(root, "agent/settings.json"), "utf8")).toBe(settings);
  });

  it("rejects unknown skills, traversal, symlink escapes, non-Markdown links and oversized files", async () => {
    const catalog = await readSkillCatalog(context());
    const id = catalog.skills[0]?.id;
    if (id === undefined) throw new Error("Missing review skill");
    await writeFile(join(root, "agent/private.md"), "secret");
    await symlink(join(root, "agent/private.md"), join(root, "agent/skills/review/escape.md"));
    await writeFile(join(root, "agent/skills/review/large.md"), "x".repeat(512 * 1024 + 1));
    await expect(readSkillDocument(catalog, "unknown")).rejects.toMatchObject({ statusCode: 404 });
    for (const document of ["../../private.md", "escape.md"]) await expect(readSkillDocument(catalog, id, document)).rejects.toMatchObject({ statusCode: 403 });
    for (const document of ["/etc/passwd", "../auth.json", "a\\b.md"]) await expect(readSkillDocument(catalog, id, document)).rejects.toMatchObject({ statusCode: 400 });
    await expect(readSkillDocument(catalog, id, "large.md")).rejects.toMatchObject({ statusCode: 413 });
  });

  it("does not present a broken settings file as a healthy empty catalog", async () => {
    await writeFile(join(root, "agent/settings.json"), "{broken");
    await expect(readSkillCatalog(context())).rejects.toMatchObject({ statusCode: 503 });
  });
});
