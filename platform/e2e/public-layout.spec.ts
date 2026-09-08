import { test } from "@playwright/test";
import { LAYOUT_VIEWPORTS, PUBLIC_ROUTES } from "./helpers/routes";
import { assertFooterContract, assertPublicLayout } from "./helpers/layout";

const year = new Date().getFullYear();

for (const route of PUBLIC_ROUTES) {
  for (const viewport of LAYOUT_VIEWPORTS) {
    test(`layout ${route} @ ${viewport.name}px`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto(route, { waitUntil: "networkidle" });
      if (await page.getByText("This page couldn't load").count()) {
        await page.reload({ waitUntil: "networkidle" });
      }
      await assertPublicLayout(page, `${route} ${viewport.name}`);
      await assertFooterContract(page, year);
    });
  }
}
