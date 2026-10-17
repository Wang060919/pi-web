import { css } from "lit";

export const navigationContextStyles = css`
  .context-switcher { flex: 0 0 auto; display: grid; gap: 2px; margin: 0 8px 20px; }
  .context-select { box-sizing: border-box; display: flex; align-items: center; gap: 10px; min-width: 0; width: 100%; padding: 7px 10px; border: 0; border-radius: 7px; background: transparent; font: inherit; text-align: left; }
  .context-select:hover, .context-select[aria-expanded="true"] { background: var(--pi-surface-hover); }
  button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
  .context-copy { display: grid; gap: 2px; flex: 1 1 auto; min-width: 0; }
  .context-copy small { color: var(--pi-muted); font-size: 11px; line-height: 14px; }
  .context-copy > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 18px; font-weight: 400; }
  .context-icon { flex: 0 0 auto; display: grid; place-items: center; width: 18px; height: 28px; color: var(--pi-muted); }
  .context-icon svg, .context-chevron { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
  .context-chevron { flex: 0 0 auto; color: var(--pi-dim); transition: transform 120ms ease; }
  .context-select[aria-expanded="true"] .context-chevron { transform: rotate(180deg); }
  @media (prefers-reduced-motion: reduce) { .context-chevron { transition: none; } }
  .context-picker { position: fixed; inset: 0; z-index: 100; }
  .context-picker modal-surface { --modal-surface-width: min(480px, calc(100vw - 32px)); --modal-surface-height: min(560px, calc(100dvh - 48px)); --modal-surface-max-height: calc(100dvh - 48px); --modal-surface-radius: 16px; }
  .picker-heading { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px 8px; }
  .picker-heading strong { min-width: 0; font-size: 14px; font-weight: 500; }
  .picker-heading .picker-close { display: grid; place-items: center; flex: 0 0 auto; width: 28px; height: 28px; padding: 0; border: 0; background: transparent; color: var(--pi-muted); font-size: 22px; }
  .picker-heading .picker-close:hover { background: var(--pi-surface-hover); color: var(--pi-text); }
  @media (pointer: coarse) { .picker-heading .picker-close { width: 44px; height: 44px; } }
  .context-picker project-list, .context-picker workspace-list { flex: 1 1 auto; min-height: 0; border-bottom: 0; }
`;
