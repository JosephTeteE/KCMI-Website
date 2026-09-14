/**
 * Small Search V2 visual review package (5 screenshots only).
 * Does not update visual baselines or QA infrastructure.
 *
 * Usage (from platform/):
 *   E2E_BASE_URL=http://127.0.0.1:3000 node scripts/capture-search-v2-review.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, devices } from "@playwright/test";

const BASE = (process.env.E2E_BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const OUT = path.resolve(process.cwd(), ".qa-search-v2-review");
const NAV = { waitUntil: "networkidle", timeout: 120_000 };

async function openSearchDialog(page) {
  const searchBtn = page.getByRole("button", { name: "Search" }).first();
  await searchBtn.waitFor({ state: "visible", timeout: 60_000 });
  await searchBtn.click();
  await page.getByRole("dialog", { name: "Search KCMI" }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  // Prefer bundled Chromium; fall back to system Chrome when browsers aren't installed.
  let browser;
  try {
    browser = await chromium.launch();
  } catch {
    browser = await chromium.launch({ channel: "chrome" });
  }
  const shots = [];

  // 1–2 desktop
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/`, NAV);
    await openSearchDialog(page);
    const p1 = path.join(OUT, "01-desktop-search-open.png");
    await page.screenshot({ path: p1, fullPage: false });
    shots.push(p1);

    await page.goto(`${BASE}/search?q=about`, NAV);
    const p2 = path.join(OUT, "02-desktop-results.png");
    await page.screenshot({ path: p2, fullPage: true });
    shots.push(p2);
    await context.close();
  }

  // 3–4 mobile
  {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/`, NAV);
    await openSearchDialog(page);
    const p3 = path.join(OUT, "03-mobile-search.png");
    await page.screenshot({ path: p3, fullPage: false });
    shots.push(p3);

    await page.goto(`${BASE}/search?q=ghana`, NAV);
    const p4 = path.join(OUT, "04-mobile-results.png");
    await page.screenshot({ path: p4, fullPage: true });
    shots.push(p4);
    await context.close();
  }

  // 5 no-results
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/search?q=zzzxq-not-a-kcmi-term-999`, NAV);
    const p5 = path.join(OUT, "05-no-results.png");
    await page.screenshot({ path: p5, fullPage: true });
    shots.push(p5);
    await context.close();
  }

  await browser.close();

  const readme = `# Search V2 review package

Base URL: ${BASE}
Captured: ${new Date().toISOString()}

1. 01-desktop-search-open.png — desktop Search dialog
2. 02-desktop-results.png — desktop results
3. 03-mobile-search.png — mobile Search dialog
4. 04-mobile-results.png — mobile results
5. 05-no-results.png — no-results state

Not a visual baseline update. QA1 remains frozen.
`;
  await writeFile(path.join(OUT, "README.md"), readme, "utf8");
  console.log(JSON.stringify({ out: OUT, shots }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
