import { expect, test } from "@playwright/test";
import { hubAuthAvailable, resolveHubStorageState } from "../qa/auth";
import { auditHubTypographySample } from "../qa/dom-audit";

test.describe("QA1 typography — Hub floors", () => {
  test("Hub dashboard sample meets body floor (report soft)", async ({
    browser,
  }) => {
    test.skip(!hubAuthAvailable(), "BLOCKED — Hub storageState missing");
    const context = await browser.newContext({
      storageState: resolveHubStorageState()!,
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    const findings = await auditHubTypographySample(page);
    // Soft gate for first run: collect but fail only extreme (<12px)
    const extreme = findings.filter((f) => f.fontSize < 12);
    expect(extreme, JSON.stringify(extreme)).toEqual([]);
    await context.close();
  });
});

test.describe("QA1 typography — public not forced to Hub floors", () => {
  test("public home loads", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });
});
