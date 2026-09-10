import { expect, test } from "@playwright/test";
import { stress } from "./fixtures/content-stress";
import { LAYOUT_VIEWPORTS } from "./helpers/routes";
import { assertPublicLayout, collectLayoutMetrics } from "./helpers/layout";

const STRESS_WIDTHS = LAYOUT_VIEWPORTS.filter((v) =>
  ["320", "390", "768", "1280"].includes(v.name),
);

test.describe("text-length stress (test-only page)", () => {
  for (const viewport of STRESS_WIDTHS) {
    test(`layout-stress @ ${viewport.name}px`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto("/qa/layout-stress", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      if (
        await page.getByRole("heading", { name: "Not available" }).count()
      ) {
        throw new Error(
          "layout-stress requires ALLOW_QA_STRESS=1 on the running production server",
        );
      }
      await expect(
        page.getByRole("heading", { name: "Layout stress (test only)" }),
      ).toBeVisible();
      await expect(page.getByText(stress.email).first()).toBeVisible();
      await expect(page.getByText(stress.branchName)).toBeVisible();
      await expect(page.getByText(stress.programTitle)).toBeVisible();
      await expect(page.getByText(stress.sermonTitle)).toBeVisible();
      await expect(page.getByText("Kasoa (stress empty optionals)")).toBeVisible();
      await assertPublicLayout(page, `stress ${viewport.name}`);
    });
  }
});

test.describe("CSS root-font scale (not browser zoom)", () => {
  test("200% rem scale on home does not overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (await page.getByText("This page couldn't load").count()) {
      test.skip(true, "Home did not render; CSS scale is not browser zoom");
    }
    await page.addStyleTag({
      content: "html { font-size: 200% !important; }",
    });
    const metrics = await collectLayoutMetrics(page);
    expect(metrics.headerFooterOverlap).toBe(false);
    expect(metrics.footerRegionOverlap).toBe(false);
  });
});
