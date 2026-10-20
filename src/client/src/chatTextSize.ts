export const CHAT_TEXT_SIZES = ["s", "m", "l"] as const;
export type ChatTextSize = typeof CHAT_TEXT_SIZES[number];
export const DEFAULT_CHAT_TEXT_SIZE: ChatTextSize = "m";
export const CHAT_TEXT_SIZE_STORAGE_KEY = "pi-web-chat-text-size";

const typography: Record<ChatTextSize, { size: string; leading: string }> = {
  s: { size: ".8125rem", leading: "1.42857" },
  m: { size: ".875rem", leading: "1.42857" },
  l: { size: ".9375rem", leading: "1.46667" },
};

export function readChatTextSize(): ChatTextSize {
  try {
    const value = localStorage.getItem(CHAT_TEXT_SIZE_STORAGE_KEY);
    return value === "s" || value === "m" || value === "l" ? value : DEFAULT_CHAT_TEXT_SIZE;
  } catch {
    // An unavailable device store still permits reading conversations at the default size.
    return DEFAULT_CHAT_TEXT_SIZE;
  }
}

export function writeChatTextSize(size: ChatTextSize): void {
  localStorage.setItem(CHAT_TEXT_SIZE_STORAGE_KEY, size);
}

export function applyChatTextSize(element: HTMLElement, size: ChatTextSize): void {
  element.dataset["chatTextSize"] = size;
  element.style.setProperty("--pi-chat-font-size", typography[size].size);
  element.style.setProperty("--pi-chat-leading", typography[size].leading);
}
