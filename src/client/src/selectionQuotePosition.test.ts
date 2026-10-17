import { describe, expect, it } from "vitest";
import { selectionQuotePosition } from "./selectionQuotePosition";

describe("selectionQuotePosition", () => {
  const bounds = { left: 100, top: 50, right: 700, bottom: 450 };
  const size = { width: 200, height: 32 };

  it("centers above the selection in coordinates relative to the bounds", () => {
    expect(selectionQuotePosition({ left: 350, top: 200, right: 450, bottom: 220 }, bounds, size)).toEqual({
      left: 200,
      top: 110,
      placement: "above",
    });
  });

  it("flips below a selection near the top", () => {
    expect(selectionQuotePosition({ left: 350, top: 70, right: 450, bottom: 90 }, bounds, size)).toEqual({
      left: 200,
      top: 48,
      placement: "below",
    });
  });

  it.each([
    { left: 90, right: 130, expectedLeft: 8 },
    { left: 670, right: 710, expectedLeft: 392 },
  ])("keeps a selection near the horizontal edge reachable: $left", ({ left, right, expectedLeft }) => {
    expect(selectionQuotePosition({ left, right, top: 200, bottom: 220 }, bounds, size).left).toBe(expectedLeft);
  });

  it("clamps below placement when neither side can fit", () => {
    expect(selectionQuotePosition(
      { left: 120, top: 60, right: 160, bottom: 100 },
      { left: 100, top: 50, right: 340, bottom: 100 },
      size,
    )).toEqual({ left: 8, top: 10, placement: "below" });
  });

  it("starts at the visible origin when the toolbar exceeds the container", () => {
    expect(selectionQuotePosition(
      { left: 110, top: 55, right: 120, bottom: 65 },
      { left: 100, top: 50, right: 180, bottom: 70 },
      size,
    )).toEqual({ left: 0, top: 0, placement: "below" });
  });

  it("reduces margins to fit a toolbar in a narrow container", () => {
    expect(selectionQuotePosition(
      { left: 10, top: 30, right: 20, bottom: 40 },
      { left: 0, top: 0, right: 210, bottom: 100 },
      size,
    )).toEqual({ left: 5, top: 48, placement: "below" });
  });

  it("rejects nonfinite geometry instead of returning invalid CSS coordinates", () => {
    expect(() => selectionQuotePosition({ left: Number.NaN, top: 200, right: 450, bottom: 220 }, bounds, size)).toThrow(RangeError);
  });
});
