import { renderUiIcon } from "./uiIcons";
import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { roleDisplayLabel, t } from "../../../shared/i18n";
import { sessionHistoryApi, type SessionHistoryEntry, type SessionSearchHit, type SessionSearchResponse } from "../api/sessionHistory";
import { keyboardEventOriginatesFromNativeActivationControl } from "./keyboardEventTarget";
import { paletteStyles } from "./paletteStyles";
import { scrollWhenSelected } from "./scrollWhenSelected";
import type { ModalSurface } from "./ModalSurface";
import "./ModalSurface";

@customElement("session-search-dialog")
export class SessionSearchDialog extends LitElement {
  @property() machineId = "local";
  @property() cwd?: string;
  @property({ attribute: false }) onSelect?: (hit: SessionSearchHit) => Promise<void>;
  @property({ attribute: false }) onClose?: () => void;
  @state() private query = "";
  @state() private scope: "workspace" | "machine" = "workspace";
  @state() private response: SessionSearchResponse | undefined;
  @state() private selectedIndex = 0;
  @state() private searching = false;
  @state() private opening = false;
  @state() private locating = false;
  @state() private previewHit: SessionSearchHit | undefined;
  @state() private preview: SessionHistoryEntry | undefined;
  @state() private error: string | undefined;
  private requestController: AbortController | undefined;
  private generation = 0;

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has("machineId") && !changed.has("cwd")) return;
    this.clearResults();
    if (this.cwd === undefined || this.cwd === "") this.scope = "machine";
  }

  protected override updated(changed: PropertyValues): void {
    if (!changed.has("previewHit")) return;
    const target = this.renderRoot.querySelector<HTMLElement>(this.previewHit === undefined ? ".search-input" : ".preview-back");
    if (target !== null) this.renderRoot.querySelector<ModalSurface>("modal-surface")?.focusDialog(target);
  }

  override disconnectedCallback(): void {
    this.requestController?.abort();
    this.generation += 1;
    super.disconnectedCallback();
  }

  override render() {
    const results = this.response?.results ?? [];
    return html`
      <modal-surface .label=${t("ui.sessionSearch.title")} .initialFocus=${".search-input"} .onClose=${() => { this.close(); }} @keydown=${(event: KeyboardEvent) => { this.handleKeyDown(event); }}>
        <form @submit=${(event: SubmitEvent) => { event.preventDefault(); void this.search(); }}>
          <header>
            <input class="search-input" type="search" .value=${this.query} placeholder=${t("ui.sessionSearch.placeholder")} aria-label=${t("ui.sessionSearch.placeholder")} aria-controls=${this.previewHit === undefined ? "session-search-results" : nothing} aria-activedescendant=${results.length === 0 || this.previewHit !== undefined ? nothing : `session-search-result-${String(this.selectedIndex)}`} ?disabled=${this.opening || this.locating} @input=${(event: Event) => {
              if (!(event.target instanceof HTMLInputElement)) return;
              this.query = event.target.value;
              this.clearResults();
            }}>
            <button type="button" aria-label=${t("navigation.close")} title=${t("navigation.close")} @click=${() => { this.close(); }}>${renderUiIcon("close")}</button>
          </header>
          <div class="search-controls">
            <label><span>${t("ui.sessionSearch.scope")}</span><select aria-label=${t("ui.sessionSearch.scope")} .value=${this.scope} ?disabled=${this.opening || this.locating} @change=${(event: Event) => { this.changeScope(event); }}>
              <option value="workspace" ?disabled=${this.cwd === undefined || this.cwd === ""}>${t("ui.sessionSearch.workspace")}</option>
              <option value="machine">${t("ui.sessionSearch.machine")}</option>
            </select></label>
            <button class="search-submit" type="submit" ?disabled=${this.query.trim() === "" || this.opening || this.locating}>${t("ui.sessionSearch.search")}</button>
          </div>
        </form>
        <div class="search-state" role="status" aria-live="polite">${this.searching ? t("ui.sessionSearch.searching") : this.opening ? t("ui.sessionSearch.opening") : this.locating ? t("ui.sessionSearch.locating") : this.response === undefined ? t("ui.sessionSearch.instructions") : `${t("ui.sessionSearch.matches")}: ${String(results.length)} · ${t("ui.sessionSearch.scannedSessions")}: ${String(this.response.scannedSessions)}`}</div>
        ${this.error === undefined ? nothing : html`<div class="search-error" role="alert">${this.error}</div>`}
        ${this.response?.truncated === true ? html`<div class="search-truncated" role="status">${t("ui.sessionSearch.truncated")}</div>` : nothing}
        ${this.previewHit !== undefined ? this.renderPreview() : html`<div class="options" id="session-search-results" role="listbox" aria-label=${t("ui.sessionSearch.results")} aria-busy=${String(this.searching)}>
          ${this.response !== undefined && results.length === 0 ? html`<div class="empty">${t("ui.sessionSearch.noResults")}</div>` : nothing}
          ${results.map((hit, index) => html`
            <button type="button" class=${`search-result ${index === this.selectedIndex ? "selected" : ""}`} id=${`session-search-result-${String(index)}`} role="option" aria-selected=${String(index === this.selectedIndex)} ?disabled=${this.opening} ${scrollWhenSelected(index === this.selectedIndex, hit)} @focus=${() => { this.selectedIndex = index; }} @click=${() => { void this.select(hit); }}>
              <span class="result-heading"><strong>${hit.session.name ?? (hit.session.firstMessage === "" ? hit.session.id : hit.session.firstMessage)}</strong>${hit.session.archived === true ? html`<span class="archived">${t("ui.sessionSearch.archived")}</span>` : nothing}</span>
              <small class="result-cwd">${hit.session.cwd}</small>
              <span class="result-summary">${hit.before}<mark>${hit.match}</mark>${hit.after}</span>
            </button>
          `)}
        </div>`}
      </modal-surface>
    `;
  }

  private renderPreview() {
    const hit = this.previewHit;
    const entry = this.preview;
    return html`
      <div class="preview-navigation"><button class="preview-back" type="button" ?disabled=${this.locating} @click=${() => { this.backToResults(); }}>${renderUiIcon("arrowLeft")} ${t("ui.sessionSearch.back")}</button><button class="preview-locate" type="button" ?disabled=${entry === undefined || this.locating || this.onSelect === undefined} @click=${() => { void this.locate(); }}>${t("ui.sessionSearch.locate")}</button></div>
      <section class="message-preview" aria-label=${t("ui.sessionSearch.preview")} aria-busy=${String(this.opening)}>
        <h2>${t("ui.sessionSearch.preview")}</h2>
        <p class="preview-source">${hit?.session.name ?? hit?.session.id}<br>${hit?.session.cwd}</p>
        ${entry === undefined ? nothing : html`<p class="preview-role">${t("ui.sessionSearch.sourceRole")}: ${roleDisplayLabel(entry.role)}</p><pre>${highlightSearchText(entry.text, hit?.match ?? this.query).map((part) => part.match ? html`<mark>${part.text}</mark>` : part.text)}</pre>`}
      </section>
    `;
  }

  private backToResults(): void {
    this.requestController?.abort();
    this.requestController = undefined;
    this.generation += 1;
    this.opening = false;
    this.previewHit = undefined;
    this.preview = undefined;
    this.error = undefined;
  }

  private close(): void {
    this.requestController?.abort();
    this.generation += 1;
    this.onClose?.();
  }

  private clearResults(): void {
    this.requestController?.abort();
    this.requestController = undefined;
    this.generation += 1;
    this.response = undefined;
    this.selectedIndex = 0;
    this.searching = false;
    this.opening = false;
    this.locating = false;
    this.previewHit = undefined;
    this.preview = undefined;
    this.error = undefined;
  }

  private changeScope(event: Event): void {
    if (!(event.target instanceof HTMLSelectElement)) return;
    this.scope = event.target.value === "machine" ? "machine" : "workspace";
    this.clearResults();
    if (this.query.trim() !== "") void this.search();
  }

  private async search(): Promise<void> {
    const query = this.query.trim();
    if (query === "" || this.opening || this.locating) return;
    this.clearResults();
    const generation = this.generation;
    const controller = new AbortController();
    this.requestController = controller;
    this.searching = true;
    try {
      const response = await sessionHistoryApi.search(query, { machineId: this.machineId, ...(this.scope === "workspace" && this.cwd !== undefined ? { cwd: this.cwd } : {}), signal: controller.signal });
      if (generation !== this.generation || !this.isConnected) return;
      this.response = response;
    } catch (error) {
      if (generation !== this.generation || controller.signal.aborted || !this.isConnected) return;
      this.error = `${t("ui.sessionSearch.searchFailed")}${error instanceof Error ? `: ${error.message}` : ""}`;
    } finally {
      if (generation === this.generation) {
        this.searching = false;
        this.requestController = undefined;
      }
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || this.opening || this.locating || keyboardEventOriginatesFromNativeActivationControl(event)
      || event.composedPath().some((target) => target instanceof HTMLSelectElement)) return;
    if (this.previewHit !== undefined) {
      if (event.key === "Enter") { event.preventDefault(); void this.search(); }
      return;
    }
    const results = this.response?.results ?? [];
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && results.length > 0) {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex + (event.key === "ArrowUp" ? -1 : 1) + results.length) % results.length;
    } else if (event.key === "Enter") {
      event.preventDefault();
      const hit = results[this.selectedIndex];
      if (hit === undefined) void this.search();
      else void this.select(hit);
    }
  }

  private async select(hit: SessionSearchHit): Promise<void> {
    if (this.opening || this.locating) return;
    this.requestController?.abort();
    const generation = ++this.generation;
    const controller = new AbortController();
    this.requestController = controller;
    this.opening = true;
    this.previewHit = hit;
    this.preview = undefined;
    this.error = undefined;
    try {
      const entry = await sessionHistoryApi.entry(hit.session, hit.entryId, { machineId: this.machineId, signal: controller.signal });
      if (generation === this.generation && this.isConnected) this.preview = entry;
    } catch (error) {
      if (generation === this.generation && this.isConnected) this.error = `${t("ui.sessionSearch.openFailed")}${error instanceof Error ? `: ${error.message}` : ""}`;
    } finally {
      if (generation === this.generation) { this.opening = false; this.requestController = undefined; }
    }
  }

  private async locate(): Promise<void> {
    const hit = this.previewHit;
    if (hit === undefined || this.locating || this.onSelect === undefined) return;
    const generation = this.generation;
    this.locating = true;
    this.error = undefined;
    try {
      await this.onSelect(hit);
      if (generation === this.generation && this.isConnected) this.close();
    } catch (error) {
      if (generation === this.generation && this.isConnected) this.error = `${t("ui.sessionSearch.locateFailed")}${error instanceof Error ? ` ${error.message}` : ""}`;
    } finally {
      if (generation === this.generation) this.locating = false;
    }
  }

  static override styles = [paletteStyles, css`
    form { flex: none; }
    .search-controls { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 16px 10px; }
    .search-controls label { display: flex; align-items: center; gap: 8px; color: var(--pi-muted); }
    select { min-width: 0; max-width: 230px; padding: 5px; border: 1px solid var(--pi-border-muted); border-radius: 6px; background: var(--pi-bg); color: var(--pi-text); font: inherit; }
    .search-submit { padding: 6px 12px; background: var(--pi-selection-bg); }
    button:disabled { opacity: .65; cursor: default; }
    .search-state, .search-error, .search-truncated { padding: 7px 16px; color: var(--pi-muted); font-size: 12px; }
    .search-error { color: var(--pi-danger); white-space: pre-wrap; overflow-wrap: anywhere; }
    .search-truncated { color: var(--pi-warning); }
    .search-result { display: grid; gap: 5px; width: 100%; padding: 10px; text-align: left; }
    .search-result.selected { background: var(--pi-selection-bg); }
    .result-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; min-width: 0; }
    .result-heading strong, .result-cwd { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .result-cwd { color: var(--pi-muted); }
    .result-summary { white-space: pre-wrap; overflow-wrap: anywhere; }
    .archived { flex: none; color: var(--pi-muted); font-size: 11px; }
    mark { border-radius: 2px; padding: 0 2px; background: color-mix(in srgb, var(--pi-accent) 25%, var(--pi-bg)); color: var(--pi-text); }
    .preview-navigation { display: flex; justify-content: space-between; gap: 10px; padding: 8px 16px; }
    .preview-navigation button { padding: 5px 8px; }
    .preview-locate { background: var(--pi-selection-bg); }
    .message-preview { flex: 1 1 auto; min-height: 0; padding: 0 16px 16px; overflow-y: auto; }
    .message-preview h2 { font-size: 14px; font-weight: var(--pi-font-weight-medium, 460); }
    .preview-source, .preview-role { color: var(--pi-muted); font-size: 12px; overflow-wrap: anywhere; }
    .message-preview pre { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; }
    @media (max-width: 480px) { .search-controls label { flex-wrap: wrap; gap: 4px; } select { max-width: 180px; } }
  `];
}

export function highlightSearchText(text: string, query: string): { text: string; match: boolean }[] {
  if (query === "") return [{ text, match: false }];
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let from = 0;
  for (let found = haystack.indexOf(needle, from); found >= 0; found = haystack.indexOf(needle, from)) {
    if (found > from) parts.push({ text: text.slice(from, found), match: false });
    parts.push({ text: text.slice(found, found + query.length), match: true });
    from = found + query.length;
  }
  if (from < text.length) parts.push({ text: text.slice(from), match: false });
  return parts;
}
