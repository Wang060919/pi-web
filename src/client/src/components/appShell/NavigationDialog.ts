import { localizedTemplate, localizedText, t } from "../../../../shared/i18n";
import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { paletteStyles } from "../paletteStyles";
import { scrollWhenSelected } from "../scrollWhenSelected";
import { pinnedNavigationTabs, toggleNavigationPin, type NavigationPreferences } from "../../navigationPreferences";
import type { AppMobileMainTab } from "./AppMobileMainTabs";
import { ModalSurface } from "../ModalSurface";
import { deepActiveElement } from "../modalLayerRegistry";

@customElement("navigation-dialog")
export class NavigationDialog extends LitElement {
  @property({ attribute: false }) tabs: AppMobileMainTab[] = [];
  // Layout/search visibility must not narrow implicit-all pin edits.
  @property({ attribute: false }) pinUniverse?: readonly string[];
  @property({ attribute: false }) preferences: NavigationPreferences = { pinnedIds: [], mobileCollapsed: false };
  @property({ attribute: false }) selectedTab?: AppMobileMainTab["id"];
  @property({ attribute: false }) onSelect?: (id: AppMobileMainTab["id"]) => void;
  @property({ attribute: false }) onPreferencesChange?: (preferences: NavigationPreferences) => void;
  @property({ attribute: false }) onClose?: () => void;

  @state() private query = "";
  @state() private selectedIndex = 0;
  private focusAfterReorder: HTMLButtonElement | undefined;

  private filteredTabs(tabs = this.tabs, preferences = this.preferences) {
    const query = this.query.trim().toLowerCase();
    const matching = tabs.filter((tab) => `${tab.label} ${tab.id}`.toLowerCase().includes(query));
    const pinnedIds = this.pinnedTabIds(tabs, preferences);
    return [...matching.filter((tab) => pinnedIds.has(tab.id)), ...matching.filter((tab) => !pinnedIds.has(tab.id))];
  }

  private pinnedTabIds(tabs = this.tabs, preferences = this.preferences): Set<string> {
    const universe = (this.pinUniverse ?? tabs.map((tab) => tab.id)).map((id) => ({ id }));
    const useDefaultPins = preferences.useDefaultPins === true;
    return new Set([
      ...pinnedNavigationTabs(universe, preferences.pinnedIds, useDefaultPins),
      ...pinnedNavigationTabs(tabs, preferences.pinnedIds, useDefaultPins),
    ].map((tab) => tab.id));
  }

  private changePins(pinnedIds: string[]): void {
    this.onPreferencesChange?.({
      ...this.preferences,
      ...(this.preferences.useDefaultPins === true ? { useDefaultPins: false } : {}),
      pinnedIds,
    });
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    const changedProperties: ReadonlyMap<PropertyKey, unknown> = changed;
    if (changed.has("selectedTab")) {
      this.selectedIndex = Math.max(0, this.filteredTabs().findIndex((tab) => tab.id === this.selectedTab));
    } else if (!changedProperties.has("query") && (changed.has("tabs") || changed.has("preferences"))) {
      const previousTabs = changed.has("tabs") ? changed.get("tabs") ?? [] : this.tabs;
      const previousPreferences = changed.has("preferences") ? changed.get("preferences") ?? this.preferences : this.preferences;
      const selectedId = this.filteredTabs(previousTabs, previousPreferences)[this.selectedIndex]?.id;
      const index = this.filteredTabs().findIndex((tab) => tab.id === selectedId);
      if (index >= 0) this.selectedIndex = index;
    }
    if (this.isConnected && (changed.has("tabs") || changed.has("preferences"))) {
      const focused = deepActiveElement(this.ownerDocument);
      if (focused instanceof HTMLButtonElement && this.renderRoot.contains(focused) && focused.closest(".destination") !== null) this.focusAfterReorder = focused;
    }
    this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.filteredTabs().length - 1));
  }

  protected override updated(): void {
    const target = this.focusAfterReorder;
    this.focusAfterReorder = undefined;
    if (!this.isConnected) return;
    const surface = this.renderRoot.querySelector("modal-surface");
    if (target?.isConnected === true && surface instanceof ModalSurface) surface.focusDialog(target);
  }

  private select(tab: AppMobileMainTab) {
    this.onSelect?.(tab.id);
    this.onClose?.();
  }

  override render() {
    const tabs = this.filteredTabs();
    const pinnedIds = this.pinnedTabIds();
    return html`
      <modal-surface .label=${t("NavigationDialog.navigation.81259b67")} .initialFocus=${"input"} .onClose=${this.onClose} @keydown=${this.navigateDestinations}>
        <header>
          <input aria-label=${t("navigation.search")} aria-describedby="navigation-selection" placeholder=${t("navigation.search_placeholder")} .value=${this.query} @input=${(event: Event) => {
            if (event.target instanceof HTMLInputElement) {
              this.query = event.target.value;
              this.selectedIndex = 0;
            }
          }}>
          <button aria-label=${t("navigation.close")} title=${t("navigation.close")} @click=${this.onClose}>×</button>
        </header>
        <span id="navigation-selection" class="sr-only" role="status" aria-live="polite" aria-atomic="true">${tabs.length === 0 ? t("NavigationDialog.no_destinations_found.d366459a") : localizedText("NavigationDialog.of.0e166819")`${tabs[this.selectedIndex]?.label ?? ""}, ${String(this.selectedIndex + 1)} of ${String(tabs.length)}`}</span>
        <h2>${t("NavigationDialog.navigation.81259b67")}</h2>
        <p>${t("navigation.description")}</p>
        <nav class="options" aria-label=${t("navigation.destinations")}>
          ${tabs.length === 0 ? localizedTemplate("NavigationDialog.no_destinations_found.afa3249e", html)`<div class="empty">No destinations found.</div>` : nothing}
          ${repeat(tabs, (tab) => tab.id, (tab, index) => html`
            ${index === 0 || pinnedIds.has(tab.id) !== pinnedIds.has(tabs[index - 1]?.id ?? "")
              ? html`<h3>${t(pinnedIds.has(tab.id) ? "navigation.pinned" : "navigation.more_tools")}</h3>` : nothing}
            <div class="destination">
              <button class=${`destination-button ${index === this.selectedIndex ? "selected" : ""}`} aria-current=${tab.id === this.selectedTab ? "page" : nothing} aria-pressed=${String(tab.id === this.selectedTab)} ${scrollWhenSelected(index === this.selectedIndex, tab.id)} @focus=${() => { this.selectedIndex = index; }} @click=${() => { this.select(tab); }}>${tab.label}</button>
              <button type="button" class="pin-button" aria-label=${localizedText("NavigationDialog.pin.e4baae6b")`Pin ${tab.label}`} title=${pinnedIds.has(tab.id) ? localizedText("NavigationDialog.unpin.55006b08")`Unpin ${tab.label}` : localizedText("NavigationDialog.pin.9bce8597")`Pin ${tab.label}`} aria-pressed=${String(pinnedIds.has(tab.id))} @click=${() => {
                this.changePins(toggleNavigationPin(tab.id, this.preferences.useDefaultPins === true ? [...pinnedIds] : this.preferences.pinnedIds, this.pinUniverse ?? this.tabs.map((item) => item.id)));
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill=${pinnedIds.has(tab.id) ? "currentColor" : "none"} stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 3h8l-1 7 4 4v2H5v-2l4-4-1-7Z"></path><path d="M12 16v6"></path>
                </svg>
              </button>
            </div>
          `)}
        </nav>
        <footer>
          <div class="tab-presets">
            <button type="button" aria-pressed=${String(this.preferences.useDefaultPins !== true && this.preferences.pinnedIds.length === 0)} @click=${() => { this.changePins([]); }}>${t("navigation.show_all_tabs")}</button>
            <button type="button" aria-pressed=${String(this.preferences.useDefaultPins === true)} @click=${() => { this.onPreferencesChange?.({ ...this.preferences, pinnedIds: [], useDefaultPins: true }); }}>${t("navigation.default_tabs")}</button>
          </div>
          <div class="mobile-navigation" role="group" aria-label=${t("navigation.mobile")}>
            <span>${t("navigation.mobile")}</span>
            <div class="toggle-options">
              <button type="button" aria-pressed=${String(!this.preferences.mobileCollapsed)} @click=${() => {
                this.onPreferencesChange?.({ ...this.preferences, mobileCollapsed: false });
              }}>${t("navigation.expanded")}</button>
              <button type="button" aria-pressed=${String(this.preferences.mobileCollapsed)} @click=${() => {
                this.onPreferencesChange?.({ ...this.preferences, mobileCollapsed: true });
              }}>${t("navigation.collapsed")}</button>
            </div>
          </div>
        </footer>
      </modal-surface>
    `;
  }

  private readonly navigateDestinations = (event: KeyboardEvent): void => {
    if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      const tabs = this.filteredTabs();
      switch (event.key) {
        case "ArrowDown": this.selectedIndex = tabs.length > 0 ? (this.selectedIndex + 1) % tabs.length : 0; break;
        case "ArrowUp": this.selectedIndex = tabs.length > 0 ? (this.selectedIndex + tabs.length - 1) % tabs.length : 0; break;
        case "Home": this.selectedIndex = 0; break;
        case "End": this.selectedIndex = Math.max(0, tabs.length - 1); break;
        case "Enter": {
          const tab = tabs[this.selectedIndex];
          if (tab !== undefined) this.select(tab);
          break;
        }
        default: return;
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!(target instanceof HTMLButtonElement)) return;
    const selector = target.classList.contains("pin-button") ? ".pin-button" : ".destination-button";
    const buttons = [...this.renderRoot.querySelectorAll<HTMLButtonElement>(selector)];
    const index = buttons.indexOf(target);
    if (index < 0) return;
    let next: number;
    switch (event.key) {
      case "ArrowDown": next = (index + 1) % buttons.length; break;
      case "ArrowUp": next = (index + buttons.length - 1) % buttons.length; break;
      case "Home": next = 0; break;
      case "End": next = buttons.length - 1; break;
      default: return;
    }
    event.preventDefault();
    event.stopPropagation();
    buttons[next]?.focus();
    buttons[next]?.scrollIntoView({ block: "nearest" });
  };

  static override styles = [paletteStyles, css`
    :host { z-index: 30; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    header, footer { flex: 0 0 auto; }
    .destination, footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    h2 { margin: 0; padding: 12px 12px 4px; font-size: 14px; line-height: 20px; font-weight: 500; }
    h3 { margin: 0; padding: 10px 12px 4px; color: var(--pi-muted); font-size: 12px; line-height: 16px; font-weight: 400; }
    p { margin: 0; padding: 0 12px 12px; color: var(--pi-muted); font-size: 12px; flex: 0 0 auto; }
    nav { overscroll-behavior: contain; }
    .destination { border-bottom: 0; gap: 0; }
    .destination-button { flex: 1; min-width: 0; overflow-wrap: anywhere; text-align: left; padding: 10px 12px; font: inherit; font-weight: 500; }
    .destination-button.selected, .destination-button:hover { background: var(--pi-selection-bg); }
    .pin-button { display: inline-flex; align-items: center; justify-content: center; padding: 10px 12px; }
    .pin-button[aria-pressed="true"] svg { color: var(--pi-text-secondary); }
    footer { padding: 12px; flex-wrap: wrap; border-top: 0; }
    .mobile-navigation { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 12px; }
    .toggle-options, .tab-presets { display: inline-flex; gap: 4px; }
    .toggle-options button { font-size: inherit; padding: 5px 7px; }
    footer button { border: 0; border-radius: 6px; background: transparent; padding: 7px 9px; }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    footer button[aria-pressed="true"] { background: var(--pi-selection-bg); }
  `];
}
