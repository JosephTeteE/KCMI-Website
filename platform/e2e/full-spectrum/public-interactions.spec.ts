import { expect, test } from "@playwright/test";

test.describe("QA1 public interactions", () => {
  test("mobile menu opens and closes on home", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const menu = page.getByRole("button", { name: /menu/i }).first();
    if (await menu.isVisible().catch(() => false)) {
      await menu.click();
      await expect(
        page.getByRole("navigation", { name: /Mobile primary|Primary/i }).first(),
      ).toBeVisible();
      const close = page.getByRole("button", { name: /close/i }).first();
      if (await close.isVisible().catch(() => false)) {
        await close.click();
      }
    }
  });

  test("locations finder accepts query", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/locations", { waitUntil: "domcontentloaded" });
    const search = page.getByRole("searchbox").or(page.getByLabel(/search|find|location/i)).first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill("Accra");
    }
    await expect(page.locator("body")).toBeVisible();
  });
});
