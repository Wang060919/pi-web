import { renderUiIcon } from "./uiIcons";
import { localizedTemplate, localizedText, t } from "../../../shared/i18n";
import { LitElement, html, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import type { Project } from "../api";
import type { MachineStatusSnapshot } from "../../../shared/machineStatus";
import { actionMenuPanelStyle } from "./actionMenu";
import { hasStatusUnread, renderActionActivityIndicator, statusActivityKind } from "./activityBadge";
import type { KeyboardNavigableSection } from "./navigationFocus";
import { activateSelectableRow, focusSelectedOrFirstSelectableRow, handleSelectableRowKeyboard } from "./selectableRow";
import { listStyles } from "./shared";

@customElement("project-list")
export class ProjectList extends LitElement implements KeyboardNavigableSection {
  @property({ attribute: false }) projects: Project[] = [];
  @property({ attribute: false }) selected?: Project;
  /** Status tree of the machine these projects belong to; absent means no indicators. */
  @property({ attribute: false }) statusSnapshot: MachineStatusSnapshot | undefined;
  @property({ type: Boolean, reflect: true }) collapsible = false;
  @property({ type: Boolean, reflect: true }) collapsed = false;
  @property({ attribute: false }) onSelect?: (project: Project) => void;
  @property({ attribute: false }) onClose?: (project: Project) => void;
  @property({ attribute: false }) onMove?: (project: Project, direction: -1 | 1) => void;
  @property({ attribute: false }) onToggleCollapsed?: () => void;
  @property({ attribute: false }) onFocusPreviousSection?: () => void | Promise<void>;
  @property({ attribute: false }) onFocusNextSection?: () => void | Promise<void>;
  @property({ attribute: false }) onCancelKeyboardNavigation?: () => void | Promise<void>;
  @state() private openMenuProjectId: string | undefined;
  @state() private menuStyle = "";
  private readonly onDocumentClick = (event: MouseEvent) => {
    if (event.composedPath().includes(this)) return;
    this.openMenuProjectId = undefined;
  };

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("click", this.onDocumentClick);
  }

  override disconnectedCallback(): void {
    document.removeEventListener("click", this.onDocumentClick);
    super.disconnectedCallback();
  }

  private focusedControl: HTMLElement | undefined;
  private focusAfterReorder: HTMLElement | undefined;

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("projects")) this.focusAfterReorder = this.focusedControl;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("projects") && this.focusAfterReorder?.isConnected === true) {
      const control = this.focusAfterReorder;
      const target = control instanceof HTMLButtonElement && control.disabled
        ? control.closest(".action-menu-panel")?.querySelector<HTMLElement>("button[data-move]:not(:disabled)")
        : control;
      target?.focus({ preventScroll: true });
    }
    this.focusAfterReorder = undefined;
    if (changed.has("projects") && this.openMenuProjectId !== undefined && !this.projects.some((project) => project.id === this.openMenuProjectId)) this.openMenuProjectId = undefined;
    if (changed.has("collapsed") && this.collapsed) this.openMenuProjectId = undefined;
  }

  async focusSelectedOrFirst(): Promise<boolean> {
    await this.updateComplete;
    return focusSelectedOrFirstSelectableRow(this.renderRoot, { fallbackSelector: ".section-toggle" });
  }

  override render() {
    return html`
      <section>
        <h2>${this.renderHeading()}</h2>
        ${this.collapsed ? null : html`
          <div class="list-body">
            ${repeat(this.projects, (project) => project.id, (project, index) => localizedTemplate("ProjectList.template.3f8eed18", html)`
              <div
                class=${`action-row ${this.selected?.id === project.id ? "selected" : ""}`}
                tabindex="0"
                data-project-id=${project.id}
                @focusin=${(event: FocusEvent) => { this.focusedControl = event.target instanceof HTMLElement ? event.target : undefined; }}
                @focusout=${() => { this.focusedControl = undefined; }}
                title=${project.path}
                @click=${(event: MouseEvent) => { activateSelectableRow(event, () => this.onSelect?.(project)); }}
                @keydown=${(event: KeyboardEvent) => { this.handleProjectKeydown(event, project); }}
              >
                <div class="action-main">
                  <span class="workspace-primary"><span class="workspace-primary-label">${project.name}</span></span><small>${project.path}</small>
                  ${this.renderActivity(project)}
                </div>
                <div class="action-menu">
                  <button class="action-menu-toggle" title="Project actions" aria-label=${localizedText("ProjectList.actions_for.a80f0aa3")`Actions for ${project.name}`} @click=${(event: MouseEvent) => { event.stopPropagation(); this.toggleMenu(project.id, event.currentTarget); }}>${renderUiIcon("more")}</button>
                  ${this.openMenuProjectId === project.id ? localizedTemplate("ProjectList.close.9291ad4b", html)`
                    <div class="action-menu-panel" style=${this.menuStyle} @click=${(event: MouseEvent) => { event.stopPropagation(); }}>
                      ${this.onMove === undefined ? null : localizedTemplate("ProjectList.move_up_move_down.4d3d29db", html)`
                        <button data-move ?disabled=${index === 0} @click=${() => { this.onMove?.(project, -1); }}>Move up</button>
                        <button data-move ?disabled=${index === this.projects.length - 1} @click=${() => { this.onMove?.(project, 1); }}>Move down</button>
                      `}
                      <button title="Close project" @click=${() => { this.close(project); }}>Close</button>
                    </div>
                  ` : null}
                </div>
              </div>
            `)}
          </div>
        `}
      </section>
    `;
  }

  private handleProjectKeydown(event: KeyboardEvent, project: Project): void {
    handleSelectableRowKeyboard(event, {
      activate: () => this.onSelect?.(project),
      previousSection: this.onFocusPreviousSection === undefined ? undefined : () => { void this.onFocusPreviousSection?.(); },
      nextSection: this.onFocusNextSection === undefined ? undefined : () => { void this.onFocusNextSection?.(); },
      cancel: this.onCancelKeyboardNavigation === undefined ? undefined : () => { void this.onCancelKeyboardNavigation?.(); },
    });
  }

  private renderHeading() {
    if (!this.collapsible) return localizedTemplate("ProjectList.projects.60d23590", html)`<span>Projects</span>`;
    const selectedSummary = this.selected?.name ?? t("ProjectList.no_project_selected.edb7a30b");
    const selectedTitle = this.selected?.path ?? selectedSummary;
    return localizedTemplate("ProjectList.projects.fd9190cd", html)`<button class="section-toggle" aria-expanded=${String(!this.collapsed)} @click=${() => { this.onToggleCollapsed?.(); }}><span class="section-title"><span class="section-name">${renderUiIcon(this.collapsed ? "chevronRight" : "chevronDown")} Projects</span>${this.collapsed ? html`<small class="section-selected" title=${selectedTitle}>${selectedSummary}</small>` : null}</span><small class="section-count">${this.projects.length}</small></button>`;
  }

  private renderActivity(project: Project) {
    const flags = this.statusSnapshot?.projects[project.id];
    const kind = statusActivityKind(flags);
    const unreadLabel = hasStatusUnread(flags) ? t("ProjectList.unread_sessions_in_this_project.3eaa893c") : undefined;
    return renderActionActivityIndicator(kind, kind === "terminal" ? t("ProjectList.project_terminal_active.ccf696aa") : t("ProjectList.project_active.af61b42e"), unreadLabel);
  }

  private toggleMenu(projectId: string, target: EventTarget | null) {
    if (this.openMenuProjectId === projectId) {
      this.openMenuProjectId = undefined;
      return;
    }
    this.menuStyle = actionMenuPanelStyle(target, { constrainTo: "viewport" });
    this.openMenuProjectId = projectId;
  }

  private close(project: Project) {
    this.openMenuProjectId = undefined;
    if (confirm(localizedText("ProjectList.close_this_only_removes_it_from_pi.32531eeb")`Close ${project.name}?\n\nThis only removes it from PI WEB; it will not change the project folder.`)) this.onClose?.(project);
  }

  static override styles = listStyles;
}
