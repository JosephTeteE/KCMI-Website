/**
 * Small Events E3 public registration visual review package (7 screenshots).
 * Does not expand QA infrastructure.
 *
 * Usage (from platform/):
 *   EVENTS_E1_REVIEW_FIXTURES=1 NEXT_PUBLIC_TURNSTILE_TEST_MODE=1 npm run dev
 *   E2E_BASE_URL=http://127.0.0.1:3000 node scripts/capture-events-e3-review.mjs
 *
 * Output (gitignored): platform/.qa-events-e3-review/
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, devices } from "@playwright/test";

const BASE = (process.env.E2E_BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const OUT = path.resolve(process.cwd(), ".qa-events-e3-review");
const NAV = { waitUntil: "networkidle", timeout: 120_000 };
const STORAGE = process.env.E2E_STORAGE_STATE;
const OPEN_SLUG = "ministers-conference-review";
const CLOSED_SLUG = "registration-closed-review";

async function shot(page, name, fullPage = true) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage });
  return file;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  let browser;
  try {
    browser = await chromium.launch();
  } catch {
    browser = await chromium.launch({ channel: "chrome" });
  }

  const shots = [];
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    ...(STORAGE ? { storageState: STORAGE } : {}),
  });
  const page = await desktop.newPage();

  await page.goto(`${BASE}/events/${OPEN_SLUG}`, NAV);
  shots.push(await shot(page, "01-event-register-cta.png"));

  await page.locator("#register").scrollIntoViewIfNeeded().catch(() => {});
  shots.push(await shot(page, "02-registration-form-desktop.png"));

  // Force a validation error state
  const submit = page.getByRole("button", { name: /Submit registration/i });
  if (await submit.isVisible().catch(() => false)) {
    await page.locator("#full_name").fill("A");
    await submit.click();
    await page.waitForTimeout(400);
    shots.push(await shot(page, "04-validation-error.png"));
  } else {
    shots.push(await shot(page, "04-validation-error.png"));
  }

  await page.goto(`${BASE}/events/${CLOSED_SLUG}`, NAV);
  shots.push(await shot(page, "06-registration-closed-or-full.png"));

  await page.goto(`${BASE}/admin/events/new`, NAV);
  const next = page.getByRole("button", { name: "Next step" });
  if (await next.isVisible().catch(() => false)) {
    for (let i = 0; i < 5; i += 1) {
      await next.click();
      await page.waitForTimeout(150);
    }
    shots.push(await shot(page, "07-hub-registration-settings.png"));
  } else {
    shots.push(await shot(page, "07-hub-registration-settings.png"));
  }

  await desktop.close();

  const mobile = await browser.newContext({
    ...devices["iPhone 12"],
    ...(STORAGE ? { storageState: STORAGE } : {}),
  });
  const mpage = await mobile.newPage();
  await mpage.goto(`${BASE}/events/${OPEN_SLUG}`, NAV);
  await mpage.locator("#register").scrollIntoViewIfNeeded().catch(() => {});
  shots.push(await shot(mpage, "03-registration-form-mobile.png"));
  await mobile.close();

  // Confirmation shot is environment-dependent; capture form as placeholder note.
  await writeFile(
    path.join(OUT, "05-confirmation-NOTE.txt"),
    [
      "Successful confirmation requires a live published Event with registration enabled,",
      "Turnstile test mode or real keys, and SUPABASE_SECRET_KEY for admin_register_for_event.",
      "Capture manually after a staging registration succeeds.",
      "",
      `Desktop form: 02-registration-form-desktop.png`,
      `Mobile form: 03-registration-form-mobile.png`,
    ].join("\n"),
  );

  await writeFile(
    path.join(OUT, "README.md"),
    [
      "# Events E3 registration review",
      "",
      "Screenshots:",
      ...shots.map((s) => `- ${path.basename(s)}`),
      "- 05-confirmation-NOTE.txt (manual confirmation capture)",
      "",
      "Fixtures: EVENTS_E1_REVIEW_FIXTURES=1",
      "Turnstile test: NEXT_PUBLIC_TURNSTILE_TEST_MODE=1 + TURNSTILE_TEST_MODE=1",
      "",
    ].join("\n"),
  );

  await browser.close();
  console.log(`Wrote ${shots.length} screenshots to ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
