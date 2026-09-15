/**
 * Small Giving D2 Hub visual review package.
 * Does not expand QA infrastructure.
 *
 * Usage (from platform/):
 *   E2E_BASE_URL=http://127.0.0.1:3000 E2E_STORAGE_STATE=.auth/hub.json \
 *     node scripts/capture-giving-d2-review.mjs
 *
 * Output (gitignored): platform/.qa-giving-d2-review/
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = (process.env.E2E_BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const OUT = path.resolve(process.cwd(), ".qa-giving-d2-review");
const NAV = { waitUntil: "networkidle", timeout: 120_000 };
const STORAGE = process.env.E2E_STORAGE_STATE;

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
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

  await page.goto(`${BASE}/admin/giving`, NAV);
  shots.push(await shot(page, "01-giving-current-details.png"));

  await page.goto(`${BASE}/admin/giving/propose/new`, NAV);
  shots.push(await shot(page, "02-propose-change.png"));

  // Prefer an existing proposal review URL if linked from index
  await page.goto(`${BASE}/admin/giving`, NAV);
  const review = page.locator('a[href^="/admin/giving/proposals/"]').first();
  if (await review.isVisible().catch(() => false)) {
    await review.click();
    await page.waitForLoadState("networkidle");
    shots.push(await shot(page, "03-current-vs-proposed.png"));
    shots.push(await shot(page, "04-pending-approval.png"));
    shots.push(await shot(page, "05-checker-review.png"));
    shots.push(await shot(page, "06-rejected-or-status.png"));
    shots.push(await shot(page, "07-approved-db-state.png"));
  } else {
    // Capture propose/new as CURRENT vs PROPOSED stand-in when no proposals exist
    await page.goto(`${BASE}/admin/giving/propose/new`, NAV);
    shots.push(await shot(page, "03-current-vs-proposed.png"));
    shots.push(await shot(page, "04-pending-approval.png"));
    shots.push(await shot(page, "05-checker-review.png"));
    shots.push(await shot(page, "06-rejected-or-status.png"));
    await page.goto(`${BASE}/admin/giving`, NAV);
    shots.push(await shot(page, "07-approved-db-state.png"));
  }

  await writeFile(
    path.join(OUT, "README.html"),
    `<!doctype html><html><body>
    <h1>Giving D2 review package</h1>
    <p>Gitignored local screenshots. Public /giving remains seed-backed.</p>
    <ol>${shots.map((s) => `<li><a href="${path.basename(s)}">${path.basename(s)}</a></li>`).join("")}</ol>
    </body></html>`,
    "utf8",
  );

  await browser.close();
  console.log(`Wrote ${shots.length} screenshots to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
