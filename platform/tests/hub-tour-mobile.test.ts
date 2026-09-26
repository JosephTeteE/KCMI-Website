import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getTourViewport,
  tourPanelFrame,
  tourScrollBehavior,
  TOUR_PANEL_EDGE_MARGIN,
  TOUR_PANEL_MAX_WIDTH,
} from "@/lib/hub/tour-layout";
import { HUB_DASHBOARD_TOUR_STEPS } from "@/lib/hub/tour";

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];

describe("Hub tour panel is independent of the target", () => {
  it("prefers visualViewport dimensions when present", () => {
    const viewport = getTourViewport({
      innerWidth: 390,
      innerHeight: 844,
      visualViewport: {
        width: 390,
        height: 700,
        offsetTop: 40,
        offsetLeft: 0,
      } as VisualViewport,
    });
    expect(viewport.height).toBe(700);
    expect(viewport.offsetTop).toBe(40);
  });

  it("keeps a bottom-centered panel inside every requested viewport", () => {
    for (const size of VIEWPORTS) {
      const frame = tourPanelFrame({
        width: size.width,
        height: size.height,
        offsetTop: 0,
        offsetLeft: 0,
      });
      expect(frame.width).toBeLessThanOrEqual(TOUR_PANEL_MAX_WIDTH);
      expect(frame.width).toBeLessThanOrEqual(
        size.width - TOUR_PANEL_EDGE_MARGIN * 2 + 0.5,
      );
      expect(frame.left).toBeGreaterThanOrEqual(0);
      expect(frame.left + frame.width).toBeLessThanOrEqual(size.width + 0.5);
      expect(frame.maxHeight).toBeLessThanOrEqual(size.height);
      expect(frame.maxHeight).toBeGreaterThan(120);
    }
  });

  it("does not move the panel when the highlighted target changes", () => {
    const viewport = {
      width: 1366,
      height: 768,
      offsetTop: 0,
      offsetLeft: 0,
    };
    const a = tourPanelFrame(viewport);
    const b = tourPanelFrame(viewport);
    expect(a).toEqual(b);
    expect(HUB_DASHBOARD_TOUR_STEPS).toHaveLength(6);
    expect(HUB_DASHBOARD_TOUR_STEPS[5]?.title).toBe("Help & Tutorial");
  });

  it("uses instant scroll", () => {
    expect(tourScrollBehavior()).toBe("auto");
  });
});

describe("Hub tour layout source contract", () => {
  it("renders the title outside the scrolling body and anchors the panel in CSS", () => {
    const source = readSrc("src/components/hub/hub-tour.tsx");
    const css = readSrc("src/styles/tokens.css");
    const heading = source.indexOf("hub-tour-card-heading");
    const body = source.indexOf("hub-tour-card-body");
    const actions = source.indexOf('data-hub-tour-actions="true"');
    expect(heading).toBeGreaterThan(0);
    expect(heading).toBeLessThan(body);
    expect(body).toBeLessThan(actions);
    expect(source).toContain("{current.title}");
    expect(source).toContain("{current.body}");
    expect(source).toContain('data-hub-tour-primary-action="true"');
    expect(source).not.toContain("placeTourBubble");
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain('behavior: "smooth"');
    expect(source).not.toContain("behavior: 'smooth'");
    expect(css).toContain("100dvh");
    expect(css).toContain("safe-area-inset-bottom");
    expect(css).toContain("left: 50%");
    expect(css).toContain("translateX(-50%)");
    expect(css).toMatch(/max-width:\s*min\(30rem/);
    expect(css).toContain("hub-tour-card-heading");
    expect(css).toMatch(/hub-tour-step-in\s+180ms/);
    expect(css).toMatch(
      /prefers-reduced-motion:\s*reduce[\s\S]*?\.hub-tour-card-body[\s\S]*?animation:\s*none/,
    );
  });
});
