/**
 * Focused D1.7 final visual proof after curation closure.
 * Uses LOCAL production server + seed public content.
 * Hub shots reuse .auth/d17-review-user.json when present.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import {
  assertNoDuplicateCountryPlaceLine,
  assertRouteLandmarks,
  assertScenarioState,
} from "./lib/capture-integrity.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, ".qa-d17-final");
const SHOTS = resolve(OUT, "screenshots");
const AUTH_STATE = resolve(ROOT, ".auth/d17-review-user.json");
const ZIP = resolve(homedir(), "Downloads/kcmi-d17-final.zip");
const BASE =
  process.env.CAPTURE_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:3017";

/** @type {{ id: string, status: 'pass'|'fail', error?: string, file?: string }[]} */
const results = [];

function record(id, status, error, file) {
  results.push({ id, status, error, file });
  console.log(`  ${status === "pass" ? "✓" : "✗"} ${id}${error ? ` — ${error}` : ""}`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function shot(page, relativeName) {
  const file = resolve(SHOTS, relativeName);
  mkdirSync(dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
  return `screenshots/${relativeName}`;
}

async function capture(browser, {
  id,
  path,
  width,
  height = 900,
  auth = false,
  surface = "public",
  scenario,
  scrollTo,
}) {
  const context = await browser.newContext({
    storageState: auth ? AUTH_STATE : undefined,
    viewport: { width, height },
  });
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.waitForTimeout(700);
    const pathname = new URL(page.url()).pathname;
    const body = await page.locator("body").innerText();
    const html = await page.content();
    assertRouteLandmarks(pathname, body, surface);
    assertNoDuplicateCountryPlaceLine(body);

    if (scenario === "branch:with-media") {
      const hero = page.locator('[data-branch-media="hero"]');
      await hero.waitFor({ state: "visible", timeout: 10_000 });
      const fixture =
        (await hero.getAttribute("data-qa-fixture")) || "d17-seed-hq-hero";
      assertScenarioState("branch:with-media", {
        html,
        bodyText: body,
        hasHeroMedia: true,
        fixtureId: fixture,
      });
    }
    if (scenario === "branch:without-media") {
      assertScenarioState("branch:without-media", {
        html,
        bodyText: body,
        hasHeroMedia: (await page.locator('[data-branch-media="hero"]').count()) > 0,
      });
    }
    if (scenario === "countries:ng-gh-tg") {
      assertScenarioState("countries:ng-gh-tg", { bodyText: body });
    }
    if (scenario === "hub-home-visual") {
      await page.locator('[data-tour="home-visual-section-banner"]').waitFor({
        state: "visible",
        timeout: 15_000,
      });
    }
    if (scrollTo) {
      const target = page.locator(scrollTo).first();
      if (await target.count()) {
        await target.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
      }
    }

    const file = await shot(page, `${id}.png`);
    record(id, "pass", undefined, file);
  } catch (error) {
    record(id, "fail", error instanceof Error ? error.message : String(error));
  } finally {
    await context.close();
  }
}

function writeDocs(expected, succeeded, failed) {
  const notes = [
    "Focused D1.7 final visual proof after curation closure.",
    "App: LOCAL D1.7 working tree. Auth (Hub): hosted staging session when present.",
    "Public content: CONTENT_SOURCE=seed / deterministic fixtures.",
    "storageState excluded from ZIP.",
    "No hosted CMS mutation. Migration not applied.",
    `Expected ${expected} · Succeeded ${succeeded} · Failed ${failed}`,
  ];
  writeFileSync(resolve(OUT, "README.txt"), notes.join("\n"));
  writeFileSync(
    resolve(OUT, "capture-results.json"),
    JSON.stringify({ baseUrl: BASE, expected, succeeded, failed, valid: failed === 0, results }, null, 2),
  );
  const cards = results
    .filter((r) => r.file)
    .map(
      (r) => `<figure data-status="${r.status}">
  <figcaption><strong>${escapeHtml(r.id)}</strong> · ${escapeHtml(r.status)}</figcaption>
  <a href="${escapeHtml(r.file)}"><img src="${escapeHtml(r.file)}" alt="${escapeHtml(r.id)}"></a>
</figure>`,
    )
    .join("\n");
  writeFileSync(
    resolve(OUT, "INDEX.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>KCMI D1.7 final</title>
<style>
body{font-family:system-ui,sans-serif;margin:1.5rem;background:#f4f1f5;color:#141216}
.grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
figure{margin:0;background:#fff;border:1px solid #d4dde0;border-radius:12px;overflow:hidden}
figure[data-status=fail]{border-color:#b60b13}
figcaption{padding:.75rem 1rem;font-size:.9rem}
img{display:block;width:100%;height:auto}
</style></head><body>
<h1>KCMI D1.7 final proof</h1>
${notes.map((n) => `<p>${escapeHtml(n)}</p>`).join("")}
<div class="grid">${cards}</div>
</body></html>`,
  );
}

async function main() {
  if (BASE.includes("kcmi-preview.josephtete.com")) {
    throw new Error("Refusing hosted preview URL for D1.7 final proof");
  }
  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(SHOTS, { recursive: true });

  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    for (const width of [390, 1280, 2560, 3840]) {
      await capture(browser, {
        id: `home-${width}`,
        path: "/",
        width,
        height: width >= 2560 ? 1400 : 900,
        scenario: "countries:ng-gh-tg",
      });
    }
    for (const width of [390, 1280]) {
      await capture(browser, { id: `about-${width}`, path: "/about", width });
      await capture(browser, {
        id: `branch-with-media-${width}`,
        path: "/locations/headquarters",
        width,
        scenario: "branch:with-media",
      });
      await capture(browser, {
        id: `branch-without-media-${width}`,
        path: "/locations/accra",
        width,
        scenario: "branch:without-media",
      });
      await capture(browser, { id: `locations-${width}`, path: "/locations", width });
    }
    await capture(browser, {
      id: "discover-kcmi-1280",
      path: "/",
      width: 1280,
      scrollTo: '[data-qa-section="discover-kcmi"]',
    });

    if (existsSync(AUTH_STATE)) {
      for (const width of [390, 1280]) {
        await capture(browser, {
          id: `hub-home-visual-${width}`,
          path: "/admin/website/home",
          width,
          auth: true,
          surface: "hub",
          scenario: "hub-home-visual",
        });
      }
    } else {
      record(
        "hub-home-visual-skipped",
        "fail",
        "Missing .auth/d17-review-user.json — Hub shots required for final proof",
      );
    }
  } finally {
    await browser.close();
  }

  const expected = results.length;
  const succeeded = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  writeDocs(expected, succeeded, failed);
  if (existsSync(ZIP)) rmSync(ZIP);
  const zip = spawnSync(
    "zip",
    ["-r", ZIP, ".", "-x", "*.auth*", "*d17-review-user.json*"],
    { cwd: OUT, stdio: "inherit" },
  );
  if (zip.status !== 0) throw new Error("ZIP failed");
  console.log(`\nExpected: ${expected}\nSucceeded: ${succeeded}\nFailed: ${failed}\nZIP → ${ZIP}`);
  if (failed > 0) {
    process.exitCode = 1;
    throw new Error(`Final bundle INVALID — ${failed} failed`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
