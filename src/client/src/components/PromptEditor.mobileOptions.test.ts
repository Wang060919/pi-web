// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { PromptEditor } from "./PromptEditor";

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("mobile composer options entry", () => {
  it("requests the app's dialog without replacing the input, changing draft or invoking send/stop", async () => {
    const editor = new PromptEditor();
    editor.onOpenMobileOptions = vi.fn();
    editor.onSend = vi.fn();
    editor.onStop = vi.fn();
    document.body.append(editor);
    await editor.updateComplete;
    editor.replaceText("Keep this unsent draft");
    const input = editor.view;
    const toggle = editor.renderRoot.querySelector<HTMLButtonElement>(".mobile-options-toggle");
    if (toggle === null) throw new Error("Missing options control");
    expect(toggle.getAttribute("aria-haspopup")).toBe("dialog");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    toggle.focus();
    toggle.click();
    expect(editor.onOpenMobileOptions).toHaveBeenCalledOnce();
    editor.mobileOptionsOpen = true;
    await editor.updateComplete;
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(editor.shadowRoot?.activeElement).toBe(toggle);
    expect(editor.view).toBe(input);
    expect(editor.view?.state.doc.toString()).toBe("Keep this unsent draft");
    expect(editor.onSend).not.toHaveBeenCalled();
    expect(editor.onStop).not.toHaveBeenCalled();
  });
});
