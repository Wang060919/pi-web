export interface QuotedChatSelection {
  machineId: string;
  sessionId: string;
  entryId: string;
  text: string;
}

export function quotedSelectionPrompt(text: string): string {
  return `${text.trim().split(/\r?\n/).map((line) => `> ${line}`).join("\n")}\n\n`;
}

/** Read from the selection's own shadow root when the browser supports it. */
export function selectedContentIn(root: ShadowRoot): { text: string; range: Range } | undefined {
  const getter: unknown = Reflect.get(root, "getSelection");
  const candidate: unknown = typeof getter === "function" ? getter.call(root) : undefined;
  const selection = typeof Selection !== "undefined" && candidate instanceof Selection ? candidate : root.ownerDocument.getSelection();
  if (selection === null || selection.rangeCount === 0) return undefined;
  if (selection.anchorNode === null || selection.focusNode === null
    || !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return undefined;
  return { text: selection.toString().trim(), range: selection.getRangeAt(0) };
}

export function selectedTextIn(root: ShadowRoot): string {
  return selectedContentIn(root)?.text ?? "";
}
