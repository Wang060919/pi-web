import { localizedText, t } from "../../shared/i18n";
import type { QueuedSessionMessage } from "./api";

// The wire action remains "edit" for compatibility; the UI calls it Recall.
export type QueuedMessageAction = "edit" | "remove" | "toggle";

export interface QueuedMessageActionTarget {
  machineId: string;
  sessionId: string;
  action: QueuedMessageAction;
  index: number;
  expectedQueue: QueuedSessionMessage[];
}

export function queuedMessageAttachmentLabel(message: QueuedSessionMessage): string | undefined {
  const count = message.attachmentCount ?? 0;
  if (count > 0) return localizedText("queuedMessageActions.template.170f0071")`${String(count)} ${count === 1 ? "attachment" : "attachments"}`;
  return message.hasAttachments === true ? t("queuedMessageActions.attachments.1ca45bcc") : undefined;
}

/** Queues are displayed in delivery order: steering first, then follow-ups. */
export function queuedMessageRecallConfirmation(messages: readonly QueuedSessionMessage[], index: number): string | undefined {
  const message = messages[index];
  const hasAttachments = message?.hasAttachments === true || (message?.attachmentCount ?? 0) > 0;
  const warning = hasAttachments
    ? t("queuedMessageActions.recall_this_message_only_its_text_will.5f2f2b2c")
    : t("queuedMessageActions.recall_this_message.ba2603c0");
  const later = messages.slice(index + 1);
  if (later.length === 0) return hasAttachments ? warning : undefined;
  const steers = later.filter((message) => message.kind === "steer").length;
  const followUps = later.length - steers;
  const parts = [
    steers === 0 ? undefined : localizedText("queuedMessageActions.later.360d6ec8")`${String(steers)} later ${steers === 1 ? "steer" : "steers"}`,
    followUps === 0 ? undefined : localizedText("queuedMessageActions.queued.a552a28d")`${String(followUps)} queued ${followUps === 1 ? "follow-up" : "follow-ups"}`,
  ].filter((part) => part !== undefined);
  return localizedText("queuedMessageActions.this_will_also_remove.139efef8")`${warning}\n\nThis will also remove ${parts.join(t("queuedMessageActions.and.8baf3888"))}.`;
}
