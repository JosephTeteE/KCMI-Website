/**
 * Target-first Hub tour placement.
 * The highlighted control is positioned first. The instruction panel then
 * takes the first side that can hold it without covering that control.
 */

export type TourViewport = {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
};

export type TourTargetBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type TourSafeInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type TourPanelSide = "top" | "right" | "bottom" | "left";

export type TourPanelBox = {
  top: number;
  left: number;
  width: number;
  height: number;
  maxHeight: number;
  side: TourPanelSide;
};

export type TourPlacement = {
  scrollX: number;
  scrollY: number;
  /** Highlighted rectangle after the safe scroll, including the outline pad. */
  highlight: TourTargetBox;
  /** Target box after the safe scroll, before the outline pad. */
  target: TourTargetBox;
  panel: TourPanelBox;
};

/** Gap between the outlined target and the panel. */
export const TOUR_PANEL_GAP = 16;

/** Outline outside the measured target. Counted inside the gap. */
export const TOUR_HIGHLIGHT_PAD = 8;

/** Distance from the visual viewport edge. */
export const TOUR_PANEL_EDGE_MARGIN = 12;

/** Desktop/tablet panel max width. */
export const TOUR_PANEL_MAX_WIDTH = 480;

/**
 * Room for step label, title, one description line, and the action row.
 * The description alone scrolls when the card is shorter than its content.
 */
export const TOUR_PANEL_MIN_HEIGHT = 188;

/** Viewports narrower than this use the mobile top/bottom rule. */
export const TOUR_MOBILE_MAX_WIDTH = 768;

const EMPTY_INSETS: TourSafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

type Bounds = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export function getTourViewport(
  win: Pick<Window, "innerWidth" | "innerHeight" | "visualViewport"> = window,
): TourViewport {
  const vv = win.visualViewport;
  if (vv && vv.height > 0 && vv.width > 0) {
    return {
      width: vv.width,
      height: vv.height,
      offsetTop: vv.offsetTop,
      offsetLeft: vv.offsetLeft,
    };
  }
  return {
    width: win.innerWidth,
    height: win.innerHeight,
    offsetTop: 0,
    offsetLeft: 0,
  };
}

/** Instant scroll — smooth scrolling delays the highlight. */
export function tourScrollBehavior(): ScrollBehavior {
  return "auto";
}

function boundsFor(viewport: TourViewport, insets: TourSafeInsets): Bounds {
  const top =
    viewport.offsetTop + Math.max(TOUR_PANEL_EDGE_MARGIN, insets.top);
  const left =
    viewport.offsetLeft + Math.max(TOUR_PANEL_EDGE_MARGIN, insets.left);
  const right =
    viewport.offsetLeft +
    viewport.width -
    Math.max(TOUR_PANEL_EDGE_MARGIN, insets.right);
  const bottom =
    viewport.offsetTop +
    viewport.height -
    Math.max(TOUR_PANEL_EDGE_MARGIN, insets.bottom);
  return {
    top,
    left,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

export function rectsOverlap(
  a: TourTargetBox,
  b: TourTargetBox,
  gap = 0,
): boolean {
  return (
    a.left < b.left + b.width + gap &&
    a.left + a.width + gap > b.left &&
    a.top < b.top + b.height + gap &&
    a.top + a.height + gap > b.top
  );
}

export function rectInside(
  box: TourTargetBox,
  viewport: TourViewport,
  epsilon = 1,
): boolean {
  const top = viewport.offsetTop;
  const left = viewport.offsetLeft;
  return (
    box.width > 0 &&
    box.height > 0 &&
    box.top >= top - epsilon &&
    box.left >= left - epsilon &&
    box.top + box.height <= top + viewport.height + epsilon &&
    box.left + box.width <= left + viewport.width + epsilon
  );
}

function isMobile(viewport: TourViewport): boolean {
  return viewport.width < TOUR_MOBILE_MAX_WIDTH;
}

function chooseSide(
  viewport: TourViewport,
  bounds: Bounds,
  target: TourTargetBox,
  panel: { width: number; height: number },
): TourPanelSide {
  if (isMobile(viewport)) {
    const mid = viewport.offsetTop + viewport.height / 2;
    const center = target.top + target.height / 2;
    const band = viewport.height * 0.12;
    if (center < mid - band) return "bottom";
    if (center > mid + band) return "top";
    const above = Math.max(0, target.top - bounds.top);
    const below = Math.max(0, bounds.bottom - (target.top + target.height));
    return below >= above ? "bottom" : "top";
  }

  const spaces: Record<TourPanelSide, number> = {
    right: bounds.right - (target.left + target.width) - TOUR_PANEL_GAP,
    left: target.left - bounds.left - TOUR_PANEL_GAP,
    bottom: bounds.bottom - (target.top + target.height) - TOUR_PANEL_GAP,
    top: target.top - bounds.top - TOUR_PANEL_GAP,
  };
  const sideBreadth = Math.min(220, panel.width);
  const stackBreadth = Math.min(TOUR_PANEL_MIN_HEIGHT, panel.height);
  const order: TourPanelSide[] = ["right", "left", "bottom", "top"];
  for (const side of order) {
    const need =
      side === "left" || side === "right" ? sideBreadth : stackBreadth;
    if (spaces[side] >= need) return side;
  }
  return order.reduce((best, side) =>
    spaces[side] > spaces[best] ? side : best,
  );
}

function thicknessFor(
  side: TourPanelSide,
  bounds: Bounds,
  panel: { width: number; height: number },
  target: TourTargetBox,
): number {
  if (side === "left" || side === "right") {
    const open =
      side === "right"
        ? bounds.right - (target.left + target.width) - TOUR_PANEL_GAP
        : target.left - bounds.left - TOUR_PANEL_GAP;
    const beside = bounds.width - target.width - TOUR_PANEL_GAP;
    const cap = Math.min(
      panel.width,
      Math.max(0, beside),
      open >= 160 ? open : Math.max(0, beside),
    );
    return Math.max(0, cap);
  }
  const cap = Math.max(120, bounds.height - 72 - TOUR_PANEL_GAP);
  const desired = Math.max(
    Math.min(TOUR_PANEL_MIN_HEIGHT, cap),
    Math.min(panel.height, cap),
  );
  return clamp(desired, 120, cap);
}

function moveTarget(
  target: TourTargetBox,
  bounds: Bounds,
  side: TourPanelSide,
  thickness: number,
): { scrollX: number; scrollY: number; target: TourTargetBox } {
  const region = freeRegion(bounds, side, thickness);
  let top = target.top;
  let left = target.left;
  const regionHeight = Math.max(0, region.bottom - region.top);
  const regionWidth = Math.max(0, region.right - region.left);

  if (target.height <= regionHeight) {
    if (top < region.top) top = region.top;
    if (top + target.height > region.bottom) top = region.bottom - target.height;
  } else if (regionHeight > 0) {
    top = region.top;
  }

  if (target.width <= regionWidth) {
    if (left < region.left) left = region.left;
    if (left + target.width > region.right) left = region.right - target.width;
  } else if (regionWidth > 0) {
    left = region.left;
  }

  return {
    scrollX: target.left - left,
    scrollY: target.top - top,
    target: {
      top,
      left,
      width: target.width,
      height: target.height,
    },
  };
}

function freeRegion(
  bounds: Bounds,
  side: TourPanelSide,
  thickness: number,
): Bounds {
  if (side === "bottom") {
    const bottom = bounds.bottom - thickness - TOUR_PANEL_GAP;
    return { ...bounds, bottom, height: Math.max(0, bottom - bounds.top) };
  }
  if (side === "top") {
    const top = bounds.top + thickness + TOUR_PANEL_GAP;
    return { ...bounds, top, height: Math.max(0, bounds.bottom - top) };
  }
  if (side === "right") {
    const right = bounds.right - thickness - TOUR_PANEL_GAP;
    return { ...bounds, right, width: Math.max(0, right - bounds.left) };
  }
  const left = bounds.left + thickness + TOUR_PANEL_GAP;
  return { ...bounds, left, width: Math.max(0, bounds.right - left) };
}

function panelOnSide(
  bounds: Bounds,
  target: TourTargetBox,
  panel: { width: number; height: number },
  side: TourPanelSide,
  thickness: number,
): TourPanelBox {
  if (side === "bottom" || side === "top") {
    const width = Math.min(panel.width, bounds.width);
    const left = bounds.left + (bounds.width - width) / 2;
    const height = Math.min(panel.height, thickness);
    const top =
      side === "bottom"
        ? bounds.bottom - height
        : bounds.top;
    return { top, left, width, height, maxHeight: height, side };
  }

  const height = Math.min(panel.height, bounds.height);
  const top = clamp(target.top, bounds.top, bounds.bottom - height);
  const available =
    side === "right"
      ? bounds.right - (target.left + target.width + TOUR_PANEL_GAP)
      : target.left - TOUR_PANEL_GAP - bounds.left;
  const used = clamp(
    Math.min(panel.width, thickness),
    0,
    Math.max(0, available),
  );
  const preferred =
    side === "right"
      ? target.left + target.width + TOUR_PANEL_GAP
      : target.left - TOUR_PANEL_GAP - used;
  const left = clamp(
    preferred,
    bounds.left,
    Math.max(bounds.left, bounds.right - Math.max(used, 1)),
  );
  return { top, left, width: used, height, maxHeight: height, side };
}

function clipBox(box: TourTargetBox, bounds: Bounds): TourTargetBox {
  const left = clamp(box.left, bounds.left, bounds.right);
  const top = clamp(box.top, bounds.top, bounds.bottom);
  const right = clamp(box.left + box.width, bounds.left, bounds.right);
  const bottom = clamp(box.top + box.height, bounds.top, bounds.bottom);
  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function padded(box: TourTargetBox): TourTargetBox {
  return {
    top: box.top - TOUR_HIGHLIGHT_PAD,
    left: box.left - TOUR_HIGHLIGHT_PAD,
    width: box.width + TOUR_HIGHLIGHT_PAD * 2,
    height: box.height + TOUR_HIGHLIGHT_PAD * 2,
  };
}

/**
 * Visible highlight: the outlined target, clipped to the viewport and cut
 * back so it stops short of the panel. Oversized sections keep their top
 * (or the free edge) on screen instead of painting under the card.
 */
function highlightFor(
  target: TourTargetBox,
  panel: TourPanelBox,
  bounds: Bounds,
): TourTargetBox {
  const outlined = clipBox(padded(target), bounds);
  const panelGap = {
    top: panel.top - TOUR_PANEL_GAP,
    left: panel.left - TOUR_PANEL_GAP,
    right: panel.left + panel.width + TOUR_PANEL_GAP,
    bottom: panel.top + panel.height + TOUR_PANEL_GAP,
  };
  let next = outlined;
  if (panel.side === "bottom") {
    next = {
      ...next,
      height: Math.max(0, Math.min(next.height, panelGap.top - next.top)),
    };
  } else if (panel.side === "top") {
    const top = Math.max(next.top, panelGap.bottom);
    next = {
      ...next,
      top,
      height: Math.max(0, next.top + next.height - top),
    };
  } else if (panel.side === "right") {
    next = {
      ...next,
      width: Math.max(0, Math.min(next.width, panelGap.left - next.left)),
    };
  } else {
    const left = Math.max(next.left, panelGap.right);
    next = {
      ...next,
      left,
      width: Math.max(0, next.left + next.width - left),
    };
  }
  if (next.width >= 8 && next.height >= 8) return next;
  return outlined.width >= 8 && outlined.height >= 8 ? outlined : next;
}

export function placeTourCard(input: {
  viewport: TourViewport;
  target: TourTargetBox;
  panel: { width: number; height: number };
  insets?: TourSafeInsets;
  /**
   * When false, only move the panel. Used while the visitor is already
   * scrolling so the tour does not fight that scroll.
   */
  reposition?: boolean;
}): TourPlacement {
  const insets = input.insets ?? EMPTY_INSETS;
  const bounds = boundsFor(input.viewport, insets);
  const requested = {
    width: Math.min(
      TOUR_PANEL_MAX_WIDTH,
      Math.max(120, input.panel.width),
    ),
    height: Math.max(120, input.panel.height),
  };
  const side = chooseSide(input.viewport, bounds, input.target, requested);
  const thickness = thicknessFor(side, bounds, requested, input.target);
  const moved =
    input.reposition === false
      ? { scrollX: 0, scrollY: 0, target: input.target }
      : moveTarget(input.target, bounds, side, thickness);
  const settledSide =
    input.reposition === false
      ? chooseSide(input.viewport, bounds, moved.target, requested)
      : side;
  const settledThickness = thicknessFor(
    settledSide,
    bounds,
    requested,
    moved.target,
  );
  const panel = panelOnSide(
    bounds,
    moved.target,
    requested,
    settledSide,
    settledThickness,
  );
  const highlight = highlightFor(moved.target, panel, bounds);
  return {
    scrollX: moved.scrollX,
    scrollY: moved.scrollY,
    target: moved.target,
    highlight,
    panel,
  };
}

/** Panel parked in the lower safe area when a step has no target yet. */
export function placeTourFallback(
  viewport: TourViewport,
  panel: { width: number; height: number },
  insets: TourSafeInsets = EMPTY_INSETS,
): TourPanelBox {
  const bounds = boundsFor(viewport, insets);
  const width = Math.min(panel.width, bounds.width);
  const height = Math.min(
    Math.max(TOUR_PANEL_MIN_HEIGHT, Math.min(panel.height, bounds.height)),
    bounds.height,
  );
  return {
    top: bounds.bottom - height,
    left: bounds.left + (bounds.width - width) / 2,
    width,
    height,
    maxHeight: height,
    side: "bottom",
  };
}
