import { renderUiIcon } from "./uiIcons";
import { localizedTemplate, localizedText, t } from "../../../shared/i18n";
import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import type { CommandOption, SessionModelCatalogEntry, SessionModelScopeMode } from "../api";
import { keyboardEventOriginatesFromNativeActivationControl } from "./keyboardEventTarget";
import { ModalSurface } from "./ModalSurface";
import { defaultPin, defaultPinHelp, defaultPinStyles } from "./DefaultPin";
import { scrollWhenSelected } from "./scrollWhenSelected";
import { ThinkingPicker } from "./ThinkingPicker";

/**
 * Scope the model dialog lists: `enabled` is the session's pickable model list
 * (pi's enabled-models scope); `all` is the session machine's full catalog
 * with per-model membership controls.
 */
export type ModelPickerMode = "enabled" | "all";

/** Filtered All-mode catalog view in the machine catalog's natural order. */
export interface ModelCatalogView {
  rows: SessionModelCatalogEntry[];
}

/** The wire value identifying one model row: `${provider}/${id}`. */
export function modelCatalogEntryValue(entry: Pick<SessionModelCatalogEntry, "provider" | "id">): string {
  return `${entry.provider}/${entry.id}`;
}

/** Case-insensitive substring filter over the Enabled-mode options (CommandPicker semantics). */
export function filterModelOptions(options: readonly CommandOption[], query: string): CommandOption[] {
  const normalized = query.trim().toLowerCase();
  if (normalized === "") return [...options];
  return options.filter((option) => `${option.label} ${option.description ?? ""} ${option.value}`.toLowerCase().includes(normalized));
}

function modelCatalogInNaturalOrder(catalog: readonly SessionModelCatalogEntry[]): SessionModelCatalogEntry[] {
  if (!catalog.every((entry) => entry.catalogIndex !== undefined)) return [...catalog];
  return [...catalog].sort((left, right) => (left.catalogIndex ?? 0) - (right.catalogIndex ?? 0));
}

/**
 * Case-insensitive substring filter over the All-mode catalog, mirroring pi's
 * model search text (id, provider, name). A dialog-owned stable order can be
 * supplied so a response from an older server cannot regroup rows mid-edit.
 */
export function modelCatalogView(
  catalog: readonly SessionModelCatalogEntry[],
  query: string,
  stableOrder?: readonly string[],
): ModelCatalogView {
  const naturalRows = modelCatalogInNaturalOrder(catalog);
  const rowsByValue = new Map(naturalRows.map((entry) => [modelCatalogEntryValue(entry), entry]));
  const listed = new Set<string>();
  const orderedRows = stableOrder === undefined
    ? naturalRows
    : [
        ...stableOrder.flatMap((value) => {
          const entry = rowsByValue.get(value);
          if (entry === undefined || listed.has(value)) return [];
          listed.add(value);
          return [entry];
        }),
        ...naturalRows.filter((entry) => !listed.has(modelCatalogEntryValue(entry))),
      ];
  const normalized = query.trim().toLowerCase();
  return {
    rows: normalized === ""
      ? orderedRows
      : orderedRows.filter((entry) => `${entry.provider} ${entry.id} ${entry.name ?? ""}`.toLowerCase().includes(normalized)),
  };
}

export interface ModelCatalogToggleAllPlan {
  mode: SessionModelScopeMode;
  /** False when narrowing the scope cannot identify the current model to retain. */
  canApply: boolean;
  hasChanges: boolean;
}

/** Toggle between every model and the smallest usable scope: the current model. */
export function modelCatalogToggleAllPlan(
  catalog: readonly SessionModelCatalogEntry[],
  currentValue: string | undefined,
): ModelCatalogToggleAllPlan {
  const enabledEntries = catalog.filter((entry) => entry.enabled);
  const current = currentValue === undefined
    ? undefined
    : catalog.find((entry) => modelCatalogEntryValue(entry) === currentValue);
  const onlyCurrentEnabled = current?.enabled === true && enabledEntries.length === 1;
  const mode: SessionModelScopeMode = enabledEntries.length === 0 || onlyCurrentEnabled ? "all" : "current";
  return {
    mode,
    canApply: mode === "all" || current !== undefined,
    hasChanges: mode === "all"
      ? enabledEntries.length < catalog.length
      : current !== undefined && (!current.enabled || enabledEntries.some((entry) => entry !== current)),
  };
}

interface ModelPickerRow {
  value: string;
  entry?: SessionModelCatalogEntry | undefined;
}

type ModelPickHandler = ((value: string) => void) | ((value: string) => Promise<boolean>);

export type ModelThinkingControls = Pick<ThinkingPicker, "options" | "selectedValue" | "defaultValue" | "defaultsLoading" | "onPick" | "onSetDefault">;

/**
 * The session model selection dialog. Enabled mode keeps the classic
 * searchable pick list; All models mode lists the machine's full catalog with
 * per-model membership controls editing pi's enabled-models scope (shared with
 * the pi TUI). Workspace `.pi/settings.json` overrides are displayed but
 * read-only because this picker edits global settings only. Scope is selection
 * UX only, never an authorization boundary.
 */
@customElement("model-picker")
export class ModelPicker extends LitElement {
  @property() override title = t("ModelPicker.select_model.aba5a42c");
  /** Enabled-mode rows: the session's pickable models, pre-labeled by the host. */
  @property({ attribute: false }) options: CommandOption[] = [];
  /** All-mode rows, including enabled state and (on current servers) each model's natural catalog index. Workspace overrides mark rows `editable: false`. */
  @property({ attribute: false }) catalog: SessionModelCatalogEntry[] = [];
  @property({ attribute: false }) selectedValue?: string;
  @property({ attribute: false }) onPick?: ModelPickHandler;
  @property({ attribute: false }) onCancel?: () => void;
  @property({ type: Boolean }) popoverMode = false;
  @property({ attribute: false }) anchor?: HTMLElement | undefined;
  @property({ attribute: false }) thinking?: ModelThinkingControls;
  /**
   * Requests a change to one model's membership in pi's enabled-models scope.
   * Resolves once the host has applied the fresh catalog (or reported the
   * failure); the checkbox is controlled, so it tracks the catalog, not clicks.
   */
  @property({ attribute: false }) onToggleEnabled?: (provider: string, modelId: string, enabled: boolean) => unknown;
  /** Atomically applies the bulk availability preset selected by the toggle-all action. */
  @property({ attribute: false }) onSetScope?: (mode: SessionModelScopeMode) => unknown;

  @property({ attribute: false }) defaultValue?: string;
  /** Host applies the default and reports save errors. */
  @property({ attribute: false }) onSetDefault?: (value: string) => Promise<unknown>;
  @property({ type: Boolean }) defaultsLoading = false;
  @state() private defaultPending = false;
  @state() private pickPending = false;
  @state() private pickError: string | undefined = undefined;
  @state() private defaultError: string | undefined = undefined;
  @state() private thinkingPending = false;
  @state() private mode: ModelPickerMode = "enabled";
  @state() private selectedIndex = 0;
  @state() private query = "";
  @state() private pendingToggles: ReadonlySet<string> = new Set();
  @state() private toggleAllPending = false;
  /** Stable for this dialog's lifetime so membership responses never move natural rows. */
  private catalogOrder: string[] = [];
  private catalogScrollTopBeforeUpdate: number | undefined;
  private focusAfterToggle: HTMLElement | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("resize", this.updateAnchorPosition);
    window.addEventListener("scroll", this.updateAnchorPosition, true);
  }

  override disconnectedCallback(): void {
    window.removeEventListener("resize", this.updateAnchorPosition);
    window.removeEventListener("scroll", this.updateAnchorPosition, true);
    super.disconnectedCallback();
  }

  override render() {
    if (this.isCompact) return this.renderPopover();
    const rows = this.visibleRows();
    return localizedTemplate("ModelPicker.template.3fc1af0e", html)`
      <modal-surface
        .onClose=${() => this.onCancel?.()}
        .initialFocus=${"input.search"}
        .label=${this.title}
        @keydown=${(event: KeyboardEvent) => { this.handleKeyDown(event); }}
      >
        <header>
          <strong>${this.title}</strong>
          <button aria-label="Close" @click=${() => this.onCancel?.()}>${renderUiIcon("close")}</button>
        </header>
        <div class="scope-toggle" role="group" aria-label="Model scope">
          ${this.renderScopeToggleButton("enabled", t("ModelPicker.enabled.2f79f806"))}
          ${this.renderScopeToggleButton("all", t("ModelPicker.all_models.38ebb146"))}
        </div>
        ${!this.modelScopeEditable ? localizedTemplate("ModelPicker.project_override_showing_models_from_this_workspace.4a934e19", html)`
          <div class="scope-notice" role="status">
            <strong>Project override</strong>
            <span>Showing models from this workspace’s <code>.pi/settings.json</code>. Model availability selection is disabled.</span>
          </div>
        ` : nothing}
        <div class="search-row">
          <input class="search" aria-label="Search models" placeholder="Search" .value=${this.query} @input=${(event: Event) => { this.handleSearchInput(event); }}>
          ${this.mode === "all" ? this.renderToggleAllButton() : nothing}
        </div>
        ${this.onSetDefault ? defaultPinHelp : nothing}
        <div
          class="options"
          role="region"
          aria-label=${this.mode === "all" ? t("ModelPicker.all_models_in_catalog_order.7e24a30c") : t("ModelPicker.enabled_models.978d2308")}
          tabindex="0"
          aria-busy=${this.membershipChangePending ? "true" : "false"}
        >
          ${this.mode === "all" ? this.renderCatalogList() : this.renderEnabledList()}
          ${rows.length === 0 ? localizedTemplate("ModelPicker.no_matching_options.0f4a8c1b", html)`<div class="empty">No matching options</div>` : null}
        </div>
      </modal-surface>
    `;
  }

  override firstUpdated() {
    this.anchorSelectionToSelectedValue();
    this.updateAnchorPosition();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has("catalog")) return;
    if (this.mode === "all") {
      this.catalogScrollTopBeforeUpdate = this.shadowRoot?.querySelector<HTMLElement>(".options")?.scrollTop;
    }
    this.rememberCatalogOrder();
    if (this.mode !== "all") return;

    // The server keeps scope order enabled-first. Anchor keyboard selection by
    // value while the dialog's natural row order stays fixed across responses.
    const previousCatalog = changed.get("catalog");
    if (previousCatalog === undefined) return;
    const previousRows = modelCatalogView(previousCatalog, this.query, this.catalogOrder).rows;
    const anchored = previousRows[this.selectedIndex];
    const rows = modelCatalogView(this.catalog, this.query, this.catalogOrder).rows;
    const anchoredValue = anchored === undefined ? undefined : modelCatalogEntryValue(anchored);
    const nextIndex = anchoredValue === undefined ? -1 : rows.findIndex((entry) => modelCatalogEntryValue(entry) === anchoredValue);
    this.selectedIndex = nextIndex >= 0 ? nextIndex : Math.min(this.selectedIndex, Math.max(rows.length - 1, 0));
  }

  protected override updated(changed: PropertyValues<this>): void {
    this.updateAnchorPosition();
    if (!changed.has("catalog") || this.catalogScrollTopBeforeUpdate === undefined) return;
    const options = this.shadowRoot?.querySelector<HTMLElement>(".options");
    if (options !== null && options !== undefined) options.scrollTop = this.catalogScrollTopBeforeUpdate;
    this.catalogScrollTopBeforeUpdate = undefined;
  }

  private get membershipChangePending(): boolean {
    return this.toggleAllPending || this.pendingToggles.size > 0;
  }

  private get isCompact(): boolean {
    return this.popoverMode && this.mode === "enabled";
  }

  private get popoverBusy(): boolean {
    return this.isCompact && (this.pickPending || this.defaultPending || this.thinkingPending);
  }

  private renderPopover(): TemplateResult {
    const options = this.popoverOptions();
    return html`
      <modal-surface
        class="popover-surface"
        .onClose=${() => this.onCancel?.()}
        .busy=${this.popoverBusy}
        .initialFocus=${"input.search"}
        .label=${this.title}
        @keydown=${(event: KeyboardEvent) => { this.handleKeyDown(event); }}
      >
        <header class="popover-header">
          <strong>${this.title}</strong>
          <button class="popover-close" type="button" aria-label=${t("ui.modelPicker.close")} ?disabled=${this.popoverBusy} @click=${() => this.onCancel?.()}>${renderUiIcon("close")}</button>
        </header>
        <div class="search-row">
          <input class="search" aria-label=${t("ui.modelPicker.search")} placeholder=${t("ui.modelPicker.search")} .value=${this.query} ?disabled=${this.popoverBusy} @input=${(event: Event) => { this.handleSearchInput(event); }} @keydown=${(event: KeyboardEvent) => { this.handleSearchKeyDown(event); }}>
        </div>
        ${this.onSetDefault === undefined ? nothing : html`<p class="popover-default-help">${t("ui.modelPicker.defaultHelp")}</p>`}
        <div class="popover-content">
        <div class="options popover-options" role="region" aria-label=${t("ModelPicker.enabled_models.978d2308")} tabindex="0" aria-busy=${this.popoverBusy ? "true" : "false"}>
          ${options.map((option, index) => {
            const current = option.value === this.selectedValue;
            const catalogEntry = this.catalog.find((entry) => modelCatalogEntryValue(entry) === option.value);
            return html`
              <div class="popover-row ${index === this.selectedIndex ? "selected" : ""}" data-model-value=${option.value} ${scrollWhenSelected(index === this.selectedIndex, option.value)}>
                <button class="model-choice" type="button" ?disabled=${this.popoverBusy || this.membershipChangePending}
                  title=${option.value} aria-current=${current ? "true" : nothing}
                  @focus=${() => { this.selectedIndex = index; }} @click=${() => { this.requestPick(option.value); }}>
                  <span class="model-copy"><strong>${option.label}</strong>${option.description === undefined || option.description === "" ? nothing : html`<small>${option.description}</small>`}</span>
                  ${current ? html`<span class="current-check" role="img" aria-label=${t("ui.modelPicker.current")}>${renderUiIcon("check")}</span>` : html`<span class="current-check" aria-hidden="true"></span>`}
                </button>
                ${this.renderDefaultPin(option.value, option.label, catalogEntry?.enabled !== false)}
              </div>
            `;
          })}
          ${options.length === 0 ? html`<div class="empty">${t("ui.modelPicker.empty")}</div>` : nothing}
        </div>
        ${this.pickPending || this.defaultPending ? html`<p class="popover-message" role="status">${t(this.pickPending ? "ui.modelPicker.saving" : "ui.modelPicker.savingDefault")}</p>` : nothing}
        ${this.pickError === undefined ? nothing : html`<p class="popover-message error" role="alert">${this.pickError}</p>`}
        ${this.defaultError === undefined ? nothing : html`<p class="popover-message error" role="alert">${this.defaultError}</p>`}
        ${this.thinking === undefined ? nothing : html`
          <thinking-picker
            .embedded=${true}
            .disabled=${this.pickPending || this.defaultPending || this.membershipChangePending}
            .options=${this.thinking.options}
            .selectedValue=${this.thinking.selectedValue}
            .defaultValue=${this.thinking.defaultValue}
            .defaultsLoading=${this.thinking.defaultsLoading}
            .onPick=${this.thinking.onPick}
            .onSetDefault=${this.thinking.onSetDefault}
            .onBusyChange=${(busy: boolean) => { this.thinkingPending = busy; }}
          ></thinking-picker>
        `}
        </div>
        <button class="manage-models" type="button" ?disabled=${this.popoverBusy || this.membershipChangePending} @click=${() => { this.selectMode("all"); }}>${t("ui.modelPicker.manage")}<span aria-hidden="true">${renderUiIcon("chevronRight")}</span></button>
      </modal-surface>
    `;
  }

  private popoverOptions(): CommandOption[] {
    const options = this.options.map((option) => {
      const entry = this.catalog.find((row) => modelCatalogEntryValue(row) === option.value);
      const separator = option.value.indexOf("/");
      return {
        ...option,
        label: entry?.name ?? entry?.id ?? (separator < 0 ? option.label : option.value.slice(separator + 1)),
        description: entry?.provider ?? option.description ?? (separator < 0 ? "" : option.value.slice(0, separator)),
      };
    });
    return filterModelOptions(options, this.query);
  }

  private get modelScopeEditable(): boolean {
    return this.catalog.every((entry) => entry.editable !== false);
  }

  private renderScopeToggleButton(mode: ModelPickerMode, label: string): TemplateResult {
    return html`<button ?disabled=${this.membershipChangePending} aria-pressed=${this.mode === mode ? "true" : "false"} @click=${() => { this.selectMode(mode); }}>${label}</button>`;
  }

  private renderToggleAllButton(): TemplateResult {
    const plan = modelCatalogToggleAllPlan(this.catalog, this.selectedValue);
    const label = plan.mode === "all" ? t("ModelPicker.select_all.2e61fd82") : t("ModelPicker.deselect_all.7a0a40b3");
    return html`
      <button
        class="toggle-all"
        ?disabled=${!this.modelScopeEditable || !plan.canApply || !plan.hasChanges || this.toggleAllPending || this.pendingToggles.size > 0}
        aria-describedby="model-scope-status"
        title=${!this.modelScopeEditable ? t("ModelPicker.workspace_settings_control_model_availability.b9e1bbe6") : !plan.canApply ? t("ModelPicker.the_current_model_is_unavailable.752f9de6") : nothing}
        @click=${() => { this.requestToggleAll(); }}
      >${label}</button>
      <span id="model-scope-status" class="scope-status" aria-live="polite">${this.membershipChangePending ? t("ModelPicker.updating_model_availability.bd9c2a77") : !this.modelScopeEditable ? t("ModelPicker.workspace_settings_control_model_availability.1ead34c7") : !plan.canApply ? t("ModelPicker.the_current_model_is_unavailable.5349ac19") : nothing}</span>
    `;
  }

  private rememberCatalogOrder(): void {
    const knownCatalogValues = new Set(this.catalogOrder);
    for (const entry of modelCatalogView(this.catalog, "").rows) {
      const value = modelCatalogEntryValue(entry);
      if (knownCatalogValues.has(value)) continue;
      knownCatalogValues.add(value);
      this.catalogOrder.push(value);
    }
  }

  private renderEnabledList(): TemplateResult[] {
    return filterModelOptions(this.options, this.query).map((option, index) => {
      const pick = html`<button
        class=${index === this.selectedIndex ? "selected" : ""}
        ?disabled=${this.membershipChangePending}
        aria-current=${index === this.selectedIndex ? "true" : nothing}
        ${scrollWhenSelected(index === this.selectedIndex, option.value)}
        @focus=${() => { this.selectedIndex = index; }}
        @click=${() => { this.requestPick(option.value); }}
      >
        <span>${option.label}</span>
        ${option.description !== undefined && option.description !== "" ? html`<small>${option.description}</small>` : null}
      </button>`;
      return this.onSetDefault ? html`<div class="default-row">${pick}${this.renderDefaultPin(option.value, option.label, this.catalog.find((entry) => modelCatalogEntryValue(entry) === option.value)?.enabled !== false)}</div>` : pick;
    });
  }

  private renderDefaultPin(value: string, label: string, enabled: boolean) {
    return this.onSetDefault ? defaultPin(label, value === this.defaultValue,
      !enabled || this.defaultsLoading || this.defaultPending || this.membershipChangePending || this.popoverBusy,
      () => { void this.setDefault(value); }) : nothing;
  }

  private async setDefault(value: string): Promise<void> {
    if (!this.onSetDefault || this.defaultsLoading || this.defaultPending || this.membershipChangePending || this.popoverBusy) return;
    if (this.catalog.find((entry) => modelCatalogEntryValue(entry) === value)?.enabled === false) return;
    this.defaultPending = true;
    this.defaultError = undefined;
    const reportInline = this.isCompact;
    try {
      if (await this.onSetDefault(value) === false && reportInline) this.defaultError = t("ui.modelPicker.defaultFailed");
    } catch (error: unknown) {
      // Hosts own user-facing errors; keep unexpected callback rejections observable.
      if (reportInline) this.defaultError = t("ui.modelPicker.defaultFailed");
      else console.warn(t("ModelPicker.failed_to_set_default_model.3d3541ef"), error);
    } finally {
      this.defaultPending = false;
      if (reportInline && this.isConnected) {
        await this.updateComplete;
        const surface = this.renderRoot.querySelector("modal-surface");
        if (surface instanceof ModalSurface) surface.focusDialog();
      }
    }
  }

  private renderCatalogList(): TemplateResult {
    const rows = modelCatalogView(this.catalog, this.query, this.catalogOrder).rows;
    return html`${repeat(rows, modelCatalogEntryValue, (entry, index) => this.renderCatalogRow(entry, index))}`;
  }

  private renderCatalogRow(entry: SessionModelCatalogEntry, index: number): TemplateResult {
    const value = modelCatalogEntryValue(entry);
    const selected = index === this.selectedIndex;
    const protectsCurrentModel = value === this.selectedValue && entry.enabled;
    const membershipDisabled = !this.modelScopeEditable || this.membershipChangePending || protectsCurrentModel;
    const membershipLabel = !this.modelScopeEditable
      ? localizedText("ModelPicker.model_availability_for_is_controlled_by_workspace.c68b85eb")`Model availability for ${value} is controlled by workspace settings`
      : protectsCurrentModel ? localizedText("ModelPicker.current_model_cannot_be_deselected.788077d4")`Current model ${value} cannot be deselected` : `${entry.enabled ? t("ModelPicker.disable.5229f1ce") : t("ModelPicker.enable.75c229fa")} ${value}`;
    return html`
      <div class="catalog-row ${selected ? "selected" : ""}" data-model-value=${value} ${scrollWhenSelected(selected, value)}>
        <input
          type="checkbox"
          .checked=${entry.enabled}
          ?disabled=${membershipDisabled}
          aria-label=${membershipLabel}
          title=${!this.modelScopeEditable ? t("ModelPicker.workspace_settings_control_model_availability.dcd92cd6") : protectsCurrentModel ? t("ModelPicker.the_current_model_must_remain_enabled.0364beee") : nothing}
          @focus=${() => { this.selectedIndex = index; }}
          @click=${(event: MouseEvent) => { this.handleEnableToggleClick(entry, event); }}
        />
        <button
          class="membership"
          ?disabled=${membershipDisabled}
          aria-label=${membershipLabel}
          aria-current=${value === this.selectedValue ? "true" : nothing}
          @focus=${() => { this.selectedIndex = index; }}
          @click=${(event: MouseEvent) => { this.requestEnabledToggle(entry, event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined); }}
        >
          <span>${entry.id}${value === this.selectedValue ? t("ModelPicker.current.3bba53fd") : ""}</span>
          <small>${entry.provider}</small>
        </button>
        ${this.renderDefaultPin(value, entry.name ?? entry.id, entry.enabled)}
      </div>
    `;
  }

  private visibleRows(): ModelPickerRow[] {
    if (this.mode === "all") {
      return modelCatalogView(this.catalog, this.query, this.catalogOrder).rows.map((entry) => ({ value: modelCatalogEntryValue(entry), entry }));
    }
    return (this.isCompact ? this.popoverOptions() : filterModelOptions(this.options, this.query)).map((option) => ({ value: option.value }));
  }

  private anchorSelectionToSelectedValue(): void {
    if (this.selectedValue === undefined) {
      this.selectedIndex = 0;
      return;
    }
    const index = this.visibleRows().findIndex((row) => row.value === this.selectedValue);
    this.selectedIndex = index >= 0 ? index : 0;
  }

  private selectMode(mode: ModelPickerMode): void {
    if (mode === this.mode || this.popoverBusy) return;
    this.pickError = undefined;
    this.defaultError = undefined;
    this.mode = mode;
    this.anchorSelectionToSelectedValue();
  }

  private handleSearchInput(event: Event): void {
    if (this.popoverBusy) return;
    if (event.target instanceof HTMLInputElement) {
      this.query = event.target.value;
      this.selectedIndex = 0;
      this.pickError = undefined;
    }
  }

  private handleSearchKeyDown(event: KeyboardEvent): void {
    // Some IMEs identify candidate confirmation only with the legacy 229 code.
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- Keep that IME compatibility guard alongside isComposing.
    if (event.isComposing || event.keyCode === 229) event.stopPropagation();
  }

  // Escape and backdrop presses are owned by the modal surface (routed to
  // `onCancel`). Search and list-container keys retain the broadened option
  // navigation idiom, while focused row controls keep their own semantics.
  private handleKeyDown(event: KeyboardEvent) {
    // The embedded slider owns its arrow keys and native control activation.
    if (event.composedPath().some((target) => target instanceof ThinkingPicker)) return;
    if (this.popoverBusy) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) event.preventDefault();
      return;
    }
    const focusedCheckbox = event.composedPath().find((target): target is HTMLInputElement => target instanceof HTMLInputElement && target.type === "checkbox");
    if (focusedCheckbox !== undefined) {
      // Browsers do not consistently activate checkboxes with Enter. Support it
      // explicitly, but never let row-navigation keys move a hidden selection
      // away from the checkbox that still holds focus.
      if (event.key === "Enter") {
        event.preventDefault();
        focusedCheckbox.click();
      }
      return;
    }
    if (keyboardEventOriginatesFromNativeActivationControl(event)) return;
    if (this.membershipChangePending && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      return;
    }
    const rows = this.visibleRows();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (rows.length > 0) this.selectedIndex = (this.selectedIndex + 1) % rows.length;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (rows.length > 0) this.selectedIndex = (this.selectedIndex - 1 + rows.length) % rows.length;
    } else if (event.key === "Enter") {
      event.preventDefault();
      const row = rows[this.selectedIndex];
      if (row?.entry !== undefined) this.requestEnabledToggle(row.entry);
      else if (row !== undefined) this.requestPick(row.value);
    } else if (event.key === " " && this.mode === "all") {
      // Space toggles the selected row only when it did not land on an input:
      // a focused checkbox toggles through its own click and the search input
      // inserts the character.
      if (event.composedPath().some((target) => target instanceof HTMLInputElement)) return;
      const row = rows[this.selectedIndex];
      if (row?.entry === undefined) return;
      event.preventDefault();
      this.requestEnabledToggle(row.entry);
    }
  }

  private handleEnableToggleClick(entry: SessionModelCatalogEntry, event: MouseEvent): void {
    // The checkbox is controlled: cancel the native flip so the rendered state
    // keeps reflecting the catalog until the host applies the fresh one.
    event.preventDefault();
    const checkbox = event.currentTarget instanceof HTMLInputElement ? event.currentTarget : undefined;
    if (checkbox !== undefined) checkbox.checked = entry.enabled;
    this.requestEnabledToggle(entry, checkbox);
  }

  private requestEnabledToggle(entry: SessionModelCatalogEntry, focusTarget?: HTMLElement): void {
    const value = modelCatalogEntryValue(entry);
    if (!this.modelScopeEditable || (value === this.selectedValue && entry.enabled) || this.membershipChangePending) return;
    if (focusTarget !== undefined && this.shadowRoot?.activeElement === focusTarget) this.focusAfterToggle = focusTarget;
    const pending = new Set(this.pendingToggles);
    pending.add(value);
    this.pendingToggles = pending;
    void this.settleEnabledToggle(value, entry);
  }

  private requestToggleAll(): void {
    if (!this.modelScopeEditable || this.toggleAllPending || this.pendingToggles.size > 0) return;
    const plan = modelCatalogToggleAllPlan(this.catalog, this.selectedValue);
    if (!plan.canApply || !plan.hasChanges) return;
    this.toggleAllPending = true;
    void this.settleToggleAll(plan.mode);
  }

  private async settleToggleAll(mode: SessionModelScopeMode): Promise<void> {
    try {
      await this.onSetScope?.(mode);
    } catch (error: unknown) {
      console.warn(`Failed to ${mode === "all" ? t("ModelPicker.enable_all_models.eefd67ea") : t("ModelPicker.keep_only_the_current_model.9b8c5580")}`, error);
    } finally {
      this.toggleAllPending = false;
    }
  }

  private async settleEnabledToggle(value: string, entry: SessionModelCatalogEntry): Promise<void> {
    try {
      await this.onToggleEnabled?.(entry.provider, entry.id, !entry.enabled);
    } catch (error: unknown) {
      // Hosts report toggle failures through the app error state; a throwing
      // callback is a wiring bug, so it stays observable here too.
      console.warn(localizedText("ModelPicker.failed_to_toggle_model.f22cdfcb")`Failed to toggle model ${value}`, error);
    } finally {
      const settled = new Set(this.pendingToggles);
      settled.delete(value);
      this.pendingToggles = settled;
      const focusTarget = this.focusAfterToggle;
      this.focusAfterToggle = undefined;
      await this.updateComplete;
      if (focusTarget?.isConnected === true && this.shadowRoot?.activeElement === null) {
        focusTarget.focus({ preventScroll: true });
      }
    }
  }

  private requestPick(value: string): void {
    if (this.isCompact) void this.pickPopoverModel(value);
    else void this.onPick?.(value);
  }

  private async pickPopoverModel(value: string): Promise<void> {
    if (this.popoverBusy || this.membershipChangePending || this.onPick === undefined) return;
    this.pickPending = true;
    this.pickError = undefined;
    try {
      if (await this.onPick(value) === false) this.pickError = t("ui.modelPicker.saveFailed");
    } catch {
      this.pickError = t("ui.modelPicker.saveFailed");
    } finally {
      this.pickPending = false;
      if (this.pickError !== undefined && this.isConnected) {
        await this.updateComplete;
        const surface = this.renderRoot.querySelector("modal-surface");
        if (surface instanceof ModalSurface) surface.focusDialog();
      }
    }
  }

  private readonly updateAnchorPosition = (): void => {
    const anchor = this.anchor;
    if (!this.isCompact || anchor === undefined || !anchor.isConnected || window.innerWidth <= 640) {
      this.removeAttribute("anchored");
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const availableHeight = rect.top - 20;
    if (availableHeight < 240 || rect.top > window.innerHeight) {
      this.removeAttribute("anchored");
      return;
    }
    const width = Math.min(320, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
    this.style.setProperty("--model-picker-left", `${String(left)}px`);
    this.style.setProperty("--model-picker-bottom", `${String(window.innerHeight - rect.top + 8)}px`);
    this.style.setProperty("--model-picker-height", `${String(availableHeight)}px`);
    this.setAttribute("anchored", "");
  };

  static override styles = [css`
    :host { position: fixed; inset: 0; z-index: 10; color: var(--pi-text); font: 13px/18px var(--pi-font-family, system-ui, sans-serif); }
    modal-surface { --modal-surface-width: min(720px, calc(100vw - 40px)); --modal-surface-max-height: min(640px, calc(100% - 40px)); }
    header { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 0; }
    strong { font-weight: 500; }
    header:not(.popover-header) strong { font-size: 14px; line-height: 20px; }
    .scope-toggle { display: flex; gap: 4px; margin: 10px 12px 0; padding: 3px; border: 0; border-radius: 8px; background: var(--pi-surface); }
    .scope-toggle button { flex: 1; padding: 6px 10px; border-radius: 6px; color: var(--pi-muted); }
    .scope-toggle button[aria-pressed="true"] { background: var(--pi-selection-bg); color: var(--pi-text); }
    .scope-notice { display: grid; gap: 3px; margin: 10px 12px 0; padding: 8px 10px; border: 0; border-radius: 8px; background: var(--pi-surface); color: var(--pi-muted); }
    .scope-notice strong { color: var(--pi-text); }
    .scope-notice code { font: inherit; color: var(--pi-text); }
    .options { min-height: 0; overflow: auto; outline: none; }
    button { border: 0; border-radius: 6px; background: transparent; color: var(--pi-text); font: inherit; cursor: pointer; }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: -2px; }
    .scope-toggle button:not([aria-pressed="true"]):not(:disabled):hover, header > button:not(:disabled):hover { background: var(--pi-surface-hover); }
    header button { font-size: 20px; color: var(--pi-muted); }
    .search-row { display: flex; align-items: center; gap: 8px; margin: 10px 12px; }
    input.search { flex: 1; min-width: 0; border: 1px solid var(--pi-border); border-radius: 8px; background: var(--pi-bg); color: var(--pi-text); font: var(--pi-control-font-size, 14px)/1.428571 var(--pi-control-font-family, system-ui, sans-serif); padding: 8px 10px; outline: none; }
    input.search:focus { border-color: var(--pi-accent); }
    .toggle-all { flex: none; padding: 8px 10px; border: 0; border-radius: 6px; background: var(--pi-surface); white-space: nowrap; }
    .toggle-all:hover:not(:disabled) { background: var(--pi-selection-bg); }
    .toggle-all:disabled { cursor: default; opacity: 0.55; }
    .scope-status { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    .options > button { display: block; width: 100%; padding: 10px 12px; border-bottom: 0; text-align: left; }
    .options > button.selected, .options > button:hover { background: var(--pi-selection-bg); }
    .catalog-row { display: flex; align-items: center; margin: 2px 4px; border-radius: 6px; }
    .catalog-row.selected, .catalog-row:hover { background: var(--pi-selection-bg); }
    .catalog-row input[type="checkbox"] { margin: 0 0 0 12px; accent-color: var(--pi-accent); }
    .catalog-row .membership { flex: 1; min-width: 0; display: block; padding: 10px 12px; text-align: left; }
    @media (pointer: coarse) { button { min-width: 44px; min-height: 44px; } }
    small { display: block; margin-top: 4px; color: var(--pi-muted); }
    .empty { padding: 24px; color: var(--pi-muted); text-align: center; }
  `, defaultPinStyles, css`
    .popover-surface { --pi-overlay: transparent; --modal-surface-width: min(320px, calc(100vw - 24px)); --modal-surface-max-height: calc(100dvh - 24px); --modal-surface-backdrop-padding: 12px; --modal-surface-radius: 10px; font-family: var(--pi-font-family, system-ui, sans-serif); }
    :host([anchored]) .popover-surface { --modal-surface-place-items: end start; --modal-surface-backdrop-padding: 12px 12px var(--model-picker-bottom) var(--model-picker-left); --modal-surface-max-height: var(--model-picker-height); }
    .popover-header { gap: 12px; padding: 12px 14px 2px; border: 0; }
    .popover-header strong { font-size: 13px; font-weight: 500; }
    .popover-close { display: grid; place-items: center; flex: none; width: 28px; height: 28px; padding: 0; border-radius: 6px; }
    .popover-surface button:disabled { cursor: not-allowed; opacity: .5; }
    .popover-surface button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: -2px; }
    .popover-surface .search-row { margin: 8px 12px; }
    .popover-surface input.search { padding: 8px 10px; border-color: var(--pi-border-muted); border-radius: 9px; background: var(--pi-surface); }
    .popover-surface input.search:focus { border-color: var(--pi-accent); }
    .popover-default-help { margin: 0; padding: 0 14px 6px; color: var(--pi-muted); font-size: 11px; line-height: 1.5; }
    .popover-content { display: flex; flex: 1 1 auto; flex-direction: column; min-height: 0; overflow-y: auto; }
    .popover-options { flex: 1 1 auto; min-height: 58px; max-height: 360px; padding: 2px 6px 6px; }
    thinking-picker { flex: none; border-top: 1px solid var(--pi-border-muted); }
    .popover-row { display: flex; min-width: 0; align-items: center; margin: 2px 0; border-radius: 9px; }
    .popover-row.selected, .popover-row:hover { background: var(--pi-selection-bg); }
    .popover-row .model-choice { display: flex; flex: 1 1 0; min-width: 0; align-items: center; gap: 8px; padding: 9px 10px; border-radius: 9px; font: inherit; text-align: left; }
    .model-copy { display: block; flex: 1 1 0; min-width: 0; }
    .model-copy strong { display: block; overflow: hidden; color: var(--pi-text); font-size: 13px; font-weight: 500; line-height: 1.5; text-overflow: ellipsis; white-space: nowrap; }
    .model-copy small { margin-top: 2px; overflow: hidden; font-size: 11px; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
    .current-check { flex: none; width: 18px; color: var(--pi-accent); font-size: 15px; text-align: center; }
    .popover-options button.default-pin { width: 32px; height: 32px; margin: 0 6px 0 0; }
    .popover-options .default-pin svg { width: 16px; height: 16px; }
    .popover-message { margin: 0; padding: 6px 14px 10px; color: var(--pi-muted); font-size: 12px; line-height: 1.5; }
    .popover-message.error { color: var(--pi-danger); }
    .manage-models { display: flex; flex: none; align-items: center; justify-content: space-between; gap: 12px; width: 100%; padding: 12px 14px; border-top: 1px solid var(--pi-border-muted); color: var(--pi-muted); font: 12px var(--pi-font-family, system-ui, sans-serif); text-align: left; }
    .manage-models:not(:disabled):hover, .popover-close:not(:disabled):hover { background: var(--pi-selection-bg); }
    .manage-models > span { font-size: 18px; line-height: 1; }
    @media (max-width: 640px) {
      .popover-surface, :host([anchored]) .popover-surface { --pi-overlay: inherit; --modal-surface-place-items: end stretch; --modal-surface-backdrop-padding: 0; --modal-surface-width: 100%; --modal-surface-max-height: min(560px, calc(100dvh - 12px)); --modal-surface-radius: 16px 16px 0 0; }
      .manage-models { padding-bottom: max(12px, env(safe-area-inset-bottom)); }
    }
  `];
}
