// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { loadTerminalFont } from "./terminalFont";

afterEach(() => { vi.unstubAllGlobals(); });

function fontEnvironment() {
  const owner = document.implementation.createHTMLDocument();
  const add = vi.fn<(face: FakeFontFace) => void>();
  Object.defineProperty(owner, "fonts", { value: { add } });
  const pending: { face: FakeFontFace; resolve: (face: FakeFontFace) => void; reject: (error: Error) => void }[] = [];
  class FakeFontFace {
    constructor(readonly family: string, readonly source: string, readonly descriptors: FontFaceDescriptors) {}
    load(): Promise<FakeFontFace> {
      return new Promise((resolve, reject) => { pending.push({ face: this, resolve, reject }); });
    }
  }
  vi.stubGlobal("FontFace", FakeFontFace);
  return { owner, add, pending };
}

describe("bundled terminal fonts", () => {
  it("shares loading across panels and registers all four styles before resolving", async () => {
    const { owner, add, pending } = fontEnvironment();
    const loading = loadTerminalFont(owner);
    expect(loadTerminalFont(owner)).toBe(loading);
    expect(pending).toHaveLength(4);
    expect(pending.map(({ face }) => face.descriptors)).toEqual([
      { weight: "400", style: "normal" }, { weight: "700", style: "normal" },
      { weight: "400", style: "italic" }, { weight: "700", style: "italic" },
    ]);
    for (const { face } of pending) {
      expect(face.family).toBe("PI Web Terminal");
      expect(face.source).toMatch(/^url\(".+\.woff2"\) format\("woff2"\)$/u);
      expect(face.source).not.toContain("local(");
    }
    for (const { face, resolve } of pending.slice(0, 3)) resolve(face);
    await Promise.resolve();
    expect(add).not.toHaveBeenCalled();
    for (const { face, resolve } of pending.slice(3)) resolve(face);
    await loading;
    expect(add.mock.calls.map(([face]) => face)).toEqual(pending.map(({ face }) => face));
    expect(loadTerminalFont(owner)).toBe(loading);
    expect(pending).toHaveLength(4);
  });

  it("reports a failed font download and allows a later panel to try again", async () => {
    const { owner, add, pending } = fontEnvironment();
    const loading = loadTerminalFont(owner);
    const failed = expect(loading).rejects.toThrow("font unavailable");
    for (const { reject } of pending) reject(new Error("font unavailable"));
    await failed;
    expect(add).not.toHaveBeenCalled();

    const retry = loadTerminalFont(owner);
    expect(retry).not.toBe(loading);
    for (const { face, resolve } of pending.slice(4)) resolve(face);
    await retry;
    expect(add).toHaveBeenCalledTimes(4);
  });
});
