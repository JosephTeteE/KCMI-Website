/**
 * D1.8.1 Program lifecycle — REQUIRED PASS for QA1.
 * Hosted DRAFT_WRITE only against STAGING QA record.
 * Date-range-only Review = FAIL.
 */

import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import {
  assertFullScheduleReview,
  assertStagingQaMultiDayReview,
  assertHubNotSignedOut,
} from "../qa/integrity";
import {
  STAGING_QA_PROGRAM_ID,
  STAGING_QA_TITLE_PREFIX,
  assertMutationAllowed,
} from "../qa/mutation-policy";
import { hubAuthAvailable, resolveHubStorageState } from "../qa/auth";
import {
  buildHubProgramReviewSchedule,
  formatHubProgramReviewScheduleText,
} from "../../src/lib/programs/hub-review-schedule";

test.describe("QA1 Program D1.8.1 lifecycle", () => {
  test("unit: Review schedule helper renders staging QA sessions completely", () => {
    const sessions = [
      {
        sessionDate: "2026-11-12",
        startTime: "09:00",
        endTime: "11:00",
        sortOrder: 0,
      },
      {
        sessionDate: "2026-11-12",
        startTime: "17:00",
        endTime: null,
        sortOrder: 1,
      },
      {
        sessionDate: "2026-11-13",
        startTime: "09:00",
        endTime: null,
        sortOrder: 2,
      },
    ];
    const days = buildHubProgramReviewSchedule(sessions);
    expect(days).toHaveLength(2);
    expect(days[0]?.sessions).toHaveLength(2);
    expect(days[1]?.sessions).toHaveLength(1);
    const text = formatHubProgramReviewScheduleText(sessions);
    assertStagingQaMultiDayReview(text);
    expect(text).not.toMatch(/12 November\s*[–-]\s*13 November/);
  });

  test("unit: variants A–N schedule semantics", () => {
    // A one-day with end
    expect(
      formatHubProgramReviewScheduleText([
        { sessionDate: "2026-10-10", startTime: "17:00", endTime: "20:00" },
      ]),
    ).toMatch(/5:00 PM – 8:00 PM/);
    // B blank end
    expect(
      formatHubProgramReviewScheduleText([
        { sessionDate: "2026-10-11", startTime: "08:30", endTime: null },
      ]),
    ).toMatch(/8:30 AM/);
    // C two sessions one day
    expect(
      buildHubProgramReviewSchedule([
        { sessionDate: "2026-11-12", startTime: "09:00", endTime: "11:00" },
        { sessionDate: "2026-11-12", startTime: "17:00", endTime: null },
      ])[0]?.sessions,
    ).toHaveLength(2);
    // E named
    expect(
      buildHubProgramReviewSchedule([
        {
          sessionDate: "2026-11-12",
          startTime: "09:00",
          endTime: "11:00",
          label: "Morning QA Session",
        },
      ])[0]?.sessions[0]?.label,
    ).toBe("Morning QA Session");
  });

  test("browser: reopen STAGING QA — reconstruct + full Review schedule", async ({
    browser,
    baseURL,
  }) => {
    test.skip(!hubAuthAvailable(), "BLOCKED — Hub storageState missing (run npm run qa:auth)");
    const state = resolveHubStorageState();
    expect(state && existsSync(state)).toBe(true);

    assertMutationAllowed(baseURL ?? "", "SAFE");

    const context = await browser.newContext({
      storageState: state!,
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    await page.goto(`/admin/programs/${STAGING_QA_PROGRAM_ID}`, {
      waitUntil: "domcontentloaded",
    });
    const body = await page.locator("body").innerText();
    assertHubNotSignedOut(body, page.url());
    expect(body).toMatch(new RegExp(STAGING_QA_TITLE_PREFIX));
    await expect(page.getByTestId("program-draft-banner")).toBeVisible({
      timeout: 20_000,
    });

    // When step — day → sessions reconstruction
    await page.getByRole("button", { name: "Next step" }).click();
    const when = page.locator('[data-tour="program-wizard-when"]');
    await expect(when).toBeVisible();
    const whenText = await when.innerText();
    expect(whenText).toMatch(/Thursday|2026-11-12|11\/12\/2026/i);
    expect(whenText).toMatch(/Friday|2026-11-13|11\/13\/2026/i);
    expect(await when.locator('input[type="date"]').count()).toBeGreaterThanOrEqual(2);

    // Advance to Review
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: "Next step" }).click();
    }
    await expect(page.locator('[data-tour="program-wizard-review"]')).toBeVisible();
    const reviewWhen = await page.getByTestId("program-review-when").innerText();
    assertStagingQaMultiDayReview(reviewWhen);
    assertFullScheduleReview(reviewWhen);

    // Published safety fixture when available (local fixtures flag)
    await page.goto("/admin/programs/fixture-published-safety", {
      waitUntil: "domcontentloaded",
    });
    const fixtureBody = await page.locator("body").innerText();
    if (!/not found|404/i.test(fixtureBody)) {
      await expect(page.getByTestId("program-live-locked")).toBeVisible({
        timeout: 10_000,
      });
      await expect(
        page.getByRole("button", { name: /Change these details/i }),
      ).toBeVisible();
    }

    await context.close();
  });

  test("browser: harmless STAGING QA draft edit + Review still full schedule", async ({
    browser,
    baseURL,
  }) => {
    test.skip(!hubAuthAvailable(), "BLOCKED — Hub storageState missing (run npm run qa:auth)");
    test.skip(
      process.env.QA_ALLOW_STAGING_DRAFT_WRITE !== "1",
      "Set QA_ALLOW_STAGING_DRAFT_WRITE=1 to exercise hosted/local DRAFT_WRITE on STAGING QA",
    );

    assertMutationAllowed(baseURL ?? "", "DRAFT_WRITE", {
      recordTitle: `${STAGING_QA_TITLE_PREFIX} Multi-day Program Test`,
    });

    const state = resolveHubStorageState();
    const context = await browser.newContext({
      storageState: state!,
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    const editPath = `/admin/programs/${STAGING_QA_PROGRAM_ID}`;

    await page.goto(editPath, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Next step" }).click();
    const labels = page.getByLabel(/Session name \(optional\)/i);
    await expect(labels.first()).toBeVisible();
    const marker = `QA1 Lifecycle ${Date.now().toString().slice(-6)}`;
    await labels.first().fill(marker);

    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: "Next step" }).click();
    }
    const reviewWhen = await page.getByTestId("program-review-when").innerText();
    assertStagingQaMultiDayReview(reviewWhen);
    expect(reviewWhen).toContain(marker);

    await Promise.all([
      page.waitForURL(
        (url) => {
          try {
            const u = new URL(url);
            return (
              u.pathname === editPath &&
              (u.searchParams.has("message") || u.searchParams.has("error"))
            );
          } catch {
            return false;
          }
        },
        { timeout: 60_000 },
      ),
      page.getByTestId("program-save-draft").click(),
    ]);

    await page.goto(editPath, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Next step" }).click();
    const values = await page
      .getByLabel(/Session name \(optional\)/i)
      .evaluateAll((els) =>
        els.map((el) => ("value" in el ? String((el as HTMLInputElement).value) : "")),
      );
    expect(values.some((v) => v.includes(marker))).toBe(true);

    // Restore blank label
    await page.getByLabel(/Session name \(optional\)/i).first().fill("");
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: "Next step" }).click();
    }
    await Promise.all([
      page.waitForURL(
        (url) => {
          try {
            const u = new URL(url);
            return u.pathname === editPath && u.searchParams.has("message");
          } catch {
            return false;
          }
        },
        { timeout: 60_000 },
      ),
      page.getByTestId("program-save-draft").click(),
    ]);

    await context.close();
  });
});
