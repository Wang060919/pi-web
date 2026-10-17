import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { decodePng, encodePng, readPiMark, renderBrandIcon, renderFavicon } from "./generate-dev-icons.mjs";

const PUBLIC_DIR = fileURLToPath(new URL("../src/client/public/", import.meta.url));
const DOCS_DIR = fileURLToPath(new URL("../docs/assets/", import.meta.url));

const ICON_PAIRS = [
  [192, "pwa-icon-192.png", "pwa-icon-dev-192.png"],
  [512, "pwa-icon-512.png", "pwa-icon-dev-512.png"],
  [180, "apple-touch-icon.png", "apple-touch-icon-dev.png"],
];

function pixelAt(image, x, y) {
  return [...image.pixels.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 4)];
}

describe("Pi identity assets", () => {
  it("retains Pi's official pixel silhouette as one shared glyph", () => {
    const { cells } = readPiMark();
    const rows = Array.from({ length: 4 }, (_, y) => Array.from({ length: 4 }, (_, x) => cells.some(([cx, cy]) => cx === x && cy === y) ? "1" : "0").join(""));
    expect(rows).toEqual(["1110", "1010", "1101", "1001"]);
  });

  it.each(ICON_PAIRS)("keeps %s px install icons reproducible and inside the maskable safe circle", (size, sourceName, devName) => {
    for (const [name, dev] of [[sourceName, false], [devName, true]]) {
      const committed = readFileSync(join(PUBLIC_DIR, name));
      expect(committed.equals(encodePng(renderBrandIcon(size, dev)))).toBe(true);
      const image = decodePng(committed);
      expect([image.width, image.height]).toEqual([size, size]);
      const background = pixelAt(image, 0, 0);
      let markPixels = 0;
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          if (pixelAt(image, x, y).every((value, channel) => value === background[channel])) continue;
          markPixels += 1;
          // Check the outer corners of each colored pixel, not only its center.
          expect(Math.hypot(Math.max(Math.abs(x - size / 2), Math.abs(x + 1 - size / 2)), Math.max(Math.abs(y - size / 2), Math.abs(y + 1 - size / 2)))).toBeLessThanOrEqual(size * 0.4);
        }
      }
      expect(markPixels).toBeGreaterThan(0);
    }
  });

  it.each(ICON_PAIRS)("adds a dev indicator to %s px artwork while preserving the neutral Pi mark", (_size, sourceName, devName) => {
    const source = decodePng(readFileSync(join(PUBLIC_DIR, sourceName)));
    const dev = decodePng(readFileSync(join(PUBLIC_DIR, devName)));
    let indicatorPixels = 0;
    for (let offset = 0; offset < source.pixels.length; offset += 4) {
      const stablePixel = [...source.pixels.subarray(offset, offset + 4)];
      const devPixel = [...dev.pixels.subarray(offset, offset + 4)];
      if (devPixel.every((value, channel) => value === stablePixel[channel])) continue;
      expect(stablePixel).toEqual([0x1c, 0x1c, 0x1c, 0xff]);
      expect(devPixel).toEqual([0xa3, 0x71, 0xf7, 0xff]);
      indicatorPixels += 1;
    }
    expect(indicatorPixels).toBeGreaterThan(0);
  });

  it("regenerates browser and documentation favicons from the same glyph", () => {
    const stable = renderFavicon();
    expect(readFileSync(join(PUBLIC_DIR, "favicon.svg"), "utf8")).toBe(stable);
    expect(readFileSync(join(DOCS_DIR, "favicon.svg"), "utf8")).toBe(stable);
    expect(readFileSync(join(PUBLIC_DIR, "favicon-dev.svg"), "utf8")).toBe(renderFavicon(true));
  });
});
