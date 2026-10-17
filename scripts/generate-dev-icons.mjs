#!/usr/bin/env node
/**
 * Regenerate stable and dev application icons from public/pi-mark.svg.
 * The same trusted pixel glyph is embedded in the UI. PWA artwork stays inside
 * the maskable safe circle; dev artwork adds a small purple pixel indicator.
 * No rasterizer or image dependency is needed for the integer-aligned glyph.
 *
 *   node scripts/generate-dev-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

const PUBLIC_DIR = fileURLToPath(new URL("../src/client/public/", import.meta.url));

const DOCS_DIR = fileURLToPath(new URL("../docs/assets/", import.meta.url));
const BACKGROUND = [0x1c, 0x1c, 0x1c, 0xff];
const FOREGROUND = [0xef, 0xee, 0xeb, 0xff];
const DEV_INDICATOR = [0xa3, 0x71, 0xf7, 0xff];

const ICONS = [
  [192, "pwa-icon-192.png", "pwa-icon-dev-192.png"],
  [512, "pwa-icon-512.png", "pwa-icon-dev-512.png"],
  [180, "apple-touch-icon.png", "apple-touch-icon-dev.png"],
];

/** Read the deliberately limited rect-based source format, failing on artwork drift. */
export function readPiMark(publicDir = PUBLIC_DIR) {
  const source = readFileSync(join(publicDir, "pi-mark.svg"), "utf8");
  const body = /<g id="pi-mark">[\s\S]*?<\/g>/.exec(source)?.[0];
  if (body === undefined || !source.includes('viewBox="0 0 4 4"')) throw new Error("Pi mark must use the 4 by 4 pixel grid");
  const cellPattern = /<rect x="([0-3])" y="([0-3])" width="1" height="1"\s*\/>/g;
  const cells = [...body.matchAll(cellPattern)]
    .map((match) => [Number(match[1]), Number(match[2])]);
  const remainder = body.replace('<g id="pi-mark">', "").replace("</g>", "").replace(cellPattern, "").trim();
  if (cells.length === 0 || remainder !== "") throw new Error("Pi mark contains unsupported cells");
  return { body, cells };
}

export function renderBrandIcon(size, dev = false, glyph = readPiMark()) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let offset = 0; offset < pixels.length; offset += 4) pixels.set(BACKGROUND, offset);
  // A centered square of <= 56% of the canvas fits inside the maskable 80% circle.
  const unit = Math.floor(size * 0.14);
  const origin = Math.floor((size - unit * 4) / 2);
  const square = (x, y, width, color) => {
    for (let row = y; row < y + width; row += 1) {
      for (let column = x; column < x + width; column += 1) pixels.set(color, (row * size + column) * 4);
    }
  };
  for (const [x, y] of glyph.cells) square(origin + x * unit, origin + y * unit, unit, FOREGROUND);
  // The upper-right grid cell is empty in Pi's mark, leaving room for a dev pixel.
  if (dev) square(origin + unit * 3 + Math.floor(unit / 4), origin + Math.floor(unit / 4), Math.ceil(unit / 2), DEV_INDICATOR);
  return { width: size, height: size, pixels };
}

export function renderFavicon(dev = false, glyph = readPiMark()) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-labelledby="title desc" shape-rendering="crispEdges">
  <title id="title">PI WEB${dev ? " dev" : ""}</title>
  <desc id="desc">Pi's pixel mark${dev ? " with a purple development indicator" : ""}.</desc>
  <style>
    .mark { fill: #151515; }
    @media (prefers-color-scheme: dark) { .mark { fill: #efeeeb; } }
  </style>
  <g class="mark" transform="translate(4 4) scale(6)">${glyph.body}</g>${dev ? '\n  <rect x="24" y="5" width="3" height="3" fill="#a371f7"/>' : ""}
</svg>
`;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const COLOR_TYPE_RGBA = 6;

export function decodePng(data) {
  if (!data.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("Not a PNG file");
  let offset = 8;
  let width;
  let height;
  let bitDepth;
  let colorType;
  const idat = [];
  while (offset < data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString("ascii", offset + 4, offset + 8);
    const chunk = data.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      bitDepth = chunk[8];
      colorType = chunk[9];
    } else if (type === "IDAT") {
      idat.push(chunk);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  if (width === undefined || height === undefined) throw new Error("PNG is missing IHDR");
  if (bitDepth !== 8 || colorType !== COLOR_TYPE_RGBA) throw new Error(`Unsupported PNG format (bitDepth ${String(bitDepth)}, colorType ${String(colorType)})`);
  if (idat.length === 0) throw new Error("PNG is missing IDAT");

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idat));
  const pixels = Buffer.allocUnsafe(height * stride);
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[y * (stride + 1)];
    const rawRow = inflated.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = pixels.subarray(y * stride, (y + 1) * stride);
    const previousRow = y === 0 ? undefined : pixels.subarray((y - 1) * stride, y * stride);
    unfilterRow(filter, rawRow, row, previousRow, bytesPerPixel);
  }
  return { width, height, pixels };
}

function unfilterRow(filter, rawRow, row, previousRow, bytesPerPixel) {
  for (let x = 0; x < rawRow.length; x += 1) {
    const raw = rawRow[x];
    const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
    const up = previousRow?.[x] ?? 0;
    const upLeft = previousRow !== undefined && x >= bytesPerPixel ? previousRow[x - bytesPerPixel] : 0;
    switch (filter) {
      case 0: row[x] = raw; break;
      case 1: row[x] = (raw + left) & 0xff; break;
      case 2: row[x] = (raw + up) & 0xff; break;
      case 3: row[x] = (raw + ((left + up) >> 1)) & 0xff; break;
      case 4: row[x] = (raw + paeth(left, up, upLeft)) & 0xff; break;
      default: throw new Error(`Unsupported PNG filter ${String(filter)}`);
    }
  }
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const distanceLeft = Math.abs(estimate - left);
  const distanceUp = Math.abs(estimate - up);
  const distanceUpLeft = Math.abs(estimate - upLeft);
  if (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft) return left;
  return distanceUp <= distanceUpLeft ? up : upLeft;
}

export function encodePng({ width, height, pixels }) {
  const stride = width * 4;
  const filtered = Buffer.allocUnsafe(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    filtered[y * (stride + 1)] = 0;
    pixels.copy(filtered, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = COLOR_TYPE_RGBA;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(filtered, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = new Int32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value;
});

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const chunk = Buffer.allocUnsafe(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, "ascii");
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + data.length)), 8 + data.length);
  return chunk;
}

export function generateBrandIcons(publicDir = PUBLIC_DIR, docsDir = DOCS_DIR) {
  const glyph = readPiMark(publicDir);
  const written = [];
  for (const [size, stableName, devName] of ICONS) {
    writeFileSync(join(publicDir, stableName), encodePng(renderBrandIcon(size, false, glyph)));
    writeFileSync(join(publicDir, devName), encodePng(renderBrandIcon(size, true, glyph)));
    written.push(stableName, devName);
  }
  const favicon = renderFavicon(false, glyph);
  writeFileSync(join(publicDir, "favicon.svg"), favicon);
  writeFileSync(join(publicDir, "favicon-dev.svg"), renderFavicon(true, glyph));
  writeFileSync(join(docsDir, "favicon.svg"), favicon);
  return [...written, "favicon.svg", "favicon-dev.svg", "docs/assets/favicon.svg"];
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const name of generateBrandIcons()) console.log(`wrote ${name}`);
}
