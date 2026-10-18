import { renderUiIcon } from "./uiIcons";
import { localizedTemplate, t } from "../../../shared/i18n";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { CommandOption } from "../api";
import { keyboardEventOriginatesFromNativeActivationControl } from "./keyboardEventTarget";
import "./ModalSurface";
import { defaultPin, defaultPinHelp, defaultPinStyles } from "./DefaultPin";
import { scrollWhenSelected } from "./scrollWhenSelected";

@customElement("command-picker")
export class CommandPicker extends LitElement {
  @property() override title = t("CommandPicker.select.d3775a76");
  @property({ type: Boolean }) searchable = false;
  @property({ attribute: false }) options: CommandOption[] = [];
  @property({ attribute: false }) selectedValue?: string;
  @property({ attribute: false }) onPick?: (value: string) => void;
  @property({ attribute: false }) onCancel?: () => void;
  @property({ attribute: false }) defaultValue?: string;
  /** Host applies the default and reports save errors. */
  @property({ attribute: false }) onSetDefault?: (value: string) => Promise<unknown>;
  @property({ type: Boolean }) defaultsLoading = false;
  @state() private defaultPending = false;
  @state() private selectedIndex = 0;
  @state() private query = "";

  override render() {
    const options = this.filteredOptions();
    return localizedTemplate("CommandPicker.template.ac370c64", html)`
      <modal-surface
        .onClose=${() => this.onCancel?.()}
        .initialFocus=${this.searchable ? "input" : ".options"}
        .label=${this.title}
        @keydown=${(event: KeyboardEvent) => { this.handleKeyDown(event); }}
      >
        <header>
          <strong>${this.title}</strong>
          <button aria-label="Close" @click=${() => this.onCancel?.()}>${renderUiIcon("close")}</button>
        </header>
        ${this.searchable ? localizedTemplate("CommandPicker.template.c8c7219f", html)`<input placeholder="Search" .value=${this.query} @input=${(event: Event) => { this.handleSearchInput(event); }}>` : null}
        ${this.onSetDefault ? defaultPinHelp : nothing}
        <div class="options" tabindex="0">
          ${options.map((option, index) => {
            const pick = html`<button
              class=${index === this.selectedIndex ? "selected" : ""}
              aria-current=${index === this.selectedIndex ? "true" : nothing}
              ${scrollWhenSelected(index === this.selectedIndex, option.value)}
              @focus=${() => { this.selectedIndex = index; }}
              @click=${() => this.onPick?.(option.value)}
            >
              <span>${option.label}</span>
              ${option.description !== undefined && option.description !== "" ? html`<small>${option.description}</small>` : null}
            </button>`;
            return this.onSetDefault ? html`<div class="default-row">${pick}${defaultPin(option.label, option.value === this.defaultValue, this.defaultsLoading || this.defaultPending, () => { void this.setDefault(option.value); })}</div>` : pick;
          })}
          ${options.length === 0 ? localizedTemplate("CommandPicker.no_matching_options.d4a7964c", html)`<div class="empty">No matching options</div>` : null}
        </div>
      </modal-surface>
    `;
  }

  private async setDefault(value: string): Promise<void> {
    if (!this.onSetDefault || this.defaultsLoading || this.defaultPending) return;
    this.defaultPending = true;
    try {
      await this.onSetDefault(value);
    } catch (error: unknown) {
      // Hosts own user-facing errors; keep unexpected callback rejections observable.
      console.warn(t("CommandPicker.failed_to_set_default_option.de894d10"), error);
    } finally {
      this.defaultPending = false;
    }
  }

  override firstUpdated() {
    this.selectInitialValue();
  }

  private selectInitialValue(): void {
    if (this.selectedValue === undefined) return;
    const index = this.filteredOptions().findIndex((option) => option.value === this.selectedValue);
    if (index >= 0) this.selectedIndex = index;
  }

  private handleSearchInput(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.query = event.target.value;
      this.selectedIndex = 0;
    }
  }

  private filteredOptions(): CommandOption[] {
    const query = this.query.trim().toLowerCase();
    if (query === "") return this.options;
    return this.options.filter((option) => `${option.label} ${option.description ?? ""} ${option.value}`.toLowerCase().includes(query));
  }

  // Escape and backdrop presses are owned by the modal surface (routed to
  // `onCancel`). Search and list-container keys retain the broadened option
  // navigation idiom, while focused native buttons keep their own semantics.
  private handleKeyDown(event: KeyboardEvent) {
    if (keyboardEventOriginatesFromNativeActivationControl(event)) return;
    const options = this.filteredOptions();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (options.length > 0) this.selectedIndex = (this.selectedIndex + 1) % options.length;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (options.length > 0) this.selectedIndex = (this.selectedIndex - 1 + options.length) % options.length;
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = options[this.selectedIndex];
      if (option) this.onPick?.(option.value);
    }
  }

  static override styles = [css`
    :host { position: fixed; inset: 0; z-index: 10; color: var(--pi-text); font: 400 13px/18px var(--pi-font-family, system-ui, sans-serif); }
    modal-surface { --modal-surface-width: min(720px, calc(100vw - 40px)); --modal-surface-max-height: min(640px, calc(100% - 40px)); }
    header { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 0; }
    .options { min-height: 0; overflow: auto; outline: none; padding: 4px 6px 6px; }
    button { border: 0; border-radius: 6px; background: transparent; color: var(--pi-text); font: inherit; cursor: pointer; }
    header button { min-width: 30px; min-height: 30px; line-height: 20px; font-size: 20px; color: var(--pi-muted); }
    input { margin: 10px 12px; border: 1px solid var(--pi-border); border-radius: 8px; background: var(--pi-bg); color: var(--pi-text); font: var(--pi-control-font-size, 14px)/1.428571 var(--pi-control-font-family, system-ui, sans-serif); padding: 8px 10px; outline: none; }
    input:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 1px; }
    .options button { display: block; width: 100%; padding: 10px 12px; border-bottom: 0; text-align: left; }
    .options button.selected, .options button:hover { background: var(--pi-selection-bg); }
    small { display: block; margin-top: 4px; color: var(--pi-muted); }
    .empty { padding: 24px; color: var(--pi-muted); text-align: center; }
    button:not(:disabled):not(.selected):hover { background: var(--pi-surface-hover); }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: -2px; }
    header strong { font-size: 14px; line-height: 20px; }
    strong { font-weight: 500; }
    small { font-size: 12px; line-height: 16px; }
    @media (max-width: 680px), (pointer: coarse) {
      button { min-height: 44px; }
      header button { min-width: 44px; }
    }
  `, defaultPinStyles];
}
