import { expect, test } from "@playwright/test";
import {
  FOOTER_VIEWPORTS,
  PUBLIC_ROUTES,
  VISUAL_VIEWPORTS,
} from "./helpers/routes";

test.describe("public visual baselines @visual", () => {
  for (const route of PUBLIC_ROUTES) {
    for (const viewport of VISUAL_VIEWPORTS) {
      test(`${route} ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto(route, { waitUntil: "networkidle" });
        // Match existing candidate filenames:
        //   public-{slug}-{width}-public-darwin.png
        // Terms already uses Playwright's default title-based names.
        if (route === "/terms") {
          await expect(page).toHaveScreenshot({ fullPage: true });
        } else {
          const slug = route === "/" ? "home" : route.slice(1);
          await expect(page).toHaveScreenshot(
            `public-${slug}-${viewport.name}.png`,
            { fullPage: true },
          );
        }
      });
    }
  }

  for (const viewport of FOOTER_VIEWPORTS) {
    test(`footer ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto("/", { waitUntil: "networkidle" });
      await page.locator("header").evaluate((el) => {
        (el as HTMLElement).style.visibility = "hidden";
      });
      await expect(page.locator("footer.site-footer")).toHaveScreenshot();
    });
  }
});
