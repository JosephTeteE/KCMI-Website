import { test } from "@playwright/test";
import { LAYOUT_VIEWPORTS, PUBLIC_ROUTES } from "./helpers/routes";
import {
  assertFooterContract,
  assertPublicLayout,
  openPublicPage,
} from "./helpers/layout";

const year = new Date().getFullYear();

for (const route of PUBLIC_ROUTES) {
  for (const viewport of LAYOUT_VIEWPORTS) {
    test(`layout ${route} @ ${viewport.name}px`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await openPublicPage(page, route);
      await assertPublicLayout(page, `${route} ${viewport.name}`);
      await assertFooterContract(page, year);
    });
  }
}
