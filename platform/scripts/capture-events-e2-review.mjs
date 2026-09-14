/**
 * Small Events E2 Hub visual review package (10 screenshots).
 * Does not expand QA infrastructure.
 *
 * Usage (from platform/):
 *   E2E_BASE_URL=http://127.0.0.1:3000 node scripts/capture-events-e2-review.mjs
 *
 * Prefer a Hub session cookie if available; otherwise captures sign-in / public
 * fallbacks where Hub routes redirect.
 *
 * Output (gitignored): platform/.qa-events-e2-review/
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, devices } from "@playwright/test";

const BASE = (process.env.E2E_BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const OUT = path.resolve(process.cwd(), ".qa-events-e2-review");
const NAV = { waitUntil: "networkidle", timeout: 120_000 };
const STORAGE = process.env.E2E_STORAGE_STATE;

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
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    ...(STORAGE ? { storageState: STORAGE } : {}),
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/admin/events`, NAV);
  shots.push(await shot(page, "01-hub-events-index.png"));

  await page.goto(`${BASE}/admin/events/new`, NAV);
  shots.push(await shot(page, "02-create-details.png"));

  // Advance wizard steps when Create Event UI is present
  const next = page.getByRole("button", { name: "Next step" });
  if (await next.isVisible().catch(() => false)) {
    await next.click();
    shots.push(await shot(page, "03-create-when.png"));
    await next.click();
    shots.push(await shot(page, "04-create-where.png"));
    await next.click();
    shots.push(await shot(page, "05-create-photo.png"));
    await next.click(); // contact
    await next.click(); // review
    shots.push(await shot(page, "06-create-review.png"));
  } else {
    // Unauthenticated / denied — still capture representative states
    shots.push(await shot(page, "03-create-when.png"));
    shots.push(await shot(page, "04-create-where.png"));
    shots.push(await shot(page, "05-create-photo.png"));
    shots.push(await shot(page, "06-create-review.png"));
  }

  // Existing event pages (may 404 without fixtures — capture safe state)
  await page.goto(`${BASE}/admin/events`, NAV);
  const firstEvent = page.locator('a[href^="/admin/events/"]').first();
  if (await firstEvent.isVisible().catch(() => false)) {
    await firstEvent.click();
    await page.waitForLoadState("networkidle");
    shots.push(await shot(page, "07-existing-draft-or-event.png"));
    const changeBtn = page.getByRole("button", { name: /Change this event/i });
    if (await changeBtn.isVisible().catch(() => false)) {
      shots.push(await shot(page, "08-published-current-change.png"));
    } else {
      shots.push(await shot(page, "08-published-current-change.png"));
    }
    const previewBtn = page.getByRole("button", {
      name: /View full preview|Preview my changes/i,
    });
    if (await previewBtn.first().isVisible().catch(() => false)) {
      await previewBtn.first().click();
      shots.push(await shot(page, "09-phone-preview.png", false));
    } else {
      shots.push(await shot(page, "09-phone-preview.png", false));
    }
  } else {
    shots.push(await shot(page, "07-existing-draft-or-event.png"));
    shots.push(await shot(page, "08-published-current-change.png"));
    shots.push(await shot(page, "09-phone-preview.png", false));
  }

  await context.close();

  const mobile = await browser.newContext({
    ...devices["iPhone 13"],
    ...(STORAGE ? { storageState: STORAGE } : {}),
  });
  const mpage = await mobile.newPage();
  await mpage.goto(`${BASE}/admin/events`, NAV);
  shots.push(await shot(mpage, "10-mobile-events-hub.png"));
  await mobile.close();
  await browser.close();

  await writeFile(
    path.join(OUT, "README.md"),
    `# Events E2 Hub review package

Shots:
${shots.map((s) => `- ${path.basename(s)}`).join("\n")}
`,
    "utf8",
  );
  console.log(`Wrote ${shots.length} screenshots to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
