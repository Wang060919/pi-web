import { describe, expect, it } from "vitest";
import { chatGroupProgress } from "./chatGroupProgress";

describe("chatGroupProgress", () => {
  it("counts one tool call across call/result slices and retains failures alongside running work", () => {
    expect(chatGroupProgress([
      { role: "assistant", parts: [
        { type: "thinking", text: "Plan" },
        { type: "toolCall", toolCallId: "read-1", toolName: "read", summary: "app.ts" },
      ] },
      { role: "tool", parts: [{ type: "toolResult", toolCallId: "read-1", toolName: "read", text: "Missing file", isError: true }] },
      { role: "tool", parts: [{ type: "toolExecution", toolCallId: "bash-1", toolName: "bash", summary: "Check files", status: "running" }] },
    ])).toEqual({ toolCount: 2, thinkingCount: 1, recordCount: 0, failedCount: 1, unfinishedCount: 1, runningTools: ["bash"] });
  });

  it("does not describe pending or interrupted calls as completed, or completed slices as running", () => {
    expect(chatGroupProgress([
      { role: "tool", parts: [
        { type: "toolExecution", toolCallId: "completed", toolName: "read", summary: "Before completion", status: "running" },
        { type: "toolExecution", toolCallId: "completed", toolName: "read", summary: "After completion", status: "success" },
        { type: "toolExecution", toolCallId: "interrupted", toolName: "bash", summary: "Interrupted", status: "pending" },
      ] },
      { role: "system", parts: [{ type: "text", text: "Session stopped" }, { type: "empty" }, { type: "toolResultBoundary", toolCallId: "completed" }] },
    ])).toEqual({ toolCount: 2, thinkingCount: 0, recordCount: 1, failedCount: 0, unfinishedCount: 1, runningTools: [] });
  });

  it("keeps separate calls without durable IDs and ignores invisible protocol markers", () => {
    expect(chatGroupProgress([
      { role: "tool", parts: [
        { type: "toolExecution", toolName: "read", summary: "first", status: "success" },
        { type: "toolExecution", toolName: "read", summary: "second", status: "error" },
        { type: "empty" },
        { type: "toolResultBoundary" },
      ] },
    ])).toEqual({ toolCount: 2, thinkingCount: 0, recordCount: 0, failedCount: 1, unfinishedCount: 0, runningTools: [] });
  });
});
