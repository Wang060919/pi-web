import { t } from "../../shared/i18n";
import type { ChatGroup } from "./chatGroups";
import type { ChatLine } from "./components/shared";

export interface ChatTimelineEntry {
  key: string;
  index: number;
  title: string;
  preview: string;
}

/** Project readable user turns without running rich-text or tool renderers. */
export function chatTimelineEntries(groups: readonly ChatGroup[]): ChatTimelineEntry[] {
  const entries: ChatTimelineEntry[] = [];
  let current: ChatTimelineEntry | undefined;
  for (const group of groups) {
    if (group.kind !== "message") continue;
    const message = group.message;
    if (message.role === "user") {
      // An invisible user turn still ends the previous answer's preview.
      current = undefined;
      if (message.source !== undefined) continue;
      const text = visibleText(message).replace(/\s+/gu, " ").trim();
      const title = text === "" && message.parts.some((part) => part.type === "image") ? t("ui.chatTimeline.image") : truncate(text, 100);
      if (title === "") continue;
      current = {
        key: message.entryId === undefined || message.entryId === "" ? `index:${String(group.index)}` : `entry:${message.entryId}`,
        index: group.index,
        title,
        preview: "",
      };
      entries.push(current);
    } else if (current !== undefined && message.role === "assistant" && message.source === undefined) {
      const text = visibleText(message).replace(/\r\n?/gu, "\n").replace(/[^\S\n]+/gu, " ").replace(/ *\n */gu, "\n").replace(/\n{3,}/gu, "\n\n").trim();
      if (text !== "") current.preview = truncate([current.preview, text].filter(Boolean).join("\n\n"), 240);
    }
  }
  return entries;
}

function visibleText(message: ChatLine): string {
  return message.parts.flatMap((part) => part.type === "text" ? [part.displayText ?? part.text] : []).join("\n\n");
}

function truncate(text: string, limit: number): string {
  const characters = Array.from(text);
  return characters.length > limit ? `${characters.slice(0, limit - 1).join("")}…` : text;
}

/** Keep the full loaded range and active turn visible in a bounded set of ticks. */
export function sampleChatTimelineEntries(entries: readonly ChatTimelineEntry[], activeKey?: string, limit = 31): ChatTimelineEntry[] {
  // Both endpoints and an interior active turn need at least three slots.
  const count = Math.max(3, Number.isFinite(limit) ? Math.floor(limit) : 31);
  if (entries.length <= count) return [...entries];
  const indexes = Array.from({ length: count }, (_, index) => Math.round(index * (entries.length - 1) / (count - 1)));
  const activeIndex = entries.findIndex((entry) => entry.key === activeKey);
  if (activeIndex >= 0 && !indexes.includes(activeIndex)) {
    let nearest = 1;
    let distance = Number.POSITIVE_INFINITY;
    for (let index = 1; index < indexes.length - 1; index += 1) {
      const candidate = indexes[index];
      if (candidate !== undefined && Math.abs(candidate - activeIndex) < distance) {
        nearest = index;
        distance = Math.abs(candidate - activeIndex);
      }
    }
    indexes[nearest] = activeIndex;
  }
  const selected = new Set(indexes);
  return entries.filter((_entry, index) => selected.has(index));
}
