import { css } from "lit";

export const sharedSettingsEditorStyles = css`
  :host { display: block; color: var(--pi-text); font: var(--pi-font-weight-regular, 360) 13px/18px var(--pi-font-family, system-ui, sans-serif); }
  h2, h3, p { margin: 0; }
  h2 { font-size: 16px; line-height: 22px; font-weight: var(--pi-font-weight-medium, 460); }
  h3 { font-size: 14px; line-height: 20px; font-weight: var(--pi-font-weight-medium, 460); }
  strong, summary { font-weight: var(--pi-font-weight-medium, 460); }
  p, small, .muted { color: var(--pi-muted); }
  small { font-size: 12px; line-height: 16px; }
  button { box-sizing: border-box; min-height: 30px; border: 0; border-radius: 6px; background: transparent; color: var(--pi-text); padding: 6px 10px; font: inherit; cursor: pointer; }
  button:not(:disabled):hover { background: var(--pi-surface-hover); }
  button:disabled { opacity: .55; cursor: not-allowed; }
  button.primary { background: var(--pi-selection-bg); color: var(--pi-text-bright); font-weight: var(--pi-font-weight-medium, 460); }
  button.danger, .error { color: var(--pi-danger); }
  .success { color: var(--pi-success); }
  button:focus-visible, a:focus-visible, summary:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
  input, textarea, select { box-sizing: border-box; width: 100%; min-width: 0; border: 1px solid var(--pi-border); border-radius: 8px; background: var(--pi-bg); color: var(--pi-text); padding: 8px 10px; outline: none; font: var(--pi-font-weight-regular, 360) 13px/18px var(--pi-control-font-family, var(--pi-font-family, system-ui, sans-serif)); }
  input:focus, textarea:focus, select:focus { border-color: var(--pi-accent); box-shadow: 0 0 0 1px var(--pi-accent-border); }
  input[type="checkbox"] { flex: 0 0 auto; width: 14px; height: 14px; margin: 0; padding: 0; accent-color: var(--pi-text); }
  input:disabled, textarea:disabled, select:disabled { opacity: .55; }
  textarea, code, pre { font: var(--pi-font-weight-regular, 360) 12px/17.5px var(--pi-font-monospace, ui-monospace, monospace); }
  textarea { resize: vertical; }
  pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  summary { cursor: pointer; overflow-wrap: anywhere; }
  .error { white-space: pre-wrap; overflow-wrap: anywhere; }

  @media (max-width: 760px), (pointer: coarse) {
    button, input:not([type="checkbox"]), select { min-height: 44px; }
    .check { min-height: 44px; }
  }
`;
