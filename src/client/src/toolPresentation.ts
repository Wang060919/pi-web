import type { ChatLine, ToolExecutionPart } from "./components/shared";
import { workspaceMarkdownFilePath, type MarkdownWorkspaceContext } from "./formatting/workspaceLinks";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

export function toolDisplayName(execution: ToolExecutionPart): string {
  if (!execution.toolName.startsWith("mcp__")) return execution.toolName;
  const details = record(execution.details);
  return typeof details?.["server"] === "string" && details["server"] && typeof details["tool"] === "string" && details["tool"]
    ? `${details["server"]}/${details["tool"]}` : execution.toolName;
}

export function toolDisplayText(execution: ToolExecutionPart): string | undefined {
  const text = execution.resultText;
  if (!execution.toolName.startsWith("mcp__") || text === undefined || text.length > 200_000 || !/^\s*[[{]/.test(text)) return text;
  try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; }
}

/** Completed tool calls are evidence of writes; names in assistant prose are not. */
export function turnWrittenFiles(messages: readonly ChatLine[], index: number, context: MarkdownWorkspaceContext | undefined): string[] {
  if (context === undefined || messages[index]?.role !== "assistant") return [];
  // Render the list once, at the last assistant message of this turn.
  for (let next = index + 1; next < messages.length && messages[next]?.role !== "user"; next++) {
    if (messages[next]?.role === "assistant") return [];
  }
  let start = index;
  while (start > 0 && messages[start - 1]?.role !== "user") start--;
  const paths = new Set<string>();
  for (let cursor = start; cursor < messages.length && (cursor === start || messages[cursor]?.role !== "user"); cursor++) {
    for (const part of messages[cursor]?.parts ?? []) {
      if (part.type !== "toolExecution" || part.status !== "success") continue;
      const args = record(part.args);
      const name = part.toolName.replace(/^functions[./]/, "");
      const candidates: string[] = [];
      if (["write", "edit", "write_file", "edit_file"].includes(name)) {
        const path = args?.["path"] ?? args?.["file_path"];
        if (typeof path === "string") candidates.push(path);
      } else if (name === "apply_patch") {
        const details = record(part.details);
        // A partially failed patch must not imply that every requested file changed.
        if (Array.isArray(details?.["failures"]) && details["failures"].length > 0) continue;
        const input = typeof part.args === "string" ? part.args : args?.["patch"] ?? args?.["input"];
        if (typeof input === "string") {
          for (const match of input.matchAll(/^\*\*\* (?:Add File|Update File|Move to): (.+)$/gm)) {
            if (match[1] !== undefined && match[1] !== "") candidates.push(match[1].trim());
          }
        }
      }
      for (const path of candidates) {
        // Tool paths are filesystem paths. Encode URL punctuation before using the existing classifier.
        const reference = path.split("/").map(encodeURIComponent).join("/");
        const relative = workspaceMarkdownFilePath(reference, context);
        if (relative !== undefined && !relative.split("/").includes("..")) paths.add(relative);
      }
    }
  }
  return [...paths];
}
