/**
 * D1.6D review-only visual bundle from the local production build.
 * Writes platform/.qa-d16-release/ (gitignored via .qa-*).
 * Does not update Playwright visual baselines.
 * Does not capture passwords, session tokens, API keys, or real MFA QR/secrets.
 *
 * Usage (from platform/, after `next build`):
 *   node scripts/qa-d16-release.mjs
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { TOTP } from "otpauth";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, ".qa-d16-release");
const SHOTS = resolve(OUT, "screenshots");
const PORT = process.env.QA_D16_PORT || "3016";
const BASE = process.env.QA_D16_BASE_URL || `http://127.0.0.1:${PORT}`;
const TEST_PASSWORD = "Local-Test-Only-Passw0rd!";
const ACCRA_BRANCH_ID = "a1000000-0000-4000-8000-000000000005";
const PUBLIC_WIDTHS = [390, 768, 1280, 1440];
const HUB_WIDTHS = [390, 1280];

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/about/apostle-frank-aikins",
  "/locations",
  "/locations/headquarters",
  "/locations/accra",
  "/locations/rumuigbo",
  "/locations/togo",
  "/services",
  "/sermons",
  "/contact",
  "/giving",
  "/livestream",
  "/mission",
  "/events",
  "/faqs",
  "/privacy",
  "/terms",
];

function loadLocalEnv() {
  const path = resolve(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i);
    let val = t.slice(i + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function slug(path) {
  return path === "/" ? "home" : path.replace(/^\//, "").replaceAll("/", "_");
}

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
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Server did not become ready at ${url}`);
}

function startServer() {
  if (process.env.QA_D16_BASE_URL) return null;
  const child = spawn("npx", ["next", "start", "-p", PORT], {
    cwd: ROOT,
    env: { ...process.env, ALLOW_QA_STRESS: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  return child;
}

async function capture(page, file, { fullPage = true } = {}) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({
    path: resolve(SHOTS, file),
    fullPage,
    animations: "disabled",
  });
  return `screenshots/${file}`;
}

async function stripMfaSecrets(page) {
  await page.evaluate(() => {
    for (const img of document.querySelectorAll("img")) {
      const alt = (img.getAttribute("alt") || "").toLowerCase();
      const src = img.getAttribute("src") || "";
      if (alt.includes("qr") || src.startsWith("data:")) {
        const note = document.createElement("p");
        note.textContent = "[Authenticator QR hidden for review]";
        img.replaceWith(note);
      }
    }
    for (const el of document.querySelectorAll("p, span, dd, code, li")) {
      const text = el.textContent || "";
      if (/manual setup code|manual secret/i.test(text)) {
        el.textContent = "Manual setup code: [hidden for review]";
      }
    }
  });
}

async function skipTour(page) {
  const skip = page.getByRole("button", { name: "Skip tour" });
  if (await skip.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await skip.click();
  }
}

async function createUser(email, roleName) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Missing local Supabase configuration");
  const admin = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: email },
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  await admin
    .from("profiles")
    .update({ is_active: true, display_name: email })
    .eq("id", data.user.id);
  const { data: role } = await admin.from("roles").select("id").eq("name", roleName).single();
  if (!role) throw new Error(`Role missing: ${roleName}`);
  await admin.from("user_roles").upsert({ user_id: data.user.id, role_id: role.id });
  await new Promise((r) => setTimeout(r, 1500));
  return { id: data.user.id, email, admin };
}

async function enrollTotp(email) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishable) throw new Error("Missing public Supabase configuration");
  const client = createClient(url, publishable, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signErr } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (signErr) throw signErr;
  const { data: enrolled, error: enrollErr } = await client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `d16d-review-${Date.now()}`,
  });
  if (enrollErr || !enrolled?.totp?.secret) {
    throw enrollErr ?? new Error("Authenticator enroll failed");
  }
  const secret = enrolled.totp.secret;
  const totp = new TOTP({ secret, digits: 6, period: 30 });
  const { data: challenge, error: challengeErr } = await client.auth.mfa.challenge({
    factorId: enrolled.id,
  });
  if (challengeErr || !challenge) throw challengeErr ?? new Error("Authenticator challenge failed");
  const { error: verifyErr } = await client.auth.mfa.verify({
    factorId: enrolled.id,
    challengeId: challenge.id,
    code: totp.generate(),
  });
  if (verifyErr) throw verifyErr;
  await client.auth.signOut();
  return secret;
}

async function signInToMfa(page, email) {
  await page.goto(`${BASE}/auth/sign-in`, { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  await page.getByRole("heading", { name: "Add extra protection" }).waitFor({
    timeout: 25_000,
  });
  await page.locator("#code").waitFor({ timeout: 20_000 });
  await page.waitForTimeout(1500);
}

async function completeMfa(page, secret) {
  await page.locator("#code").waitFor({ timeout: 20_000 });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const totp = new TOTP({ secret, digits: 6, period: 30 });
    await page.locator("#code").fill(totp.generate());
    await page.getByRole("button", { name: "Continue to the Hub" }).click();
    const reached = await page
      .getByRole("navigation", { name: "Hub" })
      .waitFor({ timeout: 12_000 })
      .then(() => true)
      .catch(() => false);
    if (reached) return;
  }
  throw new Error("Authenticator code did not open the Hub");
}

function record(entries, item) {
  entries.push(item);
}

async function capturePublic(page, entries) {
  for (const route of PUBLIC_ROUTES) {
    for (const width of PUBLIC_WIDTHS) {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
      await page.goto(`${BASE}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      const footer = page.locator("footer.site-footer");
      await footer.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
      const file = `public-${slug(route)}-${width}.png`;
      const screenshot = await capture(page, file);
      record(entries, {
        group: "public",
        route,
        viewport: width,
        state: "public logged-out",
        role: "logged-out",
        description: `Public ${route} at ${width}px`,
        screenshot,
      });
    }
  }
}

async function captureHubScreen(page, entries, {
  route,
  width,
  state,
  role,
  description,
  file,
  prepare,
}) {
  await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await skipTour(page);
  if (prepare) await prepare(page);
  const screenshot = await capture(page, file);
  record(entries, {
    group: "hub",
    route,
    viewport: width,
    state,
    role,
    description,
    screenshot,
  });
}

function writeIndex(entries) {
  const publicRows = entries.filter((e) => e.group === "public");
  const hubRows = entries.filter((e) => e.group === "hub");
  const card = (item) => `<figure class="cell">
    <a href="${escapeHtml(item.screenshot)}" target="_blank" rel="noopener">
      <img src="${escapeHtml(item.screenshot)}" alt="${escapeHtml(item.description)}">
    </a>
    <figcaption>
      <strong>${escapeHtml(item.route)}</strong>
      <span>${escapeHtml(String(item.viewport))}px · ${escapeHtml(item.role)}</span>
      <span>${escapeHtml(item.description)}</span>
      <code>${escapeHtml(item.state)}</code>
    </figcaption>
  </figure>`;

  const publicByRoute = new Map();
  for (const item of publicRows) {
    if (!publicByRoute.has(item.route)) publicByRoute.set(item.route, []);
    publicByRoute.get(item.route).push(item);
  }
  const publicHtml = [...publicByRoute.entries()]
    .map(
      ([route, items]) => `<section class="route">
      <h3>${escapeHtml(route === "/" ? "/ (home)" : route)}</h3>
      <div class="row">${items.map(card).join("")}</div>
    </section>`,
    )
    .join("\n");

  const hubHtml = `<section class="route">
    <h3>Hub representative screens</h3>
    <div class="row">${hubRows.map(card).join("")}</div>
  </section>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KCMI D1.6D visual release candidate (NOT APPROVED)</title>
  <style>
    :root { --bg:#f4f1f5; --card:#fff; --ink:#1c1720; --muted:#5c5663; --line:#d8d0dc; --warn:#7c1963; --warn-bg:#f6e8f2; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: ui-sans-serif, system-ui, sans-serif; background:var(--bg); color:var(--ink); line-height:1.45; }
    header.banner { position:sticky; top:0; z-index:2; padding:1rem 1.25rem; background:var(--warn-bg); border-bottom:3px solid var(--warn); }
    header.banner h1 { margin:0 0 .35rem; font-size:1.25rem; }
    header.banner p { margin:.2rem 0; color:var(--muted); }
    .wrap { padding:1.25rem; max-width:1400px; margin-inline:auto; }
    .row { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:1rem; }
    .route { margin-bottom:1.75rem; padding:1rem; background:var(--card); border:1px solid var(--line); border-radius:12px; }
    .cell { margin:0; border:1px solid var(--line); border-radius:8px; overflow:hidden; background:#faf8fb; }
    .cell img { display:block; width:100%; height:280px; object-fit:contain; background:#ece8ef; }
    figcaption { display:grid; gap:.2rem; padding:.65rem .7rem .8rem; font-size:.85rem; }
    figcaption code { display:block; font-size:.72rem; word-break:break-all; color:var(--muted); }
  </style>
</head>
<body>
  <header class="banner">
    <h1>KCMI D1.6D visual release candidate — not approved</h1>
    <p>Review-only local production-build screenshots. These files are gitignored and have not been blessed as visual baselines.</p>
    <p>No passwords, session tokens, API keys, or authenticator QR/secrets are included.</p>
    <p>Inventory: <strong>${entries.length}</strong> screenshots in <code>platform/.qa-d16-release/</code></p>
  </header>
  <main class="wrap">
    <h2>Public routes</h2>
    ${publicHtml}
    <h2>Hub routes</h2>
    ${hubHtml}
  </main>
</body>
</html>`;
  writeFileSync(resolve(OUT, "INDEX.html"), html);
  writeFileSync(resolve(OUT, "metadata.json"), JSON.stringify(entries, null, 2));
}

async function main() {
  if (!existsSync(resolve(ROOT, ".next"))) {
    throw new Error("No production build found. Run `npm run build` in platform/ first.");
  }
  loadLocalEnv();
  mkdirSync(SHOTS, { recursive: true });

  const server = startServer();
  const userIds = [];
  let adminClient = null;
  let reviewProgramId = null;
  let reviewSermonId = null;
  try {
    await waitForServer(BASE, 90_000);
    const browser = await chromium.launch({ channel: "chrome" });
    const entries = [];

    if (process.env.QA_D16_HUB_ONLY === "1" && existsSync(resolve(OUT, "metadata.json"))) {
      const prior = JSON.parse(readFileSync(resolve(OUT, "metadata.json"), "utf8"));
      entries.push(...prior.filter((item) => item.group === "public"));
    } else {
      const publicContext = await browser.newContext();
      const publicPage = await publicContext.newPage();
      await capturePublic(publicPage, entries);
      await publicContext.close();
      writeIndex(entries);
    }

    const stamp = Date.now();
    const superEmail = `d16d.review.sa.${stamp}@example.invalid`;
    const hqEmail = `d16d.review.hq.${stamp}@example.invalid`;
    const superUser = await createUser(superEmail, "super_admin");
    const hqUser = await createUser(hqEmail, "media_admin");
    userIds.push(superUser.id, hqUser.id);
    adminClient = superUser.admin;
    const { data: programRow } = await adminClient
      .from("programs")
      .insert({
        title: "Review-only program",
        slug: `review-only-${stamp}`,
        short_description: "Screenshot review only. Not a public announcement.",
        status: "draft",
        placement: "none",
        created_by: superUser.id,
        updated_by: superUser.id,
      })
      .select("id")
      .single();
    reviewProgramId = programRow?.id ?? null;
    const { data: sermonRow } = await adminClient
      .from("sermons")
      .insert({
        title: "Review-only sermon",
        speaker: "Review speaker",
        status: "draft",
        created_by: superUser.id,
        updated_by: superUser.id,
      })
      .select("id")
      .single();
    reviewSermonId = sermonRow?.id ?? null;
    const superSecret = await enrollTotp(superEmail);
    const hqSecret = await enrollTotp(hqEmail);

    const authContext = await browser.newContext();
    const authPage = await authContext.newPage();
    await authPage.setViewportSize({ width: 390, height: 844 });
    await authPage.goto(`${BASE}/auth/sign-in`, { waitUntil: "domcontentloaded" });
    record(entries, {
      group: "hub",
      route: "/auth/sign-in",
      viewport: 390,
      state: "empty form",
      role: "logged-out",
      description: "Sign in — empty form",
      screenshot: await capture(authPage, "hub-sign-in-390.png"),
    });
    await authPage.setViewportSize({ width: 1280, height: 900 });
    await authPage.goto(`${BASE}/auth/sign-in`, { waitUntil: "domcontentloaded" });
    record(entries, {
      group: "hub",
      route: "/auth/sign-in",
      viewport: 1280,
      state: "empty form",
      role: "logged-out",
      description: "Sign in — empty form",
      screenshot: await capture(authPage, "hub-sign-in-1280.png"),
    });

    await signInToMfa(authPage, superEmail);
    await stripMfaSecrets(authPage);
    await authPage.setViewportSize({ width: 390, height: 844 });
    record(entries, {
      group: "hub",
      route: "/auth/mfa",
      viewport: 390,
      state: "challenge, QR/secret stripped",
      role: "logged-out pending MFA",
      description: "MFA — enter 6-digit app code (no QR/secret)",
      screenshot: await capture(authPage, "hub-mfa-390.png"),
    });
    await completeMfa(authPage, superSecret);
    await skipTour(authPage);

    for (const width of HUB_WIDTHS) {
      await captureHubScreen(authPage, entries, {
        route: "/admin",
        width,
        state: "dashboard",
        role: "Super Admin",
        description: "Dashboard — What would you like to update?",
        file: `hub-dashboard-super-${width}.png`,
      });
    }

    await captureHubScreen(authPage, entries, {
      route: "/admin/website/home",
      width: 1280,
      state: "current",
      role: "Super Admin",
      description: "Homepage editor — Current section",
      file: "hub-home-current-1280.png",
    });
    await captureHubScreen(authPage, entries, {
      route: "/admin/website/home",
      width: 1280,
      state: "change mode",
      role: "Super Admin",
      description: "Homepage editor — Change mode",
      file: "hub-home-change-1280.png",
      prepare: async (page) => {
        await page.getByRole("button", { name: "Change this section" }).first().click();
      },
    });
    await captureHubScreen(authPage, entries, {
      route: "/admin/website/about",
      width: 1280,
      state: "current",
      role: "Super Admin",
      description: "About editor — Current section",
      file: "hub-about-current-1280.png",
    });
    await captureHubScreen(authPage, entries, {
      route: "/admin/programs",
      width: 1280,
      state: "list",
      role: "Super Admin",
      description: "Programs list",
      file: "hub-programs-1280.png",
    });
    if (reviewProgramId) {
      await captureHubScreen(authPage, entries, {
        route: `/admin/programs/${reviewProgramId}`,
        width: 1280,
        state: "editor current",
        role: "Super Admin",
        description: "Program editor — Current vs change",
        file: "hub-program-editor-1280.png",
      });
    }

    await captureHubScreen(authPage, entries, {
      route: "/admin/sermons",
      width: 1280,
      state: "list",
      role: "Super Admin",
      description: "Sermons list",
      file: "hub-sermons-1280.png",
    });
    if (reviewSermonId) {
      await captureHubScreen(authPage, entries, {
        route: `/admin/sermons/${reviewSermonId}`,
        width: 1280,
        state: "editor current",
        role: "Super Admin",
        description: "Sermon editor — Current details",
        file: "hub-sermon-editor-current-1280.png",
      });
      await captureHubScreen(authPage, entries, {
        route: `/admin/sermons/${reviewSermonId}`,
        width: 1280,
        state: "change mode",
        role: "Super Admin",
        description: "Sermon editor — Change mode",
        file: "hub-sermon-editor-change-1280.png",
        prepare: async (page) => {
          await page.getByRole("button", { name: "Change these details" }).click();
        },
      });
    }

    await captureHubScreen(authPage, entries, {
      route: "/admin/branches",
      width: 1280,
      state: "list",
      role: "Super Admin",
      description: "Branches list",
      file: "hub-branches-1280.png",
    });
    await captureHubScreen(authPage, entries, {
      route: `/admin/branches/${ACCRA_BRANCH_ID}`,
      width: 1280,
      state: "current service times",
      role: "Super Admin",
      description: "Branch editor — Current service times",
      file: "hub-branch-editor-current-1280.png",
    });
    await captureHubScreen(authPage, entries, {
      route: `/admin/branches/${ACCRA_BRANCH_ID}`,
      width: 1280,
      state: "change mode",
      role: "Super Admin",
      description: "Branch editor — Change mode",
      file: "hub-branch-editor-change-1280.png",
      prepare: async (page) => {
        await page.getByRole("button", { name: "Change branch details" }).click();
      },
    });
    await captureHubScreen(authPage, entries, {
      route: "/admin/livestream",
      width: 1280,
      state: "not live or current status",
      role: "Super Admin",
      description: "Livestream — current public status",
      file: "hub-livestream-1280.png",
    });
    await captureHubScreen(authPage, entries, {
      route: "/admin/media",
      width: 1280,
      state: "library",
      role: "Super Admin",
      description: "Media Library / Photos",
      file: "hub-media-1280.png",
    });
    await authContext.close();

    const hqContext = await browser.newContext();
    const hqPage = await hqContext.newPage();
    await signInToMfa(hqPage, hqEmail);
    await stripMfaSecrets(hqPage);
    await completeMfa(hqPage, hqSecret);
    await skipTour(hqPage);
    await captureHubScreen(hqPage, entries, {
      route: "/admin",
      width: 1280,
      state: "dashboard",
      role: "HQ Content Admin",
      description: "Dashboard — HQ Content Admin",
      file: "hub-dashboard-hq-1280.png",
    });
    await hqContext.close();
    await browser.close();

    writeIndex(entries);
    writeFileSync(
      resolve(OUT, "README.txt"),
      [
        "KCMI D1.6D visual release candidate — review only.",
        `Origin: ${BASE}`,
        `Screenshots: ${entries.length}`,
        "Open INDEX.html. Do not bless Playwright visual baselines from this folder.",
        "",
      ].join("\n"),
    );
    console.log(`Wrote ${entries.length} captures to ${OUT}`);
  } finally {
    if (adminClient) {
      if (reviewProgramId) {
        try {
          await adminClient.from("programs").delete().eq("id", reviewProgramId);
        } catch {
          /* review-only row */
        }
      }
      if (reviewSermonId) {
        try {
          await adminClient.from("sermons").delete().eq("id", reviewSermonId);
        } catch {
          /* review-only row */
        }
      }
      for (const id of userIds) {
        try {
          await adminClient.auth.admin.deleteUser(id);
        } catch {
          /* synthetic user */
        }
      }
    }
    if (server) {
      server.kill("SIGTERM");
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
