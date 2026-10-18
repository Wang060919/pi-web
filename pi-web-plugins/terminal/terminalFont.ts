export const TERMINAL_FONT_FAMILY = '"PI Web Terminal", monospace';

// Keep URLs relative to this activation's module, including remote machine and nested deployments.
const faces = [
  { url: new URL("./fonts/JetBrainsMonoNerdFontMono-Regular.woff2", import.meta.url).href, weight: "400", style: "normal" },
  { url: new URL("./fonts/JetBrainsMonoNerdFontMono-Bold.woff2", import.meta.url).href, weight: "700", style: "normal" },
  { url: new URL("./fonts/JetBrainsMonoNerdFontMono-Italic.woff2", import.meta.url).href, weight: "400", style: "italic" },
  { url: new URL("./fonts/JetBrainsMonoNerdFontMono-BoldItalic.woff2", import.meta.url).href, weight: "700", style: "italic" },
];

// Font faces belong to the document, so closing a terminal must not remove another panel's fonts.
const documentLoads = new WeakMap<Document, Promise<void>>();

export function loadTerminalFont(document: Document): Promise<void> {
  const existing = documentLoads.get(document);
  if (existing !== undefined) return existing;
  const load = Promise.all(faces.map(async ({ url, weight, style }) => {
    const face = new FontFace("PI Web Terminal", `url("${url}") format("woff2")`, { weight, style });
    return face.load();
  })).then((loadedFaces) => {
    for (const face of loadedFaces) document.fonts.add(face);
  }).catch((error: unknown) => {
    documentLoads.delete(document);
    throw error;
  });
  documentLoads.set(document, load);
  return load;
}
