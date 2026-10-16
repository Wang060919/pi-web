import { css } from "lit";

export const workspaceFileCardStyles = css`
  .file-cards { display: grid; gap: 8px; margin-top: 14px; min-width: 0; }
  .file-cards-heading { margin: 0; color: var(--pi-muted); font-size: 11px; font-weight: 500; }
  .file-card-list { display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; }
  .file-card { display: flex; flex: 0 1 300px; align-items: center; gap: 12px; box-sizing: border-box; max-width: 100%; min-width: 0; padding: 12px; border: 0; border-radius: 12px; background: var(--pi-surface); color: var(--pi-text); text-decoration: none; transition: background .12s ease; }
  .file-card:hover { background: var(--pi-selection-bg); }
  .file-card:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
  .file-card-type { display: grid; place-items: center; flex: none; width: 38px; height: 44px; overflow: hidden; border: 0; background: var(--pi-bg); border-radius: 7px; color: var(--pi-accent); font-size: 10px; font-weight: 600; }
  .file-card-copy { display: grid; gap: 4px; min-width: 0; }
  .file-card-copy strong { overflow-wrap: anywhere; font-size: 13px; font-weight: 500; }
  .file-card-copy small { overflow-wrap: anywhere; color: var(--pi-muted); font-size: 11px; }
  .file-card-open { margin-left: auto; color: var(--pi-muted); font-size: 16px; }
  @media (max-width: 640px) { .file-card { flex-basis: 100%; } }
  @media (prefers-reduced-motion: reduce) { .file-card { transition: none; } }
`;
