import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const clientRoot = join(repoRoot, "src", "client");

describe("client typography assets", () => {
  it.each(["index.html", "usage-preview.html"])("uses locally installed Sans families in %s without loading webfont files", async (entry) => {
    const html = await readFile(join(clientRoot, entry), "utf8");
    expect(html).toContain('"Anthropic Sans Variable Text"');
    expect(html).not.toContain("fonts/fonts.css");
    expect(html).not.toContain("@font-face");
  });

  it("names the locally installed Serif and Mono families in the app", async () => {
    const html = await readFile(join(clientRoot, "index.html"), "utf8");
    expect(html).toContain('"Anthropic Serif Variable Text"');
    expect(html).toContain('"Anthropic Mono Web"');
  });
});
