import { renderUiIcon } from "./uiIcons";
import { localizedText, t } from "../../../shared/i18n";
import { css, html, LitElement, type PropertyValues, type TemplateResult } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { customElement, property, state } from "lit/decorators.js";
import type { AppAction } from "../actions";
import { configApi, piPackagesApi, pluginsApi, type Machine, type MachineRuntime, type PiPackageMutationResponse, type PiPackageScope, type PiPackagesResponse, type PiWebConfigResponse, type PiWebConfigValues, type PiWebPluginsResponse } from "../api";
import { type SettingsSection } from "../settingsRoute";
import "./settings/SettingsModelsPanel";
import "./settings/SettingsMcpPanel";
import "./settings/SettingsSkillsPanel";
import "./ModalSurface";
import type { ModalSurface } from "./ModalSurface";
import { settingsTargetStyles } from "./settings/settingsDesignStyles";
import { findSettingsElement, searchSettings, settingsSearchItems, type SettingsSearchItem } from "./settings/settingsSearch";
import "./settings/SettingsGeneralPanel";
import "./settings/SettingsPreferencesPanel";
import "./settings/SettingsThemePanel";
import "./settings/SettingsChatTextPanel";
import { DEFAULT_CHAT_TEXT_SIZE, type ChatTextSize } from "../chatTextSize";
import "./settings/SettingsLanguagePanel";
import type { QualifiedThemeContribution } from "../plugins/types";
import { DEFAULT_THEME_PREFERENCE, type ThemePreference } from "../theme";
import "./settings/SettingsSessiondPanel";
import "./settings/SettingsPackagesPanel";
import "./settings/SettingsPluginsPanel";
import "./settings/SettingsShortcutsPanel";
import { friendlyPiPackageErrorMessage, piPackageMutationFollowUpMessage, piPackagesResponseAfterMutation, piPackageTargetLabel, shouldRefreshGatewayPluginsAfterPiPackageMutation, type PiPackageOperationState, type PiPackageTargetContext } from "./settings/piPackageSettings";
import { loadGatewaySettingsData, loadPiPackagesData } from "./settings/settingsDataLoading";
import { mergeSelectedMachineAccessConfig } from "./settings/settingsMachineAccessConfig";
import { friendlySelectedMachineSettingsErrorMessage, isSelectedMachineSettingsUnsupported, pluginLifecycleSupport, selectedMachineSettingsSupportKey, settingsMachineTarget, settingsMachineTargetLabel, type PluginLifecycleSupport, type SettingsMachineTarget } from "./settings/settingsMachineTarget";
import { mergeSelectedMachinePluginConfig, pluginEnabledConfigPatch } from "./settings/settingsPluginConfig";
import { mergeSelectedMachineSessiondConfig } from "./settings/settingsSessiondConfig";

@customElement("settings-dialog")
export class SettingsDialog extends LitElement {
  @property() projectId: string | undefined;
  @property() workspaceId: string | undefined;
  @property({ attribute: false }) onModelsSaved?: () => void | Promise<void>;
  @property({ attribute: false }) section: SettingsSection = "general";
  @property({ attribute: false }) actions: AppAction[] = [];
  @property({ attribute: false }) themes: readonly QualifiedThemeContribution[] = [];
  @property({ attribute: false }) themePreference: ThemePreference = DEFAULT_THEME_PREFERENCE;
  @property() activeThemeId = "";
  @property({ type: Boolean }) hasLocalThemeOverride = false;
  @property({ attribute: false }) onUseLocalTheme?: (preference: ThemePreference) => void;
  @property({ attribute: false }) onUseDefaultTheme?: () => void;
  @property() chatTextSize: ChatTextSize = DEFAULT_CHAT_TEXT_SIZE;
  @property({ attribute: false }) onChatTextSizeChange?: (size: ChatTextSize) => void;
  @property({ attribute: false }) machine: Machine | undefined;
  @property({ attribute: false }) machineRuntime: MachineRuntime | undefined;
  @property({ attribute: false }) onNavigate?: (section: SettingsSection) => void;
  @property({ attribute: false }) onClose?: () => void;
  @property({ attribute: false }) onConfigSaved?: (config: PiWebConfigValues) => void;
  @property({ attribute: false }) onRefreshMachineRuntime?: (machineId: string) => void | Promise<void>;
  @state() private configResponse: PiWebConfigResponse | undefined;
  @state() private accessConfigResponse: PiWebConfigResponse | undefined;
  @state() private sessiondConfigResponse: PiWebConfigResponse | undefined;
  @state() private pluginsResponse: PiWebPluginsResponse | undefined;
  @state() private selectedPluginConfigResponse: PiWebConfigResponse | undefined;
  @state() private selectedPluginsResponse: PiWebPluginsResponse | undefined;
  @state() private packagesResponse: PiPackagesResponse | undefined;
  @state() private loading = true;
  @state() private accessLoading = true;
  @state() private sessiondLoading = true;
  @state() private pluginLoading = true;
  @state() private packageLoading = true;
  @state() private saving = false;
  @state() private packageOperation: PiPackageOperationState | undefined;
  @state() private error = "";
  @state() private accessError = "";
  @state() private sessiondError = "";
  @state() private pluginError = "";
  @state() private packageError = "";
  @state() private savedMessage = "";
  @state() private packageMessage = "";
  @state() private sectionQuery = "";
  @state() private searchIndex = 0;
  private pendingSearch: SettingsSearchItem | undefined;
  private highlightedSetting: HTMLElement | undefined;
  private readonly visitedSections = new Set<SettingsSection>();
  private readonly onBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (this.hasUnsavedChanges()) { event.preventDefault(); }
  };

  private hasUnsavedChanges(): boolean {
    return Array.from(this.renderRoot.querySelectorAll<HTMLElement & { hasUnsavedChanges?: boolean }>(".settings-section > *")).some((panel) => panel.hasUnsavedChanges === true);
  }

  confirmDiscardChanges(): boolean {
    return !this.hasUnsavedChanges() || window.confirm(t("settingsDraft.discard"));
  }

  private requestClose(): void {
    if (!this.confirmDiscardChanges()) return;
    this.onClose?.();
  }

  private savedMessageTimer: number | undefined;
  private loadRequestSeq = 0;
  private accessLoadRequestSeq = 0;
  private sessiondLoadRequestSeq = 0;
  private pluginLoadRequestSeq = 0;
  private packageLoadRequestSeq = 0;
  private packageMutationSeq = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("beforeunload", this.onBeforeUnload);
    void this.loadConfig();
    void this.loadAccessConfigForTarget();
    void this.reloadSessiondState();
    void this.loadPluginsForTarget();
    void this.loadPackagesForTarget();
  }

  override disconnectedCallback(): void {
    window.removeEventListener("beforeunload", this.onBeforeUnload);
    if (this.savedMessageTimer !== undefined) window.clearTimeout(this.savedMessageTimer);
    this.savedMessageTimer = undefined;
    super.disconnectedCallback();
  }

  protected override updated(changed: PropertyValues<this>): void {
    void this.revealSearchTarget();
    if (changed.has("section")) this.renderRoot.querySelector<HTMLElement>('.mobile-tabs [aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
    const currentTarget = this.settingsTarget();
    if (changed.has("machine")) {
      const previousTarget = settingsMachineTarget(changed.get("machine"));
      if (previousTarget.id !== currentTarget.id) {
        this.resetAccessStateForTargetChange();
        if (this.isConnected) void this.loadAccessConfigForTarget(currentTarget);
        this.resetSessiondStateForTargetChange();
        if (this.isConnected) void this.loadSessiondConfigForTarget(currentTarget);
        this.resetPluginStateForTargetChange();
        if (this.isConnected) void this.loadPluginsForTarget(currentTarget);
        this.resetPackageStateForTargetChange();
        if (this.isConnected) void this.loadPackagesForTarget(currentTarget);
        return;
      }
    }

    if (!changed.has("machineRuntime")) return;
    if (!this.pluginLifecycleSupportNeedsReload(changed.get("machineRuntime"), currentTarget)) return;
    this.resetPluginStateForTargetChange();
    if (this.isConnected) void this.loadPluginsForTarget(currentTarget);
  }

  override render(): TemplateResult {
    this.visitedSections.add(this.section);
    const groups = [
      { label: t("settingsLayout.daily"), sections: ["general", "shortcuts"] as const },
      { label: t("settingsLayout.capabilities"), sections: ["models", "skills", "mcp", "packages", "plugins"] as const },
      { label: t("settingsLayout.administration"), sections: ["connection", "sessiond"] as const },
    ];
    const results = this.searchResults();
    return html`
      <modal-surface .onClose=${() => { this.requestClose(); }} .label=${t("SettingsDialog.pi_web_settings.5d890f4d")}>
        <div class="settings-shell" @keydown=${this.handleSettingsKeydown}>
        <header class="settings-header">
          <div>
            <h1>${t("settingsLayout.title")}</h1>
          </div>
          <button class="close-button" title=${t("settingsLayout.close")} aria-label=${t("settingsLayout.close")} @click=${() => { this.requestClose(); }}>${renderUiIcon("close")}</button>
        </header>
        <div class="settings-body">
          <aside class="settings-sidebar">
            <div class="settings-search-wrap">
              <label class="settings-search">${renderUiIcon("search")}<input type="search" role="combobox" aria-autocomplete="list" aria-expanded=${String(this.sectionQuery.trim() !== "")} aria-controls="settings-search-results" aria-activedescendant=${results[this.searchIndex] === undefined ? undefined : `settings-hit-${String(this.searchIndex)}`} aria-label=${t("settingsLayout.search")} placeholder=${t("settingsLayout.search")} .value=${this.sectionQuery} @input=${(event: Event) => { if (event.target instanceof HTMLInputElement) { this.sectionQuery = event.target.value; this.searchIndex = 0; } }}></label>
              ${this.sectionQuery.trim() === "" ? null : html`<div class="settings-search-results" id="settings-search-results" role="listbox" aria-label=${t("settingsSearch.results")}>
                ${results.length === 0 ? html`<p class="no-sections" role="status">${t("settingsLayout.noResults")}</p>` : results.map((item, index) => html`<button type="button" role="option" id=${`settings-hit-${String(index)}`} aria-selected=${String(index === this.searchIndex)} @mousedown=${(event: MouseEvent) => { event.preventDefault(); }} @click=${() => { this.selectSearchResult(item); }}><span>${renderUiIcon(settingsSectionIcon(item.section))}<strong>${item.label}</strong></span><small>${settingsSectionLabel(item.section)}</small></button>`)}
              </div>`}
            </div>
            <nav class="settings-nav" aria-label=${t("settingsLayout.sections")}>
              ${groups.map((group) => html`<div class="nav-group"><h2>${group.label}</h2>${group.sections.map((section) => this.renderNavButton(section, settingsSectionLabel(section), section === "general" ? t("settingsLayout.appearanceLanguage") : section === "connection" ? t("SettingsDialog.gateway_selected_machine.97827f75") : section === "shortcuts" ? t("SettingsDialog.gateway_shortcuts.e71cb404") : t("SettingsDialog.selected_machine.60ce1c88")))}</div>`)}
            </nav>
            <nav class="mobile-tabs" role="tablist" aria-label=${t("settingsLayout.sections")} @keydown=${this.handleMobileTabs}>
              ${groups.flatMap((group) => group.sections).map((section) => html`<button type="button" role="tab" aria-controls=${`settings-panel-${section}`} aria-selected=${String(section === this.section)} tabindex=${section === this.section ? 0 : -1} @click=${() => { this.navigate(section); }}>${renderUiIcon(settingsSectionIcon(section))}${settingsSectionLabel(section)}</button>`)}
            </nav>
          </aside>
          <main class="settings-content">
            ${keyed(JSON.stringify([this.settingsTarget().id, this.projectId, this.workspaceId]), html`${Array.from(this.visitedSections, (section) => html`<div class="settings-section" id=${`settings-panel-${section}`} role="tabpanel" aria-label=${settingsSectionLabel(section)} ?hidden=${section !== this.section}>${this.renderActiveSection(section)}</div>`)}`)}
          </main>
        </div>
        </div>
      </modal-surface>
    `;
  }

  private searchResults(): SettingsSearchItem[] {
    const items = settingsSearchItems();
    items.push(...this.actions.map((action) => ({ id: `shortcut-${action.id}`, section: "shortcuts" as const, label: action.title, keywords: `${action.id} ${action.description ?? ""} shortcuts 快捷键`, selector: `[data-setting-id="shortcut-${encodeURIComponent(action.id)}"]` })));
    items.push(...(this.selectedPluginsResponse?.plugins ?? []).map((plugin) => ({ id: `plugin-${plugin.id}`, section: "plugins" as const, label: plugin.id, keywords: "plugin extension 插件 扩展", selector: `[data-setting-id="plugin-${encodeURIComponent(plugin.id)}"]` })));
    return searchSettings(items, this.sectionQuery);
  }

  private readonly handleSettingsKeydown = (event: KeyboardEvent): void => {
    if (event.isComposing || event.defaultPrevented) return;
    const surface = event.composedPath().find((node) => node instanceof HTMLElement && node.localName === "modal-surface");
    if (surface !== undefined && surface !== this.renderRoot.querySelector("modal-surface")) return;
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "f") {
      event.preventDefault(); event.stopPropagation();
      const input = this.renderRoot.querySelector<HTMLInputElement>(".settings-search input");
      input?.focus(); input?.select(); return;
    }
    if (this.sectionQuery.trim() === "") return;
    if (event.key === "Escape") {
      event.preventDefault(); event.stopPropagation(); this.sectionQuery = ""; this.searchIndex = 0; return;
    }
    if (!event.composedPath().some((node) => node instanceof HTMLInputElement && node.closest(".settings-search") !== null)) return;
    const results = this.searchResults();
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && results.length > 0) {
      event.preventDefault(); event.stopPropagation();
      this.searchIndex = (this.searchIndex + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
      void this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement>(`#settings-hit-${String(this.searchIndex)}`)?.scrollIntoView({ block: "nearest" }));
    } else if (event.key === "Enter" && results[this.searchIndex] !== undefined) {
      event.preventDefault(); event.stopPropagation(); const selected = results[this.searchIndex]; if (selected !== undefined) this.selectSearchResult(selected);
    }
  };

  private selectSearchResult(item: SettingsSearchItem): void {
    this.pendingSearch = item;
    this.sectionQuery = "";
    this.searchIndex = 0;
    this.navigate(item.section);
  }

  private searchTargetCurrent(item: SettingsSearchItem): boolean { return this.isConnected && this.section === item.section; }

  private async revealSearchTarget(): Promise<void> {
    const item = this.pendingSearch;
    if (item?.section !== this.section) return;
    const panel = this.renderRoot.querySelector<HTMLElement>(".settings-section:not([hidden])");
    if (panel === null) return;
    const target = item.selector === undefined ? panel.firstElementChild : await findSettingsElement(panel, item.selector);
    if (!(target instanceof HTMLElement) || this.pendingSearch !== item || this.section !== item.section || !this.isConnected) return;
    this.pendingSearch = undefined;
    this.highlightedSetting?.removeAttribute("data-search-highlight");
    this.highlightedSetting = target;
    target.setAttribute("data-search-highlight", "");
    target.scrollIntoView({ block: "center", behavior: "auto" });
    const control = await findSettingsElement(target.shadowRoot ?? target, 'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
    if (!this.searchTargetCurrent(item)) return;
    if (control === undefined && !target.hasAttribute("tabindex")) target.tabIndex = -1;
    this.renderRoot.querySelector<ModalSurface>("modal-surface")?.focusDialog(control ?? target);
  }

  private readonly handleMobileTabs = (event: KeyboardEvent): void => {
    if (event.isComposing || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = [...this.renderRoot.querySelectorAll<HTMLButtonElement>('.mobile-tabs [role="tab"]')];
    const current = tabs.findIndex((tab) => event.composedPath().includes(tab));
    if (current < 0) return;
    event.preventDefault();
    const index = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[index]?.focus(); tabs[index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  private renderActiveSection(section: SettingsSection): TemplateResult {
    if (section === "skills") return html`<settings-skills-panel .machineId=${this.settingsTarget().id} .projectId=${this.projectId} .workspaceId=${this.workspaceId}></settings-skills-panel>`;
    if (section === "models") return html`<settings-models-panel .machineId=${this.settingsTarget().id} .targetLabel=${settingsMachineTargetLabel(this.settingsTarget())} .onConfigurationSaved=${this.onModelsSaved}></settings-models-panel>`;
    if (section === "mcp") return html`<settings-mcp-panel .machineId=${this.settingsTarget().id} .projectId=${this.projectId} .workspaceId=${this.workspaceId}></settings-mcp-panel>`;
    // Keep the section -> panel routing in sync with the public
    // `activeSettingsPanelTag` seam below, which tests assert against instead of
    // scraping this template's markup.
    if (section === "sessiond") {
      return html`
        <settings-sessiond-panel
          .configResponse=${this.sessiondConfigResponse}
          .loading=${this.sessiondLoading}
          .saving=${this.saving}
          .error=${this.sessiondError}
          .savedMessage=${this.savedMessage}
          .targetLabel=${settingsMachineTargetLabel(this.settingsTarget())}
          .onReload=${() => this.reloadSessiondState()}
          .onSave=${(config: PiWebConfigValues) => this.saveSessiondConfig(config)}
        ></settings-sessiond-panel>
      `;
    }
    if (section === "shortcuts") {
      return html`
        <settings-shortcuts-panel
          .active=${section === this.section}
          .actions=${this.actions}
          .configResponse=${this.configResponse}
          .loading=${this.loading}
          .saving=${this.saving}
          .error=${this.error}
          .savedMessage=${this.savedMessage}
          .onReload=${() => this.loadConfig()}
          .onSave=${(config: PiWebConfigValues) => this.saveConfig(config)}
        ></settings-shortcuts-panel>
      `;
    }
    if (section === "packages") {
      return html`
        <settings-packages-panel
          .packagesResponse=${this.packagesResponse}
          .targetMachine=${this.packageTarget()}
          .loading=${this.packageLoading}
          .operation=${this.packageOperation}
          .error=${this.packageError}
          .operationMessage=${this.packageMessage}
          .onReload=${() => this.loadPackagesForTarget()}
          .onInstallPackage=${(source: string) => this.installPiPackage(source)}
          .onRemovePackage=${(source: string, scope: PiPackageScope) => this.removePiPackage(source, scope)}
          .onUpdatePackage=${(source?: string) => this.updatePiPackage(source)}
        ></settings-packages-panel>
      `;
    }
    if (section === "plugins") {
      return html`
        <settings-plugins-panel
          .configResponse=${this.selectedPluginConfigResponse}
          .pluginsResponse=${this.selectedPluginsResponse}
          .loading=${this.pluginLoading}
          .saving=${this.saving}
          .recoveryCommandsSupported=${this.pluginLifecycleSupport().state === "supported"}
          .error=${this.pluginError}
          .savedMessage=${this.savedMessage}
          .targetLabel=${settingsMachineTargetLabel(this.settingsTarget())}
          .onReload=${() => this.loadPluginsForTarget()}
          .onTogglePlugin=${(pluginId: string, enabled: boolean) => this.togglePlugin(pluginId, enabled)}
        ></settings-plugins-panel>
      `;
    }
    if (section === "general") return html`
      <settings-preferences-panel .error=${this.error} .savedMessage=${this.savedMessage}>
        <settings-language-panel></settings-language-panel>
        <settings-theme-panel
          .themes=${this.themes}
          .preference=${this.themePreference}
          .defaultPreference=${this.configResponse?.effectiveConfig.defaultTheme ?? DEFAULT_THEME_PREFERENCE}
          .activeThemeId=${this.activeThemeId}
          .hasLocalOverride=${this.hasLocalThemeOverride}
          .loading=${this.loading || this.configResponse === undefined}
          .saving=${this.saving}
          .onUseLocal=${this.onUseLocalTheme}
          .onUseDefault=${this.onUseDefaultTheme}
          .onSetDefault=${(preference: ThemePreference) => this.saveDefaultTheme(preference)}
        ></settings-theme-panel>
        <settings-chat-text-panel .value=${this.chatTextSize} .onChange=${this.onChatTextSizeChange}></settings-chat-text-panel>
      </settings-preferences-panel>`;
    return html`
      <settings-general-panel
        .configResponse=${this.configResponse}
        .machineConfigResponse=${this.accessConfigResponse}
        .loading=${this.loading}
        .machineLoading=${this.accessLoading}
        .saving=${this.saving}
        .error=${this.error}
        .machineError=${this.accessError}
        .savedMessage=${this.savedMessage}
        .targetLabel=${settingsMachineTargetLabel(this.settingsTarget())}
        .onReload=${() => this.loadConfig()}
        .onReloadMachine=${() => this.loadAccessConfigForTarget()}
        .onSave=${(config: PiWebConfigValues) => this.saveConfig(config)}
        .onSaveMachineConfig=${(config: PiWebConfigValues) => this.saveMachineAccessConfig(config)}
      ></settings-general-panel>
    `;
  }

  private renderNavButton(section: SettingsSection, label: string, detail: string): TemplateResult {
    const selected = this.section === section;
    return html`
      <button class=${selected ? "selected" : ""} aria-current=${selected ? "page" : "false"} @click=${() => { this.navigate(section); }}>
        ${renderUiIcon(settingsSectionIcon(section))}<span><strong>${label}</strong><small>${detail}</small></span>
      </button>
    `;
  }

  private navigate(section: SettingsSection): void {
    this.onNavigate?.(section);
  }

  private async loadConfig(): Promise<void> {
    const requestSeq = ++this.loadRequestSeq;
    this.loading = true;
    this.error = "";
    try {
      const result = await loadGatewaySettingsData({
        loadConfig: () => configApi.config(),
        loadPlugins: () => pluginsApi.plugins(),
      });
      if (!this.isCurrentLoad(requestSeq)) return;

      if (result.config !== undefined) {
        this.configResponse = result.config;
        this.onConfigSaved?.(result.config.effectiveConfig);
      }
      if (result.plugins !== undefined) this.pluginsResponse = result.plugins;
      this.error = result.error;
    } finally {
      if (this.isCurrentLoad(requestSeq)) this.loading = false;
    }
  }

  private async loadAccessConfigForTarget(target = this.settingsTarget()): Promise<void> {
    const requestSeq = ++this.accessLoadRequestSeq;
    this.accessLoading = true;
    this.accessError = "";
    try {
      const response = await configApi.config(target.id);
      if (!this.isCurrentAccessLoad(requestSeq, target)) return;
      this.accessConfigResponse = response;
    } catch (error) {
      if (this.isCurrentAccessLoad(requestSeq, target)) {
        this.accessError = localizedText("SettingsDialog.failed_to_load_file_access_upload_config.b5ad76ea")`Failed to load file access/upload config from ${settingsMachineTargetLabel(target)}: ${friendlySelectedMachineSettingsErrorMessage(errorMessage(error), target)}`;
      }
    } finally {
      if (this.isCurrentAccessLoad(requestSeq, target)) this.accessLoading = false;
    }
  }

  private async reloadSessiondState(target = this.settingsTarget()): Promise<void> {
    await Promise.all([
      this.loadSessiondConfigForTarget(target),
      this.onRefreshMachineRuntime?.(target.id),
    ]);
  }

  private async loadSessiondConfigForTarget(target = this.settingsTarget()): Promise<void> {
    const requestSeq = ++this.sessiondLoadRequestSeq;
    this.sessiondLoading = true;
    this.sessiondError = "";
    try {
      const response = await configApi.config(target.id);
      if (!this.isCurrentSessiondLoad(requestSeq, target)) return;
      this.sessiondConfigResponse = response;
    } catch (error) {
      if (this.isCurrentSessiondLoad(requestSeq, target)) {
        this.sessiondError = localizedText("SettingsDialog.failed_to_load_session_daemon_config_from.ae288701")`Failed to load session-daemon config from ${settingsMachineTargetLabel(target)}: ${friendlySelectedMachineSettingsErrorMessage(errorMessage(error), target)}`;
      }
    } finally {
      if (this.isCurrentSessiondLoad(requestSeq, target)) this.sessiondLoading = false;
    }
  }

  private async loadPluginsForTarget(target = this.settingsTarget()): Promise<void> {
    const requestSeq = ++this.pluginLoadRequestSeq;
    this.pluginLoading = true;
    this.pluginError = "";
    try {
      const lifecycleSupport = this.pluginLifecycleSupport(target);
      if (isSelectedMachineSettingsUnsupported(lifecycleSupport)) {
        try {
          const config = await configApi.config(target.id);
          if (!this.isCurrentPluginLoad(requestSeq, target)) return;
          this.selectedPluginConfigResponse = config;
          this.selectedPluginsResponse = undefined;
          this.pluginError = lifecycleSupport.message ?? localizedText("SettingsDialog.plugin_lifecycle_diagnostics_are_not_available_on.cf9cd176")`Plugin lifecycle diagnostics are not available on ${settingsMachineTargetLabel(target)}.`;
        } catch (error) {
          if (!this.isCurrentPluginLoad(requestSeq, target)) return;
          this.pluginError = localizedText("SettingsDialog.failed_to_load_pi_web_plugin_config.cc48ef42")`Failed to load PI WEB plugin config from ${settingsMachineTargetLabel(target)}: ${friendlySelectedMachineSettingsErrorMessage(errorMessage(error), target)}; ${lifecycleSupport.message ?? t("SettingsDialog.plugin_lifecycle_diagnostics_are_unsupported.d1c878a2")}`;
        }
        return;
      }

      const [config, plugins] = await Promise.allSettled([configApi.config(target.id), pluginsApi.plugins(target.id)]);
      if (!this.isCurrentPluginLoad(requestSeq, target)) return;

      const errors: string[] = [];
      if (config.status === "fulfilled") this.selectedPluginConfigResponse = config.value;
      else errors.push(localizedText("SettingsDialog.config.173e652a")`config: ${friendlySelectedMachineSettingsErrorMessage(errorMessage(config.reason), target)}`);

      if (plugins.status === "fulfilled") this.selectedPluginsResponse = plugins.value;
      else errors.push(localizedText("SettingsDialog.pi_web_plugins.409564f1")`PI WEB plugins: ${friendlySelectedMachineSettingsErrorMessage(errorMessage(plugins.reason), target)}`);

      this.pluginError = errors.length === 0 ? "" : localizedText("SettingsDialog.failed_to_load_pi_web_plugin_settings.b65c96a9")`Failed to load PI WEB plugin settings from ${settingsMachineTargetLabel(target)}: ${errors.join(t("SettingsDialog.template.d8c062e2"))}`;
    } finally {
      if (this.isCurrentPluginLoad(requestSeq, target)) this.pluginLoading = false;
    }
  }

  private async loadPackagesForTarget(target = this.packageTarget()): Promise<void> {
    const requestSeq = ++this.packageLoadRequestSeq;
    this.packageLoading = true;
    this.packageError = "";
    this.packageMessage = "";
    try {
      const result = await loadPiPackagesData(target, (targetId) => piPackagesApi.packages(targetId));
      if (!this.isCurrentPackageLoad(requestSeq, target)) return;

      this.packagesResponse = result.packagesResponse;
      this.packageError = result.error;
    } finally {
      if (this.isCurrentPackageLoad(requestSeq, target)) this.packageLoading = false;
    }
  }

  private async togglePlugin(pluginId: string, enabled: boolean): Promise<void> {
    if (this.saving) return;
    const target = this.settingsTarget();
    const lifecycleSupport = this.pluginLifecycleSupport(target);
    if (this.selectedPluginConfigResponse === undefined) {
      this.pluginError = localizedText("SettingsDialog.plugin_config_is_not_loaded_for_reload.50cfd48f")`Plugin config is not loaded for ${settingsMachineTargetLabel(target)}. Reload before changing plugin enablement.`;
      return;
    }
    const patch = pluginEnabledConfigPatch(this.selectedPluginConfigResponse.config, pluginId, enabled);
    this.saving = true;
    this.pluginError = "";
    this.savedMessage = "";
    try {
      const response = await configApi.saveConfig(patch, target.id);
      if (!this.isCurrentSettingsTarget(target)) return;
      this.selectedPluginConfigResponse = response;
      if (target.kind === "local" && this.configResponse !== undefined) {
        this.configResponse = mergeSelectedMachinePluginConfig(this.configResponse, response);
        this.onConfigSaved?.(this.configResponse.effectiveConfig);
      }
      let pluginRefreshError: string | undefined;
      if (isSelectedMachineSettingsUnsupported(lifecycleSupport)) {
        this.selectedPluginsResponse = undefined;
        pluginRefreshError = lifecycleSupport.message ?? localizedText("SettingsDialog.plugin_lifecycle_diagnostics_are_not_available_on.53c653ea")`Plugin lifecycle diagnostics are not available on ${settingsMachineTargetLabel(target)}.`;
      } else {
        pluginRefreshError = await this.refreshPluginsForTarget(target);
      }
      if (!this.isCurrentSettingsTarget(target)) return;
      if (pluginRefreshError !== undefined) this.pluginError = pluginRefreshError;
      this.showSavedMessage();
    } catch (error) {
      if (this.isCurrentSettingsTarget(target)) {
        this.pluginError = localizedText("SettingsDialog.failed_to_save_pi_web_plugin_config.5e227998")`Failed to save PI WEB plugin config on ${settingsMachineTargetLabel(target)}: ${friendlySelectedMachineSettingsErrorMessage(errorMessage(error), target)}`;
      }
    } finally {
      this.saving = false;
    }
  }

  private async saveConfig(config: PiWebConfigValues): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    this.error = "";
    this.savedMessage = "";
    try {
      const response = await configApi.saveConfig(config);
      this.configResponse = response;
      this.onConfigSaved?.(response.effectiveConfig);
      this.showSavedMessage();
    } catch (error) {
      this.error = localizedText("SettingsDialog.failed_to_save_config.cfd6a279")`Failed to save config: ${errorMessage(error)}`;
    } finally {
      this.saving = false;
    }
  }

  private async saveDefaultTheme(preference: ThemePreference): Promise<void> {
    if (this.saving) return;
    // Retire an older Reload result and read fresh gateway config so this
    // focused action does not replace other settings with the dialog's snapshot.
    this.loadRequestSeq += 1;
    this.loading = false;
    this.saving = true;
    this.error = "";
    this.savedMessage = "";
    try {
      const current = await configApi.config();
      const response = await configApi.saveConfig({ ...current.config, defaultTheme: preference });
      this.configResponse = response;
      this.onConfigSaved?.(response.effectiveConfig);
      this.showSavedMessage();
    } catch (error) {
      this.error = localizedText("SettingsDialog.failed_to_save_default_theme.2d52aa4e")`Failed to save default theme: ${errorMessage(error)}`;
    } finally {
      this.saving = false;
    }
  }

  private async saveMachineAccessConfig(config: PiWebConfigValues): Promise<void> {
    if (this.saving) return;
    const target = this.settingsTarget();
    this.saving = true;
    this.accessError = "";
    this.savedMessage = "";
    try {
      const response = await configApi.saveConfig(config, target.id);
      if (!this.isCurrentSettingsTarget(target)) return;
      this.accessConfigResponse = response;
      if (target.kind === "local" && this.configResponse !== undefined) {
        this.configResponse = mergeSelectedMachineAccessConfig(this.configResponse, response);
        this.onConfigSaved?.(this.configResponse.effectiveConfig);
      }
      this.showSavedMessage();
    } catch (error) {
      if (this.isCurrentSettingsTarget(target)) {
        this.accessError = localizedText("SettingsDialog.failed_to_save_file_access_upload_config.4a64399d")`Failed to save file access/upload config on ${settingsMachineTargetLabel(target)}: ${friendlySelectedMachineSettingsErrorMessage(errorMessage(error), target)}`;
      }
    } finally {
      this.saving = false;
    }
  }

  private async saveSessiondConfig(config: PiWebConfigValues): Promise<void> {
    if (this.saving) return;
    const target = this.settingsTarget();
    this.saving = true;
    this.sessiondError = "";
    this.savedMessage = "";
    try {
      const response = await configApi.saveConfig(config, target.id);
      if (!this.isCurrentSettingsTarget(target)) return;
      this.sessiondConfigResponse = response;
      if (target.kind === "local" && this.configResponse !== undefined) this.configResponse = mergeSelectedMachineSessiondConfig(this.configResponse, response);
      this.showSavedMessage();
    } catch (error) {
      if (this.isCurrentSettingsTarget(target)) {
        this.sessiondError = localizedText("SettingsDialog.failed_to_save_session_daemon_config_on.32c3c9dd")`Failed to save session-daemon config on ${settingsMachineTargetLabel(target)}: ${friendlySelectedMachineSettingsErrorMessage(errorMessage(error), target)}`;
      }
    } finally {
      this.saving = false;
    }
  }

  private async installPiPackage(source: string): Promise<void> {
    const target = this.packageTarget();
    await this.runPiPackageMutation({ kind: "install", source }, t("SettingsDialog.install_pi_package.b31b8385"), target, () => piPackagesApi.install(source, target.id));
  }

  private async removePiPackage(source: string, scope: PiPackageScope): Promise<void> {
    const target = this.packageTarget();
    await this.runPiPackageMutation({ kind: "remove", source }, t("SettingsDialog.remove_pi_package.fb3324ad"), target, () => piPackagesApi.remove(source, scope, target.id));
  }

  private async updatePiPackage(source?: string): Promise<void> {
    const target = this.packageTarget();
    await this.runPiPackageMutation(source === undefined ? { kind: "update-all" } : { kind: "update", source }, t("SettingsDialog.update_pi_packages.8b88516e"), target, () => piPackagesApi.update(source, target.id));
  }

  private async runPiPackageMutation(operation: PiPackageOperationState, label: string, target: PiPackageTargetContext, mutate: () => Promise<PiPackageMutationResponse>): Promise<void> {
    if (this.saving) throw new Error(t("SettingsDialog.a_settings_operation_is_already_running.dbe5efc0"));
    const requestSeq = ++this.packageMutationSeq;
    this.packageLoadRequestSeq += 1;
    this.packageLoading = false;
    this.saving = true;
    this.packageOperation = operation;
    this.packageError = "";
    this.packageMessage = "";
    try {
      const response = await mutate();
      if (!this.isCurrentPackageMutation(requestSeq, target)) return;
      this.packagesResponse = piPackagesResponseAfterMutation(response);
      const pluginRefreshError = shouldRefreshGatewayPluginsAfterPiPackageMutation(target) ? await this.refreshGatewayPlugins() : undefined;
      if (!this.isCurrentPackageMutation(requestSeq, target)) return;
      if (pluginRefreshError !== undefined) this.packageError = pluginRefreshError;
      this.packageMessage = piPackageMutationFollowUpMessage(response.action, target);
    } catch (error) {
      if (this.isCurrentPackageMutation(requestSeq, target)) this.packageError = localizedText("SettingsDialog.failed_to_on.48f2c37f")`Failed to ${label} on ${piPackageTargetLabel(target)}: ${friendlyPiPackageErrorMessage(errorMessage(error), target)}`;
      throw error;
    } finally {
      if (this.packageMutationSeq === requestSeq) {
        this.packageOperation = undefined;
        this.saving = false;
      }
    }
  }

  private async refreshGatewayPlugins(): Promise<string | undefined> {
    try {
      this.pluginsResponse = await pluginsApi.plugins();
      return undefined;
    } catch (error) {
      return localizedText("SettingsDialog.failed_to_refresh_gateway_pi_web_plugins.5439f935")`Failed to refresh gateway PI WEB plugins: ${errorMessage(error)}`;
    }
  }

  private async refreshPluginsForTarget(target: SettingsMachineTarget): Promise<string | undefined> {
    try {
      const response = await pluginsApi.plugins(target.id);
      if (this.isCurrentSettingsTarget(target)) this.selectedPluginsResponse = response;
      return undefined;
    } catch (error) {
      if (this.isCurrentSettingsTarget(target)) this.selectedPluginsResponse = undefined;
      return localizedText("SettingsDialog.config_saved_but_failed_to_refresh_pi.71254876")`Config saved, but failed to refresh PI WEB plugins from ${settingsMachineTargetLabel(target)}: ${friendlySelectedMachineSettingsErrorMessage(errorMessage(error), target)}`;
    }
  }

  private settingsTarget(): SettingsMachineTarget {
    return settingsMachineTarget(this.machine);
  }

  private packageTarget(): PiPackageTargetContext {
    return this.settingsTarget();
  }

  private pluginLifecycleSupport(target = this.settingsTarget()): PluginLifecycleSupport {
    return pluginLifecycleSupport(target, this.machineRuntime);
  }

  private pluginLifecycleSupportNeedsReload(previousRuntime: MachineRuntime | undefined, target: SettingsMachineTarget): boolean {
    const previousSupport = pluginLifecycleSupport(target, previousRuntime);
    const currentSupport = this.pluginLifecycleSupport(target);
    return selectedMachineSettingsSupportKey(previousSupport) !== selectedMachineSettingsSupportKey(currentSupport);
  }

  private isCurrentLoad(requestSeq: number): boolean {
    return requestSeq === this.loadRequestSeq;
  }

  private isCurrentAccessLoad(requestSeq: number, target: SettingsMachineTarget): boolean {
    return requestSeq === this.accessLoadRequestSeq && this.isCurrentSettingsTarget(target);
  }

  private isCurrentSessiondLoad(requestSeq: number, target: SettingsMachineTarget): boolean {
    return requestSeq === this.sessiondLoadRequestSeq && this.isCurrentSettingsTarget(target);
  }

  private isCurrentPluginLoad(requestSeq: number, target: SettingsMachineTarget): boolean {
    return requestSeq === this.pluginLoadRequestSeq && this.isCurrentSettingsTarget(target);
  }

  private isCurrentPackageLoad(requestSeq: number, target: PiPackageTargetContext): boolean {
    return requestSeq === this.packageLoadRequestSeq && this.isCurrentPackageTarget(target);
  }

  private isCurrentPackageMutation(requestSeq: number, target: PiPackageTargetContext): boolean {
    return requestSeq === this.packageMutationSeq && this.isCurrentPackageTarget(target);
  }

  private isCurrentPackageTarget(target: PiPackageTargetContext): boolean {
    return this.packageTarget().id === target.id;
  }

  private isCurrentSettingsTarget(target: SettingsMachineTarget): boolean {
    return this.settingsTarget().id === target.id;
  }

  private resetAccessStateForTargetChange(): void {
    this.accessLoadRequestSeq += 1;
    this.accessLoading = false;
    this.accessError = "";
    this.accessConfigResponse = undefined;
    this.savedMessage = "";
  }

  private resetSessiondStateForTargetChange(): void {
    this.sessiondLoadRequestSeq += 1;
    this.sessiondLoading = false;
    this.sessiondError = "";
    this.sessiondConfigResponse = undefined;
    this.savedMessage = "";
  }

  private resetPluginStateForTargetChange(): void {
    this.pluginLoadRequestSeq += 1;
    this.pluginLoading = false;
    this.pluginError = "";
    this.selectedPluginConfigResponse = undefined;
    this.selectedPluginsResponse = undefined;
    this.savedMessage = "";
  }

  private resetPackageStateForTargetChange(): void {
    const hadPackageOperation = this.packageOperation !== undefined;
    this.packageLoadRequestSeq += 1;
    this.packageMutationSeq += 1;
    this.packageLoading = false;
    this.packageOperation = undefined;
    this.packageMessage = "";
    this.packageError = "";
    this.packagesResponse = undefined;
    if (hadPackageOperation) this.saving = false;
  }

  private showSavedMessage(): void {
    this.savedMessage = t("SettingsDialog.config_saved.e57a93f0");
    if (this.savedMessageTimer !== undefined) window.clearTimeout(this.savedMessageTimer);
    this.savedMessageTimer = window.setTimeout(() => {
      if (this.savedMessage === t("SettingsDialog.config_saved.524176ed")) this.savedMessage = "";
      this.savedMessageTimer = undefined;
    }, 3000);
  }

  static override styles = [css`
    :host { position: fixed; inset: 0; z-index: 30; color: var(--pi-text); font: var(--pi-font-weight-regular, 360) 13px/18px var(--pi-font-family, system-ui, sans-serif); }
    modal-surface { --modal-surface-backdrop-padding: max(20px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left)); --modal-surface-width: min(1120px, 100%); --modal-surface-max-height: min(760px, 100%); --modal-surface-min-height: min(620px, 100%); --modal-surface-radius: 16px; }
    .settings-shell { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; background: var(--pi-bg); }
    .settings-header { position: absolute; top: 0; right: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 0; }
    .settings-header h1 { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    .eyebrow { display: block; color: var(--pi-muted); font-size: 12px; line-height: 16px; font-weight: var(--pi-font-weight-medium, 460); letter-spacing: 0; }
    h1 { margin: 0; font-size: 18px; line-height: 24px; font-weight: var(--pi-font-weight-medium, 460); }
    button { border: 0; border-radius: 6px; background: transparent; color: var(--pi-text); padding: 7px 9px; font: inherit; cursor: pointer; }
    .close-button { width: 34px; height: 34px; display: grid; place-items: center; border: 0; background: transparent; color: var(--pi-muted); padding: 0; font-size: 24px; }
    .close-button:hover, .close-button:focus-visible { color: var(--pi-text); background: var(--pi-surface-hover); }
    .settings-body { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: 192px minmax(0, 1fr); }
    .settings-sidebar { min-height: 0; display: flex; flex-direction: column; background: var(--pi-surface); padding-top: 12px; }
    .settings-nav { min-height: 0; flex: 1; padding: 12px; overflow: auto; }
    .settings-search-wrap { position: relative; flex: none; margin: 0 12px 8px; z-index: 3; }
    .settings-search-results { position: absolute; top: calc(100% + 6px); left: 0; width: 300px; max-width: calc(100vw - 48px); max-height: min(360px, 50dvh); overflow: auto; padding: 4px; border: 1px solid var(--pi-border-muted); border-radius: 10px; background: var(--pi-bg); box-shadow: 0 8px 28px var(--pi-shadow); }
    .settings-search-results button { display: grid; width: 100%; gap: 2px; padding: 8px; text-align: left; }
    .settings-search-results button[aria-selected="true"] { background: var(--pi-selection-bg); }
    .settings-search-results button > span { display: flex; align-items: center; gap: 8px; }
    .settings-search-results small { color: var(--pi-muted); margin-inline-start: 24px; }
    .settings-nav button { display: flex; align-items: center; gap: 12px; min-height: 32px; width: 100%; margin: 0 0 1px; text-align: left; border-color: transparent; background: transparent; }
    .settings-nav button:hover, .settings-nav button:focus-visible { background: var(--pi-surface-hover); }
    .settings-nav button.selected { background: var(--pi-selection-bg); }
    .settings-nav small { display: none; }
    .settings-nav strong { font-weight: inherit; }
    .settings-search { display: flex; align-items: center; gap: 8px; min-height: 32px; box-sizing: border-box; padding: 4px 8px; border: 1px solid var(--pi-border-muted); border-radius: 8px; background: var(--pi-bg); color: var(--pi-muted); }
    .settings-search:focus-within { outline: 2px solid var(--pi-accent); outline-offset: 1px; }
    .settings-search input { min-width: 0; width: 100%; background: transparent; border: 0; outline: 0; color: var(--pi-text); font: inherit; }
    .no-sections { color: var(--pi-muted); padding: 8px; }
    .nav-group + .nav-group { margin-top: 26px; }
    .nav-group h2 { margin: 6px 9px 8px; color: var(--pi-muted); font-size: 12px; font-weight: inherit; }
    .mobile-tabs { display: none; }
    .settings-section[hidden] { display: none; }
    .settings-content { min-width: 0; min-height: 0; overflow: auto; padding: 58px 24px 24px; border-left: 1px solid var(--pi-border-muted); }

    @media (max-width: 760px) {
      modal-surface { --modal-surface-backdrop-padding: 0; --modal-surface-place-items: stretch; --modal-surface-width: 100%; --modal-surface-max-height: 100%; --modal-surface-min-height: 0; --modal-surface-border: 0; --modal-surface-radius: 0; }
      .settings-header { top: env(safe-area-inset-top); padding: 6px 8px; }
      .settings-body { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
      .settings-nav { display: none; }
      .settings-sidebar { padding-top: max(8px, env(safe-area-inset-top)); }
      .settings-search-wrap { margin: 0 60px 8px 12px; }
      .settings-search { min-height: 44px; }
      .settings-search-results { width: calc(100vw - 32px); max-width: calc(100vw - 32px); }
      .mobile-tabs { display: flex; gap: 4px; overflow-x: auto; padding: 0 12px 8px; scrollbar-width: none; }
      .mobile-tabs button { display: flex; flex: none; align-items: center; gap: 6px; white-space: nowrap; color: var(--pi-muted); min-height: 44px; }
      .mobile-tabs button[aria-selected="true"] { background: var(--pi-selection-bg); color: var(--pi-text); }
      .settings-content { border-left: 0; border-top: 1px solid var(--pi-border-muted); padding: 18px 12px calc(18px + env(safe-area-inset-bottom)); }
    }
    button:not(:disabled):hover { background: var(--pi-surface-hover); }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: -2px; }
    strong { font-weight: var(--pi-font-weight-medium, 460); }
    small { font-size: 12px; line-height: 16px; }
    @media (max-width: 680px), (pointer: coarse) {
      button { min-height: 44px; }
      header button { min-width: 44px; }
    }
  `, settingsTargetStyles];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type SettingsPanelTag =
  | "settings-skills-panel"
  | "settings-models-panel"
  | "settings-mcp-panel"
  | "settings-general-panel"
  | "settings-preferences-panel"
  | "settings-sessiond-panel"
  | "settings-packages-panel"
  | "settings-plugins-panel"
  | "settings-shortcuts-panel";

/**
 * The single custom-element panel the settings dialog renders for a section.
 *
 * This is the public routing contract behind `renderActiveSection`: each section
 * maps to exactly one panel element and nothing else (no per-tab "scope note"
 * wrapper). Tests assert this mapping instead of inspecting the rendered
 * `TemplateResult`'s markup.
 */
export function activeSettingsPanelTag(section: SettingsSection): SettingsPanelTag {
  switch (section) {
    case "skills": return "settings-skills-panel";
    case "models": return "settings-models-panel";
    case "mcp": return "settings-mcp-panel";
    case "sessiond":
      return "settings-sessiond-panel";
    case "packages":
      return "settings-packages-panel";
    case "plugins":
      return "settings-plugins-panel";
    case "shortcuts":
      return "settings-shortcuts-panel";
    case "connection":
      return "settings-general-panel";
    case "general":
      return "settings-preferences-panel";
  }
}

function settingsSectionLabel(section: SettingsSection): string {
  const keys = {
    general: "settingsLayout.preferences", connection: "settingsLayout.connection",
    models: "modelsSettings.heading", skills: "inspection.skills", mcp: "ui.settings.mcp",
    sessiond: "SettingsDialog.session_daemon.a8a7922c", packages: "SettingsDialog.pi_packages.91f80e11",
    plugins: "SettingsDialog.pi_web_plugins.e0e9e6b6", shortcuts: "SettingsDialog.keyboard.39b81103",
  } as const;
  return t(keys[section]);
}

function settingsSectionIcon(section: SettingsSection): Parameters<typeof renderUiIcon>[0] {
  const icons = { general: "settings", shortcuts: "keyboard", models: "sparkles", skills: "file", mcp: "link", packages: "package", plugins: "puzzle", connection: "server", sessiond: "server" } as const;
  return icons[section];
}
