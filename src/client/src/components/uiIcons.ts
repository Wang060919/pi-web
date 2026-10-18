import { html } from "lit";

// One optical size and stroke for compact controls, independent of the UI font.
const paths = {
  copy: "M9 8h10v12H9zM15 8V4H5v12h4",
  check: "m5 12 4 4L19 6",
  fork: "M6 3v5a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V3M12 12v9M3 6l3-3 3 3M15 6l3-3 3 3",
  undo: "m9 4-5 5 5 5M4 9h10a6 6 0 0 1 0 12h-3",
  trash: "M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7",
  close: "m6 6 12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  select: "M9 4H4v16h16V9M9 11l4 4L21 4",
  chevronRight: "m9 5 7 7-7 7",
  chevronDown: "m5 9 7 7 7-7",
  arrowUp: "M12 20V4m-6 6 6-6 6 6",
  arrowDown: "M12 4v16m-6-6 6 6 6-6",
  arrowRight: "M4 12h16m-6-6 6 6-6 6",
  cornerDownRight: "M5 4v9a3 3 0 0 0 3 3h12m-5-5 5 5-5 5",
  paperclip: "m8 12 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9m-2 9-5 5a1 1 0 0 0 2 2l8-8",
  arrowLeft: "M20 12H4m6-6-6 6 6 6",
  externalLink: "M14 4h6v6m0-6L10 14M10 4H4v16h16v-6",
  circle: "M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  dot: "M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
} as const;

type UiIcon = keyof typeof paths;

export function renderUiIcon(name: UiIcon, size: 12 | 14 | 16 | 18 = 16) {
  return html`<svg class="ui-icon" aria-hidden="true" focusable="false" width=${size} height=${size} viewBox="0 0 24 24" fill=${name === "dot" ? "currentColor" : "none"} stroke="currentColor" stroke-width=${name === "more" ? 3 : 1.75} stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;flex-shrink:0;vertical-align:-.125em"><path d=${paths[name]} /></svg>`;
}

// Markdown code controls are assembled as HTML before mounting. Only the fixed
// icon names and paths above enter this markup; message content never does.
export function uiIconMarkup(name: "copy" | "check"): string {
  return `<svg class="ui-icon" aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;flex-shrink:0;vertical-align:-.125em"><path d="${paths[name]}"></path></svg>`;
}
