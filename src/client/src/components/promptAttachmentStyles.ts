import { css } from "lit";

export const promptAttachmentStyles = css`
  .attachment-chip.attachment-card { display: flex; flex: 0 0 228px; box-sizing: border-box; width: 228px; max-width: 100%; height: 76px; border-color: var(--pi-border-muted); border-radius: 12px; background: var(--pi-bg); }
  .attachment-preview-trigger { display: flex; align-items: center; gap: 9px; width: 100%; min-width: 0; height: 100%; padding: 8px 30px 8px 8px; border: 0; border-radius: 11px; background: transparent; font: inherit; text-align: left; }
  .attachment-preview-trigger:focus-visible { outline-offset: -3px; }
  .attachment-thumbnail { display: grid; flex: none; place-items: center; width: 52px; height: 52px; overflow: hidden; border-radius: 7px; background: var(--pi-surface); }
  .attachment-thumbnail img { width: 100%; height: 100%; object-fit: cover; }
  .attachment-card-copy { display: block; flex: 1 1 0; min-width: 0; }
  .attachment-card-name { display: -webkit-box; max-height: 2.7em; overflow: hidden; color: var(--pi-text); font-size: 12px; font-weight: var(--pi-font-weight-medium, 460); line-height: 1.35; overflow-wrap: anywhere; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
  .attachment-card-info { display: block; margin-top: 4px; overflow: hidden; color: var(--pi-muted); font-size: 10px; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
  .attachment-card .attachment-remove { top: 4px; right: 4px; width: 22px; height: 22px; padding: 0; border-color: transparent; background: transparent; color: var(--pi-muted); font-size: 17px; line-height: 20px; }
  .attachment-card .attachment-remove:not(:disabled):hover { background: var(--pi-surface); color: var(--pi-danger); }
`;
