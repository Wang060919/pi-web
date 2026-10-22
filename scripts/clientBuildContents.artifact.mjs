import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("production client build contents", () => {
  it("ships self-hosted variable fonts, Chinese partitions and their licenses", async () => {
    const outDir = join(repoRoot, "dist/client");
    const html = await readFile(join(outDir, "index.html"), "utf8");
    expect(htmlAssetReferences(html)).toContain("./fonts/fonts.css");
    const fontsDir = join(outDir, "fonts");
    const css = await readFile(join(fontsDir, "fonts.css"), "utf8");
    const references = [...css.matchAll(/url\(([^)]+)\)/gu)].map((match) => match[1]);
    expect(references.length).toBeGreaterThan(0);
    for (const reference of new Set(references)) {
      expect(reference).toMatch(/^\.\/[A-Za-z0-9-]+\.woff2$/u);
      expect((await readFile(join(fontsDir, reference))).subarray(0, 4).toString()).toBe("wOF2");
    }
    for (const family of ["Figtree", "Source Serif 4", "Noto Serif SC"]) {
      expect(css).toContain(`font-family: '${family}'`);
    }
    expect(css).toContain("font-weight: 200 900");
    expect(css).toContain("unicode-range:");
    expect(css).not.toMatch(/https?:\/\//u);
    for (const family of ["Figtree", "SourceSerif4", "NotoSerifSC"]) {
      expect(await readFile(join(fontsDir, `${family}-OFL.txt`), "utf8")).toContain("SIL OPEN FONT LICENSE Version 1.1");
    }

    const files = await readdir(outDir, { recursive: true });
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
