// @vitest-environment happy-dom

import { html } from "lit";
import { afterEach, expect, it, vi } from "vitest";
import { WorkspacePanel } from "./WorkspacePanel";

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

it("keeps an unpinned tool open while essential tabs and More remain usable", async () => {
  const panel = new WorkspacePanel();
  panel.panels = [
    { id: "files:workspace.files", title: "Files", render: () => html`Files content` },
    { id: "pi-web.terminal:workspace.terminal", title: "Terminal", render: () => html`Terminal content` },
    { id: "tasks:workspace.tasks", title: "Tasks", render: () => html`Tasks content` },
  ];
  panel.tool = "tasks:workspace.tasks";
  panel.useDefaultPins = true;
  panel.onShowNavigation = vi.fn();
  panel.onSelectTool = vi.fn();
  document.body.append(panel);
  await panel.updateComplete;
  expect([...panel.shadowRoot?.querySelectorAll(".tabs button") ?? []].map((button) => button.getAttribute("aria-label"))).toEqual(["Files", "Terminal"]);
  expect(panel.shadowRoot?.querySelector(".panel-content")?.textContent).toContain("Tasks content");
  const more = panel.shadowRoot?.querySelector<HTMLButtonElement>('button[aria-label="Navigation"]');
  expect(more?.textContent).toContain("More");
  expect(more?.classList.contains("selected")).toBe(true);
  more?.click();
  expect(panel.onShowNavigation).toHaveBeenCalledOnce();
  panel.shadowRoot?.querySelector<HTMLButtonElement>('button[aria-label="Terminal"]')?.click();
  expect(panel.onSelectTool).toHaveBeenCalledWith("pi-web.terminal:workspace.terminal");
});
