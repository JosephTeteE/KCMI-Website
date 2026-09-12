import { expect, test } from "@playwright/test";
import { BOUNDARY_WIDTHS, heightForWidth, INTERACTION_WIDTHS } from "../qa/viewports";
import { auditDocumentOverflow } from "../qa/dom-audit";
import { discoverInteractiveControls } from "../qa/dom-audit";

const SWEEP_ROUTES = ["/", "/locations", "/livestream"] as const;

test.describe("QA1 responsive layout — boundary DOM sweep", () => {
  for (const route of SWEEP_ROUTES) {
    test(`overflow sweep ${route}`, async ({ page }) => {
      const findings = [];
      // Sample subset of boundaries for FAST; FULL can expand via env
      const widths =
        process.env.QA_LAYOUT_FULL === "1"
          ? [...BOUNDARY_WIDTHS]
          : [320, 390, 640, 768, 1024, 1280, 1920];
      for (const width of widths) {
        await page.setViewportSize({ width, height: heightForWidth(width) });
        await page.goto(route, { waitUntil: "domcontentloaded" });
        findings.push(
          ...(await auditDocumentOverflow(page, route, "load", width)),
        );
      }
      expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
    });
  }
});

test.describe("QA1 responsive — interaction widths control inventory", () => {
  test("homepage controls at 390/1280", async ({ page, browserName }) => {
    const discovered = [];
    for (const width of [390, 1280] as const) {
      await page.setViewportSize({ width, height: heightForWidth(width) });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      discovered.push(
        ...(await discoverInteractiveControls(page, {
          route: "/",
          scenario: "home",
          browser: browserName,
          viewport: String(width),
        })),
      );
    }
    expect(discovered.length).toBeGreaterThan(5);
    const unclassified = discovered.filter((c) => c.mutation === "UNCLASSIFIED");
    // Heuristic classifier should label most; report remainder without hard-failing smoke
    expect(unclassified.length).toBeLessThan(discovered.length);
  });
});

test.describe("QA1 breakpoint mode — locations", () => {
  test("locations operable at interaction widths", async ({ page }) => {
    for (const width of INTERACTION_WIDTHS) {
      await page.setViewportSize({ width, height: heightForWidth(width) });
      await page.goto("/locations", { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
      const overflow = await auditDocumentOverflow(
        page,
        "/locations",
        "interaction",
        width,
      );
      expect(overflow).toEqual([]);
    }
  });
});
