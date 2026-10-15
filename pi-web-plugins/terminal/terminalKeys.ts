import { t } from "./i18n.js";
export type TerminalSoftKeyId =
  | "escape"
  | "tab"
  | "ctrl-c"
  | "ctrl-d"
  | "ctrl-z"
  | "ctrl-l"
  | "ctrl-r"
  | "ctrl-u"
  | "ctrl-w"
  | "arrow-left"
  | "arrow-up"
  | "arrow-down"
  | "arrow-right"
  | "home"
  | "end"
  | "page-up"
  | "page-down"
  | "delete"
  | "backspace"
  | "meta-backward-word"
  | "meta-forward-word";

export interface TerminalModesSnapshot {
  applicationCursorKeysMode: boolean;
}

export interface TerminalSoftKeyDefinition {
  id: TerminalSoftKeyId;
  label: string;
  ariaLabel: string;
  title: string;
}

export const TERMINAL_SOFT_KEYS: readonly TerminalSoftKeyDefinition[] = [
  { id: "escape", label: "Esc", ariaLabel: "Escape", title: t("terminalKeys.send_escape.b637b731") },
  { id: "tab", label: "Tab", ariaLabel: "Tab", title: t("terminalKeys.send_tab.efc35787") },
  { id: "ctrl-c", label: "Ctrl+C", ariaLabel: "Control C", title: t("terminalKeys.interrupt_the_foreground_process.67d92232") },
  { id: "ctrl-d", label: "Ctrl+D", ariaLabel: "Control D", title: t("terminalKeys.send_eof_close_input.1d24c924") },
  { id: "ctrl-z", label: "Ctrl+Z", ariaLabel: "Control Z", title: t("terminalKeys.suspend_the_foreground_process.c041aebe") },
  { id: "ctrl-l", label: "Ctrl+L", ariaLabel: "Control L", title: t("terminalKeys.clear_redraw_the_terminal.f961b6d2") },
  { id: "ctrl-r", label: "Ctrl+R", ariaLabel: "Control R", title: t("terminalKeys.reverse_search_history.064d1bdf") },
  { id: "ctrl-u", label: "Ctrl+U", ariaLabel: "Control U", title: t("terminalKeys.delete_to_the_start_of_the_line.ac52f80f") },
  { id: "ctrl-w", label: "Ctrl+W", ariaLabel: "Control W", title: t("terminalKeys.delete_the_previous_word.37bc1a1e") },
  { id: "arrow-left", label: "←", ariaLabel: t("terminalKeys.left_arrow.90a989bb"), title: t("terminalKeys.move_left.cfcdde98") },
  { id: "arrow-up", label: "↑", ariaLabel: t("terminalKeys.up_arrow.8c7741bb"), title: t("terminalKeys.move_up_previous_command.43d1b134") },
  { id: "arrow-down", label: "↓", ariaLabel: t("terminalKeys.down_arrow.1f34a5c1"), title: t("terminalKeys.move_down_next_command.b441d674") },
  { id: "arrow-right", label: "→", ariaLabel: t("terminalKeys.right_arrow.bf49499d"), title: t("terminalKeys.move_right.711b6efe") },
  { id: "home", label: "Home", ariaLabel: "Home", title: t("terminalKeys.move_to_the_start.da060867") },
  { id: "end", label: "End", ariaLabel: "End", title: t("terminalKeys.move_to_the_end.62c6d9fa") },
  { id: "page-up", label: "PgUp", ariaLabel: t("terminalKeys.page_up.d23d8249"), title: t("terminalKeys.page_up.1c62b44a") },
  { id: "page-down", label: "PgDn", ariaLabel: t("terminalKeys.page_down.a9f0a608"), title: t("terminalKeys.page_down.d5c3a494") },
  { id: "delete", label: "Del", ariaLabel: t("terminalKeys.delete.9755d175"), title: t("terminalKeys.delete_forward.62e6e4f4") },
  { id: "backspace", label: "⌫", ariaLabel: t("terminalKeys.backspace.6edf6eef"), title: t("terminalKeys.backspace.4863bc7f") },
  { id: "meta-backward-word", label: "M-B", ariaLabel: "Meta B", title: t("terminalKeys.move_backward_one_word.86571e3e") },
  { id: "meta-forward-word", label: "M-F", ariaLabel: "Meta F", title: t("terminalKeys.move_forward_one_word.7be9e6f7") },
];

const ESC = "\x1b";
const DEL = "\x7f";

export function terminalSoftKeySequence(key: TerminalSoftKeyId, modes?: TerminalModesSnapshot): string {
  switch (key) {
    case "escape": return ESC;
    case "tab": return "\t";
    case "ctrl-c": return controlSequence("c");
    case "ctrl-d": return controlSequence("d");
    case "ctrl-z": return controlSequence("z");
    case "ctrl-l": return controlSequence("l");
    case "ctrl-r": return controlSequence("r");
    case "ctrl-u": return controlSequence("u");
    case "ctrl-w": return controlSequence("w");
    case "arrow-left": return cursorSequence("D", modes);
    case "arrow-up": return cursorSequence("A", modes);
    case "arrow-down": return cursorSequence("B", modes);
    case "arrow-right": return cursorSequence("C", modes);
    case "home": return cursorEndpointSequence("H", modes);
    case "end": return cursorEndpointSequence("F", modes);
    case "page-up": return `${ESC}[5~`;
    case "page-down": return `${ESC}[6~`;
    case "delete": return `${ESC}[3~`;
    case "backspace": return DEL;
    case "meta-backward-word": return `${ESC}b`;
    case "meta-forward-word": return `${ESC}f`;
  }
}

function controlSequence(letter: string): string {
  return String.fromCharCode(letter.toUpperCase().charCodeAt(0) - 64);
}

function cursorSequence(code: "A" | "B" | "C" | "D", modes: TerminalModesSnapshot | undefined): string {
  return modes?.applicationCursorKeysMode === true ? `${ESC}O${code}` : `${ESC}[${code}`;
}

function cursorEndpointSequence(code: "F" | "H", modes: TerminalModesSnapshot | undefined): string {
  return modes?.applicationCursorKeysMode === true ? `${ESC}O${code}` : `${ESC}[${code}`;
}
