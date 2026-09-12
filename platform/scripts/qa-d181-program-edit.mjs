/**
 * D1.8.1 Program edit parity evidence.
 * Local Next (this working tree) + staging-backed auth/data via .env.local.
 * Mutates only the known STAGING QA draft (never publish). No .auth in ZIP.
 *
 *   KCMI_ALLOW_QA_FIXTURES=1 CAPTURE_BASE_URL=http://127.0.0.1:3021 \
 *     node scripts/qa-d181-program-edit.mjs
 */
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { ensureCaptureAuthState } from "./lib/capture-auth.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, ".qa-d181-program-edit");
const SHOTS = resolve(OUT, "screenshots");
const AUTH = resolve(
  ROOT,
  process.env.CAPTURE_AUTH_STATE || ".auth/d181-local-user.json",
);
const ZIP = resolve(homedir(), "Downloads/kcmi-d181-program-edit.zip");
const BASE =
  process.env.CAPTURE_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:3021";
const PORT = new URL(BASE).port || "3021";
const QA_ID = "4798d76c-6112-4870-9f52-7d1ab38d06bd";
const QA_LABEL = "Morning QA Session";

/** @type {any} */
const results = {
  phase: "D1.8.1-program-edit",
  generatedAt: new Date().toISOString(),
  base: BASE,
  qaProgramId: QA_ID,
  hostedQa: {},
  draftSave: {},
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

function waitForPort(port, ms = 120_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const r = spawnSync("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", `http://127.0.0.1:${port}/`], {
      encoding: "utf8",
    });
    const code = (r.stdout || "").trim();
    if (code && code !== "000") return;
    spawnSync("sleep", ["1"]);
  }
  throw new Error(`Server on :${port} did not become ready`);
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(SHOTS, { recursive: true });

  await ensureCaptureAuthState({
    baseUrl: BASE,
    authStatePath: AUTH,
  });

  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });
  const context = await browser.newContext({
    storageState: AUTH,
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const editPath = `/admin/programs/${QA_ID}`;
  note(`Opening QA Program ${QA_ID}`);
  await page.goto(`${BASE}${editPath}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  if (page.url().includes("/auth/")) {
    throw new Error("Auth redirect — refresh storageState with headed MFA");
  }
  await dismissTour(page);

  const draftBanner = page.getByTestId("program-draft-banner");
  await draftBanner.waitFor({ timeout: 15_000 });
  const wizard = page.locator('[data-tour="program-wizard"]');
  await wizard.waitFor({ timeout: 10_000 });

  // Go to When step to show multi-day reconstruction
  await page.getByRole("button", { name: "Next step" }).click();
  await page.waitForTimeout(400);
  const whenSection = page.locator('[data-tour="program-wizard-when"]');
  await whenSection.waitFor({ timeout: 10_000 });

  const bodyWhen = await whenSection.innerText();
  results.hostedQa.whenText = bodyWhen.slice(0, 800);
  const hasNov12 = /2026-11-12|November 12|12 November/i.test(bodyWhen);
  const hasNov13 = /2026-11-13|November 13|13 November/i.test(bodyWhen);
  const dateInputs = whenSection.locator('input[type="date"]');
  const dateCount = await dateInputs.count();
  const timeInputs = whenSection.locator('input[type="time"]');
  const timeCount = await timeInputs.count();
  results.hostedQa.reconstruction = {
    hasNov12,
    hasNov13,
    dateCount,
    timeCount,
    severalDaysChecked: await page
      .locator('input[name="schedule_mode"][value="several_days"]')
      .isChecked()
      .catch(() => false),
  };
  note(`Reconstruction: dates=${dateCount} times=${timeCount} nov12=${hasNov12} nov13=${hasNov13}`);

  await shot(page, "01-qa-reopen-multiday-desktop");

  // Focus first day with two sessions
  const firstDay = whenSection.locator("[data-program-day]").first();
  if (await firstDay.count()) {
    await firstDay.scrollIntoViewIfNeeded();
  }
  await shot(page, "02-qa-reopen-two-sessions-one-day-desktop");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await shot(page, "03-qa-reopen-mobile");

  // Review step desktop
  await page.setViewportSize({ width: 1280, height: 800 });
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Next step" }).click();
    await page.waitForTimeout(250);
  }
  await page.locator('[data-tour="program-wizard-review"]').waitFor({
    timeout: 10_000,
  });
  await shot(page, "04-program-edit-review-desktop");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await shot(page, "05-program-edit-review-mobile");

  // Harmless draft label: back to When, set first session label, save
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE}${editPath}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await dismissTour(page);
  await page.getByRole("button", { name: "Next step" }).click();
  await page.waitForTimeout(400);

  const labelFields = page.getByLabel(/Session name \(optional\)/i);
  let labeled = false;
  if ((await labelFields.count()) > 0) {
    await labelFields.first().fill(QA_LABEL);
    labeled = true;
  }
  results.draftSave.labelApplied = labeled;

  // Advance to review and save draft
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Next step" }).click();
    await page.waitForTimeout(250);
  }
  const saveBtn = page.getByTestId("program-save-draft");
  await Promise.all([
    page.waitForURL((url) => {
      try {
        const u = new URL(url);
        return (
          u.pathname === editPath &&
          (u.searchParams.has("message") || u.searchParams.has("error"))
        );
      } catch {
        return false;
      }
    }, { timeout: 60_000 }),
    saveBtn.click(),
  ]);
  await page.waitForTimeout(800);
  await dismissTour(page);

  const afterSave = await page.locator("body").innerText();
  const afterUrl = page.url();
  results.draftSave.afterUrl = afterUrl;
  results.draftSave.flashOk = /draft changes are saved|still not on the website/i.test(
    afterSave,
  );
  results.draftSave.saveError = /could not|error|invalid/i.test(
    new URL(afterUrl).searchParams.get("error") ?? "",
  )
    ? new URL(afterUrl).searchParams.get("error")
    : null;
  results.draftSave.bannerStillDraft = await page
    .getByTestId("program-draft-banner")
    .isVisible()
    .catch(() => false);

  // Reopen verify label
  await page.goto(`${BASE}${editPath}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await dismissTour(page);
  await page.getByRole("button", { name: "Next step" }).click();
  await page.waitForTimeout(500);
  const whenAfter = await page.locator('[data-tour="program-wizard-when"]').innerText();
  const labelValues = await page
    .getByLabel(/Session name \(optional\)/i)
    .evaluateAll((els) =>
      els.map((el) => ("value" in el ? String(el.value) : "")),
    );
  results.draftSave.labelValuesAfterReopen = labelValues;
  results.draftSave.labelPersisted = labelValues.some((v) =>
    v.includes(QA_LABEL),
  );
  results.draftSave.whenAfterSnippet = whenAfter.slice(0, 400);
  note(
    `Draft save: labeled=${labeled} persisted=${results.draftSave.labelPersisted} values=${JSON.stringify(labelValues)}`,
  );

  // Restore: clear label if present
  if (results.draftSave.labelPersisted) {
    const labels = page.getByLabel(/Session name \(optional\)/i);
    if ((await labels.count()) > 0) {
      await labels.first().fill("");
      for (let i = 0; i < 3; i++) {
        await page.getByRole("button", { name: "Next step" }).click();
        await page.waitForTimeout(200);
      }
      await Promise.all([
        page.waitForURL((url) => {
          try {
            const u = new URL(url);
            return (
              u.pathname === editPath &&
              (u.searchParams.has("message") || u.searchParams.has("error"))
            );
          } catch {
            return false;
          }
        }, { timeout: 60_000 }),
        page.getByTestId("program-save-draft").click(),
      ]);
      results.draftSave.labelRestored = true;
      note("Restored QA session label (cleared)");
    }
  }

  // Shot 6 — published safety fixture
  await page.goto(`${BASE}/admin/programs/fixture-published-safety`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await dismissTour(page);
  await page.getByTestId("program-live-locked").waitFor({ timeout: 10_000 });
  await shot(page, "06-published-edit-safety-desktop");

  // Shot 7 — mobile Help with real highlight
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/admin`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.evaluate(() => {
    localStorage.removeItem("kcmi-hub-tour-v2-complete");
    localStorage.removeItem("kcmi-hub-tour-v1-complete");
    sessionStorage.removeItem("kcmi-hub-tour-v2-active");
  });
  // Open mobile menu then Help
  const menuBtn = page.getByRole("button", { name: /Menu|Open menu/i }).first();
  if (await menuBtn.isVisible().catch(() => false)) {
    await menuBtn.click();
    await page.waitForTimeout(400);
  }
  const help = page
    .locator('[data-tour="help-tutorial"]')
    .or(page.getByRole("button", { name: /Help|Tutorial|Show me around|Replay/i }))
    .first();
  await help.click();
  await page.waitForTimeout(1200);
  // Advance until Help target step if needed
  const dialog = page.locator('[role="dialog"][data-hub-tour-kind]');
  await dialog.waitFor({ timeout: 15_000 });
  // Ensure highlight on help target
  for (let i = 0; i < 6; i++) {
    const hl = page.locator("[data-hub-tour-highlight='true']");
    const title = await dialog.locator("h2").innerText().catch(() => "");
    if (/Help/i.test(title) && (await hl.isVisible().catch(() => false))) {
      break;
    }
    const next = page.getByRole("button", { name: /Next step/i });
    if (await next.isVisible().catch(() => false)) {
      await next.click();
      await page.waitForTimeout(700);
    } else break;
  }
  const hl = page.locator("[data-hub-tour-highlight='true']");
  const hlVisible = await hl.isVisible().catch(() => false);
  results.notes.push(`mobile Help highlight visible: ${hlVisible}`);
  if (!hlVisible) {
    results.screenshots.failed.push({
      name: "07-mobile-help-tutorial-target",
      error: "Help highlight cutout not visible",
    });
    results.screenshots.expected.push("07-mobile-help-tutorial-target");
  } else {
    await shot(page, "07-mobile-help-tutorial-target");
  }

  await browser.close();

  const expected = results.screenshots.expected.length;
  const succeeded = results.screenshots.succeeded.length;
  const failed = results.screenshots.failed.length;
  results.screenshots.summary = { expected, succeeded, failed };

  writeFileSync(
    resolve(OUT, "capture-results.json"),
    JSON.stringify(results, null, 2),
  );

  const index = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><title>D1.8.1 Program edit evidence</title>
<style>
body{font-family:system-ui,sans-serif;margin:2rem;background:#111;color:#eee}
img{max-width:100%;border:1px solid #333;margin:1rem 0}
.grid{display:grid;gap:1.5rem}
</style></head><body>
<h1>D1.8.1 Program edit parity</h1>
<p>Expected ${expected} / succeeded ${succeeded} / failed ${failed}</p>
<p>QA Program ${QA_ID} — draft reopen + harmless label round-trip.</p>
<div class="grid">
${results.screenshots.succeeded
  .map(
    (n) =>
      `<figure><figcaption>${n}</figcaption><img src="screenshots/${n}.png" alt="${n}"/></figure>`,
  )
  .join("\n")}
</div>
</body></html>`;
  writeFileSync(resolve(OUT, "INDEX.html"), index);

  spawnSync(
    "zip",
    [
      "-r",
      ZIP,
      ".",
      "-x",
      "*.auth*",
      "*.env*",
      "*cookies*",
      "*storageState*",
    ],
    { cwd: OUT, stdio: "inherit" },
  );

  console.log(
    JSON.stringify(
      {
        zip: ZIP,
        expected,
        succeeded,
        failed,
        draftSave: results.draftSave,
        reconstruction: results.hostedQa.reconstruction,
      },
      null,
      2,
    ),
  );

  if (failed > 0 || succeeded < 7) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
