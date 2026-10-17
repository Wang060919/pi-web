const blockElements = new Set(["P", "DIV", "SECTION", "ARTICLE", "HEADER", "FOOTER", "BLOCKQUOTE", "UL", "OL", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "PRE", "TR"]);
const ignoredElements = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG"]);

/** Parse clipboard markup as inert data; only ordinary web/mail links become Markdown. */
export function promptClipboardMarkdown(html: string): string | undefined {
  if (html === "" || html.length > 1_000_000) return undefined;
  const body = new DOMParser().parseFromString(html, "text/html").body;
  let linkCount = 0;
  const render = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (!(node instanceof Element) || ignoredElements.has(node.tagName)) return "";
    if (node.tagName === "BR") return "\n";
    const content = Array.from(node.childNodes, render).join("");
    if (node.tagName === "A") {
      const destination = markdownLinkDestination(node.getAttribute("href") ?? "");
      if (destination !== undefined && content.trim() !== "") {
        linkCount += 1;
        return `[${content.replace(/\\/g, "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]").replace(/\s*\n\s*/g, " ")}](${destination})`;
      }
    }
    return blockElements.has(node.tagName) ? `${content}\n\n` : content;
  };
  const markdown = Array.from(body.childNodes, render).join("").replace(/\n[\t ]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return linkCount === 0 ? undefined : markdown;
}

function markdownLinkDestination(href: string): string | undefined {
  if (!/^(?:https?:|mailto:)/i.test(href) || Array.from(href).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return undefined;
  try {
    const url = new URL(href);
    if (url.protocol !== "https:" && url.protocol !== "http:" && url.protocol !== "mailto:") return undefined;
    return `<${url.href.replace(/</g, "%3C").replace(/>/g, "%3E")}>`;
  } catch {
    return undefined;
  }
}
