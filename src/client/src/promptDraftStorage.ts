const draftStoragePrefix = "pi-web:prompt-draft:";
const pendingOwners = new Set<{ key: string }>();
type DraftSubmissionEvent = { type: "pending" } | { type: "consumed"; draft: string };
const submissionListeners = new Map<string, Set<(event: DraftSubmissionEvent) => void>>();

function notifySubmission(key: string, event: DraftSubmissionEvent): void {
  for (const listener of [...submissionListeners.get(key) ?? []]) listener(event);
}

export function isDraftSubmissionPending(key: string): boolean {
  return [...pendingOwners].some((owner) => owner.key === key);
}

/** Keep an in-flight submission attached to temporary-session identity changes. */
export function beginDraftSubmission(key: string): { readonly key: string; dispose: () => void } {
  const owner = { key };
  pendingOwners.add(owner);
  notifySubmission(key, { type: "pending" });
  return { get key() { return owner.key; }, dispose: () => {
    pendingOwners.delete(owner);
    notifySubmission(owner.key, { type: "pending" });
  } };
}

/** Replacement composers share pending state and consume accepted, unchanged text. */
export function subscribeDraftSubmissions(key: string, listener: (event: DraftSubmissionEvent) => void): () => void {
  const listeners = submissionListeners.get(key) ?? new Set<(event: DraftSubmissionEvent) => void>();
  listeners.add(listener);
  submissionListeners.set(key, listeners);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) submissionListeners.delete(key);
  };
}

export function consumeDraft(key: string, submitted: string, storage = browserStorage()): void {
  if (loadDraft(key, storage) !== submitted) return;
  clearDraft(key, storage);
  notifySubmission(key, { type: "consumed", draft: submitted });
}

function draftStorageKey(sessionId: string): string {
  return `${draftStoragePrefix}${sessionId}`;
}

function browserStorage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function loadDraft(sessionId: string, storage = browserStorage()): string {
  try {
    return storage?.getItem(draftStorageKey(sessionId)) ?? "";
  } catch {
    return "";
  }
}

export function saveDraft(sessionId: string, draft: string, storage = browserStorage()): void {
  try {
    if (draft) storage?.setItem(draftStorageKey(sessionId), draft);
    else storage?.removeItem(draftStorageKey(sessionId));
  } catch {
    // Ignore localStorage quota/privacy errors.
  }
}

export function clearDraft(sessionId: string, storage = browserStorage()): void {
  try {
    storage?.removeItem(draftStorageKey(sessionId));
  } catch {
    // Ignore localStorage quota/privacy errors.
  }
}

export function moveDraft(fromSessionId: string, toSessionId: string, storage = browserStorage()): void {
  if (fromSessionId === toSessionId) return;
  for (const owner of pendingOwners) if (owner.key === fromSessionId) owner.key = toSessionId;
  notifySubmission(fromSessionId, { type: "pending" });
  notifySubmission(toSessionId, { type: "pending" });
  const draft = loadDraft(fromSessionId, storage);
  if (draft === "") return;
  saveDraft(toSessionId, draft, storage);
  clearDraft(fromSessionId, storage);
}
