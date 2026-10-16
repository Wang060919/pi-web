import { marked } from "marked";
import { workspaceMarkdownFilePath, type MarkdownWorkspaceContext } from "./workspaceLinks";

export interface WorkspaceFileCard {
  path: string;
  name: string;
  extension: string;
}

/** Only explicit Markdown file references become cards; prose never implies a generated file. */
export function workspaceFileCards(text: string, context: MarkdownWorkspaceContext | undefined): WorkspaceFileCard[] {
  if (context === undefined) return [];
  const files = new Map<string, WorkspaceFileCard>();
  // This walker is synchronous; no callback returns a promise.
  void marked.walkTokens(marked.lexer(text), (token) => {
    if (token.type !== "link") return;
    const href: unknown = token.href;
    if (typeof href !== "string" || href.split(/[?#]/, 1)[0]?.endsWith("/") === true) return;
    const path = workspaceMarkdownFilePath(href, context);
    if (path === undefined || path.split("/").includes("..") || files.has(path)) return;
    const name = path.split("/").at(-1) ?? path;
    const dot = name.lastIndexOf(".");
    const extension = dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toUpperCase().slice(0, 8) : "";
    files.set(path, { path, name, extension });
  });
  return [...files.values()];
}
