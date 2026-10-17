export interface QuoteAnchorRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface QuotePopoverPosition {
  left: number;
  top: number;
  placement: "above" | "below";
}

const EDGE_MARGIN = 8;
const SELECTION_GAP = 8;

/** Position a selection toolbar in the visible bounds' coordinate space. */
export function selectionQuotePosition(
  anchor: QuoteAnchorRect,
  bounds: QuoteAnchorRect,
  size: { width: number; height: number },
): QuotePopoverPosition {
  if (![anchor.left, anchor.top, anchor.right, anchor.bottom, bounds.left, bounds.top, bounds.right, bounds.bottom, size.width, size.height].every(Number.isFinite)) {
    throw new RangeError("Selection quote geometry must contain finite numbers");
  }

  const width = Math.max(0, bounds.right - bounds.left);
  const height = Math.max(0, bounds.bottom - bounds.top);
  const toolbarWidth = Math.max(0, size.width);
  const toolbarHeight = Math.max(0, size.height);
  const above = anchor.top - bounds.top - toolbarHeight - SELECTION_GAP;
  const verticalMargin = edgeMargin(height, toolbarHeight);
  const placement = above >= verticalMargin ? "above" : "below";

  return {
    left: clampOffset((anchor.left - bounds.left + anchor.right - bounds.left - toolbarWidth) / 2, width, toolbarWidth),
    top: clampOffset(placement === "above" ? above : anchor.bottom - bounds.top + SELECTION_GAP, height, toolbarHeight),
    placement,
  };
}

function edgeMargin(extent: number, size: number): number {
  return Math.min(EDGE_MARGIN, Math.max(0, extent - size) / 2);
}

function clampOffset(offset: number, extent: number, size: number): number {
  const margin = edgeMargin(extent, size);
  return Math.max(margin, Math.min(offset, Math.max(0, extent - size) - margin));
}
