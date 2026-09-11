/**
 * D1.7 authenticated real-component visual review V3.
 *
 * - App under review: LOCAL D1.7 working tree (CAPTURE_BASE_URL, default :3017)
 * - Auth: hosted KCMI Staging Supabase via headed MFA → .auth/d17-review-user.json
 * - Public fixtures: CONTENT_SOURCE=seed + /qa/d17-public variants (ALLOW_QA_STRESS=1)
 * - READ-ONLY: does not publish/mutate hosted CMS
 *
 * Usage (from platform/, after production build with staging keys + CONTENT_SOURCE=seed):
 *   CAPTURE_BASE_URL=http://127.0.0.1:3017 npm run review:d17-v3
 *
 * Optional:
 *   CAPTURE_START_SERVER=1  — spawn `next start -p 3017` with review env
 *   CAPTURE_AUTH_TIMEOUT_MS=300000
 *   CAPTURE_SKIP_AUTH=0
 */
import { spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { ensureCaptureAuthState } from "./lib/capture-auth.mjs";
import {
  assertHomeNoBranchDump,
  assertLocationsFinderCompact,
  assertNoPublicErrorPage,
  assertRouteLandmarks,
} from "./lib/capture-integrity.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, ".qa-d17-review-v3");
const SHOTS = resolve(OUT, "screenshots");
const AUTH_STATE = resolve(ROOT, ".auth/d17-review-user.json");
const ZIP = resolve(homedir(), "Downloads/kcmi-d17-review-v3.zip");
const PORT = process.env.CAPTURE_PORT || "3017";
const BASE =
  process.env.CAPTURE_BASE_URL?.replace(/\/$/, "") ||
  `http://127.0.0.1:${PORT}`;
const AUTH_TIMEOUT_MS = Number(process.env.CAPTURE_AUTH_TIMEOUT_MS || 300_000);
const START_SERVER = process.env.CAPTURE_START_SERVER === "1";

const BREAKPOINTS = [
  { name: "mobile-se", width: 375, height: 667 },
  { name: "mobile-pro-max", width: 430, height: 932 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1920, height: 1080 },
];

const PUBLIC_ROUTES = [
  { path: "/", surface: "public" },
  { path: "/about", surface: "public" },
  { path: "/about/apostle-frank-aikins", surface: "public" },
  { path: "/services", surface: "public" },
  { path: "/sermons", surface: "public" },
  { path: "/locations", surface: "public" },
  { path: "/locations/accra", surface: "public" },
  { path: "/locations/headquarters", surface: "public" },
  { path: "/contact", surface: "public" },
  { path: "/privacy", surface: "public" },
  { path: "/faqs", surface: "public" },
  { path: "/livestream", surface: "public" },
];

const HUB_ROUTES = [
  { path: "/admin", surface: "hub" },
  { path: "/admin/website/home", surface: "hub" },
  { path: "/admin/website/about", surface: "hub" },
  { path: "/admin/website/services", surface: "hub" },
  { path: "/admin/website/sermons", surface: "hub" },
  { path: "/admin/website/faqs", surface: "hub" },
  { path: "/admin/website/global", surface: "hub" },
  { path: "/admin/livestream", surface: "hub" },
  { path: "/admin/branches", surface: "hub" },
  { path: "/admin/programs", surface: "hub" },
  { path: "/admin/media", surface: "hub" },
];

const QA_VARIANTS = [
  "no-spotlight",
  "spotlight",
  "takeover",
  "takeover-off",
  "watch-sermon",
  "watch-fallback",
];

/** @type {{ id: string, status: 'pending'|'pass'|'fail', error?: string, file?: string }[]} */
const results = [];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function routeSlug(path) {
  if (path === "/") return "home";
  return path.replace(/^\//, "").replaceAll("/", "-");
}

function record(id, status, error, file) {
  results.push({ id, status, error, file });
  const mark = status === "pass" ? "✓" : "✗";
  console.log(`  ${mark} ${id}${error ? ` — ${error}` : ""}`);
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
  if (!START_SERVER) return null;
  const child = spawn("npx", ["next", "start", "-p", PORT], {
    cwd: ROOT,
    env: {
      ...process.env,
      ALLOW_QA_STRESS: "1",
      CONTENT_SOURCE: "seed",
      // Keep Auth on hosted staging keys from .env.local; do not force hosted env mode
      KCMI_ENVIRONMENT: process.env.KCMI_ENVIRONMENT || "development",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return child;
}

async function assertPage(page, path, surface) {
  const pathname = new URL(page.url()).pathname;
  if (surface === "hub" && pathname.startsWith("/auth/")) {
    throw new Error(`Unexpected auth redirect for Hub path ${path} → ${pathname}`);
  }
  const body = await page.locator("body").innerText();
  assertRouteLandmarks(path, body, surface);
  if (path === "/") assertHomeNoBranchDump(body);
  if (path === "/locations") assertLocationsFinderCompact(body);
  return body;
}

async function shot(page, relativeName) {
  const file = resolve(SHOTS, relativeName);
  mkdirSync(dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
  return `screenshots/${relativeName}`;
}

async function gotoStable(page, path, surface, { attempts = 3 } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      await page.goto(`${BASE}${path}`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await page.waitForTimeout(surface === "hub" ? 900 : 500);
      await assertPage(page, path, surface);
      return;
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await page.waitForTimeout(1200 * (i + 1));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function captureBreakpointRoutes(browser, bp) {
  // Public: one context for the whole breakpoint
  {
    const context = await browser.newContext({
      viewport: { width: bp.width, height: bp.height },
    });
    const page = await context.newPage();
    try {
      for (const route of PUBLIC_ROUTES) {
        const id = `route:${bp.name}:${routeSlug(route.path)}`;
        try {
          await gotoStable(page, route.path, "public");
          const file = await shot(
            page,
            `routes/${bp.name}/${routeSlug(route.path)}.png`,
          );
          record(id, "pass", undefined, file);
        } catch (error) {
          record(id, "fail", error instanceof Error ? error.message : String(error));
        }
      }
    } finally {
      await context.close();
    }
  }

  // Hub: one authenticated context — reduces Auth hammering that triggered intermittent RSC errors
  {
    const context = await browser.newContext({
      storageState: AUTH_STATE,
      viewport: { width: bp.width, height: bp.height },
    });
    const page = await context.newPage();
    try {
      for (const route of HUB_ROUTES) {
        const id = `route:${bp.name}:${routeSlug(route.path)}`;
        try {
          await gotoStable(page, route.path, "hub", { attempts: 4 });
          const file = await shot(
            page,
            `routes/${bp.name}/${routeSlug(route.path)}.png`,
          );
          record(id, "pass", undefined, file);
          await page.waitForTimeout(350);
        } catch (error) {
          record(id, "fail", error instanceof Error ? error.message : String(error));
        }
      }
    } finally {
      await context.close();
    }
  }
}

async function captureWidePublic(browser) {
  for (const width of [2560, 3840]) {
    const id = `wide:home:${width}`;
    const context = await browser.newContext({
      viewport: { width, height: 1400 },
    });
    const page = await context.newPage();
    try {
      await gotoStable(page, "/", "public");
      const file = await shot(page, `wide/home-${width}.png`);
      record(id, "pass", undefined, file);
    } catch (error) {
      record(id, "fail", error instanceof Error ? error.message : String(error));
    } finally {
      await context.close();
    }
  }
}

async function captureQaVariants(browser) {
  for (const variant of QA_VARIANTS) {
    for (const width of [390, 1280]) {
      const id = `qa-home:${variant}:${width}`;
      const context = await browser.newContext({
        viewport: { width, height: 900 },
      });
      const page = await context.newPage();
      try {
        if (variant === "takeover-off") {
          await page.addInitScript(() => {
            try {
              localStorage.setItem(
                "kcmi:spotlight:once_per_browser:a1000000-0000-4000-8000-00000000d17a",
                "1",
              );
            } catch {
              /* ignore */
            }
          });
        }
        await page.goto(`${BASE}/qa/d17-public?variant=${variant}`, {
          waitUntil: "domcontentloaded",
          timeout: 90_000,
        });
        await page.waitForTimeout(700);
        const body = await page.locator("body").innerText();
        if (/not available/i.test(body)) {
          throw new Error("QA fixture disabled — set ALLOW_QA_STRESS=1 on next start");
        }
        assertHomeNoBranchDump(body);
        if (variant === "takeover") {
          const dialog = page.locator("dialog");
          await dialog.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {
            throw new Error("Expected Spotlight takeover dialog");
          });
        }
        if (variant === "no-spotlight" && /d1\.7 review spotlight program/i.test(body)) {
          throw new Error("no-spotlight variant unexpectedly showed program");
        }
        const file = await shot(page, `qa-home/${variant}-${width}.png`);
        record(id, "pass", undefined, file);
      } catch (error) {
        record(id, "fail", error instanceof Error ? error.message : String(error));
      } finally {
        await context.close();
      }
    }
  }
}

async function captureLocationsProof(browser) {
  for (const width of [390, 768, 1280, 1920]) {
    const id = `locations-proof:${width}`;
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    const page = await context.newPage();
    try {
      await page.goto(`${BASE}/locations`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await page.waitForTimeout(500);
      await assertPage(page, "/locations", "public");
      const search = page.getByRole("searchbox").or(page.getByPlaceholder(/search/i));
      if ((await search.count()) === 0) {
        throw new Error("Locations finder search control missing");
      }
      const filters = page.getByRole("group", { name: /filter by country/i });
      if ((await filters.count()) === 0) {
        throw new Error("Locations country filters missing");
      }
      const file = await shot(page, `locations/finder-${width}.png`);
      record(id, "pass", undefined, file);
    } catch (error) {
      record(id, "fail", error instanceof Error ? error.message : String(error));
    } finally {
      await context.close();
    }
  }

  // Branch detail: with media (HQ seed often has hero) + without media (accra seed)
  for (const branch of [
    { slug: "headquarters", label: "with-media" },
    { slug: "accra", label: "without-media" },
  ]) {
    for (const width of [390, 1280]) {
      const id = `branch-detail:${branch.label}:${width}`;
      const context = await browser.newContext({
        viewport: { width, height: 900 },
      });
      const page = await context.newPage();
      try {
        await page.goto(`${BASE}/locations/${branch.slug}`, {
          waitUntil: "domcontentloaded",
          timeout: 90_000,
        });
        await page.waitForTimeout(500);
        const body = await page.locator("body").innerText();
        assertNoPublicErrorPage(body, `/locations/${branch.slug}`);
        if (/this page couldn.?t load/i.test(body)) {
          throw new Error("Branch detail error page");
        }
        const file = await shot(
          page,
          `locations/branch-${branch.label}-${width}.png`,
        );
        record(id, "pass", undefined, file);
      } catch (error) {
        record(
          id,
          "fail",
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        await context.close();
      }
    }
  }
}

async function captureVisualEditorScenarios(browser) {
  const scenarios = [
    { id: "hub-editor:overview", width: 1280, prep: "overview" },
    { id: "hub-editor:overview-mobile", width: 390, prep: "overview" },
    { id: "hub-editor:banner-selected", width: 1280, prep: "banner-focus" },
    { id: "hub-editor:categories", width: 1280, prep: "categories" },
    { id: "hub-editor:words", width: 1280, prep: "words" },
    { id: "hub-editor:photo", width: 1280, prep: "photo" },
    { id: "hub-editor:typography-768", width: 768, prep: "overview" },
    { id: "hub-editor:typography-1920", width: 1920, prep: "overview" },
  ];

  const context = await browser.newContext({
    storageState: AUTH_STATE,
    viewport: { width: 1280, height: 1000 },
  });
  const page = await context.newPage();

  try {
    // Keep tour dismissed so coach-mark/welcome never blocks Edit clicks.
    await page.addInitScript(() => {
      try {
        localStorage.setItem("kcmi-hub-tour-v1-complete", "true");
        sessionStorage.removeItem("kcmi-hub-tour-v1-active");
        sessionStorage.removeItem("kcmi-hub-tour-v1-step");
      } catch {
        /* ignore */
      }
    });

    for (const scenario of scenarios) {
      try {
        await page.setViewportSize({ width: scenario.width, height: 1000 });
        await gotoStable(page, "/admin/website/home", "hub", { attempts: 4 });

        const back = page.getByRole("button", {
          name: /All homepage sections|Back to .* choices/i,
        });
        if (await back.count()) {
          await back.first().click();
          await page.waitForTimeout(400);
        }

        const banner = page.locator('[data-tour="home-visual-section-banner"]');
        await banner.first().waitFor({ state: "visible", timeout: 20_000 });
        await banner.first().scrollIntoViewIfNeeded();

        if (scenario.prep === "banner-focus") {
          await banner.focus();
        }
        if (
          scenario.prep === "categories" ||
          scenario.prep === "words" ||
          scenario.prep === "photo"
        ) {
          await banner
            .getByRole("button", { name: "Edit this section" })
            .click({ timeout: 20_000 });
          await page.getByText("What would you like to change?").waitFor({ timeout: 10_000 });
        }
        if (scenario.prep === "words") {
          await page.getByRole("button", { name: /^Words/ }).click();
          await page.getByText(/Currently on the website/i).first().waitFor({ timeout: 10_000 });
          await page.getByRole("button", { name: /Change this section/i }).first().waitFor();
          // Do not publish
        }
        if (scenario.prep === "photo") {
          await page.getByRole("button", { name: /^Photo/ }).click();
          await page.getByText(/Replace Photo|Current photo|Choose existing|Upload/i).first().waitFor({
            timeout: 10_000,
          });
        }

        const file = await shot(
          page,
          `hub-editor/${scenario.id.replace("hub-editor:", "")}-${scenario.width}.png`,
        );
        record(scenario.id, "pass", undefined, file);
        await page.waitForTimeout(400);
      } catch (error) {
        record(
          scenario.id,
          "fail",
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  } finally {
    await context.close();
  }
}

async function activateTourStep(page, href, index) {
  await gotoStable(page, href, "hub", { attempts: 4 });
  // storageState can overwrite addInitScript — set tour flags AFTER navigation.
  await page.evaluate((stepIndex) => {
    try {
      localStorage.removeItem("kcmi-hub-tour-v1-complete");
      sessionStorage.setItem("kcmi-hub-tour-v1-active", "true");
      sessionStorage.setItem("kcmi-hub-tour-v1-step", String(stepIndex));
    } catch {
      /* ignore */
    }
  }, index);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const start = page.getByRole("button", { name: /Show me around|Start tour|Start/i });
  if (await start.count()) {
    // Welcome prompt won over resume — start, then jump via storage + reload if needed
    await start.first().click();
    await page.waitForTimeout(600);
    if (index > 0) {
      await page.evaluate((stepIndex) => {
        sessionStorage.setItem("kcmi-hub-tour-v1-active", "true");
        sessionStorage.setItem("kcmi-hub-tour-v1-step", String(stepIndex));
      }, index);
      await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(900);
      await page.evaluate((stepIndex) => {
        localStorage.removeItem("kcmi-hub-tour-v1-complete");
        sessionStorage.setItem("kcmi-hub-tour-v1-active", "true");
        sessionStorage.setItem("kcmi-hub-tour-v1-step", String(stepIndex));
      }, index);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(900);
    }
  }
}

async function captureTourScenarios(browser) {
  /** Mirrors HUB_TOUR_STEPS indices + required visual proof widths. */
  const steps = [
    { name: "dashboard-homepage", index: 0, href: "/admin", width: 1280 },
    { name: "dashboard-programs", index: 1, href: "/admin", width: 1280 },
    { name: "dashboard-branches", index: 2, href: "/admin", width: 1280 },
    { name: "dashboard-livestream", index: 3, href: "/admin", width: 1280 },
    { name: "home-visual-overview", index: 5, href: "/admin/website/home", width: 1280 },
    { name: "home-visual-section-banner", index: 6, href: "/admin/website/home", width: 1280 },
    { name: "edit-category-words", index: 7, href: "/admin/website/home", width: 1280 },
    { name: "change-section", index: 8, href: "/admin/website/home", width: 1280 },
    { name: "preview-changes", index: 9, href: "/admin/website/home", width: 1280 },
    { name: "make-live", index: 10, href: "/admin/website/home", width: 1280 },
    { name: "mobile-menu-help", index: 4, href: "/admin", width: 390 },
  ];

  for (const step of steps) {
    const id = `tour:${step.name}:${step.width}`;
    const context = await browser.newContext({
      storageState: AUTH_STATE,
      viewport: { width: step.width, height: 900 },
    });
    const page = await context.newPage();
    try {
      await activateTourStep(page, step.href, step.index);

      const dialog = page
        .getByRole("dialog")
        .filter({ hasText: /step \d+ of/i });
      await dialog.first().waitFor({ state: "visible", timeout: 20_000 });
      const body = await page.locator("body").innerText();
      if (!/step \d+ of/i.test(body)) {
        throw new Error("Tour coach-mark step label missing");
      }
      const overlay = page.locator(".fixed.inset-0.z-\\[60\\]");
      if ((await overlay.count()) === 0) {
        throw new Error("Tour overlay/dimming layer missing");
      }

      const file = await shot(page, `tour/${step.name}-${step.width}.png`);
      record(id, "pass", undefined, file);
    } catch (error) {
      record(id, "fail", error instanceof Error ? error.message : String(error));
    } finally {
      await context.close();
    }
  }
}

function writeBundleDocs(expected, succeeded, failed) {
  const notes = [
    "App code source: LOCAL D1.7 working tree (not hosted kcmi-preview).",
    "Auth source: KCMI hosted Supabase staging (manual password + MFA).",
    "Public visual content: CONTENT_SOURCE=seed where applicable + /qa/d17-public fixtures.",
    "storageState (.auth/) is EXCLUDED from this ZIP — treat any local .auth file as an authenticated session secret.",
    "No hosted CMS content was published, updated, or deleted during capture.",
    "Do not bless Playwright visual baselines from this bundle.",
    `Expected ${expected} · Succeeded ${succeeded} · Failed ${failed}`,
  ];

  writeFileSync(
    resolve(OUT, "README.txt"),
    ["KCMI D1.7 visual review V3", `Base URL: ${BASE}`, "", ...notes].join("\n"),
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
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>KCMI D1.7 review V3</title>
<style>
body{font-family:system-ui,sans-serif;margin:1.5rem;background:#f4f1f5;color:#141216}
.grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
figure{margin:0;background:#fff;border:1px solid #d4dde0;border-radius:12px;overflow:hidden}
figure[data-status=fail]{border-color:#b60b13}
figcaption{padding:.75rem 1rem;font-size:.9rem}
img{display:block;width:100%;height:auto}
.notes{max-width:52rem;line-height:1.5;margin-bottom:1.5rem}
</style></head><body>
<h1>KCMI D1.7 review V3</h1>
<div class="notes">${notes.map((n) => `<p>${escapeHtml(n)}</p>`).join("")}</div>
<div class="grid">${cards}</div>
</body></html>`,
  );

  writeFileSync(
    resolve(OUT, "capture-results.json"),
    JSON.stringify(
      {
        baseUrl: BASE,
        authState: ".auth/d17-review-user.json (excluded from ZIP)",
        expected,
        succeeded,
        failed,
        valid: failed === 0,
        results,
      },
      null,
      2,
    ),
  );
}

function zipBundle() {
  if (existsSync(ZIP)) rmSync(ZIP);
  const result = spawnSync(
    "zip",
    ["-r", ZIP, ".", "-x", "*.auth*", "*d17-review-user.json*"],
    { cwd: OUT, stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error("Failed to create review ZIP");
}

async function main() {
  if (BASE.includes("kcmi-preview.josephtete.com")) {
    throw new Error(
      "Refusing D1.7 V3 capture against hosted preview URL — use local CAPTURE_BASE_URL (e.g. http://127.0.0.1:3017).",
    );
  }

  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(SHOTS, { recursive: true });
  mkdirSync(resolve(ROOT, ".auth"), { recursive: true });

  const child = startServer();
  try {
    await waitForServer(BASE, 120_000);
  } catch (error) {
    if (child) child.kill("SIGTERM");
    throw error;
  }

  await ensureCaptureAuthState({
    baseUrl: BASE,
    authStatePath: AUTH_STATE,
    timeoutMs: AUTH_TIMEOUT_MS,
  });
  try {
    chmodSync(AUTH_STATE, 0o600);
  } catch {
    /* ignore */
  }

  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  try {
    console.log("\n=== Route matrix ===");
    for (const bp of BREAKPOINTS) {
      console.log(`\n${bp.name} (${bp.width}×${bp.height})`);
      await captureBreakpointRoutes(browser, bp);
    }

    console.log("\n=== Wide public ===");
    await captureWidePublic(browser);

    console.log("\n=== QA homepage variants ===");
    await captureQaVariants(browser);

    console.log("\n=== Locations proof ===");
    await captureLocationsProof(browser);

    console.log("\n=== Visual editor scenarios ===");
    await captureVisualEditorScenarios(browser);

    console.log("\n=== Guided tour scenarios ===");
    await captureTourScenarios(browser);
  } finally {
    await browser.close();
    if (child) child.kill("SIGTERM");
  }

  const expected = results.length;
  const succeeded = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  writeBundleDocs(expected, succeeded, failed);
  zipBundle();

  console.log(`\nExpected: ${expected}`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);
  console.log(`ZIP → ${ZIP}`);
  console.log(`Auth state remains local at .auth/d17-review-user.json (not in ZIP).`);
  console.log(`Cleanup: npm run auth:cleanup-d17`);

  if (failed > 0) {
    process.exitCode = 1;
    throw new Error(`Review bundle INVALID — ${failed} capture(s) failed`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
