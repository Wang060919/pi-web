/** History arrives in transcript order; the most recent distinct prompt is first. */
export function promptInputHistoryChoices(history: readonly string[]): string[] {
  const seen = new Set<string>();
  const choices: string[] = [];
  for (let index = history.length - 1; index >= 0 && choices.length < 50; index -= 1) {
    const text = history[index];
    if (text === undefined || text.trim() === "" || seen.has(text)) continue;
    seen.add(text);
    choices.push(text);
  }
  return choices;
}
