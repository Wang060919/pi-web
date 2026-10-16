import { css } from "lit";

export const navigationContextStyles = css`
  .context-switcher { flex: 0 0 auto; display: grid; gap: 2px; padding: 8px 12px; border-bottom: 0; }
  .context-select { display: flex; align-items: center; gap: 8px; min-width: 0; width: 100%; padding: 6px 8px; border-color: transparent; border-radius: 10px; background: transparent; font: inherit; text-align: left; }
  .context-select:hover, .context-select[aria-expanded="true"] { background: var(--pi-surface-hover); }
  button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
  .context-copy { display: grid; gap: 2px; flex: 1 1 auto; min-width: 0; }
  .context-copy small { color: var(--pi-muted); font-size: 11px; }
  .context-copy > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 18px; font-weight: 400; }
  .context-chevron { flex: 0 0 auto; color: var(--pi-muted); font-size: 17px; line-height: 1; }
  .context-picker { position: fixed; inset: 0; z-index: 100; }
  .context-picker modal-surface { --modal-surface-width: min(480px, calc(100vw - 32px)); --modal-surface-height: min(560px, calc(100dvh - 48px)); --modal-surface-max-height: calc(100dvh - 48px); --modal-surface-radius: 16px; }
  .picker-heading { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px 8px; }
  .picker-heading strong { min-width: 0; font-size: 14px; font-weight: 500; }
  .picker-heading .picker-close { display: grid; place-items: center; flex: 0 0 auto; width: 28px; height: 28px; padding: 0; border: 0; background: transparent; color: var(--pi-muted); font-size: 22px; }
  .picker-heading .picker-close:hover { background: var(--pi-surface-hover); color: var(--pi-text); }
  @media (pointer: coarse) { .picker-heading .picker-close { width: 44px; height: 44px; } }
  .context-picker project-list, .context-picker workspace-list { flex: 1 1 auto; min-height: 0; border-bottom: 0; }
`;
