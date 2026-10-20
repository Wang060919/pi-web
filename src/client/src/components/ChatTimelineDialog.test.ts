// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { ChatTimelineDialog } from "./ChatTimelineDialog";
import { ModalSurface } from "./ModalSurface";

afterEach(() => { document.body.replaceChildren(); });

it("lists loaded turns with previews/current location and restores opener on cancel", async () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();
  const dialog = new ChatTimelineDialog();
  dialog.entries = [{ key: "a", index: 40, title: "First question", preview: "Answer preview" }, { key: "b", index: 42, title: "Next question", preview: "" }];
  dialog.currentKey = "b";
  dialog.onSelect = vi.fn();
  dialog.onClose = () => { dialog.remove(); };
  document.body.append(dialog);
  await dialog.updateComplete;
  const surface = dialog.renderRoot.querySelector("modal-surface");
  if (!(surface instanceof ModalSurface)) throw new Error("Missing modal surface");
  await surface.updateComplete;
  const rows = dialog.renderRoot.querySelectorAll<HTMLButtonElement>(".entry");
  expect(rows).toHaveLength(2);
  expect(dialog.renderRoot.textContent).toContain("Loaded messages");
  expect(rows[0]?.textContent).toContain("Answer preview");
  expect(rows[1]?.getAttribute("aria-current")).toBe("location");
  rows[0]?.click();
  expect(dialog.onSelect).toHaveBeenCalledWith(dialog.entries[0]);
  rows[1]?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true, cancelable: true }));
  expect(dialog.isConnected).toBe(false);
  expect(document.activeElement).toBe(opener);
});
