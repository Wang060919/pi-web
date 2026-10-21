import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("production client build contents", () => {
  it("keeps Anthropic typography local without shipping its webfont assets", async () => {
    const outDir = join(repoRoot, "dist/client");
    const html = await readFile(join(outDir, "index.html"), "utf8");
    expect(html).toContain('"Anthropic Sans Variable Text"');
    expect(html).toContain('"Anthropic Serif Variable Text"');
    expect(html).toContain('"Anthropic Mono Web"');
    expect(html).not.toContain("fonts/fonts.css");
    expect(html).not.toContain("@font-face");

    const files = await readdir(outDir, { recursive: true });
    expect(files).not.toContain(join("fonts", "fonts.css"));
    expect(files.filter((file) => /(?:^|[\\/])Anthropic[^\\/]*\.(?:woff2?|ttf|otf)$/iu.test(file))).toEqual([]);
  });

  it("emits deployment-relative HTML and PWA URLs", async () => {
    const outDir = join(repoRoot, "dist/client");
    const html = await readFile(join(outDir, "index.html"), "utf8");
    const references = htmlAssetReferences(html);
    expect(references).toContain("./favicon.svg");
    expect(references).toContain("./apple-touch-icon.png");
    expect(references).toContain("./manifest.webmanifest");
    const manifestLink = /<link\b[^>]*\brel="manifest"[^>]*>/.exec(html)?.[0];
    expect(manifestLink).toBeDefined();
    expect(manifestLink).toContain('crossorigin="use-credentials"');
    expect(references).toContainEqual(expect.stringMatching(/^\.\/assets\/index-[^/]+\.js$/));
    expect(references.filter((reference) => reference.startsWith("/"))).toEqual([]);

    const manifest = JSON.parse(await readFile(join(outDir, "manifest.webmanifest"), "utf8"));
    expect(manifest).toMatchObject({
      start_url: "./",
      scope: "./",
      icons: [
        { src: "./pwa-icon-192.png" },
        { src: "./pwa-icon-512.png" },
      ],
    });
  });
});

function htmlAssetReferences(html) {
  return Array.from(html.matchAll(/\b(?:href|src)="([^"]+)"/g), (match) => match[1] ?? "");
}
