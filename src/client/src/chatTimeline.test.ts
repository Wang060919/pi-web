import { describe, expect, it } from "vitest";
import { t } from "../../shared/i18n";
import { groupChatMessages, type ChatGroup } from "./chatGroups";
import { chatTimelineEntries, sampleChatTimelineEntries, type ChatTimelineEntry } from "./chatTimeline";
import type { ChatLine } from "./components/shared";

describe("chatTimelineEntries", () => {
  it("uses visible user titles and readable assistant text from the same turn", () => {
    const messages: ChatLine[] = [
      { role: "user", entryId: "first", parts: [{ type: "text", text: "raw question", displayText: "  First\n question\t " }] },
      { role: "assistant", parts: [{ type: "text", text: "raw answer", displayText: "  First line\r\n\r\n  Second\tline  " }] },
      { role: "assistant", parts: [{ type: "text", text: "Last line" }] },
      { role: "user", entryId: "second", parts: [{ type: "text", text: "Second question" }] },
      { role: "assistant", parts: [{ type: "text", text: "Second answer" }] },
    ];

    expect(chatTimelineEntries(groupChatMessages(messages, 40))).toEqual([
      { key: "entry:first", index: 40, title: "First question", preview: "First line\n\nSecond line\n\nLast line" },
      { key: "entry:second", index: 43, title: "Second question", preview: "Second answer" },
    ]);
  });

  it("keeps hidden display text hidden and uses an image label without image data", () => {
    const messages: ChatLine[] = [
      { role: "user", parts: [{ type: "text", text: "Visible question" }] },
      { role: "assistant", parts: [{ type: "text", text: "Visible answer" }] },
      { role: "user", parts: [{ type: "text", text: "Hidden question", displayText: "" }] },
      { role: "assistant", parts: [{ type: "text", text: "Answer to hidden question" }] },
      { role: "user", parts: [{ type: "text", text: "Hidden caption", displayText: "" }, { type: "image", mimeType: "image/png", data: "PRIVATE_BASE64" }] },
      { role: "assistant", parts: [{ type: "text", text: "Hidden answer", displayText: "" }, { type: "text", text: "Image answer" }] },
    ];

    expect(chatTimelineEntries(groupChatMessages(messages))).toEqual([
      { key: "index:0", index: 0, title: "Visible question", preview: "Visible answer" },
      { key: "index:4", index: 4, title: t("ui.chatTimeline.image"), preview: "Image answer" },
    ]);
  });

  it("excludes grouped technical events, tool output, skills, and context summaries", () => {
    const groups: ChatGroup[] = groupChatMessages([
      { role: "user", parts: [{ type: "text", text: "Question" }] },
      { role: "assistant", parts: [
        { type: "thinking", text: "Private reasoning" },
        { type: "toolCall", toolName: "read", summary: "Private tool input", args: { token: "Private arguments" } },
        { type: "text", text: "Readable answer" },
      ] },
      { role: "tool", parts: [{ type: "toolResult", toolName: "read", text: "Private tool output", isError: false }] },
      { role: "assistant", parts: [{ type: "skillInvocation", name: "helper", location: "/skill", content: "Private skill" }] },
      { role: "assistant", source: "compaction", parts: [{ type: "text", text: "Private compaction" }] },
      { role: "assistant", source: "branch_summary", parts: [{ type: "text", text: "Private branch" }] },
    ]);
    // Even callers supplying an ungrouped context summary must not expose it.
    groups.push({ kind: "message", index: 7, message: { role: "assistant", source: "compaction", parts: [{ type: "text", text: "Private summary" }] } });

    expect(chatTimelineEntries(groups)).toEqual([
      { key: "index:0", index: 0, title: "Question", preview: "Readable answer" },
    ]);
  });

  it("preserves durable keys and absolute fallback indexes when history is prepended", () => {
    const current: ChatLine[] = [
      { role: "user", entryId: "durable", parts: [{ type: "text", text: "Current question" }] },
      { role: "assistant", parts: [{ type: "text", text: "Current answer" }] },
      { role: "user", parts: [{ type: "text", text: "Optimistic question" }] },
    ];
    const before = chatTimelineEntries(groupChatMessages(current, 100));
    const after = chatTimelineEntries(groupChatMessages([
      { role: "user", entryId: "older", parts: [{ type: "text", text: "Older question" }] },
      { role: "assistant", parts: [{ type: "text", text: "Older answer" }] },
      ...current,
    ], 98));

    expect(before.map(({ key, index }) => ({ key, index }))).toEqual([
      { key: "entry:durable", index: 100 },
      { key: "index:102", index: 102 },
    ]);
    expect(after.slice(1)).toEqual(before);
  });

  it("bounds long titles and previews without splitting Unicode characters", () => {
    const entries = chatTimelineEntries(groupChatMessages([
      { role: "user", parts: [{ type: "text", text: "😀".repeat(120) }] },
      { role: "assistant", parts: [{ type: "text", text: "😀".repeat(260) }] },
    ]));

    expect(Array.from(entries[0]?.title ?? "")).toHaveLength(100);
    expect(Array.from(entries[0]?.preview ?? "")).toHaveLength(240);
    expect(entries[0]?.title).not.toContain("\uFFFD");
    expect(entries[0]?.preview).not.toContain("\uFFFD");
  });
});

describe("sampleChatTimelineEntries", () => {
  it("samples uniformly across the entire loaded range", () => {
    const entries = timelineEntries(101);
    expect(sampleChatTimelineEntries(entries, undefined, 6).map((entry) => entry.index)).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it.each(["entry:1", "entry:99"])("keeps both endpoints and the active turn %s within the sample limit", (activeKey) => {
    const entries = timelineEntries(101);
    const sampled = sampleChatTimelineEntries(entries, activeKey);
    expect(sampled).toHaveLength(31);
    expect(sampled[0]).toBe(entries[0]);
    expect(sampled.at(-1)).toBe(entries.at(-1));
    expect(sampled.map((entry) => entry.key)).toContain(activeKey);
    expect(sampled.map((entry) => entry.index)).toEqual(sampled.map((entry) => entry.index).sort((left, right) => left - right));
  });

  it("replaces the nearest interior sample when the active turn was not sampled", () => {
    expect(sampleChatTimelineEntries(timelineEntries(101), "entry:20", 5).map((entry) => entry.index)).toEqual([0, 20, 50, 75, 100]);
  });

  it("keeps every entry when the loaded conversation fits", () => {
    const entries = timelineEntries(5);
    expect(sampleChatTimelineEntries(entries, "entry:2")).toEqual(entries);
    expect(sampleChatTimelineEntries([], undefined)).toEqual([]);
  });
});

function timelineEntries(count: number): ChatTimelineEntry[] {
  return Array.from({ length: count }, (_, index) => ({ key: `entry:${String(index)}`, index, title: `Question ${String(index)}`, preview: "" }));
}
