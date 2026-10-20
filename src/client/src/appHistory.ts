const POSITION = "piWebHistoryPosition";

export function appHistoryPosition(): number | undefined {
  const value: unknown = window.history.state;
  const position: unknown = typeof value === "object" && value !== null ? Reflect.get(value, POSITION) : undefined;
  return typeof position === "number" && Number.isSafeInteger(position) ? position : undefined;
}

function historyState(position: number): Record<string, unknown> {
  const value: unknown = window.history.state;
  return { ...(typeof value === "object" && value !== null ? value : {}), [POSITION]: position };
}

export function initializeAppHistory(): void {
  if (appHistoryPosition() === undefined) window.history.replaceState(historyState(0), "");
}

export function writeAppHistory(url: URL, replace = false): void {
  const position = appHistoryPosition() ?? 0;
  if (replace) window.history.replaceState(historyState(position), "", url);
  else window.history.pushState(historyState(position + 1), "", url);
}
