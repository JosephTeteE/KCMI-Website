/**
 * Repair-only re-capture for failed V3 scenarios; merges into existing bundle.
 * READ-ONLY for hosted CMS. Uses existing .auth/d17-review-user.json.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import {
  assertHomeNoBranchDump,
  assertLocationsFinderCompact,
  assertRouteLandmarks,
} from "./lib/capture-integrity.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, ".qa-d17-review-v3");
const SHOTS = resolve(OUT, "screenshots");
const AUTH_STATE = resolve(ROOT, ".auth/d17-review-user.json");
const ZIP = resolve(homedir(), "Downloads/kcmi-d17-review-v3.zip");
const BASE =
  process.env.CAPTURE_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:3017";

const resultsPath = resolve(OUT, "capture-results.json");
if (!existsSync(resultsPath) || !existsSync(AUTH_STATE)) {
  throw new Error("Need existing capture-results.json and auth state");
}

/** @type {{ results: any[], expected: number, succeeded: number, failed: number }} */
const prior = JSON.parse(readFileSync(resultsPath, "utf8"));

function recordReplace(id, status, error, file) {
  const idx = prior.results.findIndex((r) => r.id === id);
  const row = { id, status, error, file };
  if (idx >= 0) prior.results[idx] = row;
  else prior.results.push(row);
  console.log(`  ${status === "pass" ? "✓" : "✗"} ${id}${error ? ` — ${error}` : ""}`);
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

async function gotoStable(page, path, surface, { attempts = 4 } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      await page.goto(`${BASE}${path}`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await page.waitForTimeout(900);
      await assertPage(page, path, surface);
      return;
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) await page.waitForTimeout(1200 * (i + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function repairEditor(browser) {
  const scenarios = [
    { id: "hub-editor:categories", width: 1280, prep: "categories" },
    { id: "hub-editor:words", width: 1280, prep: "words" },
    { id: "hub-editor:photo", width: 1280, prep: "photo" },
  ];
  const context = await browser.newContext({
    storageState: AUTH_STATE,
    viewport: { width: 1280, height: 1000 },
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    try {
      localStorage.setItem("kcmi-hub-tour-v1-complete", "true");
      sessionStorage.removeItem("kcmi-hub-tour-v1-active");
      sessionStorage.removeItem("kcmi-hub-tour-v1-step");
    } catch {
      /* ignore */
    }
  });
  try {
    for (const scenario of scenarios) {
      try {
        await gotoStable(page, "/admin/website/home", "hub");
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
        await banner
          .getByRole("button", { name: "Edit this section" })
          .click({ timeout: 20_000 });
        await page.getByText("What would you like to change?").waitFor({ timeout: 10_000 });
        if (scenario.prep === "words") {
          await page.getByRole("button", { name: /^Words/ }).click();
          await page.getByText(/Currently on the website/i).first().waitFor({ timeout: 10_000 });
        }
        if (scenario.prep === "photo") {
          await page.getByRole("button", { name: /^Photo/ }).click();
          await page
            .getByText(/Replace Photo|Current photo|Choose existing|Upload/i)
            .first()
            .waitFor({ timeout: 10_000 });
        }
        const file = await shot(
          page,
          `hub-editor/${scenario.id.replace("hub-editor:", "")}-${scenario.width}.png`,
        );
        recordReplace(scenario.id, "pass", undefined, file);
      } catch (error) {
        recordReplace(
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

async function repairMobileTour(browser) {
  const id = "tour:mobile-menu-help:390";
  const context = await browser.newContext({
    storageState: AUTH_STATE,
    viewport: { width: 390, height: 900 },
  });
  const page = await context.newPage();
  try {
    await gotoStable(page, "/admin", "hub");
    await page.evaluate(() => {
      localStorage.removeItem("kcmi-hub-tour-v1-complete");
      sessionStorage.setItem("kcmi-hub-tour-v1-active", "true");
      sessionStorage.setItem("kcmi-hub-tour-v1-step", "4");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const start = page.getByRole("button", { name: /Show me around/i });
    if (await start.count()) {
      await start.first().click();
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        localStorage.removeItem("kcmi-hub-tour-v1-complete");
        sessionStorage.setItem("kcmi-hub-tour-v1-active", "true");
        sessionStorage.setItem("kcmi-hub-tour-v1-step", "4");
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);
    }
    const dialog = page.getByRole("dialog").filter({ hasText: /step \d+ of/i });
    await dialog.first().waitFor({ state: "visible", timeout: 20_000 });
    if ((await page.locator(".fixed.inset-0.z-\\[60\\]").count()) === 0) {
      throw new Error("Tour overlay/dimming layer missing");
    }
    const file = await shot(page, "tour/mobile-menu-help-390.png");
    recordReplace(id, "pass", undefined, file);
  } catch (error) {
    recordReplace(id, "fail", error instanceof Error ? error.message : String(error));
  } finally {
    await context.close();
  }
}

function rewriteDocs() {
  const expected = prior.results.length;
  const succeeded = prior.results.filter((r) => r.status === "pass").length;
  const failed = prior.results.filter((r) => r.status === "fail").length;
  prior.expected = expected;
  prior.succeeded = succeeded;
  prior.failed = failed;
  prior.valid = failed === 0;
  writeFileSync(resultsPath, JSON.stringify(prior, null, 2));

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
  return { expected, succeeded, failed };
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

const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  console.log("=== Repair visual editor ===");
  await repairEditor(browser);
  console.log("=== Repair mobile tour ===");
  await repairMobileTour(browser);
} finally {
  await browser.close();
}

const counts = rewriteDocs();
zipBundle();
console.log(`Expected: ${counts.expected}`);
console.log(`Succeeded: ${counts.succeeded}`);
console.log(`Failed: ${counts.failed}`);
console.log(`ZIP → ${ZIP}`);
if (counts.failed > 0) {
  process.exitCode = 1;
  throw new Error(`Review bundle INVALID — ${counts.failed} capture(s) failed`);
}
