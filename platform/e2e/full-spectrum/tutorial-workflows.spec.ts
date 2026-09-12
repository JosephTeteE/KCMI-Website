import { expect, test } from "@playwright/test";
import { hubAuthAvailable, resolveHubStorageState } from "../qa/auth";

const STAGING_QA_PROGRAM =
  process.env.QA_STAGING_PROGRAM_ID ||
  "4798d76c-6112-4870-9f52-7d1ab38d06bd";

test.describe("QA1 tutorial workflows", () => {
  test("Help opens a tour dialog on dashboard", async ({ browser }) => {
    test.skip(!hubAuthAvailable(), "BLOCKED — Hub storageState missing");
    const context = await browser.newContext({
      storageState: resolveHubStorageState()!,
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.removeItem("kcmi-hub-tour-v2-complete");
      sessionStorage.removeItem("kcmi-hub-tour-v2-active");
    });
    const help = page
      .locator('[data-tour="help-tutorial"]')
      .or(page.getByRole("button", { name: /Help|Tutorial|Show me around|Replay/i }))
      .first();
    if (await help.isVisible().catch(() => false)) {
      await help.click();
      const dialog = page.locator('[role="dialog"][data-hub-tour-kind]');
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    }
    await context.close();
  });

  test("Program EDIT contextual tour highlights without leaving edit route", async ({
    browser,
  }) => {
    test.skip(!hubAuthAvailable(), "BLOCKED — Hub storageState missing");
    const context = await browser.newContext({
      storageState: resolveHubStorageState()!,
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    const editPath = `/admin/programs/${STAGING_QA_PROGRAM}`;
    await page.goto(editPath, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.removeItem("kcmi-hub-tour-v2-complete");
      sessionStorage.clear();
    });

    // Capture a stable field value to prove tour did not mutate wizard.
    const nameBefore = await page
      .locator("#program-title, [name='title'], input")
      .first()
      .inputValue()
      .catch(() => "");

    const replay = page
      .locator('aside [data-tour="help-tutorial"] button')
      .or(page.getByRole("button", { name: /Replay Hub Tour|Show me around/i }))
      .first();
    await expect(replay).toBeVisible({ timeout: 15_000 });
    await replay.click();
    const showMe = page.getByRole("button", { name: /Show me around/i });
    if (await showMe.isVisible().catch(() => false)) await showMe.click();

    const layer = page.locator("dialog.hub-tour-layer").first();
    await expect(layer).toBeVisible({ timeout: 15_000 });
    await expect(layer).toContainText(/Program name|When|Where|Visitor|Review/i);
    await expect(layer).not.toContainText(/Looking for this control/i);
    await expect(page.locator("[data-hub-tour-highlight='true']")).toBeVisible();
    expect(page.url()).toContain(editPath);

    await page.getByRole("button", { name: /Next step/i }).last().click();
    await expect(page.locator("[data-hub-tour-highlight='true']")).toBeVisible();
    await expect(layer).not.toContainText(/Looking for this control/i);
    expect(page.url()).toContain(editPath);

    const back = page.getByRole("button", { name: /Back|Previous/i }).last();
    if (await back.isVisible().catch(() => false)) {
      await back.click();
      await expect(page.locator("[data-hub-tour-highlight='true']")).toBeVisible();
    }

    await page.keyboard.press("Escape");
    await expect(layer).toHaveCount(0);
    await expect(page.locator("[data-hub-tour-highlight='true']")).toHaveCount(0);
    expect(page.url()).toContain(editPath);

    const nameAfter = await page
      .locator("#program-title, [name='title'], input")
      .first()
      .inputValue()
      .catch(() => "");
    if (nameBefore) expect(nameAfter).toBe(nameBefore);

    // Skip path: restart and Skip
    await replay.click();
    if (await showMe.isVisible().catch(() => false)) await showMe.click();
    await expect(layer).toBeVisible({ timeout: 10_000 });
    const skip = page.getByRole("button", {
      name: /Skip for now|Close tour|Finish tour/i,
    });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    else await page.keyboard.press("Escape");
    await expect(layer).toHaveCount(0);

    await context.close();
  });
});
