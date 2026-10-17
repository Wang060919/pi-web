// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { MCP_REDACTED_VALUE, type McpManagementSnapshot } from "../../../../shared/mcpManagement";
import { mcpManagementApi } from "../../api/mcpManagement";
import { SettingsMcpPanel } from "./SettingsMcpPanel";

const snapshot: McpManagementSnapshot = {
  servers: [{ name: "docs", scope: "global", source: "/agent/mcp.json", revision: "r1", config: { url: "https://example.com/mcp", headers: { "X-Key": MCP_REDACTED_VALUE } }, enabled: true, overridden: false }],
  revisions: { global: "r1" }, projectTrusted: false, hasProject: false, errors: [], requiresReload: true,
};
afterEach(() => { document.body.replaceChildren(); localStorage.clear(); vi.restoreAllMocks(); });

async function mount() {
  vi.spyOn(mcpManagementApi, "list").mockResolvedValue(snapshot);
  const panel = new SettingsMcpPanel();
  document.body.append(panel);
  await vi.waitFor(() => { expect(panel.shadowRoot?.textContent).toContain("docs"); });
  return panel;
}
function button(panel: SettingsMcpPanel, text: string): HTMLButtonElement {
  const button = Array.from(panel.shadowRoot?.querySelectorAll("button") ?? []).find((button) => button.textContent.trim() === text);
  if (button === undefined) throw new Error(`Missing button ${text}`);
  return button;
}

describe("MCP settings panel", () => {
  it("shows a friendly response error and clears it after a successful retry", async () => {
    const list = vi.spyOn(mcpManagementApi, "list")
      .mockRejectedValueOnce(new SyntaxError("Unexpected token '<', HTML is not JSON"))
      .mockResolvedValue(snapshot);
    const panel = new SettingsMcpPanel();
    document.body.append(panel);
    await vi.waitFor(() => { expect(panel.shadowRoot?.querySelector('[role="alert"]')?.textContent).toBe("MCP request failed"); });
    expect(panel.shadowRoot?.textContent).not.toContain("Unexpected token");
    expect(panel.shadowRoot?.textContent).not.toContain("Working…");
    expect(button(panel, "Add server").disabled).toBe(true);

    button(panel, "Refresh").click();
    await vi.waitFor(() => { expect(panel.shadowRoot?.textContent).toContain("docs"); });
    expect(list).toHaveBeenCalledTimes(2);
    expect(panel.shadowRoot?.querySelector('[role="alert"]')).toBeNull();
    expect(button(panel, "Add server").disabled).toBe(false);
  });

  it("keeps malformed configuration editable and does not send it to the server", async () => {
    const save = vi.spyOn(mcpManagementApi, "save").mockResolvedValue(snapshot);
    const panel = await mount();
    button(panel, "Add server").click();
    await panel.updateComplete;
    const configuration = panel.shadowRoot?.querySelector<HTMLTextAreaElement>("textarea");
    const form = panel.shadowRoot?.querySelector("form.editor");
    if (configuration === undefined || configuration === null || form === undefined || form === null) throw new Error("Missing MCP editor");
    configuration.value = "not valid JSON";
    configuration.dispatchEvent(new Event("input", { bubbles: true }));
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    await panel.updateComplete;
    await vi.waitFor(() => { expect(panel.shadowRoot?.querySelector('[role="alert"]')?.textContent).toBe("Server configuration must be a JSON object"); });
    expect(configuration.value).toBe("not valid JSON");
    expect(save).not.toHaveBeenCalled();
  });

  it("separates configured state from connection test results", async () => {
    vi.spyOn(mcpManagementApi, "test").mockResolvedValue({ state: "connected", checkedAt: "2026-01-01T00:00:00Z", tools: [{ name: "search", description: "Search docs" }] });
    const panel = await mount();
    expect(panel.shadowRoot?.textContent).toContain("Configured enabled");
    expect(panel.shadowRoot?.textContent).toContain("Not tested in this panel");
    button(panel, "Test connection").click();
    await vi.waitFor(() => { expect(panel.shadowRoot?.textContent).toContain("Last connection test"); });
    expect(panel.shadowRoot?.textContent).toContain("search");
    expect(panel.shadowRoot?.textContent).toContain("/reload");
  });

  it("sends masked fields unchanged when disabling a server", async () => {
    const save = vi.spyOn(mcpManagementApi, "save").mockResolvedValue({ ...snapshot, servers: [{ ...snapshot.servers[0], name: "docs", scope: "global", source: "/agent/mcp.json", revision: "r2", config: { url: "https://example.com/mcp" }, enabled: false, overridden: false }] });
    const panel = await mount();
    button(panel, "Disable").click();
    await vi.waitFor(() => { expect(save).toHaveBeenCalledOnce(); });
    expect(save).toHaveBeenCalledWith("local", { projectId: undefined, workspaceId: undefined }, "docs", { scope: "global", revision: "r1", config: { ...snapshot.servers[0]?.config, enabled: false } });
  });

  it("does not replace a new machine's panel with a stale response", async () => {
    let resolveOld: ((value: McpManagementSnapshot) => void) | undefined;
    vi.spyOn(mcpManagementApi, "list").mockImplementation((machineId) => machineId === "local"
      ? new Promise((resolve) => { resolveOld = resolve; })
      : Promise.resolve({ ...snapshot, servers: [] }));
    const panel = new SettingsMcpPanel();
    document.body.append(panel);
    await panel.updateComplete;
    panel.machineId = "remote";
    await panel.updateComplete;
    await vi.waitFor(() => { expect(panel.shadowRoot?.textContent).toContain("No MCP servers configured"); });
    resolveOld?.(snapshot);
    await panel.updateComplete;
    expect(panel.shadowRoot?.textContent).not.toContain("docs");
  });
});
