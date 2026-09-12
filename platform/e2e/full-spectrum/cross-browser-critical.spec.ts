import { expect, test } from "@playwright/test";

/**
 * Cross-browser critical paths — DOM/interaction, not pixel baselines.
 * Projects: fs-firefox / fs-webkit / mobile when configured.
 */
test.describe("QA1 cross-browser critical", () => {
  test("public home + locations load", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    await page.goto("/locations", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    testInfo.annotations.push({
      type: "browser",
      description: testInfo.project.name,
    });
  });
});
