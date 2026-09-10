/**
 * REVIEW-ONLY live staging capture for D1.6A.
 * Writes to platform/.qa-live-staging/ (gitignored via .qa-* glob).
 * Does not update Playwright visual baselines.
 * Does not fill passwords or open MFA QR.
 *
 * Usage (from platform/):
 *   E2E_SKIP_WEBSERVER=1 node scripts/qa-live-staging.mjs
 */

import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://kcmi-website-seven.vercel.app";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../.qa-live-staging");
const WIDTHS = [390, 768, 1280, 1440];
const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/locations",
  "/services",
  "/sermons",
  "/contact",
  "/giving",
  "/livestream",
  "/mission",
  "/faqs",
  "/privacy",
  "/terms",
  "/events",
  "/events/camp-meeting",
];
const HUB_SAFE_ROUTES = ["/auth/sign-in", "/admin"];

function slug(path) {
  return path === "/" ? "home" : path.replace(/^\//, "").replaceAll("/", "_");
}

async function capturePage(page, path, width) {
  const logs = [];
  const failed = [];
  page.on("console", (msg) => {
    const t = msg.type();
    if (t === "error" || t === "warning") {
      logs.push(`${t}: ${msg.text()}`);
    }
  });
  page.on("response", (res) => {
    if (res.status() >= 400) {
      failed.push(`${res.status()} ${res.url()}`);
    }
  });

  await page.setViewportSize({ width, height: 900 });
  const response = await page.goto(`${BASE}${path}`, {
    waitUntil: "load",
    timeout: 45_000,
  });
  await page.waitForTimeout(800);
  const title = await page.title();
  const headings = await page.locator("h1, h2").allTextContents();
  const links = await page.locator("a[href]").evaluateAll((els) =>
    els.slice(0, 40).map((el) => ({
      text: (el.textContent || "").trim().slice(0, 80),
      href: el.getAttribute("href"),
    })),
  );
  const buttons = await page.locator("button").evaluateAll((els) =>
    els.map((el) => (el.textContent || "").trim().slice(0, 80)),
  );
  const canonical = await page
    .locator('link[rel="canonical"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  const robots = await page
    .locator('meta[name="robots"]')
    .first()
    .getAttribute("content")
    .catch(() => null);
  const xrobots = response?.headers()["x-robots-tag"] ?? null;
  const file = `${slug(path)}-${width}.png`;
  await page.screenshot({
    path: resolve(OUT, "screenshots", file),
    fullPage: true,
  });

  return {
    path,
    width,
    status: response?.status() ?? 0,
    title,
    headings: headings.map((h) => h.trim()).filter(Boolean).slice(0, 12),
    links,
    buttons,
    canonical,
    robots,
    xrobots,
    screenshot: `screenshots/${file}`,
    console: logs.slice(0, 20),
    failedNetwork: failed.filter((u) => !u.includes("favicon")).slice(0, 15),
  };
}

async function main() {
  mkdirSync(resolve(OUT, "screenshots"), { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];

  for (const path of [...PUBLIC_ROUTES, ...HUB_SAFE_ROUTES]) {
    for (const width of WIDTHS) {
      try {
        results.push(await capturePage(page, path, width));
      } catch (err) {
        results.push({
          path,
          width,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  await browser.close();

  const index = [
    "# Live staging audit bundle (D1.6A)",
    "",
    `Origin: ${BASE}`,
    "Authenticated Hub screens were **not** captured (no passwords/MFA QR in this review-only run).",
    "`/admin` is expected to 307 to sign-in when unauthenticated.",
    "",
    "| Route | Width | Status | Title | Screenshot | Console | Failed net |",
    "|---|---|---|---|---|---|---|",
  ];
  for (const r of results) {
    if ("error" in r) {
      index.push(
        `| ${r.path} | ${r.width} | ERR | ${r.error} | — | — | — |`,
      );
      continue;
    }
    index.push(
      `| ${r.path} | ${r.width} | ${r.status} | ${r.title} | ${r.screenshot} | ${r.console.length} | ${r.failedNetwork.length} |`,
    );
  }
  writeFileSync(resolve(OUT, "INDEX.md"), `${index.join("\n")}\n`);
  writeFileSync(resolve(OUT, "results.json"), JSON.stringify(results, null, 2));
  console.log(`Wrote ${results.length} captures to ${OUT}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
