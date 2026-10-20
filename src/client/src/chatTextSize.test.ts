// @vitest-environment happy-dom

import { afterEach, expect, it, vi } from "vitest";
import { CHAT_TEXT_SIZE_STORAGE_KEY, readChatTextSize, writeChatTextSize } from "./chatTextSize";

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

it("uses Medium on a new device without saving a preference", () => {
  expect(readChatTextSize()).toBe("m");
  expect(localStorage.getItem(CHAT_TEXT_SIZE_STORAGE_KEY)).toBeNull();
});

it.each(["s", "m", "l"] as const)("restores the saved %s text size", (size) => {
  writeChatTextSize(size);
  expect(readChatTextSize()).toBe(size);
});

it.each(["", "large", "16", '{"size":"l"}'])("ignores an unsupported saved value: %s", (value) => {
  localStorage.setItem(CHAT_TEXT_SIZE_STORAGE_KEY, value);
  expect(readChatTextSize()).toBe("m");
  expect(localStorage.getItem(CHAT_TEXT_SIZE_STORAGE_KEY)).toBe(value);
});

it("uses the default when device storage is blocked and exposes failed writes", () => {
  vi.spyOn(localStorage, "getItem").mockImplementation(() => { throw new Error("Blocked storage"); });
  vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("Blocked storage"); });
  expect(readChatTextSize()).toBe("m");
  expect(() => { writeChatTextSize("l"); }).toThrow("Blocked storage");
});
