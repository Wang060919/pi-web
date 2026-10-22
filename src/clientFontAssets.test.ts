import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const clientRoot = join(repoRoot, "src", "client");

describe("client typography assets", () => {
  it.each(["index.html", "usage-preview.html"])("loads bundled interface fonts through the deployment base in %s", async (entry) => {
    const html = await readFile(join(clientRoot, entry), "utf8");
    expect(html).toContain('href="%BASE_URL%fonts/fonts.css"');
    expect(html).toContain('--pi-font-family: "Figtree",');
    expect(html).not.toContain("Anthropic Sans");
    expect(html).not.toContain("fonts.googleapis.com");
  });

  it("uses the bundled Latin and Chinese serif families before system fallbacks", async () => {
    const html = await readFile(join(clientRoot, "index.html"), "utf8");
    expect(html).toContain('--pi-font-serif: "Source Serif 4", "Noto Serif SC",');
    expect(html).not.toContain("Anthropic Serif");
  });
});
