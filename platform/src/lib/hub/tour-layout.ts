/**
 * Hub tour viewport helpers.
 * The instruction panel is viewport-fixed (bottom center / bottom sheet).
 * Target boxes are only used to draw the highlight, never to place the panel.
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

/** Horizontal margin from the usable viewport edge. */
export const TOUR_PANEL_EDGE_MARGIN = 12;

/** Desktop/tablet panel max width (480px). */
export const TOUR_PANEL_MAX_WIDTH = 480;

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

/**
 * Stable panel frame. Does not read the target.
 * Width stays inside the visual viewport. Height cap leaves a margin so CSS
 * 100dvh + safe-area can finish the rest.
 */
export function tourPanelFrame(viewport: TourViewport): {
  width: number;
  maxHeight: number;
  left: number;
} {
  const inner = Math.max(0, viewport.width - TOUR_PANEL_EDGE_MARGIN * 2);
  const width = Math.min(TOUR_PANEL_MAX_WIDTH, inner);
  const maxHeight = Math.max(
    160,
    viewport.height - TOUR_PANEL_EDGE_MARGIN * 2,
  );
  const left = viewport.offsetLeft + (viewport.width - width) / 2;
  return { width, maxHeight, left };
}

/** Instant scroll — smooth scrolling delays the highlight. */
export function tourScrollBehavior(): ScrollBehavior {
  return "auto";
}
