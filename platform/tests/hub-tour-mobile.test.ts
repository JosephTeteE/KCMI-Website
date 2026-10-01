import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getTourViewport,
  placeTourCard,
  rectInside,
  rectsOverlap,
  tourScrollBehavior,
  TOUR_PANEL_EDGE_MARGIN,
  TOUR_PANEL_GAP,
  TOUR_PANEL_MAX_WIDTH,
  TOUR_PANEL_MIN_HEIGHT,
  type TourTargetBox,
  type TourViewport,
} from "@/lib/hub/tour-layout";
import {
  HUB_DASHBOARD_TOUR_STEPS,
  HUB_HOME_CONTEXT_TOUR_STEPS,
  HUB_LIVESTREAM_CONTEXT_TOUR_STEPS,
  HUB_PROGRAMS_CONTEXT_TOUR_STEPS,
  type HubTourStep,
} from "@/lib/hub/tour";

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
] as const;

const DASHBOARD_CARD_INDEX: Record<string, number> = {
  "dashboard-homepage": 0,
  "dashboard-programs": 1,
  "dashboard-branches": 3,
  "dashboard-sermons": 4,
  "dashboard-livestream": 5,
};

function viewportOf(size: { width: number; height: number }): TourViewport {
  return { ...size, offsetTop: 0, offsetLeft: 0 };
}

/** Card and help positions follow the Hub layout, not a generic box. */
function fixtureFor(step: HubTourStep, size: { width: number; height: number }): TourTargetBox {
  const desktop = size.width >= 1024;
  const header = desktop ? 0 : 60;
  const sidebar = desktop ? 320 : 0;
  const pad = desktop ? 40 : 16;
  const left = sidebar + pad;
  const width = Math.max(120, size.width - left - pad);

  if (step.id === "help-tutorial") {
    if (!desktop) {
      const height = 96;
      return {
        top: size.height - height - 16,
        left: 16,
        width: Math.min(288, size.width - 32),
        height,
      };
    }
    const links = 12;
    const top = 16 + 20 + 12 + 52 + 24 + links * 44 + 24;
    return { top, left: 16, width: 272, height: 84 };
  }

  const cardIndex = DASHBOARD_CARD_INDEX[step.id];
  if (cardIndex != null) {
    const cardHeight = 144;
    const gap = 16;
    const pageHeader = 96;
    if (!desktop) {
      return {
        top: header + pad + pageHeader + cardIndex * (cardHeight + gap),
        left,
        width,
        height: cardHeight,
      };
    }
    const col = cardIndex % 2;
    const row = Math.floor(cardIndex / 2);
    const cardWidth = (width - gap) / 2;
    return {
      top: pad + pageHeader + row * (cardHeight + gap),
      left: left + col * (cardWidth + gap),
      width: cardWidth,
      height: cardHeight,
    };
  }

  const kindIndex = stepIndex(step);
  const tall = step.id.startsWith("program-");
  const height = tall ? 520 : step.id.startsWith("livestream-") ? 200 : 168;
  return {
    top: header + pad + kindIndex * (height + 24),
    left,
    width,
    height,
  };
}

function stepIndex(step: HubTourStep): number {
  const groups = [
    HUB_HOME_CONTEXT_TOUR_STEPS,
    HUB_PROGRAMS_CONTEXT_TOUR_STEPS,
    HUB_LIVESTREAM_CONTEXT_TOUR_STEPS,
  ];
  for (const group of groups) {
    const index = group.findIndex((item) => item.id === step.id);
    if (index >= 0) return index;
  }
  return 0;
}

function requestedPanel(width: number) {
  return {
    width: Math.min(TOUR_PANEL_MAX_WIDTH, Math.max(160, width - TOUR_PANEL_EDGE_MARGIN * 2)),
    height: width < 420 ? 272 : 224,
  };
}

const ALL_STEPS: HubTourStep[] = [
  ...HUB_DASHBOARD_TOUR_STEPS,
  ...HUB_HOME_CONTEXT_TOUR_STEPS,
  ...HUB_PROGRAMS_CONTEXT_TOUR_STEPS,
  ...HUB_LIVESTREAM_CONTEXT_TOUR_STEPS,
];

describe("Hub tour keeps the highlighted target visible", () => {
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

  it("uses instant scroll", () => {
    expect(tourScrollBehavior()).toBe("auto");
  });

  it("puts the panel below an upper-half target and above a lower-half target", () => {
    const viewport = viewportOf({ width: 390, height: 844 });
    const upper = placeTourCard({
      viewport,
      target: { top: 80, left: 16, width: 300, height: 120 },
      panel: requestedPanel(390),
    });
    const lower = placeTourCard({
      viewport,
      target: { top: 680, left: 16, width: 300, height: 96 },
      panel: requestedPanel(390),
    });
    expect(upper.panel.side).toBe("bottom");
    expect(lower.panel.side).toBe("top");
    expect(rectsOverlap(upper.highlight, upper.panel, 0)).toBe(false);
    expect(rectsOverlap(lower.highlight, lower.panel, 0)).toBe(false);
  });

  it("prefers the right side on a wide viewport when that side is clear", () => {
    const viewport = viewportOf({ width: 1366, height: 768 });
    const placed = placeTourCard({
      viewport,
      target: { top: 160, left: 360, width: 280, height: 144 },
      panel: requestedPanel(1366),
    });
    expect(placed.panel.side).toBe("right");
    expect(placed.panel.left).toBeGreaterThanOrEqual(
      placed.target.left + placed.target.width + TOUR_PANEL_GAP - 1,
    );
  });

  it("keeps every current Hub step clear of the panel at the requested viewports", () => {
    expect(ALL_STEPS.map((step) => step.id)).toEqual(
      expect.arrayContaining([
        "dashboard-homepage",
        "dashboard-programs",
        "help-tutorial",
        "home-choose-section",
        "program-about",
        "livestream-status",
      ]),
    );
    expect(HUB_DASHBOARD_TOUR_STEPS[5]?.title).toBe("Help & Tutorial");

    for (const size of VIEWPORTS) {
      const viewport = viewportOf(size);
      for (const step of ALL_STEPS) {
        const placed = placeTourCard({
          viewport,
          target: fixtureFor(step, size),
          panel: requestedPanel(size.width),
        });
        const label = `${step.id} @ ${size.width}x${size.height}`;
        expect(rectInside(placed.highlight, viewport), label).toBe(true);
        expect(rectInside(placed.panel, viewport), label).toBe(true);
        expect(rectsOverlap(placed.highlight, placed.panel, 0), label).toBe(
          false,
        );
        expect(placed.highlight.width, label).toBeGreaterThanOrEqual(8);
        expect(placed.highlight.height, label).toBeGreaterThanOrEqual(8);
        const gap = separation(placed.highlight, placed.panel);
        expect(gap, label).toBeGreaterThanOrEqual(TOUR_PANEL_GAP - 1);
        expect(placed.panel.maxHeight, label).toBeGreaterThanOrEqual(
          Math.min(TOUR_PANEL_MIN_HEIGHT, viewport.height - 48),
        );
        const fits =
          fixtureFor(step, size).height +
            requestedPanel(size.width).height +
            TOUR_PANEL_GAP +
            64 <
          size.height;
        if (fits) {
          expect(rectInside(placed.target, viewport), label).toBe(true);
          expect(rectsOverlap(placed.target, placed.panel, 0), `${label} target`).toBe(
            false,
          );
        }
      }
    }
  });
});

function separation(a: TourTargetBox, b: TourTargetBox): number {
  const aRight = a.left + a.width;
  const bRight = b.left + b.width;
  const aBottom = a.top + a.height;
  const bBottom = b.top + b.height;
  const horizontal =
    aRight <= b.left ? b.left - aRight : bRight <= a.left ? a.left - bRight : 0;
  const vertical =
    aBottom <= b.top ? b.top - aBottom : bBottom <= a.top ? a.top - bBottom : 0;
  if (horizontal > 0 && vertical === 0) return horizontal;
  if (vertical > 0 && horizontal === 0) return vertical;
  if (horizontal > 0 && vertical > 0) return Math.max(horizontal, vertical);
  return 0;
}

describe("Hub tour layout source contract", () => {
  it("renders the title outside the scrolling body and places the panel from the target", () => {
    const source = readSrc("src/components/hub/hub-tour.tsx");
    const css = readSrc("src/styles/tokens.css");
    const layout = readSrc("src/lib/hub/tour-layout.ts");
    const heading = source.indexOf("hub-tour-card-heading");
    const body = source.indexOf("hub-tour-card-body");
    const actions = source.indexOf('data-hub-tour-actions="true"');
    expect(heading).toBeGreaterThan(0);
    expect(heading).toBeLessThan(body);
    expect(body).toBeLessThan(actions);
    expect(source).toContain("{current.title}");
    expect(source).toContain("{current.body}");
    expect(source).toContain('data-hub-tour-primary-action="true"');
    expect(source).toContain("placeTourCard");
    expect(source).not.toContain("placeTourBubble");
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain('behavior: "smooth"');
    expect(source).not.toContain("behavior: 'smooth'");
    expect(css).toContain("100dvh");
    expect(css).toContain("safe-area-inset-bottom");
    expect(css).toContain("safe-area-inset-top");
    expect(css).not.toContain("left: 50%");
    expect(css).not.toContain("translateX(-50%)");
    expect(css).toContain("hub-tour-card-heading");
    expect(css).toMatch(/hub-tour-step-in\s+180ms/);
    expect(css).toMatch(
      /prefers-reduced-motion:\s*reduce[\s\S]*?\.hub-tour-card-body[\s\S]*?animation:\s*none/,
    );
    expect(layout).toContain("visualViewport");
    expect(layout).not.toContain("setTimeout");
  });
});
