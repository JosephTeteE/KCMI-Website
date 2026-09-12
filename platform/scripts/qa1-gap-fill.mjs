/**
 * QA1.1 gap fill: performance + tutorial + media drill-in, then re-package ZIP.
 * Does not mutate product code.
 */
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHARE = resolve(ROOT, ".qa-full-spectrum");
const ZIP = resolve(homedir(), "Downloads/kcmi-qa1-full-spectrum-v2.zip");
const HUB = process.env.QA_HUB_BASE_URL || "http://127.0.0.1:3024";
const PUBLIC =
  process.env.QA_PUBLIC_BASE_URL || "https://kcmi-preview.josephtete.com";
const STAGING = "4798d76c-6112-4870-9f52-7d1ab38d06bd";
const AUTH =
  [
    resolve(ROOT, ".auth/qa-hub-user.json"),
    resolve(ROOT, ".auth/d181-local-user.json"),
  ].find((p) => existsSync(p)) || null;

function readJson(name) {
  return JSON.parse(readFileSync(resolve(SHARE, name), "utf8"));
}
function writeJson(name, data) {
  writeFileSync(resolve(SHARE, name), JSON.stringify(data, null, 2));
}

async function dismissTour(page) {
  await page.evaluate(() => {
    localStorage.setItem("kcmi-hub-tour-v2-complete", "true");
    sessionStorage.removeItem("kcmi-hub-tour-v2-active");
  });
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.evaluate(() => {
    document.querySelectorAll("dialog.hub-tour-layer[open]").forEach((d) => {
      try {
        d.close();
      } catch {
        d.removeAttribute("open");
      }
    });
  });
}

async function main() {
  // —— Performance ——
  const perf = spawnSync("node", ["scripts/qa-performance.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 900_000,
    env: { ...process.env, QA_PUBLIC_BASE_URL: PUBLIC },
  });
  console.log("perf exit", perf.status);
  if (perf.stdout) console.log(perf.stdout.slice(-1500));
  if (perf.stderr) console.error(perf.stderr.slice(-800));

  const workflows = readJson("workflows.json");
  const coverage = readJson("coverage.json");
  const summary = readJson("summary.json");

  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });
  const ctx = await browser.newContext({
    storageState: AUTH,
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();

  // —— Tutorial gap ——
  const tourScenarios = [];
  async function runTour(label, path, steps) {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${HUB}${path}`, { waitUntil: "domcontentloaded" });
    await dismissTour(page);
    // Keep tour marked complete so auto-start does not cover Help; Replay starts it.
    await page.evaluate(() => {
      localStorage.setItem("kcmi-hub-tour-v2-complete", "true");
      sessionStorage.removeItem("kcmi-hub-tour-v2-active");
    });
    let replay = page.locator('aside [data-tour="help-tutorial"] button').first();
    if (!(await replay.isVisible().catch(() => false))) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload({ waitUntil: "domcontentloaded" });
      await dismissTour(page);
      await page
        .getByRole("button", { name: /Open Hub menu|Menu/i })
        .click({ force: true });
      replay = page.locator('[data-tour="help-tutorial"] button').first();
    }
    if (!(await replay.isVisible({ timeout: 5000 }).catch(() => false))) {
      tourScenarios.push({
        label,
        status: "BLOCKED",
        note: "Replay Hub Tour not visible",
      });
      await page.setViewportSize({ width: 1280, height: 800 });
      return;
    }
    await replay.click();
    await page.waitForTimeout(500);
    const showMe = page.getByRole("button", { name: /Show me around/i });
    if (await showMe.isVisible().catch(() => false)) await showMe.click();
    for (let i = 0; i < steps; i++) {
      const dlg = page.locator("dialog.hub-tour-layer").first();
      if (!(await dlg.isVisible().catch(() => false))) break;
      const body = await dlg.innerText().catch(() => "");
      const looking = /Looking for this control/i.test(body);
      const title = await dlg.locator("h2").innerText().catch(() => "");
      const hl = await page
        .locator("[data-hub-tour-highlight='true']")
        .isVisible()
        .catch(() => false);
      tourScenarios.push({
        label,
        step: i + 1,
        title,
        route: path,
        highlight: hl,
        lookingForControl: looking,
        status: looking ? "FAIL" : "PASS",
      });
      const next = page.getByRole("button", { name: /Next step|Finish tour/i });
      if (await next.isVisible().catch(() => false)) await next.click();
      else break;
      await page.waitForTimeout(350);
    }
    await page.keyboard.press("Escape");
    await dismissTour(page);
    await page.setViewportSize({ width: 1280, height: 800 });
  }

  await runTour("dashboard", "/admin", 6);
  await runTour("homepage-contextual", "/admin/website/home", 4);
  await runTour("program-contextual", `/admin/programs/${STAGING}`, 5);
  await runTour("livestream-contextual", "/admin/livestream", 5);
  // mobile menu contained
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${HUB}/admin`, { waitUntil: "domcontentloaded" });
  await dismissTour(page);
  await page.getByRole("button", { name: /Open Hub menu|Menu/i }).click({ force: true });
  if (await page.locator('[data-tour="help-tutorial"]').isVisible().catch(() => false)) {
    tourScenarios.push({ label: "mobile-menu-contained", status: "PASS" });
  } else {
    tourScenarios.push({ label: "mobile-menu-contained", status: "FAIL" });
  }
  await page.setViewportSize({ width: 1280, height: 800 });

  const tourSteps = tourScenarios.filter((s) => s.step).length;
  const tourFails = tourScenarios.filter((s) => s.status === "FAIL").length;
  workflows.tutorial = {
    status: tourFails > 0 ? "FAIL" : tourSteps >= 6 ? "PASS" : "PARTIAL",
    scenarios: tourScenarios,
    expectedMin: 6,
    executed: tourSteps,
    scenarioCount: tourScenarios.length,
  };

  // —— Media gap (home section → photo → replace → cancel) ——
  const mediaScenarios = [...(workflows["media-lifecycle"]?.scenarios || [])];
  await page.goto(`${HUB}/admin/website/home`, { waitUntil: "domcontentloaded" });
  await dismissTour(page);
  // Click first visual section card/button
  const sectionBtn = page.getByRole("button", { name: /Edit this section/i }).first();
  if (await sectionBtn.isVisible().catch(() => false)) {
    await sectionBtn.click();
    const photo = page
      .getByRole("button", { name: /Photo/i })
      .filter({ hasText: /photo/i })
      .first()
      .or(page.locator("[data-tour='edit-category-photo']"))
      .first();
    // Prefer category button whose label starts with PHOTO semantics
    const photoCat = page.locator("[data-tour='edit-category-photo']").first();
    if (await photoCat.isVisible().catch(() => false)) await photoCat.click();
    else if (await page.getByRole("button", { name: /^Photo$/i }).first().isVisible().catch(() => false)) {
      await page.getByRole("button", { name: /^Photo$/i }).first().click();
    } else {
      // category buttons include uppercase label + description
      const anyPhoto = page.getByRole("button").filter({ hasText: /^PHOTO/i }).first();
      if (await anyPhoto.isVisible().catch(() => false)) await anyPhoto.click();
    }
    const replace = page.getByRole("button", { name: /^Replace Photo$/i }).first();
    if (await replace.isVisible().catch(() => false)) {
      await replace.click();
      const upload = page.getByRole("button", { name: /Upload a new photo/i });
      if (await upload.isVisible().catch(() => false)) await upload.click();
      let cancel = page.getByRole("button", { name: /Cancel changes/i });
      if (await cancel.isVisible().catch(() => false)) {
        await cancel.click();
        mediaScenarios.unshift({
          route: "/admin/website/home",
          path: "Current→Replace→Upload New→Cancel",
          status: "PASS",
        });
      }
      const replace2 = page.getByRole("button", { name: /^Replace Photo$/i });
      if (await replace2.isVisible().catch(() => false)) {
        await replace2.click();
        const existing = page.getByRole("button", {
          name: /Use a photo already saved/i,
        });
        if (await existing.isVisible().catch(() => false)) await existing.click();
        cancel = page.getByRole("button", { name: /Cancel changes/i });
        if (await cancel.isVisible().catch(() => false)) {
          await cancel.click();
          mediaScenarios.unshift({
            route: "/admin/website/home",
            path: "Current→Replace→Choose Existing→Cancel",
            status: "PASS",
          });
        }
      }
    } else {
      mediaScenarios.unshift({
        route: "/admin/website/home",
        path: "drill-in",
        status: "BLOCKED",
        note: `section opened; Replace missing. body sample: ${(await page.locator("body").innerText()).slice(0, 200)}`,
      });
    }
  }

  // Program poster replace on wizard
  await page.goto(`${HUB}/admin/programs/${STAGING}`, {
    waitUntil: "domcontentloaded",
  });
  await dismissTour(page);
  const changeDetails = page.getByRole("button", {
    name: /Change these details|Replace Photo/i,
  });
  if (await changeDetails.first().isVisible().catch(() => false)) {
    await changeDetails.first().click().catch(() => undefined);
  }
  const progReplace = page.getByRole("button", { name: /Replace Photo/i }).first();
  if (await progReplace.isVisible().catch(() => false)) {
    await progReplace.click();
    const cancel = page.getByRole("button", { name: /Cancel changes/i });
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click();
      mediaScenarios.push({
        route: `/admin/programs/${STAGING}`,
        path: "Replace→Cancel",
        status: "PASS",
      });
    }
  }

  const mediaPass = mediaScenarios.filter((s) => s.status === "PASS").length;
  workflows["media-lifecycle"] = {
    status: mediaPass >= 2 ? "PASS" : "PARTIAL",
    scenarios: mediaScenarios,
    makeLive: "BLOCKED_BY_MUTATION_POLICY",
  };

  await ctx.close();
  await browser.close();

  // Update coverage/summary
  coverage.workflows = {
    registered: 6,
    fullyExercised: Object.values(workflows).filter((w) => w.status === "PASS").length,
    partial: Object.values(workflows).filter((w) => w.status === "PARTIAL").length,
    blocked: Object.values(workflows).filter((w) =>
      String(w.makeLive || "").includes("BLOCKED"),
    ).length,
    detail: workflows,
  };
  try {
    const perfSummary = readJson("performance-summary.json");
    coverage.performance = {
      status: perfSummary.status,
      pagesAudited: perfSummary.pagesAudited,
    };
  } catch {
    /* keep */
  }

  summary.harnessCorrections = [
    ...(summary.harnessCorrections || []),
    "QA1.1 gap-fill: lighthouse API baseline (avoid npx ETIMEDOUT)",
    "QA1.1 gap-fill: tutorial uses aside [data-tour=help-tutorial] Replay button",
    "QA1.1 gap-fill: media home section drill-in for Replace Photo",
  ].filter((v, i, a) => a.indexOf(v) === i);

  writeJson("workflows.json", workflows);
  writeJson("coverage.json", coverage);
  writeJson("summary.json", summary);

  // Refresh INDEX snippet for workflows/perf
  const index = readFileSync(resolve(SHARE, "INDEX.html"), "utf8");
  writeFileSync(
    resolve(SHARE, "INDEX.html"),
    index.replace(
      /<div class="card"><h2>Coverage<\/h2><pre>[\s\S]*?<\/pre><\/div>/,
      `<div class="card"><h2>Coverage</h2><pre>${JSON.stringify(coverage, null, 2)}</pre></div>`,
    ),
  );

  spawnSync(
    "zip",
    ["-r", ZIP, ".", "-x", "*.auth*", "*.env*", "*trace*", "*storageState*", "*cookie*"],
    { cwd: SHARE, stdio: "inherit" },
  );

  console.log(
    JSON.stringify(
      {
        zip: ZIP,
        tutorial: workflows.tutorial.status,
        tutorialExecuted: workflows.tutorial.executed,
        media: workflows["media-lifecycle"].status,
        mediaPass,
        performance: coverage.performance,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
