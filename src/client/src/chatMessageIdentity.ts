import type { ChatLine } from "./components/shared";

export function chatLineIdentity(index: number, message?: ChatLine): string {
  return chatLineScrollIdentity(message) ?? String(index);
}

export function chatLineScrollIdentity(message?: ChatLine): string | undefined {
  if (message?.entryId === undefined || message.entryId === "") return undefined;
  // Page offsets count raw entries, whereas display indexes count normalized
  // lines. Only durable entry identity survives coalescing during a prepend.
  // Skill invocations can also produce a user-text line from the same entry.
  const slice = message.parts.some((part) => part.type === "skillInvocation") ? "skill-invocation" : "message";
  return JSON.stringify([message.entryId, message.role, slice]);
}

/** Scroll identities never fall back to normalized display indexes. */
export function chatMessageAnchorKey(_index: number, message?: ChatLine): string | undefined {
  const identity = chatLineScrollIdentity(message);
  return identity === undefined ? undefined : `m:${identity}`;
}

export function chatGroupAnchorKey(_startIndex: number, message?: ChatLine): string | undefined {
  const identity = chatLineScrollIdentity(message);
  return identity === undefined ? undefined : `g:${identity}`;
}

/** Event identity is separate from the readable slice of the same entry. */
export function chatEventAnchorKey(_index: number, message?: ChatLine): string | undefined {
  const identity = chatLineScrollIdentity(message);
  return identity === undefined ? undefined : `e:${identity}`;
}

