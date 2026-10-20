// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComposerOptionsDialog } from "./ComposerOptionsDialog";
import { ModalSurface } from "./ModalSurface";

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

async function mount() {
  const opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();
  const dialog = new ComposerOptionsDialog();
  dialog.navigationEnabled = true;
  dialog.hasWorkspace = true;
  dialog.machineLabel = "Local";
  dialog.workspaceLabel = "/repo";
  dialog.thinkingLabel = "High";
  dialog.onSelect = vi.fn();
  dialog.onClose = () => { dialog.remove(); };
  document.body.append(dialog);
  await dialog.updateComplete;
  const surface = dialog.renderRoot.querySelector("modal-surface");
  if (!(surface instanceof ModalSurface)) throw new Error("Missing modal surface");
  await surface.updateComplete;
  return { dialog, opener, surface };
}

describe("composer options sheet", () => {
  it("names its modal, focuses close, traps Tab and restores its opener on Escape", async () => {
    const { dialog, opener, surface } = await mount();
    expect(surface.renderRoot.querySelector('[role="dialog"]')?.getAttribute("aria-label")).toBe("More");
    const close = dialog.renderRoot.querySelector<HTMLButtonElement>(".close");
    expect(dialog.shadowRoot?.activeElement).toBe(close);
    const last = dialog.renderRoot.querySelector<HTMLButtonElement>('[data-action="thinking"]');
    last?.focus();
    last?.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, composed: true, cancelable: true }));
    expect(dialog.shadowRoot?.activeElement).toBe(close);
    close?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true, cancelable: true }));
    expect(dialog.isConnected).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it("routes every action and allows backdrop cancellation", async () => {
    const { dialog, opener, surface } = await mount();
    for (const action of ["top", "end", "timeline", "machine", "workspace", "thinking"]) {
      dialog.renderRoot.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)?.click();
      expect(dialog.onSelect).toHaveBeenLastCalledWith(action);
    }
    surface.renderRoot.querySelector(".backdrop")?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(dialog.isConnected).toBe(false);
    expect(document.activeElement).toBe(opener);
  });
});
