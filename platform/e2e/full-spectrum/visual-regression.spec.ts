import { expect, test } from "@playwright/test";

/**
 * Pixel baselines — Chromium primary. Never update via qa:visual.
 * First run may have zero baselines; missing snapshots are reported, not auto-blessed.
 */
test.describe("QA1 visual regression — public home", () => {
  test("home hero chromium baseline", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "fs-chromium" &&
        testInfo.project.name !== "public",
      "Chromium-primary pixel baselines only",
    );
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    // Soft: establish path; first run without baseline should use soft expect when QA_VISUAL_SOFT=1
    if (process.env.QA_VISUAL_SOFT === "1") {
      test.info().annotations.push({
        type: "note",
        description: "Visual soft mode — snapshot not asserted",
      });
      return;
    }
    await expect(page).toHaveScreenshot("qa1-home-1280.png", {
      fullPage: false,
      maxDiffPixels: 400,
    });
  });
});
