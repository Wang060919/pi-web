import { localizedTemplate, localizedText, t } from "../../../../shared/i18n";
import { LitElement, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import type { Machine, Project, SessionInfo, Workspace } from "../../api";
import { browserGatewayDisplayUrl, machineIconUrl } from "../../instanceIdentity";
import { shortSessionId } from "../../sessionLabels";
import { renderNavigationMenuIcon } from "../tabIcons";
import type { NavigationSection } from "../../appShell/navigationState";

@customElement("app-context-bar")
export class AppContextBar extends LitElement {
  @property({ attribute: false }) machines: Machine[] = [];
  @property({ attribute: false }) machine?: Machine;
  /** PWA display mode: surfaces the machine location identity in the breadcrumb. */
  @property({ type: Boolean }) locationIndicator = false;
  @property({ attribute: false }) project?: Project;
  @property({ attribute: false }) workspace?: Workspace;
  @property({ attribute: false }) session?: SessionInfo;
  @property({ attribute: false }) refreshControl: unknown;
  @property({ attribute: false }) onOpenSection?: (section: NavigationSection) => void;
  @property({ attribute: false }) onShowActions?: () => void;
  @property({ attribute: false }) onShowNavigation?: () => void;
  @property({ type: Boolean }) hiddenActiveDestination = false;
  @query(".context-items") private contextItems?: HTMLElement | null;
  @state() private canScrollLeft = false;
  @state() private canScrollRight = false;
  private observedContextItems: HTMLElement | undefined;
  private contextItemsResizeObserver: ResizeObserver | undefined;

  override disconnectedCallback(): void {
    this.contextItemsResizeObserver?.disconnect();
    this.contextItemsResizeObserver = undefined;
    this.observedContextItems = undefined;
    super.disconnectedCallback();
  }

  override firstUpdated(): void {
    this.observeContextItems();
    this.updateScrollState();
  }

  override updated(): void {
    this.observeContextItems();
    this.updateScrollState();
  }

  override render() {
    const machine = displayMachine(this.machine, this.machines);
    const machineChoice = this.machines.length > 1;
    // The chip is a machine picker whenever a choice exists; the location
    // identity it carries is a PWA-only affordance (the browser shows the URL).
    const showMachineChip = machineChoice || this.locationIndicator;
    const machineChipClass = machine === undefined ? "context-chip machine-chip empty" : "context-chip machine-chip";
    const projectLabel = projectContextLabel(this.project);
    const workspaceLabel = workspaceContextLabel(this.workspace);
    const sessionLabel = sessionContextLabel(this.session);
    return localizedTemplate("AppContextBar.location_project_workspace_session.90317777", html)`
      <nav class=${this.contextBarClass()} aria-label="Current location">
        <span class="context-bar-label">Location</span>
        <ol class="context-items" @scroll=${this.onContextScroll}>
          ${showMachineChip ? html`
            <li class="context-item">
              ${machineChoice ? html`
                <button type="button" class=${machineChipClass} title=${machineContextTitle(machine)} aria-label=${localizedText("AppContextBar.machine_open_machine_selection.fc7b1a94")`Machine: ${machineContextLabel(machine)}. Open machine selection.`} @click=${() => { this.onOpenSection?.("machines"); }}>
                  ${this.renderMachineChipContent(machine, this.locationIndicator)}
                </button>
              ` : html`
                <!-- No machine choice: the chip is the instance identity, not a control. -->
                <span class="${machineChipClass} static" title=${machineContextTitle(machine)}>
                  ${this.renderMachineChipContent(machine, true)}
                </span>
              `}
            </li>
          ` : null}
          <li class="context-item">
            <button type="button" class=${this.project === undefined ? "context-chip empty" : "context-chip"} title=${projectContextTitle(this.project)} aria-label=${localizedText("AppContextBar.project_open_project_selection.805aa728")`Project: ${projectLabel}. Open project selection.`} @click=${() => { this.onOpenSection?.("projects"); }}>
              <span class="context-kind">Project</span>
              <span class="context-value">${projectLabel}</span>
            </button>
          </li>
          <li class="context-item">
            <button type="button" class=${this.workspace === undefined ? "context-chip empty" : "context-chip"} title=${workspaceContextTitle(this.workspace)} aria-label=${localizedText("AppContextBar.workspace_open_workspace_selection.1e2f44a7")`Workspace: ${workspaceLabel}. Open workspace selection.`} @click=${() => { this.onOpenSection?.("workspaces"); }}>
              <span class="context-kind">Workspace</span>
              <span class="context-value">${workspaceLabel}</span>
            </button>
          </li>
          <li class="context-item">
            <button type="button" class=${this.session === undefined ? "context-chip empty" : "context-chip"} title=${sessionContextTitle(this.session)} aria-label=${localizedText("AppContextBar.session_open_session_selection.b575725d")`Session: ${sessionLabel}. Open session selection.`} @click=${() => { this.onOpenSection?.("sessions"); }}>
              <span class="context-kind">Session</span>
              <span class="context-value">${sessionLabel}</span>
            </button>
          </li>
        </ol>
        ${this.hasContextActions() ? html`<div class="context-actions">${this.onShowNavigation === undefined ? null : localizedTemplate("AppContextBar.template.29f1820d", html)`<button type="button" class=${`context-action-button${this.hiddenActiveDestination ? " selected" : ""}`} title="Navigation" aria-label="Navigation" aria-haspopup="dialog" @click=${this.onShowNavigation}>${renderNavigationMenuIcon()}</button>`}${this.renderActionsButton()}${this.refreshControl}</div>` : null}
      </nav>
    `;
  }

  private renderMachineChipContent(machine: Machine | undefined, locationIndicator: boolean) {
    if (machine === undefined) return localizedTemplate("AppContextBar.no_machine.e672d7d6", html)`<span class="context-value">No machine</span>`;
    // Browser mode keeps the chip a plain machine picker; the location identity
    // (favicon and host) only shows where the browser chrome does not.
    if (!locationIndicator) return html`<span class="context-value">${machineSelectionLabel(machine)}</span>`;
    const detail = machineContextDetail(machine, browserGatewayDisplayUrl());
    return html`
      <img class="context-chip-icon" src=${machineIconUrl(machine)} alt="" @error=${this.hideBrokenIcon} />
      ${this.machines.length > 1 ? html`<span class="context-value">${machineContextLabel(machine)}</span>` : null}
      ${detail === undefined ? null : html`<span class=${this.machines.length > 1 ? "context-detail" : "context-value"}>${detail}</span>`}
    `;
  }

  private readonly hideBrokenIcon = (event: Event): void => {
    if (event.currentTarget instanceof HTMLImageElement) event.currentTarget.style.display = "none";
  };

  private renderActionsButton() {
    if (this.onShowActions === undefined) return null;
    return localizedTemplate("AppContextBar.template.f9feeffd", html)`
      <button type="button" class="context-action-button" title="Show Actions" aria-label="Show Actions" @click=${(event: MouseEvent) => { event.stopPropagation(); this.onShowActions?.(); }}>
        <svg class="context-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 4h5v5H4zM15 4h5v5h-5zM4 15h5v5H4zM15 15h5v5h-5z"></path>
        </svg>
      </button>
    `;
  }

  private contextBarClass(): string {
    const classes = ["context-bar"];
    if (this.canScrollLeft) classes.push("can-scroll-left");
    if (this.canScrollRight) classes.push("can-scroll-right");
    return classes.join(" ");
  }

  private hasContextActions(): boolean {
    return this.refreshControl !== undefined || this.onShowActions !== undefined || this.onShowNavigation !== undefined;
  }

  private observeContextItems(): void {
    const contextItems = this.contextItemsElement();
    if (this.observedContextItems === contextItems) return;
    this.contextItemsResizeObserver?.disconnect();
    this.observedContextItems = contextItems;
    this.contextItemsResizeObserver = undefined;
    if (contextItems === undefined || typeof ResizeObserver === "undefined") return;
    this.contextItemsResizeObserver = new ResizeObserver(() => {
      this.updateScrollState();
    });
    this.contextItemsResizeObserver.observe(contextItems);
  }

  private updateScrollState(): void {
    const contextItems = this.contextItemsElement();
    const maxScrollLeft = contextItems === undefined ? 0 : Math.max(0, contextItems.scrollWidth - contextItems.clientWidth);
    const canScrollLeft = contextItems !== undefined && contextItems.scrollLeft > 1;
    const canScrollRight = contextItems !== undefined && maxScrollLeft - contextItems.scrollLeft > 1;
    if (this.canScrollLeft !== canScrollLeft) this.canScrollLeft = canScrollLeft;
    if (this.canScrollRight !== canScrollRight) this.canScrollRight = canScrollRight;
  }

  private contextItemsElement(): HTMLElement | undefined {
    const contextItems = this.contextItems;
    return contextItems instanceof HTMLElement ? contextItems : undefined;
  }

  private readonly onContextScroll = () => {
    this.updateScrollState();
  };

  static override styles = css`
    /* Keep the refresh menu in this shadow tree above the following mobile tab strip. */
    :host { position: relative; z-index: 20; flex: 0 0 auto; min-width: 0; }
    .context-bar { position: relative; flex: 0 0 auto; min-width: 0; display: flex; align-items: center; gap: 0; padding: 6px 0; border-bottom: 0; background: var(--pi-bg); }
    .context-bar::before, .context-bar::after { content: ""; position: absolute; top: 0; bottom: 0; z-index: 2; width: 20px; opacity: 0; pointer-events: none; transition: opacity .15s ease; }
    .context-bar::before { left: 0; background: linear-gradient(90deg, color-mix(in srgb, var(--pi-shadow-strong) 55%, transparent) 0%, transparent 100%); }
    .context-bar::after { right: 0; background: linear-gradient(270deg, color-mix(in srgb, var(--pi-shadow-strong) 55%, transparent) 0%, transparent 100%); }
    .context-bar.can-scroll-left::before, .context-bar.can-scroll-right::after { opacity: 1; }
    .context-bar-label { display: none; }
    .context-items { flex: 1 1 auto; min-width: 0; display: flex; align-items: stretch; gap: 5px; margin: 0; padding: 0 8px; list-style: none; overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain; scroll-padding-inline: 8px; scrollbar-width: thin; }
    .context-item { flex: 0 0 auto; min-width: 0; display: flex; }
    .context-actions { position: relative; flex: 0 0 auto; z-index: 3; display: flex; align-items: center; gap: 6px; padding: 0 8px; background: var(--pi-bg); pointer-events: none; }
    .context-actions::before { content: ""; position: absolute; top: 0; bottom: 0; left: -24px; z-index: 0; width: 24px; background: linear-gradient(90deg, transparent, var(--pi-bg)); pointer-events: none; }
    app-refresh-control, .context-action-button { position: relative; z-index: 1; pointer-events: auto; }
    .context-action-button { box-sizing: border-box; width: 36px; height: 36px; display: grid; place-items: center; border: 0; border-radius: 6px; background: transparent; color: var(--pi-text); padding: 0; line-height: 1; }
    .context-action-button.selected, .context-action-button:hover { background: var(--pi-selection-bg); }
    .context-action-button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: -2px; }
    .context-action-icon { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linejoin: round; pointer-events: none; }
    .context-chip { flex: 0 0 auto; min-width: 0; display: inline-flex; align-items: center; gap: 5px; border: 0; border-radius: 6px; background: transparent; color: var(--pi-text); padding: 4px 8px; font: inherit; text-align: left; }
    .context-chip-icon { flex: 0 0 auto; width: 14px; height: 14px; }
    .context-detail { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--pi-muted); font-size: 11px; }
    button.context-chip:hover { background: var(--pi-surface-hover); }
    button.context-chip:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    .context-chip.empty { color: var(--pi-muted); }
    .context-kind { display: none; }
    .context-value { min-width: 0; overflow: visible; text-overflow: clip; white-space: nowrap; }
    button { cursor: pointer; }
    @media (max-width: 760px) {
      .context-bar { padding: 0; }
    }
    @media (max-width: 760px), (pointer: coarse) {
      .context-action-button { width: 44px; height: 44px; }
      .context-chip { min-height: 44px; max-width: 180px; }
      .context-value { overflow: hidden; text-overflow: ellipsis; }
      .context-items { scrollbar-width: none; }
    }
  `;
}

/**
 * The machine chip always shows the machine the UI acts on, falling back to
 * the local machine before an explicit selection lands.
 */
function displayMachine(machine: Machine | undefined, machines: readonly Machine[]): Machine | undefined {
  return machine ?? machines.find((candidate) => candidate.id === "local") ?? machines[0];
}

function machineContextLabel(machine: Machine | undefined): string {
  return machine?.name ?? t("AppContextBar.no_machine.f7f92e3f");
}

/** The plain picker label used in browser mode, where the chip carries no location identity. */
function machineSelectionLabel(machine: Machine): string {
  return `${machine.name}${machine.kind === "remote" ? t("AppContextBar.remote.6e06c0a1") : ""}`;
}

/**
 * The host the machine is reached at: the serving gateway for the local
 * machine (what a PWA hides), the remote host otherwise.
 */
export function machineContextDetail(machine: Machine, gatewayDisplay: string): string | undefined {
  if (machine.kind === "local" || machine.baseUrl === undefined) return gatewayDisplay;
  try {
    return new URL(machine.baseUrl).host;
  } catch {
    return undefined;
  }
}

function machineContextTitle(machine: Machine | undefined): string {
  return machine === undefined ? t("AppContextBar.no_machine_selected.9fa17d18") : machine.baseUrl ?? machine.name;
}

function projectContextLabel(project: Project | undefined): string {
  return project?.name ?? t("AppContextBar.no_project.9a842642");
}

function projectContextTitle(project: Project | undefined): string {
  return project === undefined ? t("AppContextBar.no_project_selected.30bf775c") : `${project.name} — ${project.path}`;
}

function workspaceContextLabel(workspace: Workspace | undefined): string {
  return workspace === undefined ? t("AppContextBar.no_workspace.3afbf59b") : `${workspace.label}${workspace.isMain ? t("AppContextBar.main.0ef52ece") : ""} · ${workspace.path}`;
}

function workspaceContextTitle(workspace: Workspace | undefined): string {
  return workspace === undefined ? t("AppContextBar.no_workspace_selected.a554d91b") : `${workspace.label}${workspace.isMain ? t("AppContextBar.main.9962e11f") : ""} — ${workspace.path}`;
}

function sessionContextLabel(session: SessionInfo | undefined): string {
  const name = session?.name?.trim();
  const firstMessage = session?.firstMessage.trim();
  return name !== undefined && name !== "" ? name : firstMessage !== undefined && firstMessage !== "" ? firstMessage : session === undefined ? t("AppContextBar.no_session.77f43535") : shortSessionId(session.id);
}

function sessionContextTitle(session: SessionInfo | undefined): string {
  return session === undefined ? t("AppContextBar.no_session_selected.77ebce4c") : session.path;
}
