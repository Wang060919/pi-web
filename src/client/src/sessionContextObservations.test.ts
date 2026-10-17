import { describe, expect, it } from "vitest";
import { normalizeMessages } from "./chatMessages";
import { sessionContextObservations } from "./sessionContextObservations";
import type { ChatLine } from "./components/shared";

describe("sessionContextObservations", () => {
  it("distinguishes included skills, requested reads, and successful or failed matching results", () => {
    const messages: ChatLine[] = [
      { role: "user", parts: [{ type: "skillInvocation", name: "included", location: "/skills/included/SKILL.md", content: "private skill body" }] },
      { role: "skill", parts: [
        { type: "skillRead", name: "pending", path: "/skills/pending/SKILL.md", toolCallId: "pending" },
        { type: "skillRead", name: "success", path: "/skills/success/SKILL.md", toolCallId: "success" },
        { type: "skillRead", name: "failed", path: "/skills/failed/SKILL.md", toolCallId: "failed" },
        { type: "skillRead", name: "unmatched", path: "/skills/unmatched/SKILL.md", toolCallId: "other-tool" },
        { type: "skillRead", name: "legacy", path: "/skills/legacy/SKILL.md" },
      ] },
      { role: "tool", parts: [
        { type: "toolResult", toolCallId: "success", toolName: "read", text: "private skill body", isError: false },
        { type: "toolResult", toolCallId: "failed", toolName: "read", text: "not found", isError: true },
        { type: "toolResult", toolCallId: "other-tool", toolName: "bash", text: "success", isError: false },
      ] },
    ];

    expect(sessionContextObservations(messages)).toEqual({
      hasCompaction: false,
      references: [
        { kind: "skill-invocation", name: "included", path: "/skills/included/SKILL.md" },
        { kind: "skill-read", name: "pending", path: "/skills/pending/SKILL.md", state: "requested" },
        { kind: "skill-read", name: "success", path: "/skills/success/SKILL.md", state: "completed" },
        { kind: "skill-read", name: "failed", path: "/skills/failed/SKILL.md", state: "failed" },
        { kind: "skill-read", name: "unmatched", path: "/skills/unmatched/SKILL.md", state: "requested" },
        { kind: "skill-read", name: "legacy", path: "/skills/legacy/SKILL.md", state: "requested" },
      ],
    });
  });

  it("handles real normalized file and skill reads without inferring reads from prose", () => {
    const messages = normalizeMessages([
      { role: "user", content: "Please inspect @src/index.ts; read /private/file.md" },
      { role: "assistant", content: [
        { type: "toolCall", id: "file", name: "read", arguments: { path: "src/index.ts" } },
        { type: "toolCall", id: "skill", name: "read", arguments: { path: "/skills/review/SKILL.md" } },
        { type: "toolCall", id: "write", name: "write", arguments: { path: "/write.txt", content: "body" } },
      ] },
      { role: "toolResult", toolCallId: "file", toolName: "read", content: "file contents", isError: false },
      { role: "toolResult", toolCallId: "skill", toolName: "read", content: "skill contents", isError: false },
    ]);

    expect(sessionContextObservations(messages).references).toEqual([
      { kind: "file-read", path: "src/index.ts", state: "completed" },
      { kind: "skill-read", name: "review", path: "/skills/review/SKILL.md", state: "completed" },
    ]);
  });

  it.each(["pending", "running", "success", "error"] as const)("preserves %s execution state on ordinary file reads", (status) => {
    expect(sessionContextObservations([{ role: "tool", parts: [{ type: "toolExecution", toolName: "read", summary: "file", args: { path: "/file.txt" }, status }] }]).references).toEqual([
      { kind: "file-read", path: "/file.txt", state: status === "success" ? "completed" : status === "error" ? "failed" : "requested" },
    ]);
  });

  it("counts only user image attachments by MIME type without copying payloads or prompt text", () => {
    const messages: ChatLine[] = [
      { role: "user", parts: [
        { type: "image", mimeType: "image/png", get data(): string { throw new Error("Do not inspect image payload"); } },
        { type: "image", mimeType: "image/png", data: "private image" },
        { type: "image", mimeType: "image/jpeg", data: "another private image" },
      ] },
      { role: "tool", parts: [{ type: "image", mimeType: "image/png", data: "tool output" }] },
      { role: "system", source: "compaction", parts: [{ type: "text", text: "private compaction summary" }] },
    ];

    expect(sessionContextObservations(messages)).toEqual({
      hasCompaction: true,
      references: [{ kind: "image", mimeType: "image/png", count: 2 }, { kind: "image", mimeType: "image/jpeg", count: 1 }],
    });
  });

  it("keeps empty or malformed file arguments out of the observed list", () => {
    expect(sessionContextObservations([{ role: "assistant", parts: [
      { type: "toolCall", toolName: "read", summary: "a" },
      { type: "toolCall", toolName: "read", summary: "b", args: { path: "" } },
      { type: "toolCall", toolName: "read", summary: "c", args: { path: 1 } },
    ] }])).toEqual({ references: [], hasCompaction: false });
  });
});
