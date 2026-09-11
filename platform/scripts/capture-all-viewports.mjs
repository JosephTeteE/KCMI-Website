/**
 * Capture public + Hub screenshots across viewports.
 *
 * Auth: headed MFA → storageState (default platform/.auth/user.json).
 * Supports CAPTURE_BASE_URL for local pre-release or hosted post-deploy.
 *
 * Usage (from platform/):
 *   npm run screenshots
 *   CAPTURE_BASE_URL=http://127.0.0.1:3017 CAPTURE_AUTH_STATE=.auth/d17-review-user.json npm run screenshots
 */
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { ensureCaptureAuthState } from "./lib/capture-auth.mjs";
import { assertRouteLandmarks } from "./lib/capture-integrity.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const AUTH_STATE = resolve(
  ROOT,
  process.env.CAPTURE_AUTH_STATE || ".auth/user.json",
);
const SHOTS_DIR = resolve(ROOT, process.env.CAPTURE_SHOTS_DIR || "screenshots");
const ZIP_PATH = resolve(ROOT, process.env.CAPTURE_ZIP || "kcmi-screenshots.zip");

const BASE =
  process.env.CAPTURE_BASE_URL?.replace(/\/$/, "") ||
  "https://kcmi-preview.josephtete.com";
const AUTH_TIMEOUT_MS = Number(process.env.CAPTURE_AUTH_TIMEOUT_MS || 300_000);

const BREAKPOINTS = [
  { name: "mobile-se", width: 375, height: 667 },
  { name: "mobile-pro-max", width: 430, height: 932 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop-4k", width: 1920, height: 1080 },
];

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/about/apostle-frank-aikins",
  "/services",
  "/sermons",
  "/locations",
  "/locations/accra",
  "/contact",
  "/privacy",
  "/faqs",
  "/livestream",
];

const HUB_ROUTES = [
  "/admin",
  "/admin/website/home",
  "/admin/website/about",
  "/admin/website/services",
  "/admin/website/sermons",
  "/admin/website/faqs",
  "/admin/website/global",
  "/admin/livestream",
  "/admin/branches",
  "/admin/programs",
  "/admin/media",
];

function routeSlug(path) {
  if (path === "/") return "home";
  return path.replace(/^\//, "").replaceAll("/", "-");
}

async function captureRoute(context, breakpoint, path, surface) {
  const page = await context.newPage();
  const dir = resolve(SHOTS_DIR, breakpoint.name);
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, `${routeSlug(path)}.png`);

  try {
    await page.setViewportSize({
      width: breakpoint.width,
      height: breakpoint.height,
    });
    await page.goto(`${BASE}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.waitForTimeout(700);
    const body = await page.locator("body").innerText();
    assertRouteLandmarks(path, body, surface);
    if (surface === "hub") {
      const pathname = new URL(page.url()).pathname;
      if (pathname.startsWith("/auth/")) {
        throw new Error(`Hub route redirected to auth: ${pathname}`);
      }
    }
    await page.screenshot({ path: file, fullPage: true });
    console.log(`  ✓ ${breakpoint.name}/${routeSlug(path)}.png`);
    return true;
  } catch (err) {
    console.error(`  ✗ ${breakpoint.name} ${path}: ${err.message}`);
    return false;
  } finally {
    await page.close();
  }
}

function zipScreenshots() {
  if (existsSync(ZIP_PATH)) rmSync(ZIP_PATH);
  const result = spawnSync("zip", ["-r", ZIP_PATH, "screenshots"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("Failed to create screenshots zip");
  }
  console.log(`Archived → ${ZIP_PATH}`);
}

async function main() {
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

  if (existsSync(SHOTS_DIR)) rmSync(SHOTS_DIR, { recursive: true, force: true });
  mkdirSync(SHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });

  let failed = 0;
  let succeeded = 0;
  const allRoutes = [
    ...PUBLIC_ROUTES.map((path) => ({ path, surface: "public" })),
    ...HUB_ROUTES.map((path) => ({ path, surface: "hub" })),
  ];

  console.log(
    `Capturing ${allRoutes.length} routes × ${BREAKPOINTS.length} breakpoints on ${BASE}`,
  );

  try {
    for (const breakpoint of BREAKPOINTS) {
      console.log(
        `\n${breakpoint.name} (${breakpoint.width}×${breakpoint.height})`,
      );
      const context = await browser.newContext({
        storageState: AUTH_STATE,
        viewport: {
          width: breakpoint.width,
          height: breakpoint.height,
        },
      });

      for (const route of allRoutes) {
        const ok = await captureRoute(
          context,
          breakpoint,
          route.path,
          route.surface,
        );
        if (ok) succeeded += 1;
        else failed += 1;
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  zipScreenshots();
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);
  if (failed > 0) {
    process.exitCode = 1;
    throw new Error("Screenshot capture incomplete");
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
