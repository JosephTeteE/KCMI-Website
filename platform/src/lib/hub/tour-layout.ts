/**
 * Hub tour coach-mark positioning helpers.
 * Prefer visualViewport + dvh-friendly math so mobile browser chrome does not
 * clip the action row (Finish tour).
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

export type TourBubbleBox = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

/** Fallback estimate when the card has not been measured yet. */
export const TOUR_BUBBLE_ESTIMATE_HEIGHT = 320;

/** Horizontal margin from the usable viewport edge. */
export const TOUR_BUBBLE_EDGE_MARGIN = 12;

/**
 * Approximate home-indicator / browser chrome cushion when env() is not
 * available to JS. CSS still applies env(safe-area-inset-bottom) on the card.
 */
export const TOUR_BUBBLE_SAFE_BOTTOM_FALLBACK = 20;

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

export function tourBubbleMaxHeight(
  viewport: TourViewport,
  estimateHeight = TOUR_BUBBLE_ESTIMATE_HEIGHT,
): number {
  const usable =
    viewport.height -
    TOUR_BUBBLE_EDGE_MARGIN * 2 -
    TOUR_BUBBLE_SAFE_BOTTOM_FALLBACK;
  return Math.max(200, Math.min(estimateHeight, usable));
}

/**
 * Clamp a proposed bubble rect so the full card (including actions) stays
 * inside the usable visual viewport.
 */
export function clampTourBubbleBox(input: {
  top: number;
  left: number;
  width: number;
  height: number;
  viewport: TourViewport;
}): TourBubbleBox {
  const { viewport } = input;
  const width = Math.min(
    input.width,
    Math.max(160, viewport.width - TOUR_BUBBLE_EDGE_MARGIN * 2),
  );
  const maxHeight = tourBubbleMaxHeight(viewport, input.height);
  const minTop = viewport.offsetTop + TOUR_BUBBLE_EDGE_MARGIN;
  const maxTop =
    viewport.offsetTop +
    viewport.height -
    maxHeight -
    TOUR_BUBBLE_EDGE_MARGIN -
    TOUR_BUBBLE_SAFE_BOTTOM_FALLBACK;
  const top = Math.min(Math.max(input.top, minTop), Math.max(minTop, maxTop));
  const minLeft = viewport.offsetLeft + TOUR_BUBBLE_EDGE_MARGIN;
  const maxLeft =
    viewport.offsetLeft + viewport.width - width - TOUR_BUBBLE_EDGE_MARGIN;
  const left = Math.min(Math.max(input.left, minLeft), Math.max(minLeft, maxLeft));
  return { top, left, width, maxHeight };
}

export function placeTourBubble(input: {
  target: TourTargetBox | null;
  viewport: TourViewport;
  openMobileMenu?: boolean;
  bubbleWidth?: number;
  estimatedHeight?: number;
}): TourBubbleBox | { bottomAnchored: true; width: number; maxHeight: number } {
  const estimatedHeight = input.estimatedHeight ?? TOUR_BUBBLE_ESTIMATE_HEIGHT;
  const bubbleWidth = Math.min(
    input.bubbleWidth ?? 352,
    input.viewport.width - TOUR_BUBBLE_EDGE_MARGIN * 2,
  );
  const maxHeight = tourBubbleMaxHeight(input.viewport, estimatedHeight);

  if (!input.target) {
    return {
      bottomAnchored: true,
      width: Math.min(24 * 16, bubbleWidth),
      maxHeight,
    };
  }

  const box = input.target;
  if (input.openMobileMenu) {
    const left = Math.min(
      Math.max(TOUR_BUBBLE_EDGE_MARGIN, box.left),
      Math.max(
        TOUR_BUBBLE_EDGE_MARGIN,
        input.viewport.offsetLeft +
          input.viewport.width -
          bubbleWidth -
          TOUR_BUBBLE_EDGE_MARGIN,
      ),
    );
    const top = box.top + box.height + 10;
    return clampTourBubbleBox({
      top,
      left,
      width: bubbleWidth,
      height: estimatedHeight,
      viewport: input.viewport,
    });
  }

  const spaceBelow =
    input.viewport.offsetTop +
    input.viewport.height -
    (box.top + box.height);
  const placeAbove =
    spaceBelow < maxHeight + 24 &&
    box.top - input.viewport.offsetTop > maxHeight + 24;
  const top = placeAbove
    ? box.top - maxHeight - 12
    : box.top + box.height + 12;

  const left = Math.min(
    Math.max(TOUR_BUBBLE_EDGE_MARGIN, box.left),
    Math.max(
      TOUR_BUBBLE_EDGE_MARGIN,
      input.viewport.offsetLeft +
        input.viewport.width -
        bubbleWidth -
        TOUR_BUBBLE_EDGE_MARGIN,
    ),
  );

  return clampTourBubbleBox({
    top,
    left,
    width: bubbleWidth,
    height: estimatedHeight,
    viewport: input.viewport,
  });
}

/** Prefer instant scroll on tour steps — smooth scrolling delays the highlight. */
export function tourScrollBehavior(
  prefersReducedMotion: boolean,
): ScrollBehavior {
  return prefersReducedMotion ? "auto" : "auto";
}
