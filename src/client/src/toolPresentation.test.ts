// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChatLine, ToolExecutionPart } from "./components/shared";
import { toolDisplayName, toolDisplayText, turnWrittenFiles } from "./toolPresentation";
import { writeClipboardText } from "./clipboard";
import { ToolExecutionView } from "./components/ToolExecutionView";

vi.mock("./clipboard", () => ({ writeClipboardText: vi.fn(() => Promise.resolve(true)) }));
const context = { machineId: "remote", projectId: "p", workspaceId: "w", root: "/repo" };

afterEach(() => { document.body.replaceChildren(); vi.clearAllMocks(); });

function tool(name: string, args?: unknown, status: ToolExecutionPart["status"] = "success"): ToolExecutionPart {
  return { type: "toolExecution", toolName: name, summary: name, status, ...(args === undefined ? {} : { args }) };
}

function turn(parts: ToolExecutionPart[]): ChatLine[] {
  return [{ role: "user", parts: [{ type: "text", text: "change files" }] }, { role: "tool", parts }, { role: "assistant", parts: [{ type: "text", text: "I also mentioned /repo/not-written.ts in the reply" }] }];
}

describe("written-file evidence", () => {
  it("uses successful file-writing arguments once per turn, never model prose, reads or failed calls", () => {
    const messages = turn([tool("write", { path: "src/new.ts" }), tool("edit", { file_path: "/repo/src/new.ts" }), tool("write", { path: "failed.ts" }, "error"), tool("write", { path: "pending.ts" }, "running"), tool("read", { path: "read.ts" }), tool("bash", { command: "touch shell.ts" })]);
    expect(turnWrittenFiles(messages, 2, context)).toEqual(["src/new.ts"]);
    const withEarlierAssistant: ChatLine[] = [messages[0] ?? { role: "user", parts: [] }, { role: "assistant", parts: [] }, ...messages.slice(1)];
    expect(turnWrittenFiles(withEarlierAssistant, 1, context)).toEqual([]);
    expect(turnWrittenFiles(withEarlierAssistant, 3, context)).toEqual(["src/new.ts"]);
    expect(turnWrittenFiles(messages, 2, undefined)).toEqual([]);
  });

  it("keeps filesystem punctuation and Unicode but refuses traversal and paths outside the workspace", () => {
    const messages = turn([tool("write", { path: "/repo/src/a #?%中文.ts" }), tool("write", { path: "./src/literal%2Fname.ts" }), tool("write", { path: "/repo-other/secret" }), tool("write", { path: "../secret" }), tool("write", { path: "/repo/a/../../secret" }), tool("write", { path: "bad\\path" })]);
    expect(turnWrittenFiles(messages, 2, context)).toEqual(["src/a #?%中文.ts", "src/literal%2Fname.ts"]);
  });

  it("recognizes apply_patch headers, ignores patch deletions and rejects partial failures", () => {
    const patch = "*** Begin Patch\n*** Add File: src/new.ts\n+new\n*** Update File: src/old.ts\n-old\n+new\n*** Delete File: src/gone.ts\n*** End Patch";
    const failed = { ...tool("apply_patch", { patch: "*** Add File: partial.ts" }), details: { failures: ["failed update"] } };
    expect(turnWrittenFiles(turn([tool("functions.apply_patch", patch), failed]), 2, context)).toEqual(["src/new.ts", "src/old.ts"]);
  });

  it("does not borrow successful writes from a different user turn", () => {
    const messages: ChatLine[] = [...turn([tool("write", { path: "earlier.ts" })]), { role: "user", parts: [] }, { role: "assistant", parts: [{ type: "text", text: "later" }] }];
    expect(turnWrittenFiles(messages, 4, context)).toEqual([]);
  });
});

describe("MCP display", () => {
  it("uses structured server/tool details and pretty JSON without mutating original results", () => {
    const execution = { ...tool("mcp__opaque__call"), details: { server: "files", tool: "list" }, resultText: '{"files":["a","b"]}' };
    expect(toolDisplayName(execution)).toBe("files/list");
    expect(toolDisplayText(execution)).toBe('{\n  "files": [\n    "a",\n    "b"\n  ]\n}');
    expect(execution.resultText).toBe('{"files":["a","b"]}');
    expect(toolDisplayName({ ...execution, details: {} })).toBe(execution.toolName);
    expect(toolDisplayText({ ...execution, resultText: "{invalid json" })).toBe("{invalid json");
    expect(toolDisplayText({ ...execution, toolName: "bash" })).toBe(execution.resultText);
  });

  it("copies exact raw MCP output even while displaying the formatted JSON", async () => {
    const raw = '{"value":1, "label":"two"}';
    const view = new ToolExecutionView();
    view.execution = { ...tool("mcp__test__read"), resultText: raw };
    document.body.append(view);
    await view.updateComplete;
    expect(view.renderRoot.querySelector(".detail-result pre")?.textContent).toBe('{\n  "value": 1,\n  "label": "two"\n}');
    view.renderRoot.querySelector<HTMLButtonElement>(".detail-result button")?.click();
    expect(writeClipboardText).toHaveBeenCalledExactlyOnceWith(raw);
  });
});
