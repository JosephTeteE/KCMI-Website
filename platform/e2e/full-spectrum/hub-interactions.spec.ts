import { expect, test } from "@playwright/test";
import { hubAuthAvailable, resolveHubStorageState } from "../qa/auth";

test.describe("QA1 Hub interactions", () => {
  test("dashboard landmark + programs nav", async ({ browser, baseURL }) => {
    test.skip(
      !hubAuthAvailable(baseURL),
      "BLOCKED — Hub storageState missing for this baseURL (run npm run qa:auth)",
    );
    const context = await browser.newContext({
      storageState: resolveHubStorageState(baseURL)!,
      viewport: { width: 1280, height: 800 },
    });
    await context.addInitScript(() => {
      localStorage.setItem("kcmi-hub-tour-v2-complete", "1");
      sessionStorage.removeItem("kcmi-hub-tour-v2-active");
    });
    const page = await context.newPage();
    await page.goto("/admin", { waitUntil: "domcontentloaded" });

    // Fail fast if storageState did not authenticate (redirect to sign-in).
    await expect(page.getByRole("heading", { name: /KCMI Hub sign in/i })).toHaveCount(
      0,
      { timeout: 5_000 },
    );

    // Dismiss tour if it still opened (e.g. older storage key).
    const tour = page.locator("dialog.hub-tour-layer[open]");
    if (await tour.isVisible().catch(() => false)) {
      await page.keyboard.press("Escape");
      await expect(tour).toHaveCount(0);
    }

    // Hub dashboard main title from HubPageHeader (src/app/admin/page.tsx).
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "What would you like to update?",
      }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("list", { name: "Things you can update" }),
    ).toBeVisible();

    await page
      .getByRole("navigation", { name: "Hub" })
      .getByRole("link", { name: "Programs & Announcements" })
      .click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Programs & Announcements",
      }),
    ).toBeVisible();
    await context.close();
  });
});
