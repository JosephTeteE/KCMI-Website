/**
 * D1.7 visual review bundle.
 *
 * Captures public pages from a local production build (new D1.7 UI).
 * Hub captures use platform/.auth/user.json when present against
 * QA_D17_HUB_BASE_URL (default: local). Tour steps are driven when Hub auth works.
 *
 * Writes platform/.qa-d17-review/ and ~/Downloads/kcmi-d17-review.zip
 * Does not bless visual baselines.
 *
 * Usage (from platform/):
 *   ALLOW_QA_STRESS=1 npm run build && node scripts/qa-d17-review.mjs
 */
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, ".qa-d17-review");
const SHOTS = resolve(OUT, "screenshots");
const PORT = process.env.QA_D17_PORT || "3027";
const BASE = process.env.QA_D17_BASE_URL || `http://127.0.0.1:${PORT}`;
const HUB_BASE = process.env.QA_D17_HUB_BASE_URL || BASE;
const AUTH_STATE = resolve(ROOT, ".auth/user.json");
const ZIP = resolve(homedir(), "Downloads/kcmi-d17-review.zip");

const PUBLIC = [
  { path: "/", name: "home", widths: [320, 390, 768, 1280, 1920, 3840] },
  { path: "/locations", name: "locations", widths: [390, 1280, 1920] },
  { path: "/locations/accra", name: "branch-accra", widths: [390, 1280] },
  { path: "/locations/headquarters", name: "branch-hq", widths: [390, 1280] },
  { path: "/about", name: "about", widths: [390, 1280] },
  { path: "/services", name: "services", widths: [390, 1280] },
  { path: "/sermons", name: "sermons", widths: [390, 1280] },
  { path: "/contact", name: "contact", widths: [390, 1280] },
];

const HUB = [
  { path: "/admin", name: "hub-dashboard", widths: [390, 1280, 1920] },
  { path: "/admin/website/home", name: "hub-home-chooser", widths: [390, 1280] },
  {
    path: "/admin/website/home",
    name: "hub-home-words",
    widths: [390, 1280],
    prep: "banner-words",
  },
  {
    path: "/admin/website/home",
    name: "hub-home-spotlight",
    widths: [390, 1280],
    prep: "spotlight",
  },
  { path: "/admin/branches", name: "hub-branches", widths: [390, 1280] },
  { path: "/admin/livestream", name: "hub-livestream", widths: [390, 1280] },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status > 0) return;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new Error(`Server not ready at ${url}`);
}

function startServer() {
  if (process.env.QA_D17_BASE_URL) return null;
  return spawn("npx", ["next", "start", "-p", PORT], {
    cwd: ROOT,
    env: { ...process.env, ALLOW_QA_STRESS: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function shot(page, file) {
  const path = resolve(SHOTS, file);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  return `screenshots/${file}`;
}

function writeIndex(entries, notes) {
  const cards = entries
    .map(
      (e) => `<figure>
  <figcaption><strong>${escapeHtml(e.label)}</strong> · ${escapeHtml(e.meta)}</figcaption>
  <a href="${escapeHtml(e.file)}"><img src="${escapeHtml(e.file)}" alt="${escapeHtml(e.label)}"></a>
</figure>`,
    )
    .join("\n");
  writeFileSync(
    resolve(OUT, "INDEX.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>KCMI D1.7 review</title>
<style>
body{font-family:system-ui,sans-serif;margin:1.5rem;background:#f4f1f5;color:#141216}
.grid{display:grid;gap:1.25rem;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
figure{margin:0;background:#fff;border:1px solid #d4dde0;border-radius:12px;overflow:hidden}
figcaption{padding:.75rem 1rem;font-size:.9rem}
img{display:block;width:100%;height:auto}
.notes{max-width:52rem;margin-bottom:1.5rem;line-height:1.5}
</style></head><body>
<h1>KCMI D1.7 visual review</h1>
<div class="notes">${notes.map((n) => `<p>${escapeHtml(n)}</p>`).join("")}</div>
<div class="grid">${cards}</div>
</body></html>`,
  );
  writeFileSync(
    resolve(OUT, "README.txt"),
    [
      "KCMI D1.7 visual review",
      `Public base: ${BASE}`,
      `Hub base: ${HUB_BASE}`,
      ...notes,
      "",
      "Do not bless Playwright visual baselines from this bundle.",
    ].join("\n"),
  );
}

async function capturePublic(browser, entries) {
  for (const route of PUBLIC) {
    for (const width of route.widths) {
      const context = await browser.newContext({
        viewport: { width, height: Math.min(1200, Math.round(width * 1.6)) },
      });
      const page = await context.newPage();
      await page.goto(`${BASE}${route.path}`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await page.waitForTimeout(700);
      const file = await shot(page, `public-${route.name}-${width}.png`);
      entries.push({
        label: `Public ${route.path}`,
        meta: `${width}px`,
        file,
      });
      await context.close();
    }
  }
}

async function captureHub(browser, entries, notes) {
  if (!existsSync(AUTH_STATE)) {
    notes.push(
      "Hub screenshots skipped: platform/.auth/user.json missing. Run npm run screenshots once against preview, or sign in locally and save storage state.",
    );
    return;
  }

  for (const route of HUB) {
    for (const width of route.widths) {
      const context = await browser.newContext({
        storageState: AUTH_STATE,
        viewport: { width, height: Math.min(1200, Math.round(width * 1.5)) },
      });
      const page = await context.newPage();
      await page.goto(`${HUB_BASE}${route.path}`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      if (route.prep === "spotlight") {
        const card = page.locator('[data-tour="home-visual-section-spotlight"]');
        if (await card.count()) {
          await card.getByRole("button", { name: "Edit this section" }).click();
        } else {
          const fallback = page.getByRole("button", { name: /Edit this section/i });
          // Prefer spotlight card via heading nearby
          const spotlightEdit = page
            .getByText("KCMI Spotlight")
            .locator("..")
            .getByRole("button", { name: "Edit this section" });
          if (await spotlightEdit.count()) await spotlightEdit.first().click();
          else if (await fallback.count()) await fallback.nth(1).click().catch(() => {});
        }
      }
      if (route.prep === "banner-words") {
        const banner = page.locator('[data-tour="home-visual-section-banner"]');
        if (await banner.count()) {
          await banner.getByRole("button", { name: "Edit this section" }).click();
          await page.getByRole("button", { name: /^Words/ }).click();
        }
      }
      await page.waitForTimeout(800);
      const file = await shot(page, `hub-${route.name}-${width}.png`);
      entries.push({
        label: `Hub ${route.path}`,
        meta: `${width}px${route.prep ? ` · ${route.prep}` : ""}`,
        file,
      });
      await context.close();
    }
  }

  // Tour highlights (dashboard steps)
  const tourSteps = [
    { name: "tour-homepage", target: '[data-tour="dashboard-homepage"]' },
    { name: "tour-branches", target: '[data-tour="dashboard-branches"]' },
    { name: "tour-livestream", target: '[data-tour="dashboard-livestream"]' },
  ];
  const context = await browser.newContext({
    storageState: AUTH_STATE,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(`${HUB_BASE}/admin`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.evaluate(() => {
    try {
      localStorage.removeItem("kcmi-hub-tour-v1-complete");
      sessionStorage.setItem("kcmi-hub-tour-v1-active", "true");
      sessionStorage.setItem("kcmi-hub-tour-v1-step", "0");
    } catch {
      /* ignore */
    }
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  const start = page.getByRole("button", { name: /Start|tour|Yes/i });
  if (await start.count()) await start.first().click().catch(() => {});
  await page.waitForTimeout(600);
  for (const step of tourSteps) {
    const target = page.locator(step.target);
    if (await target.count()) {
      await target.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const file = await shot(page, `hub-${step.name}-1280.png`);
      entries.push({
        label: `Tour ${step.name}`,
        meta: "1280px",
        file,
      });
    }
  }
  // Publishing flow on homepage editor
  await page.goto(`${HUB_BASE}/admin/website/home`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForTimeout(500);
  const change = page.locator('[data-tour="change-section"]');
  if (await change.count()) {
    await change.first().click().catch(() => {});
    await page.waitForTimeout(400);
  }
  const file = await shot(page, "hub-tour-publish-flow-1280.png");
  entries.push({ label: "Tour publish flow", meta: "1280px", file });
  await context.close();
}

async function main() {
  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(SHOTS, { recursive: true });

  const child = startServer();
  await waitForServer(BASE, 90_000);

  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });
  const entries = [];
  const notes = [
    "Public captures are from the local D1.7 production build.",
    "Visual baselines were not updated.",
  ];

  try {
    await capturePublic(browser, entries);
    await captureHub(browser, entries, notes);
  } finally {
    await browser.close();
    if (child) child.kill("SIGTERM");
  }

  writeIndex(entries, notes);
  if (existsSync(ZIP)) rmSync(ZIP);
  spawnSync("zip", ["-r", ZIP, "."], { cwd: OUT, stdio: "inherit" });
  const count = readdirSync(SHOTS).filter((f) => f.endsWith(".png")).length;
  console.log(`Wrote ${count} screenshots → ${OUT}`);
  console.log(`ZIP → ${ZIP}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
