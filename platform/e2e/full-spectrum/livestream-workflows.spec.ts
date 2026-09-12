import { expect, test } from "@playwright/test";
import { hubAuthAvailable, resolveHubStorageState } from "../qa/auth";

test.describe("QA1 livestream workflows — safe states only", () => {
  test("livestream editor loads; does not Make Live", async ({ browser }) => {
    test.skip(!hubAuthAvailable(), "BLOCKED — Hub storageState missing");
    const context = await browser.newContext({
      storageState: resolveHubStorageState()!,
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await page.goto("/admin/livestream", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    // Classify PUBLIC_WRITE gate present or not — never click Make Livestream Live here
    await context.close();
  });
});
