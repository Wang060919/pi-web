// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SkillCatalog, SkillDocument, SessionInspection } from "../../../shared/runtimeInspection";
import { runtimeInspectionApi } from "../api/runtimeInspection";
import { SettingsSkillsPanel } from "./settings/SettingsSkillsPanel";
import { SessionInspectionPanel } from "./SessionInspectionPanel";
import type { FormattedText } from "./FormattedText";

afterEach(() => { document.body.replaceChildren(); localStorage.clear(); vi.restoreAllMocks(); });
const catalog: SkillCatalog = { projectTrusted: true, diagnostics: [], skills: [{ id: "one", name: "review", description: "Review source", path: "/skills/review/SKILL.md", scope: "project", source: "auto", modelInvocation: false }] };
const snapshot: SessionInspection = { source: "active-runtime", systemPrompt: "<script>literal instructions</script>", tools: [{ name: "read", description: "Read a file", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } }] };
function button(element: HTMLElement, text: string): HTMLButtonElement {
  const result = Array.from(element.shadowRoot?.querySelectorAll("button") ?? []).find((button) => button.textContent.includes(text));
  if (result === undefined) throw new Error(`Missing button: ${text}`);
  return result;
}

describe("inspection panels", () => {
  it("browses a skill and linked Markdown without treating instructions as executable HTML", async () => {
    vi.spyOn(runtimeInspectionApi, "skills").mockResolvedValue(catalog);
    const read = vi.spyOn(runtimeInspectionApi, "document").mockResolvedValueOnce({ path: "SKILL.md", content: "---\nname: review\n---\n# Review\n[Guide](refs/guide.md)\n<script>alert('x')</script>" }).mockResolvedValueOnce({ path: "refs/guide.md", content: "# Linked guide" });
    const panel = new SettingsSkillsPanel(); panel.machineId = "remote"; panel.projectId = "p"; panel.workspaceId = "w";
    document.body.append(panel);
    await vi.waitFor(() => { expect(panel.shadowRoot?.textContent).toContain("Explicit invocation only"); });
    button(panel, "review").click();
    await vi.waitFor(() => { expect(panel.shadowRoot?.querySelector("formatted-text")).not.toBeNull(); });
    const text = panel.shadowRoot?.querySelector<FormattedText>("formatted-text");
    await text?.updateComplete;
    expect(text?.shadowRoot?.querySelector("script")).toBeNull();
    expect(text?.shadowRoot?.textContent).not.toContain("name: review");
    const link = text?.shadowRoot?.querySelector<HTMLAnchorElement>("a");
    expect(link?.textContent).toBe("Guide"); link?.click();
    await vi.waitFor(() => { expect(read).toHaveBeenLastCalledWith("remote", { projectId: "p", workspaceId: "w" }, "one", expect.any(AbortSignal), "refs/guide.md"); });
    await vi.waitFor(() => { expect(panel.shadowRoot?.textContent).toContain("refs/guide.md"); });
    button(panel, "Source").click(); await panel.updateComplete;
    expect(panel.shadowRoot?.querySelector("pre")?.textContent).toBe("# Linked guide");
  });

  it("cancels a skill read and discards its late response when the target machine changes", async () => {
    vi.spyOn(runtimeInspectionApi, "skills").mockResolvedValueOnce(catalog).mockResolvedValueOnce({ skills: [], diagnostics: [], projectTrusted: false });
    let finish!: (document: SkillDocument) => void;
    const read = vi.spyOn(runtimeInspectionApi, "document").mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const panel = new SettingsSkillsPanel(); document.body.append(panel);
    await vi.waitFor(() => { expect(panel.shadowRoot?.textContent).toContain("review"); });
    button(panel, "review").click(); panel.machineId = "next"; await panel.updateComplete;
    finish({ path: "SKILL.md", content: "old machine private instructions" });
    await vi.waitFor(() => { expect(panel.shadowRoot?.textContent).toContain("No matching skills"); });
    expect(read.mock.calls[0]?.[3].aborted).toBe(true);
    expect(panel.shadowRoot?.textContent).not.toContain("old machine");
    expect(panel.shadowRoot?.querySelector("formatted-text")).toBeNull();
  });

  it("renders literal runtime prompts, active tool schemas and refreshed values", async () => {
    const inspect = vi.spyOn(runtimeInspectionApi, "session").mockResolvedValueOnce(snapshot).mockResolvedValueOnce({ ...snapshot, tools: [] });
    const panel = new SessionInspectionPanel(); panel.machineId = "remote"; panel.session = { id: "s", cwd: "/repo" }; document.body.append(panel);
    await vi.waitFor(() => { expect(panel.shadowRoot?.querySelector("pre")?.textContent).toBe(snapshot.systemPrompt); });
    expect(panel.shadowRoot?.querySelector("script")).toBeNull();
    expect(inspect).toHaveBeenCalledWith("remote", { id: "s", cwd: "/repo" }, expect.any(AbortSignal));
    button(panel, "Active tools").click(); await panel.updateComplete;
    expect(panel.shadowRoot?.querySelector("summary")?.textContent).toBe("read");
    expect(panel.shadowRoot?.querySelector("pre")?.textContent).toContain('"required"');
    button(panel, "Refresh").click();
    await vi.waitFor(() => { expect(panel.shadowRoot?.textContent).toContain("No matching active tools"); });
    expect(panel.shadowRoot?.textContent).toContain("Active tools (0)");
  });

  it("discards stale session responses and reports an unavailable runtime with retry", async () => {
    let finish!: (snapshot: SessionInspection) => void;
    const inspect = vi.spyOn(runtimeInspectionApi, "session").mockReturnValueOnce(new Promise((resolve) => { finish = resolve; })).mockRejectedValueOnce(new Error("No active runtime"));
    const panel = new SessionInspectionPanel(); panel.session = { id: "a", cwd: "/a" }; document.body.append(panel); await panel.updateComplete;
    panel.session = { id: "b", cwd: "/b" }; await panel.updateComplete; finish(snapshot);
    await vi.waitFor(() => { expect(panel.shadowRoot?.querySelector('[role="alert"]')?.textContent).toContain("No active runtime"); });
    expect(inspect.mock.calls[0]?.[2].aborted).toBe(true);
    expect(panel.shadowRoot?.querySelector("pre")).toBeNull();
    inspect.mockResolvedValueOnce(snapshot); button(panel, "Refresh").click();
    await vi.waitFor(() => { expect(panel.shadowRoot?.querySelector("pre")?.textContent).toBe(snapshot.systemPrompt); });
  });
});
