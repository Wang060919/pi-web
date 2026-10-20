import { settingsDesignStyles } from "./settingsDesignStyles";
import { localizedTemplate, localizedText, t } from "../../../../shared/i18n";
import { css, html, LitElement, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { AppAction } from "../../actions";
import type { PiWebConfigResponse, PiWebConfigValues, PiWebShortcutConfig } from "../../api";
import { formatShortcut, parseShortcutInput, resolveShortcutBindings, shortcutPreferenceForAction, shortcutSequenceTimeoutMs, shortcutTokenFromEvent, type ShortcutBindingResolution } from "../../keyboardShortcuts";
import { composerShortcutActions, isComposerShortcut } from "../../composerShortcuts";
import "./SettingsPanelFrame";
import type { SettingsNotice } from "./SettingsPanelFrame";

const RECORD_SHORTCUT_LISTENER_OPTIONS = { capture: true } as const;

function renderShortcutsDescription(): TemplateResult {
  return localizedTemplate("SettingsShortcutsPanel.edit_app_shortcuts_by_action_type_a.62a52306", html)`Edit app shortcuts by action. Type a shortcut such as <code>mod+k</code> or <code>g p</code>, record one from the keyboard, disable it with None, or reset it to the default. Unmodified app shortcuts work outside editable fields. Composer send bindings accept one key combination and take priority inside the editor; unassigned Enter and Shift+Enter insert newlines. Touch or narrow screen applies when the browser reports a coarse primary pointer (typically touch) or a viewport at most 760px wide; otherwise, desktop applies. When app shortcuts conflict, custom shortcuts win before defaults; ties are resolved by action id, and shorter shortcuts shadow longer sequences with the same prefix.`;
}

@customElement("settings-shortcuts-panel")
export class SettingsShortcutsPanel extends LitElement {
  @property({ attribute: false }) actions: AppAction[] = [];
  @property({ attribute: false }) configResponse: PiWebConfigResponse | undefined;
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) saving = false;
  @property() error = "";
  @property() savedMessage = "";
  @property({ attribute: false }) onReload?: () => void | Promise<void>;
  @property({ attribute: false }) onSave?: (config: PiWebConfigValues) => void | Promise<void>;
  @property({ type: Boolean }) active = true;
  get hasUnsavedChanges(): boolean { return Object.keys(this.drafts).length > 0; }

  @state() private drafts: Record<string, string> = {};
  @state() private localError = "";
  @state() private recording: RecordingState | undefined;
  private recordingTimer: number | undefined;
  private recordingListenerActive = false;

  private readonly onRecordKeyDown = (event: KeyboardEvent): void => {
    const recording = this.recording;
    if (recording === undefined) return;
    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      this.stopRecording();
      return;
    }

    const token = shortcutTokenFromEvent(event);
    if (token === undefined) {
      this.localError = t("SettingsShortcutsPanel.press_a_letter_number_punctuation_function_or.e40953a3");
      return;
    }
    const tokens = [...recording.tokens, token];
    this.localError = "";
    this.drafts = { [recording.actionId]: tokens.join(" ") };
    this.recording = { actionId: recording.actionId, tokens };
    if (isComposerShortcut(recording.actionId)) this.stopRecording();
    else this.armRecordingTimer();
  };

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("active") && !this.active) this.stopRecording();
    if (changed.has("configResponse") && this.configResponse !== undefined
      && (!this.hasUnsavedChanges || JSON.stringify(changed.get("configResponse")?.config.shortcuts) !== JSON.stringify(this.configResponse.config.shortcuts))) {
      this.drafts = {};
      this.localError = "";
      this.stopRecording();
    }
  }

  override disconnectedCallback(): void {
    this.stopRecording();
    super.disconnectedCallback();
  }

  override render(): TemplateResult {
    const groups = shortcutGroups([...composerShortcutActions(), ...this.actions]);
    const shortcutResolutions = this.shortcutResolutions();
    return localizedTemplate("SettingsShortcutsPanel.template.ea509ce7", html)`
      <settings-panel-frame
        heading="Keyboard shortcuts"
        .description=${renderShortcutsDescription()}
        actionLabel="Reload"
        .actionDisabled=${this.loading}
        .notices=${this.panelNotices()}
        .onAction=${() => { if (!this.hasUnsavedChanges || window.confirm(t("settingsDraft.reload"))) { this.drafts = {}; void this.onReload?.(); } }}
      >
        ${this.configResponse === undefined && this.loading ? localizedTemplate("SettingsShortcutsPanel.loading_shortcuts.7e2bb2b0", html)`<div class="loading-card">Loading shortcuts…</div>` : localizedTemplate("SettingsShortcutsPanel.config_file_shortcut_overrides_are_saved_under.ee0e1670", html)`
          <div class="config-path-card">
            <span>Config file</span>
            <code>${this.configResponse?.path ?? t("SettingsShortcutsPanel.unknown.86cdea82")}</code>
            <small>Shortcut overrides are saved under <code>shortcuts</code>. A value of <code>null</code> disables the action shortcut.</small>
          </div>
          <section class="shortcut-group" data-setting-id="send">
            <h3>Send behavior</h3>
            <label class="shortcut-input-label">
              <span>Send while agent is running</span>
              <select aria-label="Send while agent is running" .value=${this.configResponse?.config.defaultStreamingBehavior ?? "steer"} ?disabled=${this.loading || this.saving || this.configResponse === undefined} @change=${(event: Event) => { void this.saveSendBehavior(event); }}>
                <option value="steer">Steer (default)</option>
                <option value="followUp">Follow-up</option>
              </select>
            </label>
            <p>Keyboard shortcut only. Steer sends before the next model call; follow-up waits for the response to finish.</p>
          </section>
          ${groups.length === 0 ? localizedTemplate("SettingsShortcutsPanel.no_actions_registered.091cc85f", html)`<div class="loading-card">No actions registered.</div>` : groups.map((group) => html`
            <section class="shortcut-group">
              <h3>${group.name}</h3>
              <div class="shortcut-list">
                ${group.actions.map((action) => this.renderShortcutRow(action, shortcutResolutions.get(action.id)))}
              </div>
            </section>
          `)}
        `}
      </settings-panel-frame>
    `;
  }

  private async saveSendBehavior(event: Event): Promise<void> {
    const value = event.target instanceof HTMLSelectElement ? event.target.value : undefined;
    if (value !== "steer" && value !== "followUp") return;
    await this.onSave?.({ ...(this.configResponse?.config ?? {}), defaultStreamingBehavior: value });
  }

  private panelNotices(): readonly SettingsNotice[] {
    const notices: SettingsNotice[] = [];
    const error = this.localError || this.error;
    if (error !== "") notices.push({ type: "error", content: error });
    if (this.savedMessage !== "") notices.push({ type: "success", content: this.savedMessage });
    return notices;
  }

  private renderShortcutRow(action: AppAction, resolution: ShortcutBindingResolution | undefined): TemplateResult {
    const shortcuts = this.configResponse?.config.shortcuts;
    const configured = shortcutPreferenceForAction(action, shortcuts);
    const state = shortcutState(action, shortcuts);
    const inputText = this.shortcutInputText(action);
    const parsedInput = inputText.trim() === "" ? undefined : parseShortcutInput(inputText);
    const previewShortcut = parsedInput?.ok === true ? parsedInput.shortcut : effectiveShortcut(action, shortcuts);
    const hasConfiguredShortcut = configured !== undefined;
    const hasDraft = this.drafts[action.id] !== undefined;
    const displayState = hasDraft && inputText.trim() !== "" ? "custom" : state;
    const recordingHint = this.recordingHint(action.id);
    const conflictLabel = shortcutConflictLabel(resolution);
    return localizedTemplate("SettingsShortcutsPanel.shortcut_save_none_reset.b33ef031", html)`
      <article class=${shortcutRowClass(resolution)} data-setting-id=${`shortcut-${encodeURIComponent(action.id)}`}>
        <div class="shortcut-main">
          <strong>${action.title}</strong>
          ${action.description !== undefined && action.description !== "" ? html`<small>${action.description}</small>` : null}
          <small class="shortcut-id">${action.id}</small>
          <small>${action.shortcut !== undefined && action.shortcut !== "" ? localizedTemplate("SettingsShortcutsPanel.default.a883721c", html)`Default: <kbd>${formatShortcut(action.shortcut)}</kbd>` : t("SettingsShortcutsPanel.no_default_shortcut.bc668391")}</small>
        </div>
        <div class="shortcut-editor">
          <div class="shortcut-status">
            ${previewShortcut !== undefined && previewShortcut !== "" ? html`<kbd>${formatShortcut(previewShortcut)}</kbd>` : html`<span class="unassigned">${state === "disabled" ? t("SettingsShortcutsPanel.disabled.c07f9edd") : t("SettingsShortcutsPanel.unassigned.bfffde77")}</span>`}
            <small class=${displayState}>${shortcutStateLabel(displayState)}${hasDraft ? t("SettingsShortcutsPanel.unsaved.0edb4129") : ""}</small>
            ${conflictLabel === undefined ? null : html`<small class=${shortcutConflictClass(resolution)}>${conflictLabel}</small>`}
          </div>
          <label class="shortcut-input-label">
            <span>Shortcut</span>
            <input
              class="shortcut-input"
              data-action-id=${action.id}
              .value=${inputText}
              placeholder=${action.shortcut ?? "mod+k"}
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              ?disabled=${this.saving}
              @input=${(event: Event) => { this.updateDraft(action.id, inputValue(event)); }}
            >
          </label>
          ${recordingHint !== "" ? html`<small class="recording-hint">${recordingHint}</small>` : null}
          <div class="shortcut-actions">
            <button class="primary" ?disabled=${this.loading || this.saving || !hasDraft || inputText.trim() === ""} @click=${() => { void this.saveShortcut(action); }}>Save</button>
            <button ?disabled=${this.loading || this.saving} @click=${() => { void this.toggleRecording(action.id); }}>${this.recording?.actionId === action.id ? t("SettingsShortcutsPanel.cancel_recording.3f58f867") : t("SettingsShortcutsPanel.record.0391b747")}</button>
            <button ?disabled=${this.loading || this.saving || configured === null} @click=${() => { void this.setShortcutNone(action); }}>None</button>
            <button ?disabled=${this.loading || this.saving || !hasConfiguredShortcut} @click=${() => { void this.resetShortcut(action); }}>Reset</button>
          </div>
        </div>
      </article>
    `;
  }

  private shortcutInputText(action: AppAction): string {
    const draft = this.drafts[action.id];
    if (draft !== undefined) return draft;
    const configured = shortcutPreferenceForAction(action, this.configResponse?.config.shortcuts);
    if (configured === null) return "";
    return configured ?? action.shortcut ?? "";
  }

  private recordingHint(actionId: string): string {
    const recording = this.recording;
    if (recording?.actionId !== actionId) return "";
    if (recording.tokens.length === 0) return t("SettingsShortcutsPanel.recording_press_ctrl_or_alt_with_a.e894d7d3");
    return localizedText("SettingsShortcutsPanel.recording_press_another_key_to_add_a.8c83475a")`Recording: ${formatShortcut(recording.tokens.join(" "))}. Press another key to add a sequence, or wait to finish.`;
  }

  private updateDraft(actionId: string, value: string): void {
    this.drafts = { [actionId]: value };
    this.localError = "";
  }

  private async saveShortcut(action: AppAction): Promise<void> {
    this.stopRecording();
    const input = this.shortcutInputText(action).trim();
    const parsed = parseShortcutInput(input);
    if (!parsed.ok) {
      this.localError = parsed.message;
      return;
    }
    if (isComposerShortcut(action.id) && parsed.tokens.length !== 1) {
      this.localError = t("SettingsShortcutsPanel.composer_send_shortcuts_must_be_a_single.d10b8e4c");
      return;
    }
    this.localError = "";
    await this.saveShortcutPreference(action, parsed.shortcut);
  }

  private async setShortcutNone(action: AppAction): Promise<void> {
    this.stopRecording();
    this.localError = "";
    await this.saveShortcutPreference(action, null);
  }

  private async resetShortcut(action: AppAction): Promise<void> {
    this.stopRecording();
    this.localError = "";
    await this.saveShortcutPreference(action, undefined);
  }

  private async saveShortcutPreference(action: AppAction, shortcut: string | null | undefined): Promise<void> {
    const config: PiWebConfigValues = { ...(this.configResponse?.config ?? {}) };
    const currentShortcuts = config.shortcuts ?? {};
    const migratedShortcuts = withoutShortcutPreferences(currentShortcuts, [action.id, ...(action.shortcutAliases ?? [])]);
    const shortcuts = shortcut === undefined ? migratedShortcuts : { ...migratedShortcuts, [action.id]: shortcut };
    if (Object.keys(shortcuts).length === 0) {
      delete config.shortcuts;
    } else {
      config.shortcuts = shortcuts;
    }
    await this.onSave?.(config);
  }

  private shortcutResolutions(): Map<string, ShortcutBindingResolution> {
    const shortcuts = this.previewShortcutConfig();
    // Desktop/mobile composer bindings are mutually exclusive and do not disable app bindings.
    const resolutions = [
      ...resolveShortcutBindings(this.actions, shortcuts, { enabledOnly: true }),
      ...composerShortcutActions().flatMap((action) => resolveShortcutBindings([action], shortcuts)),
    ];
    return new Map(resolutions.map((resolution) => [resolution.action.id, resolution]));
  }

  private previewShortcutConfig(): PiWebShortcutConfig | undefined {
    const shortcuts = { ...(this.configResponse?.config.shortcuts ?? {}) };
    for (const [actionId, draft] of Object.entries(this.drafts)) {
      const trimmedDraft = draft.trim();
      if (trimmedDraft === "") continue;
      const parsed = parseShortcutInput(trimmedDraft);
      if (parsed.ok) shortcuts[actionId] = parsed.shortcut;
    }
    return Object.keys(shortcuts).length === 0 ? undefined : shortcuts;
  }

  private async toggleRecording(actionId: string): Promise<void> {
    if (this.recording?.actionId === actionId) {
      this.stopRecording();
      return;
    }
    this.stopRecording();
    this.localError = "";
    this.recording = { actionId, tokens: [] };
    this.ensureRecordingListener();
    await this.updateComplete;
    this.focusShortcutInput(actionId);
  }

  private focusShortcutInput(actionId: string): void {
    for (const input of this.renderRoot.querySelectorAll<HTMLInputElement>(".shortcut-input")) {
      if (input.dataset["actionId"] === actionId) {
        input.focus();
        input.select();
        return;
      }
    }
  }

  private armRecordingTimer(): void {
    this.clearRecordingTimer();
    this.recordingTimer = window.setTimeout(() => {
      this.recordingTimer = undefined;
      this.stopRecording();
    }, shortcutSequenceTimeoutMs);
  }

  private stopRecording(): void {
    this.clearRecordingTimer();
    this.removeRecordingListener();
    this.recording = undefined;
  }

  private clearRecordingTimer(): void {
    if (this.recordingTimer === undefined) return;
    window.clearTimeout(this.recordingTimer);
    this.recordingTimer = undefined;
  }

  private ensureRecordingListener(): void {
    if (this.recordingListenerActive) return;
    window.addEventListener("keydown", this.onRecordKeyDown, RECORD_SHORTCUT_LISTENER_OPTIONS);
    this.recordingListenerActive = true;
  }

  private removeRecordingListener(): void {
    if (!this.recordingListenerActive) return;
    window.removeEventListener("keydown", this.onRecordKeyDown, RECORD_SHORTCUT_LISTENER_OPTIONS);
    this.recordingListenerActive = false;
  }

  static override styles = [css`
    :host { display: block; font: var(--pi-font-weight-regular, 360) 13px/18px var(--pi-font-family, system-ui, sans-serif); }
    small { font-size: 12px; line-height: 16px; }
    strong { font-weight: var(--pi-font-weight-medium, 460); }
    h3, p { margin: 0; }
    h3 { font-size: 14px; line-height: 20px; font-weight: var(--pi-font-weight-medium, 460); }
    p { color: var(--pi-muted); font-size: 14px; line-height: 20px; }
    button, input, select { font: inherit; }
    select { border: 1px solid var(--pi-border); border-radius: 8px; background: var(--pi-bg); color: var(--pi-text); padding: 8px 9px; font: var(--pi-font-weight-regular, 360) var(--pi-control-font-size, 14px)/1.428571 var(--pi-control-font-family, system-ui, sans-serif); }
    select:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    select:disabled { opacity: .55; cursor: not-allowed; }
    button { box-sizing: border-box; min-height: 30px; border: 0; border-radius: 6px; background: transparent; color: var(--pi-text); padding: 6px 10px; font: inherit; cursor: pointer; }
    button:not(:disabled):hover { background: var(--pi-surface-hover); }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    button:disabled, input:disabled { opacity: .55; cursor: not-allowed; }
    .primary { background: var(--pi-selection-bg); color: var(--pi-text-bright); font-weight: var(--pi-font-weight-medium, 460); }
    .loading-card, .config-path-card { border: 0; border-radius: 10px; background: var(--pi-surface); padding: 12px; }
    .loading-card, .config-path-card { color: var(--pi-muted); }
    .config-path-card { display: grid; gap: 5px; }
    .config-path-card span { color: var(--pi-muted); font-size: 12px; font-weight: var(--pi-font-weight-medium, 460); }
    code { border: 0; border-radius: 5px; background: var(--pi-bg); padding: 1px 4px; color: var(--pi-text); font: var(--pi-font-weight-regular, 360) 12px/17.5px var(--pi-font-monospace, ui-monospace, monospace); overflow-wrap: anywhere; }
    .shortcut-group { margin: 0; }
    .shortcut-group h3 { margin: 0 0 8px; color: var(--pi-muted); font-size: 12px; text-transform: none; }
    .shortcut-list { display: grid; gap: 4px; border: 0; border-radius: 10px; overflow: hidden; }
    .shortcut-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(360px, 48%); gap: 14px; align-items: start; padding: 12px; border-bottom: 0; background: var(--pi-surface); }
    .shortcut-row.shadowed { background: color-mix(in srgb, var(--pi-warning) 5%, var(--pi-surface)); }
    .shortcut-row.shadowing { background: color-mix(in srgb, var(--pi-accent) 5%, var(--pi-surface)); }
    .shortcut-main { min-width: 0; display: grid; gap: 4px; }
    .shortcut-main strong, .shortcut-main small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .shortcut-main small { color: var(--pi-muted); }
    .shortcut-id { font-family: var(--pi-font-monospace, ui-monospace, monospace); }
    .shortcut-editor { min-width: 0; display: grid; gap: 8px; }
    .shortcut-status { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
    .shortcut-status small { color: var(--pi-muted); font-size: 12px; }
    .shortcut-status small.custom { color: var(--pi-accent); }
    .shortcut-status small.disabled { color: var(--pi-warning); }
    .shortcut-status small.conflict { border: 1px solid currentColor; border-radius: 999px; padding: 2px 7px; }
    .shortcut-status small.conflict.shadowing { color: var(--pi-accent); }
    .shortcut-status small.conflict.shadowed { color: var(--pi-warning); }
    .shortcut-input-label { min-width: 0; display: grid; gap: 5px; }
    .shortcut-input-label span { color: var(--pi-muted); font-size: 12px; font-weight: var(--pi-font-weight-medium, 460); }
    input { box-sizing: border-box; width: 100%; min-width: 0; border: 1px solid var(--pi-border); border-radius: 8px; background: var(--pi-bg); color: var(--pi-text); padding: 8px 9px; outline: none; font: var(--pi-font-weight-regular, 360) var(--pi-control-font-size, 14px)/1.428571 var(--pi-control-monospace-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace); }
    input:focus { border-color: var(--pi-accent); box-shadow: 0 0 0 1px var(--pi-accent-border); }
    .shortcut-actions { display: flex; justify-content: flex-end; gap: 7px; flex-wrap: wrap; }
    kbd { border: 1px solid var(--pi-border); border-radius: 6px; background: var(--pi-bg); color: var(--pi-text-secondary); padding: 3px 7px; font: var(--pi-font-weight-regular, 360) 12px/17.5px var(--pi-font-monospace, ui-monospace, monospace); white-space: nowrap; }
    .unassigned { color: var(--pi-muted); font-size: 12px; }
    .recording-hint { color: var(--pi-accent); font-size: 12px; }

    @media (max-width: 760px) {
      .shortcut-row { grid-template-columns: minmax(0, 1fr); align-items: start; }
      .shortcut-status, .shortcut-actions { justify-content: flex-start; }
    }

    @media (max-width: 760px), (pointer: coarse) {
      button, input, select { min-height: 44px; }
    }
  `, settingsDesignStyles];
}

interface RecordingState {
  actionId: string;
  tokens: string[];
}

type ShortcutState = "default" | "custom" | "disabled" | "unassigned";

function shortcutRowClass(resolution: ShortcutBindingResolution | undefined): string {
  if (resolution?.active === false) return "shortcut-row shadowed";
  if (resolution?.active === true && resolution.shadows.length > 0) return "shortcut-row shadowing";
  return "shortcut-row";
}

function shortcutConflictClass(resolution: ShortcutBindingResolution | undefined): string {
  return resolution?.active === false ? "conflict shadowed" : "conflict shadowing";
}

function shortcutConflictLabel(resolution: ShortcutBindingResolution | undefined): string | undefined {
  if (resolution === undefined) return undefined;
  if (!resolution.active) return localizedText("SettingsShortcutsPanel.shadowed_by.64fcd231")`Shadowed by ${resolution.shadowedBy?.action.title ?? t("SettingsShortcutsPanel.another_action.fc68979c")}`;
  const shadowedCount = resolution.shadows.length;
  if (shadowedCount === 0) return undefined;
  const shadowedNames = resolution.shadows.slice(0, 2).map((binding) => binding.action.title).join(", ");
  const suffix = shadowedCount > 2 ? localizedText("SettingsShortcutsPanel.more.5c2687c3")`, +${String(shadowedCount - 2)} more` : "";
  return localizedText("SettingsShortcutsPanel.shadows.9daaca06")`Shadows ${String(shadowedCount)} ${shadowedCount === 1 ? "action" : "actions"}: ${shadowedNames}${suffix}`;
}

function shortcutGroups(actions: AppAction[]): { name: string; actions: AppAction[] }[] {
  const grouped = new Map<string, AppAction[]>();
  for (const action of [...actions].sort(compareActions)) {
    const group = action.group ?? t("SettingsShortcutsPanel.other.46cc7693");
    grouped.set(group, [...(grouped.get(group) ?? []), action]);
  }
  return [...grouped.entries()].map(([name, groupActions]) => ({ name, actions: groupActions }));
}

function compareActions(left: AppAction, right: AppAction): number {
  return (left.group ?? t("SettingsShortcutsPanel.other.5dc8a71f")).localeCompare(right.group ?? t("SettingsShortcutsPanel.other.5e3fbdb1")) || left.title.localeCompare(right.title);
}

function withoutShortcutPreferences(shortcuts: PiWebShortcutConfig, actionIds: readonly string[]): PiWebShortcutConfig {
  const removed = new Set(actionIds);
  return Object.fromEntries(Object.entries(shortcuts).filter(([shortcutActionId]) => !removed.has(shortcutActionId)));
}

function effectiveShortcut(action: AppAction, shortcuts: PiWebShortcutConfig | undefined): string | undefined {
  const configured = shortcutPreferenceForAction(action, shortcuts);
  if (configured === null) return undefined;
  return configured ?? action.shortcut;
}

function shortcutState(action: AppAction, shortcuts: PiWebShortcutConfig | undefined): ShortcutState {
  const configured = shortcutPreferenceForAction(action, shortcuts);
  if (configured === null) return "disabled";
  if (configured !== undefined) return "custom";
  return action.shortcut === undefined || action.shortcut === "" ? "unassigned" : "default";
}

function shortcutStateLabel(state: ShortcutState): string {
  switch (state) {
    case "default": return t("SettingsShortcutsPanel.default.369362c4");
    case "custom": return t("SettingsShortcutsPanel.custom.cf1f602b");
    case "disabled": return t("SettingsShortcutsPanel.disabled.6b02229a");
    case "unassigned": return t("SettingsShortcutsPanel.no_default.54b2a71e");
  }
}

function inputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : "";
}
