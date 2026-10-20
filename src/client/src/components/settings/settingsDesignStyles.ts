import { css } from "lit";

export const settingsTargetStyles = css`
  [data-search-highlight] { scroll-margin-block: 24px; animation: settings-target 2s ease-out; border-radius: 8px; }
  @keyframes settings-target {
    0%, 35% { outline: 2px solid var(--pi-accent); outline-offset: 4px; background: color-mix(in srgb, var(--pi-accent) 10%, transparent); }
    100% { outline: 2px solid transparent; outline-offset: 4px; background: transparent; }
  }
  @media (prefers-reduced-motion: reduce) {
    [data-search-highlight] { animation-timing-function: step-end; }
  }
`;

/** Comfortable settings density, shared by the independently rendered panels. */
export const settingsDesignStyles = css`
  :host { --settings-control-height: 32px; font: var(--pi-font-weight-regular, 360) 14px/20px var(--pi-font-family, system-ui, sans-serif); }
  h2 { font-size: 18px; line-height: 24px; }
  h3 { font-size: 15px; line-height: 20px; font-weight: var(--pi-font-weight-semibold, 540); }
  small { font-size: 13px; line-height: 18px; }
  button { min-height: var(--settings-control-height); border-radius: 8px; padding: 5px 12px; font-size: 14px; line-height: 20px; }
  input:not([type="checkbox"]):not([type="radio"]), select { min-height: var(--settings-control-height); border-radius: 8px; padding: 5px 10px; font: inherit; }
  textarea { border-radius: 8px; padding: 8px 10px; }
  .field, .mode-row { padding-block: 12px; }
  .settings-card { background: transparent; border-radius: 0; padding: 0; }
  .settings-sections { gap: 32px; }
  .card-heading, header { gap: 4px; }
  .theme-card header { margin: 0 0 12px; }
  .language-card { padding-bottom: 24px; }
  .config-form { gap: 0; }
  .config-form .field { display: grid; grid-template-columns: minmax(0, 1fr) minmax(180px, 280px); align-items: start; gap: 4px 24px; }
  .config-form .field > .field-heading { grid-column: 1; grid-row: 1; color: var(--pi-text); font-size: 14px; font-weight: inherit; }
  .config-form .field > small { grid-column: 1; grid-row: 2; }
  .config-form .field > :is(input, select, textarea) { grid-column: 2; grid-row: 1 / span 2; }
  .config-form .field[data-setting-id="allowed-hosts"] > textarea { grid-row: 3; }
  .config-form .field[data-setting-id="allowed-hosts"] > select { grid-row: 1 / span 2; }
  .config-form > .field + .field { border-top: 1px solid var(--pi-border-muted); }
  .form-actions { padding-block: 12px; gap: 12px; }
  .section-heading { margin-bottom: 24px; }
  .content, .fields { gap: 16px; }
  ${settingsTargetStyles}
  @media (max-width: 760px), (pointer: coarse) {
    :host { --settings-control-height: 44px; }
    .config-form .field { grid-template-columns: minmax(0, 1fr); gap: 8px; }
    .config-form .field > :is(input, select, textarea, small, .field-heading), .config-form .field[data-setting-id="allowed-hosts"] > :is(select, textarea) { grid-column: 1; grid-row: auto; }
    .config-form .field > small { order: 1; }
    input:not([type="checkbox"]):not([type="radio"]), select { font-size: 16px; }
  }
`;
