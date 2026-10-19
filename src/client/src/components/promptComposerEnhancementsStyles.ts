import { css } from "lit";

export const promptComposerEnhancementsStyles = css`
  .prompt-history { position: absolute; z-index: 5; bottom: 100%; left: 0; right: 0; box-sizing: border-box; max-height: min(320px, 45dvh); overflow-y: auto; margin-bottom: 6px; padding: 6px; border: 1px solid var(--pi-border-muted); border-radius: 10px; background: var(--pi-surface); box-shadow: 0 8px 24px var(--pi-shadow); font: var(--pi-font-weight-regular, 360) 13px/18px var(--pi-control-font-family, var(--pi-font-family, system-ui, sans-serif)); }
  .prompt-history-heading { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px 8px; padding: 5px 8px 8px; color: var(--pi-muted); font-size: 12px; }
  .prompt-history button { display: block; box-sizing: border-box; width: 100%; padding: 8px; border: 0; border-radius: 6px; background: transparent; color: var(--pi-text); text-align: start; font: inherit; white-space: pre-wrap; overflow-wrap: anywhere; }
  .prompt-history button.selected { background: var(--pi-selection-bg); }
  .prompt-history button:not(:disabled):hover { background: var(--pi-surface-hover); }
  .prompt-history button:disabled { opacity: .5; cursor: not-allowed; }
  .prompt-history-text { display: -webkit-box; overflow: hidden; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
  .attachment-chip.attachment-card:has(.attachment-image-controls) { height: auto; min-height: 100px; flex-wrap: wrap; }
  .attachment-card:has(.attachment-image-controls) .attachment-preview-trigger { height: 72px; }
  .attachment-image-controls { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px; min-width: 0; width: 100%; padding: 0 8px 8px; box-sizing: border-box; color: var(--pi-muted); font: var(--pi-font-weight-regular, 360) 12px/18px var(--pi-control-font-family, var(--pi-font-family, system-ui, sans-serif)); }
  .attachment-image-controls select { box-sizing: border-box; min-width: 0; max-width: 100%; min-height: 28px; padding: 4px 6px; border: 1px solid var(--pi-border-muted); border-radius: 6px; background: var(--pi-bg); color: var(--pi-text); font: inherit; cursor: pointer; }
  .attachment-image-controls select:not(:disabled):hover { background: var(--pi-surface-hover); }
  .attachment-image-controls select:disabled { opacity: .5; cursor: not-allowed; }
  .attachment-image-controls span { min-width: 0; overflow-wrap: anywhere; }
  .attachment-image-controls select:focus-visible, .prompt-history button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
  .attachment-processing-error { flex-basis: 100%; color: var(--pi-danger); }
`;
