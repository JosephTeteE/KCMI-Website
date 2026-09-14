/**
 * Small Events E1 visual review package (5 screenshots only).
 * Does not update visual baselines or expand QA infrastructure.
 *
 * Usage (from platform/):
 *   1. Start Next with review fixtures:
 *      EVENTS_E1_REVIEW_FIXTURES=1 npm run dev
 *   2. Capture:
 *      E2E_BASE_URL=http://127.0.0.1:3000 node scripts/capture-events-e1-review.mjs
 *
 * Output (gitignored): platform/.qa-events-e1-review/
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, devices } from "@playwright/test";

const BASE = (process.env.E2E_BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const OUT = path.resolve(process.cwd(), ".qa-events-e1-review");
const NAV = { waitUntil: "networkidle", timeout: 120_000 };

async function main() {
  await mkdir(OUT, { recursive: true });
  let browser;
  try {
    browser = await chromium.launch();
  } catch {
    browser = await chromium.launch({ channel: "chrome" });
  }
  const shots = [];

  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();

    await page.goto(`${BASE}/events`, NAV);
    const p1 = path.join(OUT, "01-desktop-events-index.png");
    await page.screenshot({ path: p1, fullPage: true });
    shots.push(p1);

    await page.goto(`${BASE}/events/ministers-conference-review`, NAV);
    const p2 = path.join(OUT, "02-desktop-detail-with-image.png");
    await page.screenshot({ path: p2, fullPage: true });
    shots.push(p2);

    await page.goto(`${BASE}/events/family-retreat-review`, NAV);
    const p3 = path.join(OUT, "03-desktop-detail-without-image.png");
    await page.screenshot({ path: p3, fullPage: true });
    shots.push(p3);

    await page.goto(`${BASE}/events/unknown-unpublished-slug`, NAV);
    const p5 = path.join(OUT, "05-desktop-unpublished-safe.png");
    await page.screenshot({ path: p5, fullPage: true });
    shots.push(p5);

    await context.close();
  }

  {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/events`, NAV);
    const p4 = path.join(OUT, "04-mobile-events-index.png");
    await page.screenshot({ path: p4, fullPage: true });
    shots.push(p4);
    await context.close();
  }

  await browser.close();

  const readme = `# Events E1 review package

Synthetic fixtures via EVENTS_E1_REVIEW_FIXTURES=1 (non-production).
Not legacy Camp 2025 content. Not production data.

Shots:
${shots.map((s) => `- ${path.basename(s)}`).join("\n")}
`;
  await writeFile(path.join(OUT, "README.md"), readme, "utf8");
  console.log(`Wrote ${shots.length} screenshots to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
