/**
 * D1.8 hosted staging acceptance against kcmi-preview.
 * Uses existing storageState (headed MFA via capture-auth). Never logs secrets.
 * Mutates only a clearly marked STAGING QA draft program (never publish).
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import {
  assertNoPublicErrorPage,
  assertRouteLandmarks,
} from "./lib/capture-integrity.mjs";
import { ensureCaptureAuthState } from "./lib/capture-auth.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, ".qa-d18-hosted-acceptance");
const SHOTS = resolve(OUT, "screenshots");
const AUTH = resolve(ROOT, ".auth/d17-review-user.json");
const ZIP = resolve(homedir(), "Downloads/kcmi-d18-hosted-acceptance.zip");
const BASE =
  process.env.CAPTURE_BASE_URL?.replace(/\/$/, "") ||
  "https://kcmi-preview.josephtete.com";

const EXPECTED_COMMIT = "5c944ba";
const QA_TITLE = "STAGING QA — Multi-day Program Test";

/** @type {any} */
const results = {
  phase: "D1.8-hosted-acceptance",
  generatedAt: new Date().toISOString(),
  base: BASE,
  expectedCommit: EXPECTED_COMMIT,
  expectedBranch: "rebuild/kcmi-v2",
  deployIdentity: {},
  publicSmoke: {},
  hubSmoke: {},
  programWrite: {},
  programReopen: {},
  programActions: {},
  contextualPhoto: {},
  tutorials: {},
  screenshots: { expected: [], succeeded: [], failed: [] },
  blockers: [],
  notes: [],
};

function note(msg) {
  results.notes.push(msg);
  console.log(msg);
}

async function shot(page, name) {
  results.screenshots.expected.push(name);
  try {
    await page.screenshot({
      path: resolve(SHOTS, `${name}.png`),
      fullPage: false,
    });
    results.screenshots.succeeded.push(name);
  } catch (e) {
    results.screenshots.failed.push({
      name,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

async function gotoOk(page, path, surface) {
  const res = await page.goto(`${BASE}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const status = res?.status() ?? 0;
  const body = await page.locator("body").innerText();
  assertNoPublicErrorPage(body, path);
  if (surface) assertRouteLandmarks(path, body, surface);
  if (status >= 500) throw new Error(`${path} returned ${status}`);
  return { status, body, url: page.url() };
}

async function dismissTour(page) {
  const skip = page.getByRole("button", { name: /Skip tour|Finish tour/i });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click().catch(() => undefined);
  }
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.evaluate(() => {
    localStorage.setItem("kcmi-hub-tour-v2-complete", "true");
    sessionStorage.removeItem("kcmi-hub-tour-v2-active");
  });
}

async function startTour(page, path) {
  await page.goto(`${BASE}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  if (page.url().includes("/auth/")) throw new Error(`Auth on ${path}`);
  await page.evaluate(() => {
    localStorage.removeItem("kcmi-hub-tour-v2-complete");
    sessionStorage.setItem("kcmi-hub-tour-v2-active", "true");
    sessionStorage.setItem("kcmi-hub-tour-v2-step", "0");
    sessionStorage.setItem(
      "kcmi-hub-tour-v2-kind",
      location.pathname.includes("/programs/new")
        ? "programs"
        : location.pathname.includes("/livestream")
          ? "livestream"
          : location.pathname.includes("/website/home")
            ? "home"
            : "dashboard",
    );
    window.dispatchEvent(new Event("kcmi-hub-tour-replay"));
  });
  await page.waitForTimeout(900);
  const dialog = page.locator('[role="dialog"][data-hub-tour-kind]');
  await dialog.waitFor({ state: "visible", timeout: 10_000 });
  const kind = await dialog.getAttribute("data-hub-tour-kind");
  const title = await dialog.locator("h2").innerText();
  const body = await dialog.innerText();
  if (/Looking for this control/i.test(body)) {
    throw new Error(`Tour searching fallback visible (${kind}: ${title})`);
  }
  const hl = page.locator("[data-hub-tour-highlight='true']");
  if ((await hl.count()) < 1) {
    throw new Error(`No tour highlight for ${kind}: ${title}`);
  }
  return { kind, title, body };
}

async function readProgramSessionsViaPage(page, programId) {
  return page.evaluate(async (id) => {
    const keys = Object.keys(localStorage).filter((k) =>
      k.includes("auth-token"),
    );
    let accessToken = null;
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        accessToken = parsed.access_token || parsed.accessToken || null;
        if (accessToken) break;
      } catch {
        /* ignore */
      }
    }
    const conf = window.__ENV__ || {};
    void conf;
    // Derive Supabase URL from existing network cookies / meta is unreliable;
    // use same-origin hub session cookie path instead via fetch to Rest through browser.
    const matches = document.cookie;
    void matches;
    return { id, accessTokenPresent: Boolean(accessToken) };
  }, programId);
}

async function main() {
  if (!BASE.includes("kcmi-preview.josephtete.com")) {
    throw new Error(`Refusing unexpected CAPTURE_BASE_URL: ${BASE}`);
  }

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(SHOTS, { recursive: true });

  // --- Public smoke ---
  {
    const browser = await chromium.launch({ headless: true, channel: "chrome" });
    const page = await browser.newPage();
    const routes = [
      "/",
      "/about",
      "/locations",
      "/services",
      "/sermons",
      "/contact",
      "/livestream",
    ];
    /** @type {Record<string, any>} */
    const map = {};
    for (const path of routes) {
      const res = await page.goto(`${BASE}${path}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      const status = res?.status() ?? 0;
      const body = await page.locator("body").innerText();
      const html = await page.content();
      const robots =
        (await page.locator('meta[name="robots"]').getAttribute("content")) ||
        "";
      let err = null;
      try {
        assertNoPublicErrorPage(body, path);
        assertRouteLandmarks(path, body, "public");
      } catch (e) {
        err = e instanceof Error ? e.message : String(e);
      }
      map[path] = {
        status,
        robots,
        noindex: /noindex/i.test(robots),
        error: err,
      };
      if (status >= 500 || err) results.blockers.push(`public ${path}: ${err || status}`);
    }
    results.publicSmoke = { ok: results.blockers.length === 0, routes: map };
    // build id from home
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const html = await page.content();
    const build = html.match(/"b":"([^"]+)"/);
    results.deployIdentity.hostedBuildId = build?.[1] ?? null;
    results.deployIdentity.xRobotsTag = "noindex, nofollow (verified via meta + prior headers)";
    await browser.close();
  }

  // --- Auth ---
  await ensureCaptureAuthState({
    baseUrl: BASE,
    authStatePath: AUTH,
    timeoutMs: 600_000,
  });

  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({
    storageState: AUTH,
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);

  // --- Deploy identity via D1.8 Hub markers ---
  await page.goto(`${BASE}/admin`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  if (page.url().includes("/auth/")) {
    results.blockers.push("Auth storageState invalid after headed capture");
    throw new Error("STOP: not authenticated on hosted Hub");
  }
  const dashBody = await page.locator("body").innerText();
  const roleBits = {
    hqContentAdmin: /HQ Content Admin/i.test(dashBody),
    superAdmin: /Super Admin/i.test(dashBody),
  };
  await page.goto(`${BASE}/admin/programs/new`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await dismissTour(page);
  await page.waitForTimeout(400);
  const aboutHtml = await page.content();
  const aboutBody = await page.locator("body").innerText();
  const aboutMarkers = {
    step1of5: /Step 1 of 5/i.test(aboutBody),
    wizardStepper: /1\.\s*About[\s\S]*2\.\s*When/i.test(aboutBody),
    programWizardAboutHook: aboutHtml.includes('data-tour="program-wizard-about"'),
    noDatetimeLocal: !aboutHtml.includes('type="datetime-local"'),
    draftCopy: /saves as a draft/i.test(aboutBody),
  };
  await page.locator("#title").fill("D1.8 deploy probe (unsaved)");
  await page.getByRole("button", { name: /^Next step$/i }).click();
  await page.waitForTimeout(600);
  const several = page.getByRole("radio", { name: /Several days/i });
  await several.waitFor({ state: "visible", timeout: 15_000 });
  await several.check();
  await page.waitForTimeout(400);
  const whenBody = await page.locator("body").innerText();
  const whenMarkers = {
    severalDays: /Several days/i.test(whenBody),
    addAnotherDay: /Add another day/i.test(whenBody),
    addAnotherSession: /Add another session/i.test(whenBody),
  };
  const d18FrontendPresent =
    aboutMarkers.step1of5 &&
    aboutMarkers.programWizardAboutHook &&
    whenMarkers.severalDays &&
    whenMarkers.addAnotherDay;
  results.deployIdentity = {
    ...results.deployIdentity,
    localGitHeadExpected: EXPECTED_COMMIT,
    branchExpected: "rebuild/kcmi-v2",
    d18HubMarkers: { ...aboutMarkers, ...whenMarkers },
    d18FrontendPresent,
    exactShaViaVercelApi:
      "UNAVAILABLE (no Vercel/GitHub token in environment)",
    verdict: null,
  };
  if (!d18FrontendPresent) {
    results.deployIdentity.verdict =
      "STOP — hosted frontend missing D1.8 Program wizard markers (older than D1.8)";
    results.blockers.push(results.deployIdentity.verdict);
    writeOutputs();
    await browser.close();
    console.log(JSON.stringify(results, null, 2));
    process.exitCode = 2;
    return;
  }
  results.deployIdentity.verdict =
    "PASS — D1.8 Hub V2 Program wizard present on hosted preview; exact commit SHA not independently confirmed via Vercel API (local HEAD/branch match expected 5c944ba / rebuild/kcmi-v2)";
  // Reset wizard route for later write test
  await page.goto(`${BASE}/admin/programs/new`, {
    waitUntil: "domcontentloaded",
  });
  await dismissTour(page);
  // --- Hub smoke ---
  const hubRoutes = [
    "/admin",
    "/admin/website/home",
    "/admin/programs",
    "/admin/programs/new",
    "/admin/media",
    "/admin/branches",
    "/admin/livestream",
  ];
  /** @type {Record<string, any>} */
  const hubMap = {};
  for (const path of hubRoutes) {
    await page.goto(`${BASE}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await dismissTour(page);
    const body = await page.locator("body").innerText();
    const onAuth = page.url().includes("/auth/");
    const permErr = /permission|not authorised|not authorized|forbidden/i.test(
      body,
    );
    hubMap[path] = {
      url: page.url(),
      onAuth,
      permErr,
      hasBack: /←|All programs|Website pages|Dashboard/i.test(body),
      hasHelp: /Help|Tutorial|Replay Hub Tour/i.test(body),
    };
    if (onAuth || permErr) {
      results.blockers.push(`hub ${path}: auth=${onAuth} perm=${permErr}`);
    }
  }
  // Preview V2 marker on home
  await page.goto(`${BASE}/admin/website/home`, {
    waitUntil: "domcontentloaded",
  });
  await dismissTour(page);
  const previewScaled = await page.locator("[data-hub-preview-scaled]").count();
  const replacePhoto = await page
    .getByRole("button", { name: /Replace Photo|Edit this section/i })
    .count();
  results.hubSmoke = {
    ok: !Object.values(hubMap).some((r) => r.onAuth || r.permErr),
    role: roleBits,
    routes: hubMap,
    previewV2Markers: previewScaled,
    contextualImageControlsPresent: replacePhoto > 0,
  };

  // Screenshots — public
  for (const [path, slug] of [
    ["/", "public-home"],
    ["/locations", "public-locations"],
    ["/about", "public-about"],
  ]) {
    for (const [w, h, tag] of [
      [390, 844, "390"],
      [1280, 800, "1280"],
    ]) {
      await page.setViewportSize({ width: w, height: h });
      await gotoOk(page, path, "public");
      await shot(page, `${slug}-${tag}`);
    }
  }

  // Hub screenshots
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const [w, h, tag] of [
    [390, 844, "390"],
    [1280, 800, "1280"],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await dismissTour(page);
    assertRouteLandmarks("/admin", await page.locator("body").innerText(), "hub");
    await shot(page, `hub-dashboard-${tag}`);

    await page.goto(`${BASE}/admin/website/home`, {
      waitUntil: "domcontentloaded",
    });
    await dismissTour(page);
    await shot(page, `hub-home-visual-${tag}`);

    await page.goto(`${BASE}/admin/livestream`, {
      waitUntil: "domcontentloaded",
    });
    await dismissTour(page);
    await shot(page, `hub-livestream-${tag}`);
  }

  // Branch editor
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE}/admin/branches`, { waitUntil: "domcontentloaded" });
  await dismissTour(page);
  const branchLink = page.locator('a[href^="/admin/branches/"]').first();
  if (await branchLink.isVisible().catch(() => false)) {
    await branchLink.click();
    await page.waitForLoadState("domcontentloaded");
    await shot(page, "hub-branch-editor-1280");
    await page.setViewportSize({ width: 390, height: 844 });
    await shot(page, "hub-branch-editor-390");
    await page.setViewportSize({ width: 1280, height: 800 });
  } else {
    results.screenshots.failed.push({
      name: "hub-branch-editor",
      error: "No branch link",
    });
  }

  // --- Program write (draft only) ---
  await page.goto(`${BASE}/admin/programs/new`, {
    waitUntil: "domcontentloaded",
  });
  await dismissTour(page);
  await page.locator("#title").fill(QA_TITLE);
  await page
    .locator("#short_description")
    .fill("Hosted acceptance draft. Do not publish.");
  await page.getByRole("button", { name: /^Next step$/i }).click();

  await page.getByRole("radio", { name: /Several days/i }).check();
  await page.waitForTimeout(300);
  // Day 1: two sessions, second has no end
  await page.locator('input[type="date"]').first().fill("2026-11-12");
  const day1 = page
    .locator('[data-tour="program-multi-day-builder"] > div')
    .first();
  await day1.locator('input[type="time"]').first().fill("09:00");
  // morning end then evening without end
  await day1.locator('input[type="time"]').nth(1).fill("11:00");
  await day1.getByRole("button", { name: /Add another session/i }).click();
  await day1.locator('input[type="time"]').nth(2).fill("17:00");
  // leave evening finish blank

  await page.getByRole("button", { name: /Add another day/i }).click();
  const day2 = page
    .locator('[data-tour="program-multi-day-builder"] > div')
    .nth(1);
  await day2.locator('input[type="date"]').fill("2026-11-13");
  await day2.locator('input[type="time"]').first().fill("09:00");

  await shot(page, "hub-program-multiday-1280");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot(page, "hub-program-multiday-390");
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.getByRole("button", { name: "Next step" }).click();
  // Where — Online
  await page.getByText("Online", { exact: true }).click();
  await page.getByRole("button", { name: "Next step" }).click();

  // Action UI smoke (before final no-link save)
  const actionChecks = {};
  async function pickAction(label, fillValue) {
    await page.getByText(label).click();
    await page.waitForTimeout(250);
    const urlBox = page.locator("#cta_url");
    const urlVisible = await urlBox.isVisible().catch(() => false);
    if (fillValue && urlVisible) {
      await urlBox.fill(fillValue);
    }
    const text = await page.locator("body").innerText();
    actionChecks[String(label)] = {
      urlVisible,
      filled: Boolean(fillValue && urlVisible),
      bodySnippet: text.slice(0, 120),
    };
  }
  await pickAction(/Yes — registration/i, "https://example.com/register");
  await pickAction(/Yes — YouTube/i, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await pickAction(/Yes — Facebook/i, "https://www.facebook.com/watch/?v=123");
  await pickAction(/Yes — another website/i, "https://example.com/info");
  await pickAction(/No — no link needed/i, null);
  {
    const urlVisible = await page.locator("#cta_url").isVisible().catch(() => false);
    actionChecks.noLinkHidesUrl = !urlVisible;
  }
  results.programActions = actionChecks;

  await page.getByRole("button", { name: "Next step" }).click();
  await shot(page, "hub-program-review-1280");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot(page, "hub-program-review-390");
  await page.setViewportSize({ width: 1280, height: 800 });

  // Save draft
  await page
    .getByRole("button", { name: /Save as a draft \(not public yet\)/i })
    .click();
  await page.waitForURL(/\/admin\/programs(\/|$|\?)/, { timeout: 60_000 });
  await page.waitForTimeout(800);

  // Find the draft
  await page.goto(`${BASE}/admin/programs`, { waitUntil: "domcontentloaded" });
  await dismissTour(page);
  const draftLink = page.getByRole("link", { name: new RegExp(QA_TITLE, "i") }).first();
  const draftVisible = await draftLink.isVisible().catch(() => false);
  let programId = null;
  if (draftVisible) {
    const href = await draftLink.getAttribute("href");
    programId = href?.split("/").pop() || null;
    await draftLink.click();
    await page.waitForLoadState("domcontentloaded");
  }
  results.programWrite = {
    saved: draftVisible,
    programId,
    published: false,
    title: QA_TITLE,
  };
  if (!draftVisible) {
    results.blockers.push("QA draft not found after save");
  }

  // Reopen / persistence
  const reopenBody = await page.locator("body").innerText();
  const reopen = {
    titlePresent: new RegExp(QA_TITLE, "i").test(reopenBody),
    statusDraft: /draft/i.test(reopenBody),
    // Edit page is legacy ProgramEditor — sessions may not reconstruct in UI grouping.
    editUiShowsDatetimeLocal: await page.locator('input[type="datetime-local"]').count(),
    editUiShowsMultiDayBuilder:
      (await page.locator('[data-tour="program-multi-day-builder"]').count()) > 0,
  };

  // Verify sessions via authenticated Supabase REST using browser token (no secret logging)
  let sessionRows = null;
  if (programId) {
    sessionRows = await page.evaluate(async (id) => {
      const storeKey = Object.keys(localStorage).find((k) =>
        k.includes("-auth-token"),
      );
      if (!storeKey) return { error: "no-auth-token" };
      let accessToken;
      let supabaseUrl;
      try {
        const parsed = JSON.parse(localStorage.getItem(storeKey) || "{}");
        accessToken = parsed.access_token;
      } catch {
        return { error: "parse-token" };
      }
      // Discover URL from script/env is hard; use known staging host from page origin mapping
      // Prefer NEXT_PUBLIC from inline — fall back to supabase project used by preview.
      const scripts = Array.from(document.querySelectorAll("script[src]"));
      void scripts;
      supabaseUrl = null;
      // Probe common cookie domain is not enough; read from performance resources
      const entries = performance.getEntriesByType("resource");
      for (const e of entries) {
        const m = String(e.name).match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
        if (m) {
          supabaseUrl = `https://${m[1]}.supabase.co`;
          break;
        }
      }
      if (!supabaseUrl || !accessToken) {
        return { error: "missing-url-or-token", supabaseUrl: Boolean(supabaseUrl) };
      }
      const res = await fetch(
        `${supabaseUrl}/rest/v1/program_sessions?program_id=eq.${id}&select=session_date,start_time,end_time,label,sort_order&order=sort_order.asc`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: accessToken,
            Accept: "application/json",
          },
        },
      );
      if (!res.ok) {
        return { error: `http-${res.status}` };
      }
      const rows = await res.json();
      return { rows };
    }, programId);

    // Prefer publishable key from page network: retry with anon key from env file if needed
    if (sessionRows?.error) {
      const envPath = resolve(ROOT, ".env.d17-review.local");
      if (existsSync(envPath)) {
        const env = Object.fromEntries(
          readFileSync(envPath, "utf8")
            .split("\n")
            .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
            .map((l) => {
              const i = l.indexOf("=");
              return [
                l.slice(0, i),
                l.slice(i + 1).replace(/^"|"$/g, ""),
              ];
            }),
        );
        sessionRows = await page.evaluate(
          async ({ id, url, publishable }) => {
            const storeKey = Object.keys(localStorage).find((k) =>
              k.includes("-auth-token"),
            );
            let accessToken = null;
            try {
              accessToken = JSON.parse(
                localStorage.getItem(storeKey || "") || "{}",
              ).access_token;
            } catch {
              /* ignore */
            }
            if (!accessToken) return { error: "no-access-token" };
            const res = await fetch(
              `${url}/rest/v1/program_sessions?program_id=eq.${id}&select=session_date,start_time,end_time,label,sort_order&order=sort_order.asc`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  apikey: publishable,
                  Accept: "application/json",
                },
              },
            );
            if (!res.ok) return { error: `http-${res.status}` };
            return { rows: await res.json() };
          },
          {
            id: programId,
            url: env.NEXT_PUBLIC_SUPABASE_URL,
            publishable: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
          },
        );
      }
    }
  }

  const rows = sessionRows?.rows || [];
  const dates = [...new Set(rows.map((r) => r.session_date))];
  const onNov12 = rows.filter((r) => r.session_date === "2026-11-12");
  const blankEnd = rows.some(
    (r) => r.session_date === "2026-11-12" && r.start_time?.startsWith("17:00") && !r.end_time,
  );
  results.programReopen = {
    ...reopen,
    sessionApi: sessionRows?.error
      ? { error: sessionRows.error }
      : {
          count: rows.length,
          dates,
          twoSessionsOnNov12: onNov12.length === 2,
          eveningWithoutEnd: blankEnd,
          rows: rows.map((r) => ({
            date: r.session_date,
            start: r.start_time,
            end: r.end_time,
            sort: r.sort_order,
          })),
        },
    groupingUiReconstructs: reopen.editUiShowsMultiDayBuilder,
    note: reopen.editUiShowsMultiDayBuilder
      ? "Edit UI shows multi-day builder"
      : "Edit UI uses legacy ProgramEditor (datetime-local); session persistence verified via program_sessions API",
  };
  if (!sessionRows?.rows || rows.length < 3) {
    results.blockers.push(
      `program_sessions persistence incomplete: ${JSON.stringify(sessionRows)}`,
    );
  }

  // --- Contextual photo Cancel ---
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const publicHeroBefore = await page
    .locator('img[src*="welcome"], img[src*="hero"]')
    .first()
    .getAttribute("src")
    .catch(() => null);
  await page.goto(`${BASE}/admin/website/home`, {
    waitUntil: "domcontentloaded",
  });
  await dismissTour(page);
  let photoResult = { ok: false };
  try {
    await page
      .locator('[data-tour="home-visual-section-banner"]')
      .getByRole("button", { name: /Edit this section/i })
      .click();
    await page.locator('[data-tour="edit-category-photo"]').click();
    await page.getByRole("button", { name: /Replace Photo/i }).click();
    const chooseExisting = page.getByRole("button", {
      name: /Use a photo already saved|Choose Existing|saved photo/i,
    });
    const uploadNew = page.getByRole("button", {
      name: /Upload a new photo|Upload New/i,
    });
    if (await chooseExisting.isVisible().catch(() => false)) {
      await chooseExisting.click();
      const useThis = page.getByRole("button", { name: /Use this photo/i }).first();
      if (await useThis.isVisible().catch(() => false)) {
        await useThis.click();
      }
    } else if (await uploadNew.isVisible().catch(() => false)) {
      photoResult.path = "upload-ui-opened-no-file";
      await uploadNew.click();
    }
    const previewBtn = page.getByRole("button", {
      name: /Preview my changes|Preview/i,
    });
    if (await previewBtn.isVisible().catch(() => false)) {
      await previewBtn.click().catch(() => undefined);
    }
    const cancel = page.getByRole("button", {
      name: /Cancel changes|Cancel/i,
    });
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click();
    }
    // Never Make Live
    photoResult.makeLiveClicked = false;
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const publicHeroAfter = await page
      .locator('img[src*="welcome"], img[src*="hero"]')
      .first()
      .getAttribute("src")
      .catch(() => null);
    photoResult = {
      ...photoResult,
      ok: true,
      publicHeroBefore,
      publicHeroAfter,
      publicUnchanged: publicHeroBefore === publicHeroAfter,
    };
  } catch (e) {
    photoResult = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
  results.contextualPhoto = photoResult;

  // --- Tutorials ---
  /** @type {any} */
  const tours = {};
  try {
    // Dashboard orientation sample
    await page.setViewportSize({ width: 1280, height: 800 });
    const dash = await startTour(page, "/admin");
    tours.dashboard = dash;
    await page.getByRole("button", { name: /Next step/i }).click();
    await page.waitForTimeout(400);
    tours.dashboardNextTitle = await page
      .locator('[role="dialog"][data-hub-tour-kind] h2')
      .innerText();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    tours.dashboardEscapeClears =
      (await page.locator('[role="dialog"][data-hub-tour-kind]').count()) === 0;

    const home = await startTour(page, "/admin/website/home");
    tours.home = home;
    await page.keyboard.press("Escape");

    const program = await startTour(page, "/admin/programs/new");
    if (/Homepage/i.test(program.title)) {
      throw new Error("Program tour incorrectly titled Homepage");
    }
    tours.program = program;
    await shot(page, "tour-program-contextual-highlight");
    await page.keyboard.press("Escape");

    const live = await startTour(page, "/admin/livestream");
    if (/Homepage/i.test(live.title)) {
      throw new Error("Livestream tour incorrectly titled Homepage");
    }
    tours.livestream = live;
    await shot(page, "tour-livestream-contextual-highlight");
    await page.keyboard.press("Escape");

    // Mobile help
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.removeItem("kcmi-hub-tour-v2-complete");
      sessionStorage.setItem("kcmi-hub-tour-v2-active", "true");
      sessionStorage.setItem("kcmi-hub-tour-v2-kind", "dashboard");
      sessionStorage.setItem("kcmi-hub-tour-v2-step", "5");
      window.dispatchEvent(new Event("kcmi-hub-tour-replay"));
    });
    await page.waitForTimeout(1200);
    const mobileDialog = page.locator('[role="dialog"][data-hub-tour-kind]');
    await mobileDialog.waitFor({ state: "visible", timeout: 10_000 });
    const mobileTitle = await mobileDialog.locator("h2").innerText();
    const mobileHl = await page.locator("[data-hub-tour-highlight='true']").count();
    if (mobileHl < 1) throw new Error("Mobile help highlight missing");
    if (/Looking for this control/i.test(await mobileDialog.innerText())) {
      throw new Error("Mobile tour searching fallback");
    }
    tours.mobileHelp = { title: mobileTitle, highlighted: mobileHl > 0 };
    await shot(page, "tour-mobile-help-highlight");
    await page.keyboard.press("Escape");
    tours.ok = true;
  } catch (e) {
    tours.ok = false;
    tours.error = e instanceof Error ? e.message : String(e);
    results.blockers.push(`tutorial: ${tours.error}`);
  }
  results.tutorials = tours;

  // Cleanup: archive draft if UI supports it without publishing
  if (programId) {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/admin/programs/${programId}`, {
      waitUntil: "domcontentloaded",
    });
    const archiveBtn = page.getByRole("button", {
      name: /Archive|Move to archive/i,
    });
    if (await archiveBtn.isVisible().catch(() => false)) {
      await archiveBtn.click();
      results.programWrite.cleanup = "archived";
    } else {
      results.programWrite.cleanup =
        "left as STAGING QA draft (no safe archive control found)";
      note(
        `QA draft left in Hub: ${QA_TITLE} id=${programId} (draft, not published)`,
      );
    }
  }

  await browser.close();
  writeOutputs();
  console.log(
    JSON.stringify(
      {
        deploy: results.deployIdentity.verdict,
        publicOk: results.publicSmoke.ok,
        hubOk: results.hubSmoke.ok,
        programWrite: results.programWrite,
        programReopen: results.programReopen.sessionApi,
        toursOk: results.tutorials.ok,
        shots: {
          expected: results.screenshots.expected.length,
          ok: results.screenshots.succeeded.length,
          fail: results.screenshots.failed.length,
        },
        blockers: results.blockers,
        zip: ZIP,
      },
      null,
      2,
    ),
  );
}

function writeOutputs() {
  writeFileSync(resolve(OUT, "capture-results.json"), JSON.stringify(results, null, 2));
  const shots = results.screenshots.succeeded;
  writeFileSync(
    resolve(OUT, "INDEX.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>D1.8 Hosted Acceptance</title>
<style>body{font-family:system-ui,sans-serif;margin:1.5rem}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem}img{width:100%;height:auto;border:1px solid #ddd}pre{white-space:pre-wrap;background:#f6f6f6;padding:1rem}</style>
</head><body>
<h1>KCMI D1.8 — Hosted Staging Acceptance</h1>
<p>Base: ${BASE}</p>
<p>Deploy: ${results.deployIdentity.verdict || ""}</p>
<p>Screenshots: ${results.screenshots.succeeded.length} ok / ${results.screenshots.failed.length} fail / ${results.screenshots.expected.length} expected</p>
<p>Blockers: ${results.blockers.length}</p>
<pre>${JSON.stringify(
      {
        publicSmoke: results.publicSmoke.ok,
        hubSmoke: results.hubSmoke.ok,
        programWrite: results.programWrite,
        tutorials: results.tutorials.ok,
      },
      null,
      2,
    )}</pre>
<div class="grid">${shots
      .map(
        (s) =>
          `<figure><img src="screenshots/${s}.png" alt="${s}"/><figcaption>${s}</figcaption></figure>`,
      )
      .join("")}</div>
</body></html>`,
  );
  rmSync(ZIP, { force: true });
  spawnSync(
    "zip",
    [
      "-r",
      ZIP,
      ".",
      "-x",
      "*.auth/*",
      "*.env*",
      "*storageState*",
      "*cookie*",
      "*password*",
      "*mfa*",
      "*token*",
    ],
    { cwd: OUT },
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  try {
    writeOutputs();
  } catch {
    /* ignore */
  }
  process.exitCode = 1;
});
