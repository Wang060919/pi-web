import type { CapturedAttachment } from "./promptAttachmentCapture";

/** A captured attachment staged in the composer, tagged with a stable id for chip removal/rendering. */
export type PendingAttachment = CapturedAttachment & { id: string };

export type StagedAttachmentStore = Map<string, readonly PendingAttachment[]>;
type StagedAttachmentListener = (attachments: readonly PendingAttachment[]) => void;

export interface StagedAttachmentCapture {
  /** Follows session identity handoffs only while this capture is in flight. */
  readonly key: string;
  append(attachments: readonly PendingAttachment[]): void;
  dispose(): void;
}

/**
 * In-memory (not localStorage) staging area for attachments pending send, keyed
 * the same way as `promptDraftStorage` (by `machineId:sessionId`). Attachment
 * payloads are base64 file/image data, which can be large, so unlike the draft
 * text they are not persisted across reloads.
 *
 * This mirrors `promptDraftStorage`/`cachedNewSessions` deliberately, both in
 * shape (an injectable store defaulting to a shared instance, the way those
 * modules default `storage` to `browserStorage()`) and in why it exists:
 * `PromptEditor` is a single long-lived element that just gets pointed at a
 * different session, and `sessionController` reassigns session ids under the
 * user in a few places (new-session provisioning, cached-session
 * replacement) where it already moves the draft via `moveDraft`. Staged
 * attachments need the same treatment so they migrate rather than vanish
 * when a session's id changes for reasons other than the user switching tabs.
 */
function defaultStore(): StagedAttachmentStore {
  return sharedStore;
}

const sharedStore: StagedAttachmentStore = new Map();
const listenersByStore = new WeakMap<StagedAttachmentStore, Map<string, Set<StagedAttachmentListener>>>();
const capturesByStore = new WeakMap<StagedAttachmentStore, Set<{ key: string }>>();

/** A mounted composer observes its own key; disconnecting releases the subscription. */
export function subscribeStagedAttachments(key: string, listener: StagedAttachmentListener, store: StagedAttachmentStore = defaultStore()): () => void {
  let listenersByKey = listenersByStore.get(store);
  if (listenersByKey === undefined) {
    listenersByKey = new Map();
    listenersByStore.set(store, listenersByKey);
  }
  let listeners = listenersByKey.get(key);
  if (listeners === undefined) {
    listeners = new Set();
    listenersByKey.set(key, listeners);
  }
  listeners.add(listener);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    listeners.delete(listener);
    if (listeners.size === 0) listenersByKey.delete(key);
    if (listenersByKey.size === 0) listenersByStore.delete(store);
  };
}

/** Bound only to pending reads, so handoffs do not retain permanent key aliases. */
export function beginStagedAttachmentCapture(key: string, store: StagedAttachmentStore = defaultStore()): StagedAttachmentCapture {
  let captures = capturesByStore.get(store);
  if (captures === undefined) {
    captures = new Set();
    capturesByStore.set(store, captures);
  }
  const owner = { key };
  captures.add(owner);
  let active = true;
  return {
    get key() { return owner.key; },
    append: (attachments) => {
      if (!active) throw new Error("Attachment capture has already finished");
      if (attachments.length > 0) saveStagedAttachments(owner.key, [...loadStagedAttachments(owner.key, store), ...attachments], store);
    },
    dispose: () => {
      if (!active) return;
      active = false;
      captures.delete(owner);
      if (captures.size === 0) capturesByStore.delete(store);
    },
  };
}

function notifyStagedAttachments(key: string, store: StagedAttachmentStore): void {
  const attachments = loadStagedAttachments(key, store);
  for (const listener of [...listenersByStore.get(store)?.get(key) ?? []]) listener(attachments);
}

export function loadStagedAttachments(key: string, store: StagedAttachmentStore = defaultStore()): readonly PendingAttachment[] {
  return store.get(key) ?? [];
}

export function saveStagedAttachments(key: string, attachments: readonly PendingAttachment[], store: StagedAttachmentStore = defaultStore()): void {
  const previous = store.get(key);
  if (attachments.length > 0) store.set(key, attachments);
  else store.delete(key);
  if (previous !== store.get(key)) notifyStagedAttachments(key, store);
}

export function clearStagedAttachments(key: string, store: StagedAttachmentStore = defaultStore()): void {
  saveStagedAttachments(key, [], store);
}

export function moveStagedAttachments(fromKey: string, toKey: string, store: StagedAttachmentStore = defaultStore()): void {
  if (fromKey === toKey) return;
  for (const capture of capturesByStore.get(store) ?? []) if (capture.key === fromKey) capture.key = toKey;
  const attachments = store.get(fromKey);
  if (attachments === undefined) return;
  store.set(toKey, attachments);
  store.delete(fromKey);
  notifyStagedAttachments(fromKey, store);
  notifyStagedAttachments(toKey, store);
}
