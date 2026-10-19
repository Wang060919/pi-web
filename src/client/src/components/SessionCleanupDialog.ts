import { renderUiIcon } from "./uiIcons";
import { localizedTemplate, localizedText, t } from "../../../shared/i18n";
import { LitElement, css, html, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { SessionCleanupExecuteResponse, SessionCleanupPreviewResponse, SessionCleanupProjectSummary, SessionCleanupRequest } from "../api";
import { canRunSessionCleanup, confirmSessionCleanup, DEFAULT_SESSION_CLEANUP_DRAFT, selectedSessionCleanupProjectCwds, sessionCleanupPreviewForSelectedProjects, sessionCleanupPreviewHasTargets, sessionCleanupRequestKey, validateSessionCleanupDraft, type SessionCleanupDraft } from "../sessionCleanupUi";
import "./ModalSurface";

@customElement("session-cleanup-dialog")
export class SessionCleanupDialog extends LitElement {
  @property({ attribute: false }) preview?: SessionCleanupPreviewResponse;
  @property({ attribute: false }) previewRequest?: SessionCleanupRequest;
  @property({ attribute: false }) result?: SessionCleanupExecuteResponse;
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) running = false;
  @property({ type: String }) error = "";
  @property({ attribute: false }) onPreview?: (request: SessionCleanupRequest) => void | Promise<void>;
  @property({ attribute: false }) onRun?: (request: SessionCleanupRequest) => void | Promise<void>;
  @property({ attribute: false }) onClose?: () => void;

  @state() private draft: SessionCleanupDraft = { ...DEFAULT_SESSION_CLEANUP_DRAFT };
  @state() private formError = "";
  @state() private selectedProjectCwds: string[] | undefined;

  override willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("preview")) this.selectedProjectCwds = this.preview?.projects.map((project) => project.cwd);
  }

  override render(): TemplateResult {
    const validation = validateSessionCleanupDraft(this.draft);
    const selectedPreview = this.selectedPreview();
    const runEnabled = canRunSessionCleanup({ draft: this.draft, preview: selectedPreview, previewRequest: this.previewRequest, loading: this.loading, running: this.running });
    const runTitle = runEnabled ? t("SessionCleanupDialog.run_cleanup.5fce8304") : selectedPreview !== undefined && !sessionCleanupPreviewHasTargets(selectedPreview) ? t("SessionCleanupDialog.select_at_least_one_project_to_run.bfa342bc") : t("SessionCleanupDialog.preview_cleanup_before_running_it.5bc5269e");
    return localizedTemplate("SessionCleanupDialog.sessions_clean_up_sessions_preview_manual_cleanup.06a74625", html)`
      <modal-surface .onClose=${() => { this.onClose?.(); }} .label=${t("SessionCleanupDialog.clean_up_sessions.4c9fa7b7")}>
        <header>
          <div>
            <span class="eyebrow">Sessions</span>
            <h1>Clean up sessions</h1>
          </div>
          <button class="close-button" title="Close cleanup" aria-label="Close cleanup" @click=${() => { this.onClose?.(); }}>${renderUiIcon("close")}</button>
        </header>
        <div class="body">
          <p class="intro">Preview manual cleanup for this machine before archiving idle sessions or permanently deleting old archived sessions.</p>
          ${this.renderForm(validation.ok ? "" : validation.error)}
          ${this.renderMessage()}
          ${this.preview === undefined ? null : this.renderPreview(this.preview)}
          ${this.result === undefined ? null : this.renderResult(this.result)}
        </div>
        <footer>
          <button @click=${() => { this.onClose?.(); }}>${this.result === undefined ? t("SessionCleanupDialog.cancel.d355c95d") : t("SessionCleanupDialog.close.98874c72")}</button>
          <button ?disabled=${this.loading || this.running} @click=${() => { this.previewCleanup(); }}>${this.loading ? t("SessionCleanupDialog.previewing.2c40ad17") : t("SessionCleanupDialog.preview.396ef5ec")}</button>
          <button class="danger" ?disabled=${!runEnabled} title=${runTitle} @click=${() => { this.runCleanup(); }}>${this.running ? t("SessionCleanupDialog.running.603d0ae6") : t("SessionCleanupDialog.run_cleanup.e281c161")}</button>
        </footer>
      </modal-surface>
    `;
  }

  private renderForm(validationError: string): TemplateResult {
    const disabled = this.loading || this.running;
    const validation = validateSessionCleanupDraft(this.draft);
    const previewOutOfDate = this.preview !== undefined && validation.ok && sessionCleanupRequestKey(validation.request) !== sessionCleanupRequestKey(this.previewRequest) && sessionCleanupPreviewHasTargets(this.preview);
    return localizedTemplate("SessionCleanupDialog.archive_non_archived_sessions_idle_for_more.65b9eb9a", html)`
      <fieldset ?disabled=${disabled}>
        <label class="toggle-row">
          <input type="checkbox" .checked=${this.draft.archiveIdleEnabled} @change=${(event: Event) => { this.updateDraft({ archiveIdleEnabled: checkedValue(event) }); }}>
          <span>Archive non-archived sessions idle for more than</span>
          <input class="days" type="number" min="0" step="1" inputmode="numeric" .value=${this.draft.archiveIdleDays} ?disabled=${disabled || !this.draft.archiveIdleEnabled} @input=${(event: Event) => { this.updateDraft({ archiveIdleDays: inputValue(event) }); }}>
          <span>days</span>
        </label>
        <label class="toggle-row delete-row">
          <input type="checkbox" .checked=${this.draft.deleteArchivedEnabled} @change=${(event: Event) => { this.updateDraft({ deleteArchivedEnabled: checkedValue(event) }); }}>
          <span>Delete archived sessions archived for more than</span>
          <input class="days" type="number" min="0" step="1" inputmode="numeric" .value=${this.draft.deleteArchivedDays} ?disabled=${disabled || !this.draft.deleteArchivedEnabled} @input=${(event: Event) => { this.updateDraft({ deleteArchivedDays: inputValue(event) }); }}>
          <span>days</span>
        </label>
      </fieldset>
      <p class="warning"><strong>Deletion is permanent.</strong> Cleanup only deletes sessions that are already archived.</p>
      ${validationError === "" ? null : html`<div class="dialog-error" role="alert">${validationError}</div>`}
      ${previewOutOfDate ? localizedTemplate("SessionCleanupDialog.thresholds_changed_preview_again_before_running_cleanup.beba1c04", html)`<div class="hint" role="status">Thresholds changed. Preview again before running cleanup.</div>` : null}
    `;
  }

  private renderMessage(): TemplateResult | null {
    const message = this.formError || this.error;
    return message === "" ? null : html`<div class="dialog-error" role="alert">${message}</div>`;
  }

  private renderPreview(preview: SessionCleanupPreviewResponse): TemplateResult {
    const selectedCwds = this.selectedProjectCwdsForPreview();
    const selected = new Set(selectedCwds);
    const selectedPreview = sessionCleanupPreviewForSelectedProjects(preview, selectedCwds);
    return localizedTemplate("SessionCleanupDialog.preview.583a0bba", html)`
      <section class="preview" aria-label="Cleanup preview">
        <h2>Preview</h2>
        ${preview.projects.length === 0 ? localizedTemplate("SessionCleanupDialog.no_sessions_match_these_thresholds.6d09a1e2", html)`<p class="empty">No sessions match these thresholds.</p>` : localizedTemplate("SessionCleanupDialog.clean_up_project_workspace_path_archive_delete.69b41ead", html)`
          ${this.renderSelectionControls(preview, selectedCwds)}
          <div class="table-scroll" tabindex="0" aria-label="Cleanup projects table">
            <table>
              <thead>
                <tr><th>Clean up</th><th>Project/workspace path</th><th>Archive</th><th>Delete archived</th></tr>
              </thead>
              <tbody>
                ${preview.projects.map((project) => this.renderProjectRow(project, selected.has(project.cwd)))}
              </tbody>
              <tfoot>
                <tr><th colspan="2">Selected totals</th><td>${selectedPreview.totals.archiveCount}</td><td>${selectedPreview.totals.deleteCount}</td></tr>
              </tfoot>
            </table>
          </div>
        `}
        ${preview.skippedBusySessionIds === undefined || preview.skippedBusySessionIds.length === 0 ? null : localizedTemplate("SessionCleanupDialog.busy_skipped.2b5c0ac1", html)`<p class="hint">${preview.skippedBusySessionIds.length} busy ${preview.skippedBusySessionIds.length === 1 ? "session was" : "sessions were"} skipped.</p>`}
      </section>
    `;
  }

  private renderSelectionControls(preview: SessionCleanupPreviewResponse, selectedCwds: readonly string[]): TemplateResult {
    const disabled = this.loading || this.running;
    return localizedTemplate("SessionCleanupDialog.of_projects_selected_select_all_deselect_all.3efcdf6d", html)`
      <div class="selection-controls" role="group" aria-label="Project selection">
        <span>${selectedCwds.length} of ${preview.projects.length} projects selected</span>
        <button ?disabled=${disabled || selectedCwds.length === preview.projects.length} @click=${() => { this.selectAllProjects(); }}>Select all</button>
        <button ?disabled=${disabled || selectedCwds.length === 0} @click=${() => { this.deselectAllProjects(); }}>Deselect all</button>
      </div>
      ${selectedCwds.length === 0 ? localizedTemplate("SessionCleanupDialog.select_at_least_one_project_to_run.2b4ceacb", html)`<p class="hint" role="status">Select at least one project to run cleanup.</p>` : null}
    `;
  }

  private renderProjectRow(project: SessionCleanupProjectSummary, selected: boolean): TemplateResult {
    return html`
      <tr class=${selected ? "" : "unselected"}>
        <td class="select-cell"><input type="checkbox" aria-label=${localizedText("SessionCleanupDialog.clean_up.1eda4c66")`Clean up ${project.cwd}`} .checked=${selected} ?disabled=${this.running} @change=${(event: Event) => { this.setProjectSelected(project.cwd, checkedValue(event)); }}></td>
        <th title=${project.cwd} dir="auto">${project.cwd}</th>
        <td>${project.archiveCount}</td>
        <td>${project.deleteCount}</td>
      </tr>
    `;
  }

  private renderResult(result: SessionCleanupExecuteResponse): TemplateResult {
    return localizedTemplate("SessionCleanupDialog.cleanup_complete_archived_permanently_deleted_archived.4813659d", html)`
      <section class="result" aria-label="Cleanup result">
        <h2>Cleanup complete</h2>
        <p>Archived ${result.archivedSessionIds.length} ${result.archivedSessionIds.length === 1 ? "session" : "sessions"}; permanently deleted ${result.deletedSessionIds.length} archived ${result.deletedSessionIds.length === 1 ? "session" : "sessions"}.</p>
      </section>
    `;
  }

  private updateDraft(patch: Partial<SessionCleanupDraft>): void {
    this.draft = { ...this.draft, ...patch };
    this.formError = "";
  }

  private selectedPreview(): SessionCleanupPreviewResponse | undefined {
    return this.preview === undefined ? undefined : sessionCleanupPreviewForSelectedProjects(this.preview, this.selectedProjectCwdsForPreview());
  }

  private selectedProjectCwdsForPreview(): string[] {
    return this.preview === undefined ? [] : selectedSessionCleanupProjectCwds(this.preview, this.selectedProjectCwds);
  }

  private selectAllProjects(): void {
    this.selectedProjectCwds = this.preview?.projects.map((project) => project.cwd) ?? [];
    this.formError = "";
  }

  private deselectAllProjects(): void {
    this.selectedProjectCwds = [];
    this.formError = "";
  }

  private setProjectSelected(cwd: string, selected: boolean): void {
    const preview = this.preview;
    if (preview === undefined) return;
    const selectedCwds = new Set(this.selectedProjectCwdsForPreview());
    if (selected) selectedCwds.add(cwd);
    else selectedCwds.delete(cwd);
    this.selectedProjectCwds = preview.projects.map((project) => project.cwd).filter((projectCwd) => selectedCwds.has(projectCwd));
    this.formError = "";
  }

  private previewCleanup(): void {
    const validation = validateSessionCleanupDraft(this.draft);
    if (!validation.ok) {
      this.formError = validation.error;
      return;
    }
    this.formError = "";
    void this.onPreview?.(validation.request);
  }

  private runCleanup(): void {
    const validation = validateSessionCleanupDraft(this.draft);
    if (!validation.ok) {
      this.formError = validation.error;
      return;
    }
    const selectedPreview = this.selectedPreview();
    const selectedProjectCwds = this.selectedProjectCwdsForPreview();
    if (!canRunSessionCleanup({ draft: this.draft, preview: selectedPreview, previewRequest: this.previewRequest })) {
      this.formError = selectedPreview !== undefined && !sessionCleanupPreviewHasTargets(selectedPreview) ? t("SessionCleanupDialog.select_at_least_one_project_to_run.59afcf1f") : t("SessionCleanupDialog.preview_cleanup_before_running_it.273df4a8");
      return;
    }
    if (selectedPreview === undefined || !confirmSessionCleanup(selectedPreview, (message) => confirm(message))) return;
    this.formError = "";
    void this.onRun?.({ ...validation.request, projectCwds: selectedProjectCwds });
  }

  static override styles = css`
    :host { position: fixed; inset: 0; z-index: 30; color: var(--pi-text); font: var(--pi-font-weight-regular, 360) 13px/18px var(--pi-font-family, system-ui, sans-serif); }
    modal-surface { --modal-surface-backdrop-padding: max(20px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left)); --modal-surface-width: min(760px, 100%); --modal-surface-max-height: min(760px, 100%); --modal-surface-radius: 14px; }
    header, footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 0; }
    footer { border-top: 0; border-bottom: 0; justify-content: end; }
    .body { flex: 1 1 auto; min-height: 0; overflow: auto; display: grid; gap: 14px; padding: 16px; }
    .eyebrow { display: block; color: var(--pi-muted); font-size: 12px; line-height: 16px; font-weight: var(--pi-font-weight-medium, 460); letter-spacing: 0; }
    h1, h2, p { margin: 0; }
    h1 { font-size: 18px; line-height: 24px; font-weight: var(--pi-font-weight-medium, 460); }
    h2 { font-size: 14px; line-height: 20px; font-weight: var(--pi-font-weight-medium, 460); }
    .intro { font-size: 14px; line-height: 20px; color: var(--pi-text-secondary); }
    .hint, .empty { color: var(--pi-muted); }
    fieldset { margin: 0; padding: 0; border: 0; display: grid; gap: 10px; }
    .toggle-row { display: grid; grid-template-columns: auto minmax(0, max-content) 88px auto; align-items: center; gap: 8px; color: var(--pi-text); }
    input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--pi-accent); }
    input.days { box-sizing: border-box; width: 88px; min-width: 0; border: 1px solid var(--pi-border); border-radius: 8px; background: var(--pi-bg); color: var(--pi-text); padding: 8px 9px; font: var(--pi-font-weight-regular, 360) var(--pi-control-font-size, 14px)/1.428571 var(--pi-control-font-family, system-ui, sans-serif); }
    input.days:disabled { opacity: .55; }
    .warning, .dialog-error, .result { border: 1px solid var(--pi-border); border-radius: 10px; padding: 10px 12px; }
    .warning { border-color: var(--pi-warning-border); background: var(--pi-warning-surface); color: var(--pi-text); }
    .dialog-error { border-color: var(--pi-danger); background: color-mix(in srgb, var(--pi-danger) 10%, var(--pi-bg)); color: var(--pi-danger); }
    .result { border-color: var(--pi-success-border); background: var(--pi-success-bg); }
    .preview { display: grid; gap: 10px; min-width: 0; }
    .selection-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .selection-controls span { color: var(--pi-muted); }
    .selection-controls button { padding: 5px 7px; font-size: 12px; }
    .table-scroll { max-width: 100%; overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain; scrollbar-width: thin; -webkit-overflow-scrolling: touch; border: 1px solid var(--pi-border); border-radius: 10px; }
    table { width: 100%; min-width: 620px; border-collapse: collapse; }
    th, td { border-bottom: 1px solid var(--pi-border-muted); padding: 8px 10px; text-align: right; }
    thead th:first-child, td.select-cell { width: 72px; text-align: center; }
    th:nth-child(2), td:nth-child(2) { text-align: left; }
    tbody tr.unselected { opacity: .58; }
    tbody th { max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--pi-font-monospace, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace); font-weight: var(--pi-font-weight-medium, 460); }
    tfoot th, tfoot td { border-bottom: 0; font-weight: var(--pi-font-weight-medium, 460); }
    button { border: 0; border-radius: 6px; background: transparent; color: var(--pi-text); padding: 7px 9px; font: inherit; cursor: pointer; }
    button:disabled { opacity: .5; cursor: not-allowed; }
    button.danger { color: var(--pi-danger); }
    button.danger:not(:disabled):hover { background: color-mix(in srgb, var(--pi-danger) 14%, transparent); }
    .close-button { width: 34px; height: 34px; display: grid; place-items: center; border: 0; background: transparent; color: var(--pi-muted); padding: 0; font-size: 24px; }
    .close-button:hover, .close-button:focus-visible { color: var(--pi-text); background: var(--pi-surface-hover); }

    @media (max-width: 680px) {
      modal-surface { --modal-surface-backdrop-padding: 0; --modal-surface-place-items: stretch; --modal-surface-width: 100%; --modal-surface-max-height: 100%; --modal-surface-border: 0; --modal-surface-radius: 0; }
      .toggle-row { grid-template-columns: auto minmax(0, 1fr); }
      .toggle-row input.days { grid-column: 2; }
      .toggle-row span:last-child { grid-column: 2; }
      table { min-width: 560px; }
      thead th:first-child, td.select-cell { width: 58px; }
    }
    button:not(:disabled):hover { background: var(--pi-surface-hover); }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: -2px; }
    strong { font-weight: var(--pi-font-weight-medium, 460); }
    small { font-size: 12px; line-height: 16px; }
    @media (max-width: 680px), (pointer: coarse) {
      button { min-height: 44px; }
      header button { min-width: 44px; }
    }
    input.days:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 1px; }
  `;
}

function checkedValue(event: Event): boolean {
  return event.target instanceof HTMLInputElement ? event.target.checked : false;
}

function inputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : "";
}
