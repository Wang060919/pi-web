import { css } from "lit";

/** Shared presentation only: source and preview lifecycle stay with their owners. */
export const codeBlockFrameStyles = css`
  .code-block-frame { min-width: 0; border: 0; border-radius: 8px; background: var(--pi-surface); color: var(--pi-text); }
  /* Normal flow keeps the header outside the body's native scroll region. */
  .code-block-header { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; min-height: 24px; padding: 6px 8px; border-radius: 7px 7px 0 0; border-bottom: 0; background: transparent; }
  .code-block-label { flex: 1 1 0; min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--pi-muted); font: 12px/1.5 var(--pi-font-family, system-ui, sans-serif); }
  .code-block-header > .code-block-copy { flex: 0 0 24px; display: grid; place-items: center; margin-inline-start: auto; width: 24px; height: 24px; box-sizing: border-box; border: 0; border-radius: 6px; background: transparent; color: var(--pi-muted); padding: 0; font: 14px/1 var(--pi-font-family, system-ui, sans-serif); cursor: pointer; }
  .code-block-header > .code-block-copy:hover { color: var(--pi-text); background: var(--pi-surface-hover); }
  .code-block-header > .code-block-copy:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: -2px; }
`;
