import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  clampTourBubbleBox,
  getTourViewport,
  placeTourBubble,
  tourBubbleMaxHeight,
  tourScrollBehavior,
  TOUR_BUBBLE_EDGE_MARGIN,
  TOUR_BUBBLE_SAFE_BOTTOM_FALLBACK,
} from "@/lib/hub/tour-layout";

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("Hub tour layout viewport clamping", () => {
  it("prefers visualViewport dimensions when present", () => {
    const viewport = getTourViewport({
      innerWidth: 390,
      innerHeight: 844,
      visualViewport: {
        width: 390,
        height: 700,
        offsetTop: 0,
        offsetLeft: 0,
      } as VisualViewport,
    });
    expect(viewport.height).toBe(700);
    expect(viewport.width).toBe(390);
  });

  it("keeps the bubble (and Finish actions) inside a short mobile viewport", () => {
    const viewport = {
      width: 375,
      height: 560,
      offsetTop: 0,
      offsetLeft: 0,
    };
    const placed = clampTourBubbleBox({
      top: 420,
      left: 20,
      width: 352,
      height: 360,
      viewport,
    });
    expect(placed.top + placed.maxHeight).toBeLessThanOrEqual(
      viewport.height -
        TOUR_BUBBLE_EDGE_MARGIN -
        TOUR_BUBBLE_SAFE_BOTTOM_FALLBACK +
        0.5,
    );
    expect(placed.top).toBeGreaterThanOrEqual(TOUR_BUBBLE_EDGE_MARGIN);
    expect(placed.maxHeight).toBe(tourBubbleMaxHeight(viewport, 360));
  });

  it("clamps across narrow 320px and large 430px phone widths", () => {
    for (const width of [320, 375, 390, 393, 430]) {
      const viewport = { width, height: 640, offsetTop: 0, offsetLeft: 0 };
      const placed = placeTourBubble({
        target: { top: 500, left: 8, width: 120, height: 44 },
        viewport,
        estimatedHeight: 340,
      });
      expect("bottomAnchored" in placed).toBe(false);
      if ("bottomAnchored" in placed) return;
      expect(placed.left).toBeGreaterThanOrEqual(TOUR_BUBBLE_EDGE_MARGIN);
      expect(placed.left + placed.width).toBeLessThanOrEqual(
        width - TOUR_BUBBLE_EDGE_MARGIN + 0.5,
      );
      expect(placed.top + placed.maxHeight).toBeLessThanOrEqual(
        viewport.height -
          TOUR_BUBBLE_EDGE_MARGIN -
          TOUR_BUBBLE_SAFE_BOTTOM_FALLBACK +
          0.5,
      );
    }
  });

  it("bottom-anchors when there is no target and still caps height", () => {
    const viewport = { width: 390, height: 700, offsetTop: 0, offsetLeft: 0 };
    const placed = placeTourBubble({ target: null, viewport });
    expect(placed).toMatchObject({ bottomAnchored: true });
    if (!("bottomAnchored" in placed)) return;
    expect(placed.maxHeight).toBeLessThanOrEqual(viewport.height);
  });

  it("uses instant scroll behavior so Next is not delayed by smooth scrolling", () => {
    expect(tourScrollBehavior(false)).toBe("auto");
    expect(tourScrollBehavior(true)).toBe("auto");
  });
});

describe("Hub tour mobile performance contracts", () => {
  it("does not use smooth scrollIntoView or long mobile remeasure waits", () => {
    const source = readSrc("src/components/hub/hub-tour.tsx");
    expect(source).not.toContain('behavior: "smooth"');
    expect(source).not.toContain("behavior: 'smooth'");
    expect(source).toContain("tourScrollBehavior");
    expect(source).toContain("getTourViewport");
    expect(source).toContain("placeTourBubble");
    expect(source).toContain("safe-area-inset-bottom");
    expect(source).toContain('data-hub-tour-actions="true"');
    expect(source).toContain('data-hub-tour-primary-action="true"');
    expect(source).toContain("hub-tour-card-body");
    // Avoid multi-hundred-ms post-scroll waits that made Next feel lagged.
    expect(source).not.toMatch(/openMobileMenu \? 220/);
    expect(source).not.toMatch(/setTimeout\(\(\) => \{\s*if \(cancelled\) return;\s*setTargetBox/);
  });

  it("keeps a short GPU-friendly step transition and respects reduced motion", () => {
    const css = readSrc("src/styles/tokens.css");
    expect(css).toContain("hub-tour-card-body");
    expect(css).toContain("hub-tour-step-in");
    expect(css).toMatch(/hub-tour-step-in\s+180ms/);
    expect(css).toContain("translate3d");
    expect(css).toMatch(
      /prefers-reduced-motion:\s*reduce[\s\S]*?\.hub-tour-card-body[\s\S]*?animation:\s*none/,
    );
  });
});
