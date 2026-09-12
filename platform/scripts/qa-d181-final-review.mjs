/**
 * D1.8.1 final Review schedule summary evidence (3 shots only).
 * Local Next + staging-backed auth. No .auth in ZIP.
 */
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { ensureCaptureAuthState } from "./lib/capture-auth.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, ".qa-d181-final-review");
const SHOTS = resolve(OUT, "screenshots");
const AUTH = resolve(
  ROOT,
  process.env.CAPTURE_AUTH_STATE || ".auth/d181-local-user.json",
);
const ZIP = resolve(homedir(), "Downloads/kcmi-d181-final-review.zip");
const BASE =
  process.env.CAPTURE_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:3022";
const QA_ID = "4798d76c-6112-4870-9f52-7d1ab38d06bd";

/** @type {any} */
const results = {
  phase: "D1.8.1-final-review-schedule",
  generatedAt: new Date().toISOString(),
  base: BASE,
  screenshots: { expected: [], succeeded: [], failed: [] },
  notes: [],
};

function note(msg) {
  results.notes.push(msg);
  console.log(msg);
}

async function shot(page, name) {
  results.screenshots.expected.push(name);
  try {
    await page.screenshot({
      path: resolve(SHOTS, `${name}.png`),
      fullPage: false,
    });
    results.screenshots.succeeded.push(name);
  } catch (e) {
    results.screenshots.failed.push({
      name,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

async function dismissTour(page) {
  const skip = page.getByRole("button", { name: /Skip tour|Finish tour/i });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click().catch(() => undefined);
  }
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.evaluate(() => {
    localStorage.setItem("kcmi-hub-tour-v2-complete", "true");
    sessionStorage.removeItem("kcmi-hub-tour-v2-active");
  });
}

async function goToReview(page) {
  for (let i = 0; i < 4; i++) {
    const next = page.getByRole("button", { name: "Next step" });
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
    await page.waitForTimeout(250);
  }
  await page.locator('[data-tour="program-wizard-review"]').waitFor({
    timeout: 15_000,
  });
  await page.getByTestId("program-review-when").waitFor({ timeout: 10_000 });
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(SHOTS, { recursive: true });

  await ensureCaptureAuthState({ baseUrl: BASE, authStatePath: AUTH });

  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });
  const context = await browser.newContext({
    storageState: AUTH,
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // 1–2 multi-day Review from staging QA draft
  note(`Opening QA Program ${QA_ID}`);
  await page.goto(`${BASE}/admin/programs/${QA_ID}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  if (page.url().includes("/auth/")) {
    throw new Error("Auth redirect — refresh storageState with headed MFA");
  }
  await dismissTour(page);
  await goToReview(page);

  const whenText = await page.getByTestId("program-review-when").innerText();
  results.notes.push(`multi-day When:\n${whenText}`);
  if (!/Thursday/i.test(whenText) || !/Friday/i.test(whenText)) {
    throw new Error(`Review When missing day headings: ${whenText}`);
  }
  if (!/9:00 AM/i.test(whenText) || !/5:00 PM/i.test(whenText)) {
    throw new Error(`Review When missing session times: ${whenText}`);
  }
  if (/12 November – 13 November/i.test(whenText)) {
    throw new Error("Review still shows compact date-range only");
  }

  await shot(page, "01-multiday-review-desktop");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await shot(page, "02-multiday-review-mobile");

  // 3 one-day Review via new wizard (no save)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE}/admin/programs/new`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await dismissTour(page);

  await page.getByLabel(/Program name/i).fill("D1.8.1 one-day Review proof");
  await page.getByRole("button", { name: "Next step" }).click();
  await page.waitForTimeout(300);

  await page.locator('input[name="schedule_mode"][value="one_day"]').check();
  await page.locator("#one_day_date").fill("2026-10-10");
  await page.locator("#one_day_start").fill("17:00");
  await page.locator("#one_day_end").fill("20:00");
  await page.getByRole("button", { name: "Next step" }).click();
  await page.waitForTimeout(250);

  // Where
  await page.getByText(/Online/i).first().click();
  await page.getByRole("button", { name: "Next step" }).click();
  await page.waitForTimeout(250);

  // Visitor link — none
  await page.getByRole("button", { name: "Next step" }).click();
  await page.waitForTimeout(250);

  await page.locator('[data-tour="program-wizard-review"]').waitFor({
    timeout: 10_000,
  });
  const oneDayWhen = await page.getByTestId("program-review-when").innerText();
  results.notes.push(`one-day When:\n${oneDayWhen}`);
  if (!/Saturday.*10 October 2026/i.test(oneDayWhen)) {
    throw new Error(`one-day Review heading unexpected: ${oneDayWhen}`);
  }
  if (!/5:00 PM – 8:00 PM/i.test(oneDayWhen)) {
    throw new Error(`one-day Review time unexpected: ${oneDayWhen}`);
  }

  await shot(page, "03-oneday-review-desktop");

  await browser.close();

  const expected = results.screenshots.expected.length;
  const succeeded = results.screenshots.succeeded.length;
  const failed = results.screenshots.failed.length;
  results.screenshots.summary = { expected, succeeded, failed };

  writeFileSync(
    resolve(OUT, "capture-results.json"),
    JSON.stringify(results, null, 2),
  );
  writeFileSync(
    resolve(OUT, "INDEX.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>D1.8.1 Review schedule</title>
<style>body{font-family:system-ui;margin:2rem;background:#111;color:#eee}img{max-width:100%;border:1px solid #333}</style></head><body>
<h1>D1.8.1 Final Review schedule</h1>
<p>Expected ${expected} / succeeded ${succeeded} / failed ${failed}</p>
${results.screenshots.succeeded
  .map(
    (n) =>
      `<figure><figcaption>${n}</figcaption><img src="screenshots/${n}.png" alt="${n}"/></figure>`,
  )
  .join("\n")}
</body></html>`,
  );

  spawnSync(
    "zip",
    ["-r", ZIP, ".", "-x", "*.auth*", "*.env*", "*cookies*", "*storageState*"],
    { cwd: OUT, stdio: "inherit" },
  );

  console.log(JSON.stringify({ zip: ZIP, expected, succeeded, failed }, null, 2));
  if (failed > 0 || succeeded < 3) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
