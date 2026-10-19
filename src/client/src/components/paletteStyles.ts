import { css } from "lit";

/** Searchable modal chrome shared by Actions and Navigation. */
export const paletteStyles = css`
  :host { position: fixed; inset: 0; z-index: 20; color: var(--pi-text); font: var(--pi-font-weight-regular, 360) 13px/18px var(--pi-font-family, system-ui, sans-serif); }
  modal-surface { --palette-top: min(12dvh, 90px); --palette-bottom: max(20px, env(safe-area-inset-bottom)); --modal-surface-place-items: start center; --modal-surface-backdrop-padding: var(--palette-top) 20px var(--palette-bottom); --modal-surface-max-height: min(640px, calc(100dvh - var(--palette-top) - var(--palette-bottom))); }
  header { display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 10px; border-bottom: 0; }
  input { min-width: 0; border: 0; outline: none; background: transparent; color: var(--pi-text); font: var(--pi-font-weight-regular, 360) var(--pi-control-font-size, 14px)/1.428571 var(--pi-control-font-family, system-ui, sans-serif); padding: 8px; }
  input::placeholder { color: var(--pi-dim); }
  button { border: 0; border-radius: 6px; background: transparent; color: var(--pi-text); font: inherit; cursor: pointer; }
  header button { min-width: 30px; min-height: 30px; line-height: 20px; color: var(--pi-muted); font-size: 22px; padding: 2px 8px; }
  .options { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 4px 6px 6px; }
  .empty { padding: 24px; color: var(--pi-muted); text-align: center; }
  button:not(:disabled):hover { background: var(--pi-surface-hover); }
  button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: -2px; }
  input:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: -2px; border-radius: 6px; }
  strong { font-weight: var(--pi-font-weight-medium, 460); }
  small { font-size: 12px; line-height: 16px; }
  @media (max-width: 680px), (pointer: coarse) {
    button { min-height: 44px; }
    header button { min-width: 44px; }
  }
`;
