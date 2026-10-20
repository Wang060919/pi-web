import { renderUiIcon } from "./uiIcons";
import { localizedTemplate, t } from "../../../shared/i18n";
import { LitElement, html, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import type { ProjectDirectoryInfo } from "../../../shared/apiTypes";
import { api, trustApi, type FileSuggestion } from "../api";
import type { ProjectTrustChoice } from "../controllers/projectController";
import { css } from "lit";
import "./ModalSurface";

/** Server-resolved trust state for the entered path, keyed on the decided path. */
interface ProjectTrustState {
  path: string;
  decision: boolean | null;
  trusted: boolean;
  loading: boolean;
  error?: string;
}

@customElement("project-dialog")
export class ProjectDialog extends LitElement {
  @property({ attribute: false }) onSubmit?: (path: string, create: boolean, trust: ProjectTrustChoice | undefined) => void;
  @property({ attribute: false }) onCancel?: () => void;
  @property() machineId = "local";
  @property() machineLabel = "Local";
  @state() private directoryInfo: ProjectDirectoryInfo | undefined;
  @state() private directoryError = "";
  @state() private infoError = "";
  @state() private showHidden = false;
  @state() private path = "";
  @state() private createMissing = false;
  @state() private suggestions: FileSuggestion[] = [];
  @state() private selected = 0;
  @state() private loading = false;
  @state() private trust: ProjectTrustState | undefined;
  @state() private trustTouched = false;
  @query(".path-input") private pathInput?: HTMLInputElement;

  // Separate staleness counters: setPath fires both loaders, so a shared one
  // would make the trust read invalidate every in-flight suggestions request
  // (leaving "Loading folders…" up forever).
  private suggestionRequestId = 0;
  private trustRequestId = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    void this.loadSuggestions();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("machineId") && this.hasUpdated) {
      this.setPath("");
      this.createMissing = false;
    }
  }

  private visibleSuggestions(): FileSuggestion[] {
    return this.suggestions.filter((item) => this.showHidden || !folderName(item.path).startsWith("."));
  }

  private canSubmit(): boolean {
    if (this.path.trim() === "" || this.loading) return false;
    if (this.directoryInfo === undefined) return true;
    return this.directoryInfo.exists ? this.directoryInfo.isDirectory : this.createMissing;
  }

  private async loadSuggestions() {
    const requestId = ++this.suggestionRequestId;
    this.loading = true;
    this.directoryInfo = undefined;
    this.suggestions = [];
    this.directoryError = "";
    this.infoError = "";
    const path = this.path;
    let info: ProjectDirectoryInfo | undefined;
    try {
      info = await api.projectDirectoryInfo(path, this.machineId);
      if (requestId !== this.suggestionRequestId) return;
      this.directoryInfo = info;
    } catch (error) {
      if (requestId !== this.suggestionRequestId) return;
      this.infoError = `${t("ui.projectPicker.checkFailed")}: ${String(error)}`;
    }
    try {
      const query = info?.isDirectory === true ? `${info.path.replace(/[\\/]$/u, "")}/` : path;
      const suggestions = await api.projectDirectories(query, this.machineId);
      if (requestId !== this.suggestionRequestId) return;
      this.suggestions = suggestions;
      this.selected = Math.min(this.selected, Math.max(0, this.visibleSuggestions().length - 1));
    } catch (error) {
      if (requestId !== this.suggestionRequestId) return;
      this.suggestions = [];
      this.directoryError = `${t("ui.projectPicker.loadFailed")}: ${String(error)}`;
    } finally {
      if (requestId === this.suggestionRequestId) this.loading = false;
    }
  }

  private setPath(value: string) {
    this.path = value;
    this.selected = 0;
    this.trustTouched = false;
    void this.loadSuggestions();
    void this.loadTrust();
  }

  private pick(suggestion: FileSuggestion) {
    this.setPath(suggestion.path);
  }

  private submit() {
    if (!this.canSubmit()) return;
    this.onSubmit?.(this.path, this.createMissing, this.trust === undefined ? undefined : { trusted: this.trust.trusted, changed: this.trustTouched });
  }

  private onPathInput(event: InputEvent) {
    if (!(event.target instanceof HTMLInputElement)) return;
    this.setPath(event.target.value);
  }

  /**
   * Server-resolved existing trust for the entered path (never the raw path
   * trusted verbatim). Dropped when a newer path input or an explicit user
   * toggle supersedes it, so a stale read can not clobber the user's choice.
   */
  private async loadTrust() {
    const requestId = ++this.trustRequestId;
    const trimmed = this.path.trim();
    if (trimmed === "") {
      if (requestId === this.trustRequestId) this.trust = undefined;
      return;
    }
    if (requestId === this.trustRequestId) {
      // Keep the previous value visible (cosmetic continuity) while the read
      // for the new path is in flight; the result replaces it either way.
      this.trust = {
        ...(this.trust ?? { path: trimmed, decision: null, trusted: false }),
        path: trimmed,
        loading: true,
      };
    }
    try {
      const result = await trustApi.projectTrust(trimmed, this.machineId);
      if (requestId !== this.trustRequestId || this.trustTouched) return;
      this.trust = { path: result.path, decision: result.decision, trusted: result.trusted, loading: false };
    } catch (error) {
      if (requestId !== this.trustRequestId || this.trustTouched) return;
      this.trust = { path: trimmed, decision: null, trusted: false, loading: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private onTrustChange(checked: boolean) {
    this.trustTouched = true;
    if (this.trust !== undefined) this.trust = { ...this.trust, trusted: checked, loading: false };
  }

  private renderTrustChoice() {
    const unavailable = this.trust === undefined || this.trust.loading || this.trust.error !== undefined;
    return localizedTemplate("ProjectDialog.trust_this_project_trusting_lets_pi_load.06efff24", html)`
      <label class="check">
        <input type="checkbox" .checked=${this.trust?.trusted ?? false} ?disabled=${unavailable} @change=${(event: InputEvent) => { if (event.target instanceof HTMLInputElement) this.onTrustChange(event.target.checked); }} />
        <span>Trust this project</span>
      </label>
      <small class="trust-hint">
        Trusting lets pi load this project's .pi settings, extensions, skills, and packages.
        <a href="https://pi.dev/docs/latest/security" target="_blank" rel="noreferrer">Learn about project trust</a>
      </small>
      ${this.trust?.error === undefined ? null : localizedTemplate("ProjectDialog.trust_state_unavailable.e2320232", html)`<small class="trust-error">Trust state unavailable: ${this.trust.error}</small>`}
    `;
  }

  // Escape and backdrop presses are owned by the modal surface (routed to
  // `onCancel`). The remaining keys stay scoped to the path input — their home
  // before the migration — so Enter/Tab on the footer buttons and checkbox keep
  // their native behavior.
  private onKeyDown(event: KeyboardEvent) {
    if (event.target !== this.pathInput) return;
    if (event.key === "Enter") {
      event.preventDefault();
      this.submit();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      this.selected = Math.min(this.selected + 1, Math.max(0, this.visibleSuggestions().length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this.selected = Math.max(0, this.selected - 1);
    } else if (event.key === "Tab") {
      const suggestion = this.visibleSuggestions()[this.selected];
      if (suggestion === undefined) return;
      event.preventDefault();
      this.pick(suggestion);
    }
  }

  override render() {
    const info = this.directoryInfo;
    const suggestions = this.visibleSuggestions();
    const status = info === undefined ? "" : !info.exists ? t("ui.projectPicker.missing") : info.isDirectory ? t("ui.projectPicker.exists") : t("ui.projectPicker.notDirectory");
    return html`
      <modal-surface .onClose=${() => this.onCancel?.()} .initialFocus=${".path-input"} .label=${t("ProjectDialog.add_project.d38cd98d")} @keydown=${(event: KeyboardEvent) => { this.onKeyDown(event); }}>
        <header><strong>${t("ProjectDialog.add_project.d38cd98d")}</strong><button type="button" @click=${() => { this.onCancel?.(); }} aria-label=${t("navigation.close")}>${renderUiIcon("close")}</button></header>
        <div class="body">
          <p class="machine-target">${t("ui.projectPicker.machine")}: <strong>${this.machineLabel}</strong></p>
          <label>${t("ui.projectPicker.folder")}<input class="path-input" .value=${this.path} @input=${(event: InputEvent) => { this.onPathInput(event); }} placeholder=${t("ui.projectPicker.pathPlaceholder")} autocomplete="off"></label>
          <div class="directory-status" role="status">${this.loading ? t("ui.projectPicker.loading") : status}${info === undefined ? null : html`<code>${info.path}</code>`}</div>
          <div class="browse-actions"><button type="button" ?disabled=${info === undefined || info.parentPath === info.path || this.loading} @click=${() => { if (info !== undefined) this.setPath(info.parentPath); }}>${t("ui.projectPicker.parent")}</button><button type="button" @click=${() => { this.setPath("~"); }}>${t("ui.projectPicker.home")}</button><label class="check"><input type="checkbox" .checked=${this.showHidden} @change=${(event: Event) => { if (event.target instanceof HTMLInputElement) { this.showHidden = event.target.checked; this.selected = 0; } }}>${t("ui.projectPicker.hidden")}</label></div>
          ${this.infoError === "" ? null : html`<p class="directory-error" role="alert">${this.infoError}</p>`}
          <div class="suggestions">
            ${this.directoryError !== "" ? html`<div class="directory-error" role="alert">${this.directoryError}<button type="button" @click=${() => { void this.loadSuggestions(); }}>${t("ui.projectPicker.retry")}</button></div>` : null}
            ${this.loading ? html`<div class="hint">${t("ui.projectPicker.loading")}</div>` : null}
            ${suggestions.map((suggestion, index) => html`<button type="button" class=${index === this.selected ? "selected" : ""} title=${suggestion.path} @click=${() => { this.pick(suggestion); }}>${renderUiIcon("folder")}<span>${folderName(suggestion.path)}</span></button>`)}
            ${!this.loading && this.directoryError === "" && suggestions.length === 0 ? html`<div class="hint">${t("ui.projectPicker.empty")}</div>` : null}
          </div>
          <fieldset class="add-mode"><legend>${t("ui.projectPicker.action")}</legend><label class="check"><input type="radio" name="add-mode" value="existing" .checked=${!this.createMissing} @change=${() => { this.createMissing = false; }}>${t("ui.projectPicker.addExisting")}</label><label class="check"><input type="radio" name="add-mode" value="create" .checked=${this.createMissing} @change=${() => { this.createMissing = true; }}>${t("ui.projectPicker.create")}</label></fieldset>
          ${this.renderTrustChoice()}
        </div>
        <footer><button type="button" @click=${() => { this.onCancel?.(); }}>${t("ui.projectPicker.cancel")}</button><button type="button" class="primary" ?disabled=${!this.canSubmit()} @click=${() => { this.submit(); }}>${this.createMissing && info?.exists !== true ? t("ui.projectPicker.create") : t("ProjectDialog.add_project.d38cd98d")}</button></footer>
      </modal-surface>`;
  }

  static override styles = css`
    :host { position: fixed; inset: 0; z-index: 30; color: var(--pi-text); font: var(--pi-font-weight-regular, 360) 13px/18px var(--pi-font-family, system-ui, sans-serif); }
    modal-surface { --modal-surface-place-items: start center; --modal-surface-backdrop-padding: min(12dvh, 90px) 0 max(20px, env(safe-area-inset-bottom)); --modal-surface-width: min(720px, calc(100vw - 40px)); --modal-surface-max-height: min(700px, 100%); }
    header, footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px; border-bottom: 0; }
    footer { border-top: 0; border-bottom: 0; justify-content: end; }
    .machine-target { margin: 0; }
    .directory-status { color: var(--pi-muted); overflow-wrap: anywhere; }
    .directory-status code { display: block; margin-top: 4px; white-space: normal; }
    .browse-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .browse-actions .check { margin-inline-start: auto; }
    .directory-error { color: var(--pi-danger); overflow-wrap: anywhere; }
    .add-mode { margin: 0; padding: 8px; border: 1px solid var(--pi-border-muted); border-radius: 6px; display: grid; gap: 6px; }
    .suggestions button svg { width: 16px; height: 16px; vertical-align: middle; margin-inline-end: 8px; }
    .body { display: grid; gap: 12px; padding: 12px; min-height: 0; overflow: auto; }
    label { display: grid; gap: 6px; color: var(--pi-muted); }
    input[type="text"], input:not([type]) { box-sizing: border-box; width: 100%; border: 1px solid var(--pi-border); border-radius: 8px; background: var(--pi-bg); color: var(--pi-text); padding: 9px; font: var(--pi-font-weight-regular, 360) var(--pi-control-font-size, 14px)/1.428571 var(--pi-control-monospace-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace); }
    .check { display: flex; grid-template-columns: auto 1fr; align-items: center; color: var(--pi-text); }
    .suggestions { min-height: 90px; max-height: 320px; overflow: auto; border: 0; border-radius: 8px; background: var(--pi-surface); padding: 4px; }
    .suggestions button { display: block; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border: 0; border-bottom: 0; border-radius: 6px; background: transparent; color: var(--pi-text); padding: 8px 10px; text-align: left; font: var(--pi-font-weight-regular, 360) 12px/17.5px var(--pi-font-monospace, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace); }
    .suggestions button.selected, .suggestions button:hover { background: var(--pi-selection-bg); }
    .hint { padding: 12px; color: var(--pi-muted); }
    .trust-error { color: var(--pi-danger, #c0392b); }
    .trust-hint { color: var(--pi-muted); font-size: 12px; line-height: 16px; }
    .trust-hint a { color: var(--pi-accent); }
    button { border: 0; border-radius: 6px; background: transparent; color: var(--pi-text); padding: 7px 9px; font: inherit; cursor: pointer; }
    header button { min-width: 30px; min-height: 30px; line-height: 20px; border: 0; background: transparent; color: var(--pi-muted); font-size: 22px; padding: 0 8px; }
    .primary { background: var(--pi-selection-bg); font-weight: var(--pi-font-weight-medium, 460); }
    button:disabled { opacity: .5; cursor: not-allowed; }
    button:not(:disabled):not(.selected):hover { background: var(--pi-surface-hover); }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: -2px; }
    strong { font-weight: var(--pi-font-weight-medium, 460); }
    small { font-size: 12px; line-height: 16px; }
    @media (max-width: 680px), (pointer: coarse) {
      button { min-height: 44px; }
      header button { min-width: 44px; }
    }
    header strong { font-size: 14px; line-height: 20px; }
    input:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 1px; }
  `;
}

function folderName(path: string): string {
  const name = path.replace(/[\\/]+$/u, "").split(/[\\/]/u).at(-1);
  return name === undefined || name === "" ? path : name;
}
