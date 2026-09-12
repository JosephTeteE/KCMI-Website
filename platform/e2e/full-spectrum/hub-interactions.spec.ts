import { expect, test } from "@playwright/test";
import { hubAuthAvailable, resolveHubStorageState } from "../qa/auth";

test.describe("QA1 Hub interactions", () => {
  test("dashboard landmark + programs nav", async ({ browser }) => {
    test.skip(!hubAuthAvailable(), "BLOCKED — Hub storageState missing");
    const context = await browser.newContext({
      storageState: resolveHubStorageState()!,
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /What would you like to update/i }),
    ).toBeVisible({ timeout: 20_000 });
    await page
      .getByRole("navigation", { name: /Hub/i })
      .getByRole("link", { name: /Programs/i })
      .click();
    await expect(page.getByRole("heading", { name: /Programs/i })).toBeVisible();
    await context.close();
  });
});
