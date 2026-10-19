import { describe, expect, it } from "vitest";
import { chatLineIdentity, chatLineScrollIdentity, chatMessageAnchorKey, chatGroupAnchorKey, chatEventAnchorKey } from "./chatMessageIdentity";
import type { ChatLine } from "./components/shared";

describe("chat message identity", () => {
  it("never derives scroll-anchor keys from display indexes or empty entry IDs", () => {
    for (const key of [chatMessageAnchorKey, chatEventAnchorKey, chatGroupAnchorKey]) {
      expect(key(40)).toBeUndefined();
      expect(key(41, { role: "assistant", parts: [] })).toBeUndefined();
      expect(key(42, { entryId: "", role: "assistant", parts: [] })).toBeUndefined();
    }
  });

  it("keeps durable entry keys independent of normalized indexes and separates entry slices", () => {
    const reply: ChatLine = { entryId: "entry-1", role: "user", parts: [{ type: "text", text: "Question" }] };
    const invocation: ChatLine = { ...reply, parts: [{ type: "skillInvocation", name: "testing", location: "SKILL.md", content: "Instructions" }] };
    for (const key of [chatMessageAnchorKey, chatEventAnchorKey, chatGroupAnchorKey]) {
      expect(key(495, reply)).toBe(key(453, reply));
      expect(key(495, reply)).not.toBe(key(495, invocation));
      expect(key(495, reply)).not.toBe(key(495, { ...reply, entryId: "entry-2" }));
    }
    expect(chatMessageAnchorKey(495, reply)).not.toBe(chatEventAnchorKey(495, reply));
  });

  it("keeps display-index fallback exclusive to disclosure identity", () => {
    for (const message of [undefined, { role: "assistant" as const, parts: [] }, { entryId: "", role: "assistant" as const, parts: [] }]) {
      expect(chatLineIdentity(42, message)).toBe("42");
      expect(chatLineScrollIdentity(message)).toBeUndefined();
    }
    const message: ChatLine = { entryId: "entry-1", role: "assistant", parts: [] };
    expect(chatLineIdentity(42, message)).toBe('["entry-1","assistant","message"]');
    expect(chatLineScrollIdentity(message)).toBe(chatLineIdentity(42, message));
    expect(chatMessageAnchorKey(42, message)).toBe('m:["entry-1","assistant","message"]');
    expect(chatGroupAnchorKey(42, message)).toBe('g:["entry-1","assistant","message"]');
    expect(chatEventAnchorKey(42, message)).toBe('e:["entry-1","assistant","message"]');
  });
});
