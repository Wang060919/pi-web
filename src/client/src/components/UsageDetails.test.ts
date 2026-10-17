// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionStatus } from "../api";
import { UsageDetails } from "./UsageDetails";
import { deepActiveElement, requiredElement, settleRenderedDialog } from "./modalSurfaceTestSupport";

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("UsageDetails context sources", () => {
  it("shows authoritative full paths and keeps available skills in a keyboard-focusable collapsed group", async () => {
    const details = await mount((element) => {
      element.status = { ...status(), contextSources: {
        source: "runtime-resource-loader",
        agentFiles: [{ path: "/workspace/AGENTS.md" }, { path: "/home/user/.pi/agent/AGENTS.md" }],
        systemPromptFiles: [{ path: "/agent/SYSTEM.md", kind: "system" }, { path: "/agent/APPEND_SYSTEM.md", kind: "append-system" }],
        availableSkills: [{ name: "review", path: "/skills/review/SKILL.md", modelInvocation: false }],
      } };
    });
    const skills = requiredElement(details.shadowRoot?.querySelector<HTMLDetailsElement>(".skills"), "skills group");
    const summary = requiredElement(skills.querySelector<HTMLElement>("summary"), "skills summary");

    expect(Array.from(details.shadowRoot?.querySelectorAll(".path") ?? [], (path) => path.textContent)).toEqual([
      "/workspace/AGENTS.md", "/home/user/.pi/agent/AGENTS.md", "/agent/SYSTEM.md", "/agent/APPEND_SYSTEM.md", "/skills/review/SKILL.md",
    ]);
    expect(skills.open).toBe(false);
    expect(skills.textContent).toContain("Available skills");
    expect(skills.textContent).toContain("Explicit invocation only");
    expect(details.shadowRoot?.textContent).toContain("Extensions can adjust the final prompt");
    summary.focus();
    expect(deepActiveElement()).toBe(summary);
    expect(summary.getAttribute("tabindex")).toBe("0");
  });

  it("distinguishes older-daemon metadata from supported empty collections", async () => {
    const details = await mount();
    expect(details.shadowRoot?.querySelector(".unavailable")?.textContent).toContain("Update and restart its session daemon");
    expect(details.shadowRoot?.querySelector(".skills")).toBeNull();

    details.status = { ...status(), contextSources: { source: "runtime-resource-loader", agentFiles: [], availableSkills: [] } };
    await details.updateComplete;
    expect(details.shadowRoot?.querySelector(".unavailable")).toBeNull();
    expect(details.shadowRoot?.textContent).toContain("This runtime does not report these sources.");
    expect(details.shadowRoot?.textContent).toContain("None reported");
    expect(details.shadowRoot?.querySelector(".skills .count")?.textContent).toBe("0");
  });

  it("states transcript and compaction limits and renders image metadata without payloads", async () => {
    const details = await mount((element) => {
      element.status = { ...status(), isCompacting: true };
      element.historyPartial = true;
      element.messages = [
        { role: "user", parts: [{ type: "image", mimeType: "image/png", data: "private-image-payload" }] },
        { role: "system", source: "compaction", parts: [{ type: "text", text: "private-compaction-body" }] },
      ];
    });

    expect(details.shadowRoot?.textContent).toContain("Based on messages loaded in this browser");
    expect(details.shadowRoot?.textContent).toContain("Earlier messages are not loaded");
    expect(details.shadowRoot?.textContent).toContain("Compaction summary appears in loaded history");
    expect(details.shadowRoot?.querySelector('[role="status"]')?.textContent).toBe("Compacting context…");
    expect(details.shadowRoot?.querySelector(".observations")?.textContent).toContain("image/png × 1");
    expect(details.shadowRoot?.textContent).not.toContain("private-image-payload");
    expect(details.shadowRoot?.textContent).not.toContain("private-compaction-body");
  });
});

async function mount(configure?: (element: UsageDetails) => void): Promise<UsageDetails> {
  const details = new UsageDetails();
  details.status = status();
  configure?.(details);
  document.body.append(details);
  await settleRenderedDialog(details);
  return details;
}

function status(): SessionStatus {
  return {
    sessionId: "context-session", isStreaming: false, isCompacting: false, isBashRunning: false,
    pendingMessageCount: 0, queuedMessages: [],
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, cost: 0,
  };
}
