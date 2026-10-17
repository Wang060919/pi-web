// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { quotedSelectionPrompt, selectedTextIn } from "./quotedSelection";

afterEach(() => { document.getSelection()?.removeAllRanges(); document.body.replaceChildren(); vi.restoreAllMocks(); });

describe("quoted chat selections", () => {
  it("quotes every line, including blank lines, while preserving internal indentation", () => {
    expect(quotedSelectionPrompt("  first line\r\n\r\n  indented line\nlast line  ")).toBe("> first line\n> \n>   indented line\n> last line\n\n");
  });

  it("reads the selected text from its own shadow root rather than another selection", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = host.attachShadow({ mode: "open" });
    const content = document.createElement("span");
    content.textContent = "  assistant selection  ";
    root.append(content);
    const selection = document.getSelection();
    if (selection === null) throw new Error("Expected document selection");
    const range = document.createRange();
    range.selectNodeContents(content);
    selection.addRange(range);
    Object.defineProperty(root, "getSelection", { value: () => selection, configurable: true });
    const fallback = vi.spyOn(document, "getSelection");
    expect(selectedTextIn(root)).toBe("assistant selection");
    expect(fallback).not.toHaveBeenCalled();
  });

  it("returns empty text when the browser has no selection", () => {
    const root = document.createElement("div").attachShadow({ mode: "open" });
    Object.defineProperty(root, "getSelection", { value: () => null, configurable: true });
    expect(selectedTextIn(root)).toBe("");
  });

  it("does not borrow an outside document selection when shadow-root selection is unavailable", () => {
    const host = document.createElement("div");
    const outside = document.createElement("p");
    outside.textContent = "outside private text";
    document.body.append(host, outside);
    const root = host.attachShadow({ mode: "open" });
    Object.defineProperty(root, "getSelection", { value: undefined, configurable: true });
    const selection = document.getSelection();
    if (selection === null) throw new Error("Expected document selection");
    const range = document.createRange();
    range.selectNodeContents(outside);
    selection.addRange(range);
    expect(selectedTextIn(root)).toBe("");
  });

  it("accepts a document fallback selection only when both ends are inside the requested root", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = host.attachShadow({ mode: "open" });
    Object.defineProperty(root, "getSelection", { value: undefined, configurable: true });
    const content = document.createElement("span");
    content.textContent = "inside the assistant";
    root.append(content);
    const selection = document.getSelection();
    if (selection === null) throw new Error("Expected document selection");
    const range = document.createRange();
    range.selectNodeContents(content);
    selection.addRange(range);
    expect(selectedTextIn(root)).toBe("inside the assistant");
  });
});
