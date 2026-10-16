import type { ChatLine, ChatPart } from "./components/shared";

export interface ChatGroupProgress {
  toolCount: number;
  thinkingCount: number;
  recordCount: number;
  failedCount: number;
  unfinishedCount: number;
  runningTools: string[];
}

/** Count work rather than protocol roles, coalescing slices of the same tool call. */
export function chatGroupProgress(messages: readonly ChatLine[]): ChatGroupProgress {
  const tools = new Map<string | ChatPart, { name: string; failed: boolean; finished: boolean; running: boolean }>();
  let thinkingCount = 0;
  let recordCount = 0;
  for (const message of messages) {
    let hasRecord = false;
    for (const part of message.parts) {
      if (part.type === "thinking") {
        thinkingCount += 1;
      } else if (part.type === "toolCall" || part.type === "toolExecution" || part.type === "toolResult") {
        const key = part.toolCallId === undefined || part.toolCallId === "" ? part : part.toolCallId;
        const tool = tools.get(key) ?? { name: part.toolName, failed: false, finished: false, running: false };
        if (part.type === "toolExecution") {
          tool.failed ||= part.status === "error";
          tool.finished ||= part.status === "success" || part.status === "error";
          tool.running ||= part.status === "running";
        } else if (part.type === "toolResult") {
          tool.failed ||= part.isError;
          tool.finished = true;
        }
        tools.set(key, tool);
      } else if (part.type !== "empty" && part.type !== "toolResultBoundary") {
        hasRecord = true;
      }
    }
    if (hasRecord) recordCount += 1;
  }
  const calls = [...tools.values()];
  return {
    toolCount: calls.length,
    thinkingCount,
    recordCount,
    failedCount: calls.filter((tool) => tool.failed).length,
    unfinishedCount: calls.filter((tool) => !tool.finished).length,
    runningTools: [...new Set(calls.filter((tool) => tool.running && !tool.finished).map((tool) => tool.name))],
  };
}
