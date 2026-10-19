// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { PromptEditor } from "./PromptEditor";

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("mobile composer options", () => {
  it("exposes a labeled disclosure without replacing the editor or losing draft/focus and preserves context actions", async () => {
    const editor = new PromptEditor();
    editor.cwd = "/repo";
    editor.onSelectMachine = vi.fn();
    editor.onSelectWorkspace = vi.fn();
    editor.onStop = vi.fn();
    editor.canStop = true;
    document.body.append(editor);
    await editor.updateComplete;
    editor.replaceText("Keep this unsent draft");
    const input = editor.view;
    const toggle = editor.renderRoot.querySelector<HTMLButtonElement>(".mobile-options-toggle");
    if (toggle === null) throw new Error("Missing options control");
    expect(toggle.getAttribute("aria-label")).toBeTruthy();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    for (const id of toggle.getAttribute("aria-controls")?.split(" ") ?? []) {
      expect(editor.renderRoot.querySelector(`#${id}`)).not.toBeNull();
    }
    toggle.focus();
    toggle.click();
    await editor.updateComplete;
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(editor.shadowRoot?.activeElement).toBe(toggle);
    expect(editor.view).toBe(input);
    expect(editor.view?.state.doc.toString()).toBe("Keep this unsent draft");
    editor.renderRoot.querySelector<HTMLButtonElement>(".machine-chip")?.click();
    editor.renderRoot.querySelector<HTMLButtonElement>(".folder-chip")?.click();
    editor.renderRoot.querySelector<HTMLButtonElement>(".stop-button")?.click();
    expect(editor.onSelectMachine).toHaveBeenCalledOnce();
    expect(editor.onSelectWorkspace).toHaveBeenCalledOnce();
    expect(editor.onStop).toHaveBeenCalledOnce();
    toggle.click();
    await editor.updateComplete;
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(editor.view?.state.doc.toString()).toBe("Keep this unsent draft");
  });
});
