import { localizedTemplate, t } from "../../../../shared/i18n";
import { LitElement, css, html, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import type { Machine, MachineHealth, Project, SessionActivity, SessionInfo, SessionStatus, Workspace } from "../../api";
import type { MachineStatusSnapshot } from "../../../../shared/machineStatus";
import type { SessionLabelItem, WorkspaceLabelItem } from "../../plugins/types";
import { selectedMachineId } from "../../controllers/types";
import type { NavigationSection } from "../../appShell/navigationState";
import { NAVIGATION_SECTION_ORDER } from "../../appShell/navigationState";
import type { KeyboardNavigableSection } from "../navigationFocus";
import "../ModalSurface";
import type { ModalSurface } from "../ModalSurface";
import { navigationContextStyles } from "./navigationContextStyles";
import { piMark } from "../PiMark";
import "../MachineList";
import "../MachineSwitcher";
import "../ProjectList";
import "../WorkspaceList";
import "../SessionList";

export type NavigationFocusTarget = NavigationSection | "chat";
type ContextPicker = "projects" | "workspaces";

@customElement("app-navigation-panel")
export class AppNavigationPanel extends LitElement {
  @property({ attribute: false }) machines: Machine[] = [];
  @property({ attribute: false }) selectedMachine: Machine | undefined = undefined;
  /** PWA display mode: surfaces the single-machine identity bubble in the header. */
  @property({ type: Boolean }) locationIndicator = false;
  @property({ attribute: false }) machineStatuses: Record<string, MachineHealth> = {};
  @property({ attribute: false }) machineStatusSnapshots: Record<string, MachineStatusSnapshot> = {};
  @property({ attribute: false }) projects: Project[] = [];
  @property({ attribute: false }) selectedProject: Project | undefined = undefined;
  @property({ attribute: false }) workspaces: Workspace[] = [];
  @property({ attribute: false }) selectedWorkspace: Workspace | undefined = undefined;
  @property({ attribute: false }) sessions: SessionInfo[] = [];
  @property({ attribute: false }) selectedSession?: SessionInfo;
  @property({ attribute: false }) pinnedRootIds: string[] = [];
  @property({ attribute: false }) sessionActivities: Record<string, SessionActivity> = {};
  @property({ attribute: false }) sessionStatuses: Record<string, SessionStatus> = {};
  @property({ attribute: false }) sendingPrompts: Record<string, true> = {};
  @property({ attribute: false }) unreadSessionIds: ReadonlySet<string> = new Set();
  @property({ attribute: false }) deletingWorkspaceIds: string[] = [];
  // Unlike event callbacks, this provider affects rendered content; replacements
  // must remain reactive inputs to WorkspaceList.
  @property({ attribute: false }) workspaceLabelItems: (workspace: Workspace) => WorkspaceLabelItem[] = () => [];
  @property({ attribute: false }) sessionLabelItems: (session: SessionInfo) => SessionLabelItem[] = () => [];
  @property({ attribute: false }) refreshControl: unknown;
  @property({ type: Boolean, reflect: true }) collapsible = false;
  @property({ type: Boolean, reflect: true }) compact = false;
  @property({ type: Boolean }) machinesCollapsed = false;
  @property({ type: Boolean }) projectsCollapsed = false;
  @property({ type: Boolean }) workspacesCollapsed = false;
  @property({ type: Boolean }) sessionsCollapsed = false;
  @property({ type: Number }) startingSessionCount = 0;
  @property({ type: Boolean }) canStartSession = false;
  @property({ attribute: false }) onShowActions?: () => void;
  @property({ attribute: false }) onToggleMachines?: () => void;
  @property({ attribute: false }) onToggleProjects?: () => void;
  @property({ attribute: false }) onToggleWorkspaces?: () => void;
  @property({ attribute: false }) onToggleSessions?: () => void;
  @property({ attribute: false }) onSelectProject?: (project: Project) => void | Promise<void>;
  @property({ attribute: false }) onCloseProject?: (project: Project) => void | Promise<void>;
  @property({ attribute: false }) onMoveProject?: (project: Project, direction: -1 | 1) => void;
  @property({ attribute: false }) onMoveWorkspace?: (workspace: Workspace, direction: -1 | 1) => void;
  @property({ attribute: false }) onPinSession?: (session: SessionInfo) => void;
  @property({ attribute: false }) onUnpinSession?: (session: SessionInfo) => void;
  @property({ attribute: false }) onMoveSessionPin?: (session: SessionInfo, direction: -1 | 1) => void;
  @property({ attribute: false }) onSelectWorkspace?: (workspace: Workspace) => void | Promise<void>;
  @property({ attribute: false }) onDeleteWorkspace?: (workspace: Workspace) => void | Promise<void>;
  @property({ attribute: false }) onStartSession?: () => void | Promise<void>;
  @property({ attribute: false }) onSelectSession?: (session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onArchiveSession?: (session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onArchiveSessionWithDescendants?: (session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onArchiveSessions?: (sessions: SessionInfo[]) => void | Promise<void>;
  @property({ attribute: false }) onRestoreSession?: (session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onDeleteCachedNewSession?: (session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onDeleteArchivedSession?: (session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onDeleteArchivedSessions?: (sessions: SessionInfo[]) => void | Promise<void>;
  @property({ attribute: false }) onDetachParentSession?: (session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onMarkSessionRead?: (session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onMarkSessionsRead?: (sessions: SessionInfo[]) => void | Promise<void>;
  @property({ attribute: false }) onReloadSession?: (session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onCleanupSessions?: () => void | Promise<void>;
  @property({ attribute: false }) onArchivedCollapsed?: () => void | Promise<void>;
  @property({ attribute: false }) onSelectMachine?: (machine: Machine) => void | Promise<void>;
  @property({ attribute: false }) onRemoveMachine?: (machine: Machine) => void | Promise<void>;
  @property({ attribute: false }) onFocusNavigationTarget?: (target: NavigationFocusTarget) => void | Promise<void>;
  @property({ attribute: false }) onCancelKeyboardNavigation?: () => void | Promise<void>;

  @query("machine-list") private machineList?: KeyboardNavigableSection;
  @query("machine-switcher") private machineSwitcher?: KeyboardNavigableSection;
  @query("project-list") private projectList?: KeyboardNavigableSection;
  @query("workspace-list") private workspaceList?: KeyboardNavigableSection;
  @query("session-list") private sessionList?: KeyboardNavigableSection;
  @query("modal-surface") private pickerSurface?: ModalSurface;
  @state() private contextPicker: ContextPicker | undefined;

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (this.contextPicker !== undefined && (
      (changed.has("selectedMachine") && (changed.get("selectedMachine")?.id ?? "local") !== (this.selectedMachine?.id ?? "local"))
      || (changed.has("selectedProject") && changed.get("selectedProject")?.id !== this.selectedProject?.id)
      || (changed.has("selectedWorkspace") && changed.get("selectedWorkspace")?.id !== this.selectedWorkspace?.id)
      || this.compact
    )) this.contextPicker = undefined;
    this.toggleAttribute("context-picker-open", this.contextPicker !== undefined);
  }

  async focusSection(section: NavigationSection): Promise<boolean> {
    await this.updateComplete;
    if (!this.compact && (section === "projects" || section === "workspaces")) return await this.openContextPicker(section);
    if (this.contextPicker !== undefined) await this.closeContextPicker();
    switch (section) {
      case "machines": return await this.focusNavigableSection(this.compact ? this.machineList : this.machineSwitcher);
      case "projects": return await this.focusNavigableSection(this.projectList);
      case "workspaces": return await this.focusNavigableSection(this.workspaceList);
      case "sessions": return await this.focusNavigableSection(this.sessionList);
    }
  }

  // Stable child inputs delegate at invocation time, never capturing old props.
  private readonly childCallbacks = {
    toggleProjects: () => { this.onToggleProjects?.(); },
    selectProject: async (project: Project) => {
      if (this.contextPicker !== undefined) await this.closeContextPicker();
      await this.onSelectProject?.(project);
    },
    closeProject: (project: Project) => this.onCloseProject?.(project),
    moveProject: (project: Project, direction: -1 | 1) => this.onMoveProject?.(project, direction),
    moveWorkspace: (workspace: Workspace, direction: -1 | 1) => this.onMoveWorkspace?.(workspace, direction),
    pinSession: (session: SessionInfo) => this.onPinSession?.(session),
    unpinSession: (session: SessionInfo) => this.onUnpinSession?.(session),
    moveSessionPin: (session: SessionInfo, direction: -1 | 1) => this.onMoveSessionPin?.(session, direction),
    toggleWorkspaces: () => { this.onToggleWorkspaces?.(); },
    selectWorkspace: async (workspace: Workspace) => {
      if (this.contextPicker !== undefined) await this.closeContextPicker();
      await this.onSelectWorkspace?.(workspace);
    },
    deleteWorkspace: (workspace: Workspace) => this.onDeleteWorkspace?.(workspace),
    toggleSessions: () => { this.onToggleSessions?.(); },
    archivedCollapsed: () => this.onArchivedCollapsed?.(),
    startSession: () => this.onStartSession?.(),
    selectSession: (session: SessionInfo) => this.onSelectSession?.(session),
    archiveSession: (session: SessionInfo) => this.onArchiveSession?.(session),
    archiveSessionWithDescendants: (session: SessionInfo) => this.onArchiveSessionWithDescendants?.(session),
    archiveSessions: (sessions: SessionInfo[]) => this.onArchiveSessions?.(sessions),
    restoreSession: (session: SessionInfo) => this.onRestoreSession?.(session),
    deleteCachedNewSession: (session: SessionInfo) => this.onDeleteCachedNewSession?.(session),
    deleteArchivedSession: (session: SessionInfo) => this.onDeleteArchivedSession?.(session),
    deleteArchivedSessions: (sessions: SessionInfo[]) => this.onDeleteArchivedSessions?.(sessions),
    detachParentSession: (session: SessionInfo) => this.onDetachParentSession?.(session),
    markSessionRead: (session: SessionInfo) => this.onMarkSessionRead?.(session),
    markSessionsRead: (sessions: SessionInfo[]) => this.onMarkSessionsRead?.(sessions),
    reloadSession: (session: SessionInfo) => this.onReloadSession?.(session),
    cleanupSessions: () => this.onCleanupSessions?.(),
    previousFromProjects: () => { this.focusPreviousFrom("projects"); },
    nextFromProjects: () => { this.focusNextFrom("projects"); },
    previousFromWorkspaces: () => { this.focusPreviousFrom("workspaces"); },
    nextFromWorkspaces: () => { this.focusNextFrom("workspaces"); },
    previousFromSessions: () => { this.focusPreviousFrom("sessions"); },
    nextFromSessions: () => { this.focusNextFrom("sessions"); },
    cancelKeyboardNavigation: () => { this.cancelKeyboardNavigation(); },
  };

  override render() {
    return localizedTemplate("AppNavigationPanel.pi_web_actions.a6cbb6f6", html)`
      <header>
        <div class="brand">${piMark()}<strong>PI WEB</strong></div>
        <machine-switcher
          .machines=${this.machines}
          .selected=${this.selectedMachine}
          .locationIndicator=${this.locationIndicator}
          .statuses=${this.machineStatuses}
          .statusSnapshots=${this.machineStatusSnapshots}
          .onSelect=${(machine: Machine) => this.onSelectMachine?.(machine)}
          .onRemove=${(machine: Machine) => this.onRemoveMachine?.(machine)}
          .onFocusNextSection=${() => { this.focusNextFrom("machines"); }}
          .onCancelKeyboardNavigation=${() => { this.cancelKeyboardNavigation(); }}
        ></machine-switcher>
        <div class="header-actions">
          ${this.refreshControl}
          <button title="Show Actions" aria-label="Show Actions" @click=${() => { this.onShowActions?.(); }}>Actions</button>
        </div>
      </header>
      ${this.compact && shouldShowMachinesSection(this.machines) ? html`
        <machine-list
          .machines=${this.machines}
          .selected=${this.selectedMachine}
          .statuses=${this.machineStatuses}
          .statusSnapshots=${this.machineStatusSnapshots}
          .collapsible=${this.collapsible}
          .collapsed=${this.machinesCollapsed}
          .onToggleCollapsed=${() => { this.onToggleMachines?.(); }}
          .onSelect=${(machine: Machine) => this.onSelectMachine?.(machine)}
          .onRemove=${(machine: Machine) => this.onRemoveMachine?.(machine)}
          .onFocusNextSection=${() => { this.focusNextFrom("machines"); }}
          .onCancelKeyboardNavigation=${() => { this.cancelKeyboardNavigation(); }}
        ></machine-list>
      ` : null}
      ${this.compact ? html`${this.renderProjectList()}${this.renderWorkspaceList()}` : this.renderContextSwitcher()}
      <session-list
        .sessions=${this.sessions}
        .pinnedRootIds=${this.pinnedRootIds}
        .onPin=${this.childCallbacks.pinSession}
        .onUnpin=${this.childCallbacks.unpinSession}
        .onMovePin=${this.childCallbacks.moveSessionPin}
        .statuses=${this.sessionStatuses}
        .activities=${this.sessionActivities}
        .sessionFlags=${this.selectedMachineStatusSnapshot()?.sessions}
        .sending=${this.sendingPrompts}
        .unreadSessionIds=${this.unreadSessionIds}
        .selected=${this.selectedSession}
        .sessionLabelItems=${this.sessionLabelItems}
        .startingCount=${this.startingSessionCount}
        .canStart=${this.canStartSession}
        .collapsible=${this.collapsible}
        .collapsed=${this.sessionsCollapsed}
        .onToggleCollapsed=${this.childCallbacks.toggleSessions}
        .onArchivedCollapsed=${this.childCallbacks.archivedCollapsed}
        .onStart=${this.childCallbacks.startSession}
        .onSelect=${this.childCallbacks.selectSession}
        .onArchive=${this.childCallbacks.archiveSession}
        .onArchiveWithDescendants=${this.childCallbacks.archiveSessionWithDescendants}
        .onArchiveMany=${this.childCallbacks.archiveSessions}
        .onRestore=${this.childCallbacks.restoreSession}
        .onDelete=${this.childCallbacks.deleteCachedNewSession}
        .onDeleteArchived=${this.childCallbacks.deleteArchivedSession}
        .onDeleteArchivedMany=${this.childCallbacks.deleteArchivedSessions}
        .onDetachParent=${this.childCallbacks.detachParentSession}
        .onMarkRead=${this.childCallbacks.markSessionRead}
        .onMarkReadMany=${this.childCallbacks.markSessionsRead}
        .onReload=${this.childCallbacks.reloadSession}
        .onCleanup=${this.childCallbacks.cleanupSessions}
        .onFocusPreviousSection=${this.childCallbacks.previousFromSessions}
        .onFocusNextSection=${this.childCallbacks.nextFromSessions}
        .onCancelKeyboardNavigation=${this.childCallbacks.cancelKeyboardNavigation}
      ></session-list>
      ${this.renderContextPicker()}
    `;
  }

  private renderProjectList() {
    return html`
      <project-list
        .projects=${this.projects}
        .selected=${this.selectedProject}
        .statusSnapshot=${this.selectedMachineStatusSnapshot()}
        .collapsible=${this.compact && this.collapsible}
        .collapsed=${this.compact && this.projectsCollapsed}
        .onToggleCollapsed=${this.childCallbacks.toggleProjects}
        .onSelect=${this.childCallbacks.selectProject}
        .onClose=${this.childCallbacks.closeProject}
        .onMove=${this.childCallbacks.moveProject}
        .onFocusPreviousSection=${this.childCallbacks.previousFromProjects}
        .onFocusNextSection=${this.childCallbacks.nextFromProjects}
        .onCancelKeyboardNavigation=${this.childCallbacks.cancelKeyboardNavigation}
      ></project-list>
    `;
  }

  private renderWorkspaceList() {
    return html`
      <workspace-list
        .workspaces=${this.workspaces}
        .selected=${this.selectedWorkspace}
        .machineId=${this.selectedMachine?.id ?? "local"}
        .statusSnapshot=${this.selectedMachineStatusSnapshot()}
        .deletingWorkspaceIds=${this.deletingWorkspaceIds}
        .collapsible=${this.compact && this.collapsible}
        .collapsed=${this.compact && this.workspacesCollapsed}
        .workspaceLabelItems=${this.workspaceLabelItems}
        .onToggleCollapsed=${this.childCallbacks.toggleWorkspaces}
        .onSelect=${this.childCallbacks.selectWorkspace}
        .onDelete=${this.childCallbacks.deleteWorkspace}
        .onMove=${this.childCallbacks.moveWorkspace}
        .onFocusPreviousSection=${this.childCallbacks.previousFromWorkspaces}
        .onFocusNextSection=${this.childCallbacks.nextFromWorkspaces}
        .onCancelKeyboardNavigation=${this.childCallbacks.cancelKeyboardNavigation}
      ></workspace-list>
    `;
  }

  private renderContextSwitcher() {
    return html`
      <div class="context-switcher">
        <button
          class="context-select"
          data-context="projects"
          title=${this.selectedProject?.path ?? t("ui.navigation.chooseProject")}
          aria-label=${t("ui.navigation.projectPicker")}
          aria-haspopup="dialog"
          aria-expanded=${String(this.contextPicker === "projects")}
          @click=${() => { void this.openContextPicker("projects"); }}
        >
          <span class="context-copy"><small>${t("ui.navigation.project")}</small><span>${this.selectedProject?.name ?? t("ui.navigation.chooseProject")}</span></span>
          <span class="context-chevron" aria-hidden="true">⌄</span>
        </button>
        <button
          class="context-select"
          data-context="workspaces"
          title=${this.selectedWorkspace?.path ?? t("ui.navigation.chooseWorkspace")}
          aria-label=${t("ui.navigation.workspacePicker")}
          aria-haspopup="dialog"
          aria-expanded=${String(this.contextPicker === "workspaces")}
          @click=${() => { void this.openContextPicker("workspaces"); }}
        >
          <span class="context-copy"><small>${t("ui.navigation.workspace")}</small><span>${this.selectedWorkspace?.label ?? t("ui.navigation.chooseWorkspace")}</span></span>
          <span class="context-chevron" aria-hidden="true">⌄</span>
        </button>
      </div>
    `;
  }

  private renderContextPicker() {
    if (this.contextPicker === undefined) return null;
    const projectPicker = this.contextPicker === "projects";
    const label = t(projectPicker ? "ui.navigation.projectPicker" : "ui.navigation.workspacePicker");
    return html`
      <div class="context-picker">
        <modal-surface .label=${label} .onClose=${() => { void this.closeContextPicker(); }}>
          <div class="picker-heading"><strong>${label}</strong><button class="picker-close" aria-label=${t("ui.navigation.closePicker")} title=${t("ui.navigation.closePicker")} @click=${() => { void this.closeContextPicker(); }}>×</button></div>
          ${projectPicker ? this.renderProjectList() : this.renderWorkspaceList()}
        </modal-surface>
      </div>
    `;
  }

  private async openContextPicker(picker: ContextPicker): Promise<boolean> {
    if (this.compact) return false;
    if (this.contextPicker !== undefined && this.contextPicker !== picker) await this.closeContextPicker();
    // Keep a stable restoration target even when a keyboard shortcut opens
    // the picker from the composer rather than from its trigger.
    this.renderRoot.querySelector<HTMLElement>(`[data-context="${picker}"]`)?.focus({ preventScroll: true });
    this.contextPicker = picker;
    await this.updateComplete;
    if (this.contextPicker !== picker) return false;
    const surface = this.pickerSurface;
    await surface?.updateComplete;
    if (this.contextPicker !== picker) return false;
    const list = picker === "projects" ? this.projectList : this.workspaceList;
    if (await this.focusNavigableSection(list)) return true;
    surface?.focusDialog(this.renderRoot.querySelector<HTMLElement>(".picker-close") ?? undefined);
    return surface !== undefined;
  }

  private async closeContextPicker(): Promise<void> {
    if (this.contextPicker === undefined) return;
    this.contextPicker = undefined;
    // Removing ModalSurface restores the trigger before the next navigation
    // request chooses its own focus target.
    await this.updateComplete;
  }

  /**
   * Project and workspace rows always belong to the selected machine, resolved
   * exactly as the rest of the app resolves it — including its local-machine
   * default, which is the key snapshots arrive under before a machine has been
   * selected. Diverging here would blank every row's indicator while a snapshot
   * is in fact loaded.
   */
  private selectedMachineStatusSnapshot(): MachineStatusSnapshot | undefined {
    return this.machineStatusSnapshots[selectedMachineId({ selectedMachine: this.selectedMachine })];
  }

  private async focusNavigableSection(section: KeyboardNavigableSection | undefined): Promise<boolean> {
    if (section === undefined) return false;
    return await section.focusSelectedOrFirst();
  }

  private focusPreviousFrom(section: NavigationSection): void {
    const target = previousVisibleNavigationTarget(section, this.machines);
    if (target !== undefined) void this.focusOutsidePicker(target);
  }

  private focusNextFrom(section: NavigationSection): void {
    void this.focusOutsidePicker(nextVisibleNavigationTarget(section, this.machines));
  }

  private async focusOutsidePicker(target: NavigationFocusTarget): Promise<void> {
    if (this.contextPicker !== undefined) await this.closeContextPicker();
    await this.onFocusNavigationTarget?.(target);
  }

  private cancelKeyboardNavigation(): void {
    if (this.contextPicker !== undefined) {
      void this.closeContextPicker();
      return;
    }
    void this.onCancelKeyboardNavigation?.();
  }

  static override styles = [css`
    :host { --navigation-panel-bg: light-dark(color-mix(in srgb, var(--pi-bg) 98%, var(--pi-text)), color-mix(in srgb, var(--pi-bg) 86%, #000)); display: flex; flex-direction: column; min-height: 0; overflow: hidden; background: var(--navigation-panel-bg); font: 400 13px/18px var(--pi-font-family, system-ui, sans-serif); }
    :host([compact]) { flex: 1 1 auto; }
    header { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; border-bottom: 0; }
    .brand { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 8px; color: var(--pi-text); }
    header strong { font-size: 13px; line-height: 18px; font-weight: 500; }
    machine-switcher { flex: 1 1 auto; min-width: 0; }
    :host([compact]) header { display: none; }
    .header-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; }
    /* Expanded sections share the panel height equally, so collapsing one
       section distributes its space to every remaining section, not just the
       session list. Collapsed sections keep only their heading height. */
    machine-list, project-list, workspace-list, session-list { flex: 1 1 0px; min-height: 0; overflow: hidden; border-bottom: 0; }
    machine-list[collapsed],
    project-list[collapsed],
    workspace-list[collapsed],
    session-list[collapsed] { flex: 0 0 auto; min-height: auto; overflow: hidden; }
    button { border: 0; border-radius: 6px; background: transparent; color: var(--pi-text); padding: 6px 8px; font: inherit; cursor: pointer; }
    button:not(:disabled):hover { background: var(--pi-surface-hover); }
  `, navigationContextStyles];
}

export function shouldShowMachinesSection(machines: readonly Machine[]): boolean {
  return machines.length > 1;
}

function previousVisibleNavigationTarget(section: NavigationSection, machines: readonly Machine[]): NavigationSection | undefined {
  const sections = visibleNavigationSections(machines);
  return sections[sections.indexOf(section) - 1];
}

function nextVisibleNavigationTarget(section: NavigationSection, machines: readonly Machine[]): NavigationFocusTarget {
  const sections = visibleNavigationSections(machines);
  return sections[sections.indexOf(section) + 1] ?? "chat";
}

// Only a machine choice makes the machines section navigable: with a single
// machine the switcher is a static bubble, and compact mode has no list.
function visibleNavigationSections(machines: readonly Machine[]): NavigationSection[] {
  return NAVIGATION_SECTION_ORDER.filter((section) => section !== "machines" || shouldShowMachinesSection(machines));
}
