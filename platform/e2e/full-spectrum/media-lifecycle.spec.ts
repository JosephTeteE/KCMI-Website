import { expect, test } from "@playwright/test";
import { hubAuthAvailable, resolveHubStorageState } from "../qa/auth";

test.describe("QA1 media lifecycle — cancel path classified", () => {
  test("homepage editor loads without public write", async ({ browser }) => {
    test.skip(!hubAuthAvailable(), "BLOCKED — Hub storageState missing");
    const context = await browser.newContext({
      storageState: resolveHubStorageState()!,
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await page.goto("/admin/website/home", { waitUntil: "domcontentloaded" });
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(20);
    // PUBLIC_WRITE Make live must not be auto-clicked by this suite
    await context.close();
  });
});
