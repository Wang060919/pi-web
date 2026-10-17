// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { trustApi, type Machine, type Project, type SessionInfo, type Workspace } from "../../api";
import type { MachineStatusSnapshot } from "../../../../shared/machineStatus";
import { machineStatusSnapshot } from "../../machineStatus.testSupport";
import { MachineList } from "../MachineList";
import { MachineSwitcher } from "../MachineSwitcher";
import { ProjectList } from "../ProjectList";
import { WorkspaceList } from "../WorkspaceList";
import { SessionList } from "../SessionList";
import { AppNavigationPanel, shouldShowMachinesSection } from "./AppNavigationPanel";

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("shouldShowMachinesSection", () => {
  it("hides machine navigation when there is no machine choice", () => {
    expect(shouldShowMachinesSection([])).toBe(false);
    expect(shouldShowMachinesSection([machine("local")])).toBe(false);
  });

  it("shows machine navigation when there are multiple machines", () => {
    expect(shouldShowMachinesSection([machine("local"), machine("remote-a")])).toBe(true);
  });
});

describe("header identity", () => {
  it("opens usage from the Pi mark only when a workspace is selected and uses the latest callback", async () => {
    const panel = await mountHeaderPanel([machine("local")]);
    const firstOpen = vi.fn();
    panel.onShowOverview = firstOpen;
    const mark = panel.shadowRoot?.querySelector<HTMLButtonElement>("button.brand-mark");
    if (mark == null) throw new Error("Expected overview entry on the Pi mark");
    expect(mark.disabled).toBe(true);
    expect(mark.getAttribute("aria-label")).toBe("Workspace overview");
    mark.click();
    expect(firstOpen).not.toHaveBeenCalled();

    panel.selectedWorkspace = workspace("ws-1", "project-1");
    await panel.updateComplete;
    expect(mark.disabled).toBe(false);
    mark.click();
    expect(firstOpen).toHaveBeenCalledOnce();

    const latestOpen = vi.fn();
    panel.onShowOverview = latestOpen;
    mark.click();
    expect(latestOpen).toHaveBeenCalledOnce();
    expect(firstOpen).toHaveBeenCalledOnce();
  });

  it("pairs the brand name with a decorative Pi mark", async () => {
    const panel = await mountHeaderPanel([machine("local")]);

    expect(panel.shadowRoot?.querySelector("header strong")?.textContent).toBe("PI WEB");
    expect(panel.shadowRoot?.querySelector(".brand .pi-mark")?.getAttribute("aria-hidden")).toBe("true");
    expect(panel.shadowRoot?.querySelector(".brand svg")).not.toBeNull();
    expect(panel.shadowRoot?.querySelector(".brand-domain")).toBeNull();
  });

  it("keeps the machine switcher visible with a single machine", async () => {
    const panel = await mountHeaderPanel([machine("local")]);

    expect(panel.shadowRoot?.querySelector("machine-switcher")).toBeInstanceOf(MachineSwitcher);
  });

  it("forwards the location-indicator flag to the machine switcher", async () => {
    const panel = await mountHeaderPanel([machine("local")], true);

    expect(section(panel, "machine-switcher", MachineSwitcher).locationIndicator).toBe(true);
  });
});

describe("machine status wiring", () => {
  it("gives machine sections every snapshot and project and workspace sections the selected machine's", async () => {
    const local = machineStatusSnapshot({ machine: { "core:working": true }, sessions: { "child-1": { "core:working": true } } });
    const remote = machineStatusSnapshot({ machine: { "core:unread": true } });
    const panel = await mountPanel({ local, "remote-a": remote }, machine("local"));

    expect(section(panel, "machine-switcher", MachineSwitcher).statusSnapshots).toEqual({ local, "remote-a": remote });
    expect(section(panel, "machine-list", MachineList).statusSnapshots).toEqual({ local, "remote-a": remote });
    expect(section(panel, "project-list", ProjectList).statusSnapshot).toBe(local);
    expect(section(panel, "workspace-list", WorkspaceList).statusSnapshot).toBe(local);
    expect(section(panel, "session-list", SessionList).sessionFlags).toBe(local.sessions);

    panel.selectedMachine = machine("remote-a");
    await panel.updateComplete;
    expect(section(panel, "session-list", SessionList).sessionFlags).toBe(remote.sessions);
  });

  it("reads the local machine's snapshot before a machine has been selected", async () => {
    // `selectedMachine` is undefined until machines load, and can stay undefined
    // if that load fails, while local project rows already render. The app keys
    // snapshots by `selectedMachine?.id ?? LOCAL_MACHINE_ID`, so this panel must
    // resolve the same id instead of blanking every indicator.
    const local = machineStatusSnapshot({ projects: { "project-1": { "core:working": true } } });
    const panel = await mountPanel({ local }, undefined);

    expect(section(panel, "project-list", ProjectList).statusSnapshot).toBe(local);
    expect(section(panel, "workspace-list", WorkspaceList).statusSnapshot).toBe(local);
  });

  it("leaves project and workspace sections without a snapshot when the selected machine has none", async () => {
    const panel = await mountPanel({ "remote-a": machineStatusSnapshot() }, machine("local"));

    expect(section(panel, "project-list", ProjectList).statusSnapshot).toBeUndefined();
    expect(section(panel, "workspace-list", WorkspaceList).statusSnapshot).toBeUndefined();
    expect(section(panel, "session-list", SessionList).sessionFlags).toBeUndefined();
  });
});

describe("stable list inputs", () => {
  it("skips unchanged lists on panel updates while invoking the latest callbacks", async () => {
    const panel = await mountPanel({}, machine("local"));
    const currentSession = session("session-1");
    panel.sessions = [currentSession];
    const oldSelect = vi.fn();
    panel.onSelectProject = oldSelect;
    panel.onSelectWorkspace = oldSelect;
    panel.onSelectSession = oldSelect;
    const projects = section(panel, "project-list", ProjectList);
    const workspaces = section(panel, "workspace-list", WorkspaceList);
    const sessions = section(panel, "session-list", SessionList);
    const lists = [projects, workspaces, sessions];
    const settle = async () => {
      await panel.updateComplete;
      await Promise.all(lists.map((list) => list.updateComplete));
    };
    await settle();
    // Render counts are the regression contract, not a proxy for visible output.
    const renders = lists.map((list) => vi.spyOn(list, "render"));
    const panelRender = vi.spyOn(panel, "render");
    panel.locationIndicator = true;
    await settle();
    expect(panelRender).toHaveBeenCalledOnce();
    for (const render of renders) expect(render).not.toHaveBeenCalled();

    const selectProject = vi.fn();
    const selectWorkspace = vi.fn();
    const selectSession = vi.fn();
    const focus = vi.fn();
    panel.onSelectProject = selectProject;
    panel.onSelectWorkspace = selectWorkspace;
    panel.onSelectSession = selectSession;
    panel.onFocusNavigationTarget = focus;
    panel.machines = [machine("local")];
    await settle();
    for (const render of renders) expect(render).not.toHaveBeenCalled();
    for (const list of lists) control(list, ".action-row").click();
    expect(selectProject).toHaveBeenCalledWith(panel.projects[0]);
    expect(selectWorkspace).toHaveBeenCalledWith(panel.workspaces[0]);
    expect(selectSession).toHaveBeenCalledWith(currentSession);
    expect(oldSelect).not.toHaveBeenCalled();

    control(projects, ".action-row").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(focus).not.toHaveBeenCalled();
    panel.machines = [machine("local"), machine("remote-a")];
    await settle();
    control(projects, ".action-row").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(focus).toHaveBeenCalledWith("machines");
  });

  it("still renders changed list data and workspace label providers", async () => {
    const panel = await mountPanel({}, machine("local"));
    const projects = section(panel, "project-list", ProjectList);
    const workspaces = section(panel, "workspace-list", WorkspaceList);
    const sessions = section(panel, "session-list", SessionList);
    await Promise.all([projects.updateComplete, workspaces.updateComplete, sessions.updateComplete]);
    panel.projects = [project("latest-project")];
    panel.workspaces = [workspace("latest-workspace", "latest-project")];
    panel.sessions = [session("latest-session")];
    await panel.updateComplete;
    await Promise.all([projects.updateComplete, workspaces.updateComplete, sessions.updateComplete]);
    expect(projects.shadowRoot?.textContent).toContain("latest-project");
    expect(workspaces.shadowRoot?.textContent).toContain("latest-workspace");
    expect(sessions.shadowRoot?.textContent).toContain("latest-session");

    panel.workspaceLabelItems = (workspace) => [{ type: "text", text: `Label for ${workspace.id}` }];
    await panel.updateComplete;
    await workspaces.updateComplete;
    expect(workspaces.shadowRoot?.textContent).toContain("Label for latest-workspace");
  });
});

describe("navigation order controls", () => {
  it("forwards moves and root-session pins without selecting an item", async () => {
    vi.spyOn(trustApi, "workspaceTrust").mockResolvedValue({ path: "/repo/first", decision: null, trusted: false });
    const panel = await mountPanel({}, machine("local"));
    panel.projects = [project("first"), project("second")];
    panel.workspaces = [workspace("first", "first"), workspace("second", "first")];
    panel.sessions = [session("root")];
    panel.onMoveProject = vi.fn();
    panel.onMoveWorkspace = vi.fn();
    panel.onPinSession = vi.fn();
    panel.onSelectSession = vi.fn();
    await panel.updateComplete;
    const projects = section(panel, "project-list", ProjectList);
    const workspaces = section(panel, "workspace-list", WorkspaceList);
    const sessions = section(panel, "session-list", SessionList);
    await Promise.all([projects.updateComplete, workspaces.updateComplete, sessions.updateComplete]);
    for (const list of [projects, workspaces]) {
      control(list, ".action-menu-toggle").click();
      await list.updateComplete;
      menuButton(list, "Move down").click();
    }
    expect(panel.onMoveProject).toHaveBeenCalledWith(panel.projects[0], 1);
    expect(panel.onMoveWorkspace).toHaveBeenCalledWith(panel.workspaces[0], 1);
    control(sessions, ".action-menu-toggle").click();
    await sessions.updateComplete;
    menuButton(sessions, "Pin session").click();
    expect(panel.onPinSession).toHaveBeenCalledWith(panel.sessions[0]);
    expect(panel.onSelectSession).not.toHaveBeenCalled();

    panel.pinnedRootIds = ["root"];
    await panel.updateComplete;
    await sessions.updateComplete;
    expect(sessions.pinnedRootIds).toEqual(["root"]);
    expect(panel.shadowRoot?.textContent).not.toContain("Saving navigation order");
    expect(panel.shadowRoot?.querySelector(".order-status")).toBeNull();
  });
});

describe("desktop context selectors", () => {
  it("offers one desktop new-session entry and keeps the original control in compact navigation", async () => {
    const panel = await mountDesktopPanel();
    const sessions = section(panel, "session-list", SessionList);
    await sessions.updateComplete;
    const start = panel.renderRoot.querySelector<HTMLButtonElement>(".new-session");
    if (start === null) throw new Error("Expected the desktop new-session entry");
    expect(start.disabled).toBe(true);
    expect(sessions.shadowRoot?.querySelector(".start-session-button")).toBeNull();

    const first = vi.fn();
    panel.onStartSession = first;
    panel.canStartSession = true;
    await panel.updateComplete;
    start.click();
    expect(first).toHaveBeenCalledOnce();
    const latest = vi.fn();
    panel.onStartSession = latest;
    start.click();
    expect(latest).toHaveBeenCalledOnce();
    expect(first).toHaveBeenCalledOnce();

    panel.compact = true;
    await panel.updateComplete;
    await sessions.updateComplete;
    expect(panel.shadowRoot?.querySelector(".new-session")).toBeNull();
    expect(sessions.shadowRoot?.querySelector(".start-session-button")).not.toBeNull();
  });

  it("keeps project and workspace summaries above the session list until a selector opens", async () => {
    const panel = await mountDesktopPanel();

    expect(contextControl(panel, "projects").textContent).toContain("project-1");
    expect(contextControl(panel, "workspaces").textContent).toContain("ws-1");
    expect(contextControl(panel, "workspaces").title).toBe("/repo/ws-1");
    expect(panel.shadowRoot?.querySelector("project-list")).toBeNull();
    expect(panel.shadowRoot?.querySelector("workspace-list")).toBeNull();
    expect(section(panel, "session-list", SessionList).sessions).toEqual(panel.sessions);

    contextControl(panel, "projects").click();
    await panel.updateComplete;
    expect(contextControl(panel, "projects").getAttribute("aria-expanded")).toBe("true");
    expect(section(panel, "project-list", ProjectList).projects).toBe(panel.projects);
    expect(panel.shadowRoot?.querySelector("workspace-list")).toBeNull();
  });

  it("focuses the selected row for keyboard navigation and returns focus to its trigger on Escape", async () => {
    const panel = await mountDesktopPanel();
    panel.projects = [project("other"), ...panel.projects];
    panel.onCancelKeyboardNavigation = vi.fn();
    await panel.updateComplete;

    expect(await panel.focusSection("projects")).toBe(true);
    const projects = section(panel, "project-list", ProjectList);
    const selectedRow = control(projects, ".action-row.selected");
    expect(projects.shadowRoot?.activeElement).toBe(selectedRow);
    selectedRow.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
    await panel.updateComplete;

    expect(panel.shadowRoot?.querySelector("modal-surface")).toBeNull();
    expect(panel.shadowRoot?.activeElement).toBe(contextControl(panel, "projects"));
    expect(panel.onCancelKeyboardNavigation).not.toHaveBeenCalled();
  });

  it("keeps an empty selector accessible and closes it from the dialog Escape route", async () => {
    const panel = await mountDesktopPanel();
    panel.projects = [];
    panel.selectedProject = undefined;
    await panel.updateComplete;

    expect(await panel.focusSection("projects")).toBe(true);
    const close = panel.shadowRoot?.querySelector(".picker-close");
    expect(panel.shadowRoot?.activeElement).toBe(close);
    close?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
    await panel.updateComplete;
    expect(panel.shadowRoot?.querySelector("modal-surface")).toBeNull();
    expect(panel.shadowRoot?.activeElement).toBe(contextControl(panel, "projects"));
  });

  it.each(["machine", "project", "workspace", "compact"] as const)("dismisses an open selector when the %s context changes", async (context) => {
    const panel = await mountDesktopPanel();
    expect(await panel.focusSection("projects")).toBe(true);
    if (context === "machine") panel.selectedMachine = machine("remote-a");
    if (context === "project") panel.selectedProject = project("other");
    if (context === "workspace") panel.selectedWorkspace = workspace("other", "project-1");
    if (context === "compact") panel.compact = true;
    await panel.updateComplete;

    expect(panel.shadowRoot?.querySelector("modal-surface")).toBeNull();
    if (context !== "compact") expect(panel.shadowRoot?.activeElement).toBe(contextControl(panel, "projects"));
  });

  it("retains an open selector during same-context data refreshes", async () => {
    const panel = await mountDesktopPanel();
    expect(await panel.focusSection("projects")).toBe(true);
    panel.selectedMachine = machine("local");
    panel.selectedProject = project("project-1");
    panel.selectedWorkspace = workspace("ws-1", "project-1");
    await panel.updateComplete;

    expect(panel.shadowRoot?.querySelector("modal-surface")).not.toBeNull();
    expect(contextControl(panel, "projects").getAttribute("aria-expanded")).toBe("true");
  });

  it("preserves management, machine status, and plugin label inputs in the workspace selector", async () => {
    vi.spyOn(trustApi, "workspaceTrust").mockResolvedValue({ path: "/repo/ws-1", decision: null, trusted: false });
    const panel = await mountDesktopPanel();
    const snapshot = machineStatusSnapshot({ workspaces: { "ws-1": { "core:working": true } } });
    panel.machineStatusSnapshots = { local: snapshot };
    panel.workspaces = [...panel.workspaces, workspace("ws-2", "project-1")];
    panel.deletingWorkspaceIds = ["another-workspace"];
    panel.workspaceLabelItems = () => [{ type: "text", text: "Plugin workspace label" }];
    panel.onMoveWorkspace = vi.fn();
    panel.onSelectWorkspace = vi.fn();
    panel.projectsCollapsed = true;
    panel.workspacesCollapsed = true;
    await panel.updateComplete;

    expect(await panel.focusSection("workspaces")).toBe(true);
    const workspaces = section(panel, "workspace-list", WorkspaceList);
    expect(workspaces.collapsed).toBe(false);
    expect(workspaces.collapsible).toBe(false);
    expect(workspaces.machineId).toBe("local");
    expect(workspaces.statusSnapshot).toBe(snapshot);
    expect(workspaces.deletingWorkspaceIds).toBe(panel.deletingWorkspaceIds);
    expect(workspaces.shadowRoot?.textContent).toContain("Plugin workspace label");

    control(workspaces, ".action-menu-toggle").click();
    await workspaces.updateComplete;
    menuButton(workspaces, "Move down").click();
    expect(panel.onMoveWorkspace).toHaveBeenCalledWith(panel.workspaces[0], 1);
    expect(panel.shadowRoot?.querySelector("modal-surface")).not.toBeNull();
    control(workspaces, ".action-row").click();
    await panel.updateComplete;
    await Promise.resolve();
    expect(panel.onSelectWorkspace).toHaveBeenCalledWith(panel.workspaces[0]);
    expect(panel.shadowRoot?.querySelector("modal-surface")).toBeNull();
  });

  it("closes a picker before forwarding keyboard navigation to another section", async () => {
    const panel = await mountDesktopPanel();
    const focus = vi.fn();
    panel.onFocusNavigationTarget = focus;
    expect(await panel.focusSection("projects")).toBe(true);
    const projects = section(panel, "project-list", ProjectList);

    control(projects, ".action-row").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }));
    await panel.updateComplete;
    await Promise.resolve();
    expect(panel.shadowRoot?.querySelector("modal-surface")).toBeNull();
    expect(focus).toHaveBeenCalledWith("workspaces");
  });
});

function contextControl(panel: AppNavigationPanel, context: "projects" | "workspaces"): HTMLButtonElement {
  const button = panel.shadowRoot?.querySelector(`[data-context="${context}"]`);
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing ${context} selector`);
  return button;
}

async function mountDesktopPanel(): Promise<AppNavigationPanel> {
  const panel = new AppNavigationPanel();
  panel.machines = [machine("local"), machine("remote-a")];
  panel.selectedMachine = panel.machines[0];
  panel.projects = [project("project-1")];
  panel.selectedProject = panel.projects[0];
  panel.workspaces = [workspace("ws-1", "project-1")];
  panel.selectedWorkspace = panel.workspaces[0];
  panel.sessions = [session("session-1")];
  document.body.append(panel);
  await panel.updateComplete;
  return panel;
}

function menuButton(list: ProjectList | WorkspaceList | SessionList, text: string): HTMLButtonElement {
  const button = [...(list.shadowRoot?.querySelectorAll("button") ?? [])].find((item) => item.textContent.trim() === text);
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing ${text}`);
  return button;
}

function control(list: ProjectList | WorkspaceList | SessionList, selector: string): HTMLElement {
  const element = list.shadowRoot?.querySelector(selector);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
  return element;
}

function session(id: string): SessionInfo {
  return {
    id, path: `/sessions/${id}.jsonl`, cwd: "/workspace",
    created: "2026-06-09T00:00:00.000Z", modified: "2026-06-09T00:00:00.000Z",
    messageCount: 1, firstMessage: id,
  };
}

async function mountPanel(machineStatusSnapshots: Record<string, MachineStatusSnapshot>, selectedMachine: Machine | undefined): Promise<AppNavigationPanel> {
  const panel = new AppNavigationPanel();
  panel.compact = true;
  panel.machines = [machine("local"), machine("remote-a")];
  if (selectedMachine !== undefined) panel.selectedMachine = selectedMachine;
  panel.projects = [project("project-1")];
  panel.workspaces = [workspace("ws-1", "project-1")];
  panel.machineStatusSnapshots = machineStatusSnapshots;
  document.body.append(panel);
  await panel.updateComplete;
  return panel;
}

function section<T>(panel: AppNavigationPanel, selector: string, type: abstract new (...args: never) => T): T {
  const element = panel.shadowRoot?.querySelector(selector);
  if (!(element instanceof type)) throw new Error(`Expected a ${selector} section`);
  return element;
}

async function mountHeaderPanel(machines: Machine[], locationIndicator = false): Promise<AppNavigationPanel> {
  const panel = new AppNavigationPanel();
  panel.machines = machines;
  panel.locationIndicator = locationIndicator;
  document.body.append(panel);
  await panel.updateComplete;
  return panel;
}

function machine(id: string): Machine {
  return {
    id,
    name: id,
    kind: id === "local" ? "local" : "remote",
    createdAt: "2026-06-04T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z",
  };
}

function project(id: string): Project {
  return { id, name: id, path: `/repo/${id}`, createdAt: "2026-06-04T00:00:00.000Z" };
}

function workspace(id: string, projectId: string): Workspace {
  return { id, projectId, path: `/repo/${id}`, label: id, isMain: true, effectiveConfig: {} };
}
