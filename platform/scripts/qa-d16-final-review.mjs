/**
 * D1.6 final Hub preview screenshots.
 *
 * Prefers authenticated Hub capture when local Auth is healthy.
 * Falls back to ALLOW_QA_STRESS=1 /qa/hub-preview harness (no Auth) when Auth
 * cannot create/sign-in a synthetic user.
 *
 * Writes platform/.qa-d16-final/ (gitignored). Does not bless visual baselines.
 *
 * Usage (from platform/, after `next build`):
 *   node scripts/qa-d16-final-review.mjs
 *   QA_D16_FINAL_BASE_URL=http://127.0.0.1:PORT node scripts/qa-d16-final-review.mjs
 *   QA_D16_FINAL_FORCE_FALLBACK=1 ...  # skip Auth path
 */
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { TOTP } from "otpauth";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, ".qa-d16-final");
const SHOTS = resolve(OUT, "screenshots");
const PORT = process.env.QA_D16_FINAL_PORT || "3021";
const BASE = process.env.QA_D16_FINAL_BASE_URL || `http://127.0.0.1:${PORT}`;
const TEST_PASSWORD = "Local-Test-Only-Passw0rd!";
const ACCRA_BRANCH_ID = "a1000000-0000-4000-8000-000000000005";
const FORCE_FALLBACK = process.env.QA_D16_FINAL_FORCE_FALLBACK === "1";

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
  if (process.env.QA_D16_FINAL_BASE_URL) return null;
  const child = spawn("npx", ["next", "start", "-p", PORT], {
    cwd: ROOT,
    env: { ...process.env, ALLOW_QA_STRESS: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  return child;
}

async function capture(page, file) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({
    path: resolve(SHOTS, file),
    fullPage: true,
    animations: "disabled",
  });
  return `screenshots/${file}`;
}

async function probeAuth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !secret || !publishable) {
    return { ok: false, reason: "Missing local Supabase env" };
  }
  try {
    const health = await fetch(`${url}/auth/v1/health`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!health.ok) {
      return { ok: false, reason: `Auth health HTTP ${health.status}` };
    }
  } catch (err) {
    return {
      ok: false,
      reason: `Auth health unreachable (${err instanceof Error ? err.message : err})`,
    };
  }

  const admin = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `d16.final.probe.${Date.now()}@example.invalid`;
  try {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) {
      return {
        ok: false,
        reason: `createUser failed: ${error?.message ?? "unknown"}`,
        class: /timed out|timeout/i.test(error?.message ?? "")
          ? "auth-service"
          : "auth-service",
      };
    }
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: true, admin, reason: "create/dispose synthetic user succeeded" };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
      class: "auth-service",
    };
  }
}

async function createUser(admin, email, roleName) {
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
  const { data: role } = await admin
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single();
  if (!role) throw new Error(`Role missing: ${roleName}`);
  await admin.from("user_roles").upsert({ user_id: data.user.id, role_id: role.id });
  await new Promise((r) => setTimeout(r, 1500));
  return { id: data.user.id, email };
}

async function enrollTotp(email) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
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
    friendlyName: `d16-final-${Date.now()}`,
  });
  if (enrollErr || !enrolled?.totp?.secret) {
    throw enrollErr ?? new Error("Authenticator enroll failed");
  }
  const secret = enrolled.totp.secret;
  const totp = new TOTP({ secret, digits: 6, period: 30 });
  const { data: challenge, error: challengeErr } = await client.auth.mfa.challenge({
    factorId: enrolled.id,
  });
  if (challengeErr || !challenge) {
    throw challengeErr ?? new Error("Authenticator challenge failed");
  }
  const { error: verifyErr } = await client.auth.mfa.verify({
    factorId: enrolled.id,
    challengeId: challenge.id,
    code: totp.generate(),
  });
  if (verifyErr) throw verifyErr;
  await client.auth.signOut();
  return secret;
}

async function completeMfa(page, secret) {
  await page.locator("#code").waitFor({ timeout: 20_000 });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const totp = new TOTP({ secret, digits: 6, period: 30 });
    await page.locator("#code").fill(totp.generate());
    await page.getByRole("button", { name: "Continue to the Hub" }).click();
    const reached = await page
      .getByRole("navigation", { name: "Hub" })
      .or(page.getByRole("button", { name: "Open Hub menu" }))
      .waitFor({ timeout: 12_000 })
      .then(() => true)
      .catch(() => false);
    if (reached) return;
  }
  throw new Error("Authenticator code did not open the Hub");
}

async function skipTour(page) {
  const skip = page.getByRole("button", { name: "Skip tour" });
  if (await skip.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await skip.click();
  }
}

function writeIndex(entries, mode, authNote) {
  const card = (item) => `<figure class="cell">
    <a href="${escapeHtml(item.screenshot)}" target="_blank" rel="noopener">
      <img src="${escapeHtml(item.screenshot)}" alt="${escapeHtml(item.description)}">
    </a>
    <figcaption>
      <strong>${escapeHtml(item.route)}</strong>
      <span>${escapeHtml(String(item.viewport))}px</span>
      <span>${escapeHtml(item.description)}</span>
      <code>${escapeHtml(item.state)}</code>
    </figcaption>
  </figure>`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>KCMI D1.6 final preview (NOT APPROVED)</title>
  <style>
    body{font-family:system-ui,sans-serif;margin:0;background:#f4f1f5;color:#1c1720}
    header{padding:1rem 1.25rem;background:#f6e8f2;border-bottom:3px solid #7c1963}
    .wrap{padding:1.25rem;max-width:1100px;margin:auto}
    .row{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem}
    .cell{margin:0;border:1px solid #d8d0dc;border-radius:8px;overflow:hidden;background:#fff}
    .cell img{display:block;width:100%;height:280px;object-fit:contain;background:#ece8ef}
    figcaption{display:grid;gap:.2rem;padding:.65rem;font-size:.85rem}
    code{font-size:.72rem;color:#5c5663;word-break:break-all}
  </style>
</head>
<body>
  <header>
    <h1>KCMI D1.6 final Hub preview — not approved</h1>
    <p>Mode: <strong>${escapeHtml(mode)}</strong>. ${escapeHtml(authNote)}</p>
    <p>Do not bless Playwright visual baselines from this folder.</p>
  </header>
  <main class="wrap"><div class="row">${entries.map(card).join("")}</div></main>
</body>
</html>`;
  writeFileSync(resolve(OUT, "INDEX.html"), html);
  writeFileSync(resolve(OUT, "metadata.json"), JSON.stringify({ mode, authNote, entries }, null, 2));
  writeFileSync(
    resolve(OUT, "README.txt"),
    [
      "KCMI D1.6 final Hub preview — review only.",
      `Mode: ${mode}`,
      authNote,
      `Screenshots: ${entries.length}`,
      "Open INDEX.html. Do not bless visual baselines.",
      "",
    ].join("\n"),
  );
}

async function captureFallback(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const entries = [];
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
    await page.goto(`${BASE}/qa/hub-preview`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.getByRole("heading", { name: "Hub preview harness" }).waitFor();
    await expectNoScrollCopy(page);
    const banner = page.getByRole("region", {
      name: "Homepage Top Banner",
      exact: true,
    });
    await banner.getByRole("button", { name: "View full-size preview" }).waitFor();
    await page.evaluate(() => window.scrollTo(0, 0));
    // Clip to the home preview card for cleaner review shots
    await banner.screenshot({
      path: resolve(SHOTS, width === 390 ? "hub-home-preview-390.png" : "hub-home-preview-1280.png"),
      animations: "disabled",
    });
    entries.push({
      group: "qa-fallback",
      route: "/qa/hub-preview#home",
      viewport: width,
      state: "ALLOW_QA_STRESS harness",
      description: `Homepage Top Banner preview @ ${width}px (QA harness)`,
      screenshot: `screenshots/${width === 390 ? "hub-home-preview-390.png" : "hub-home-preview-1280.png"}`,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/qa/hub-preview`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const branch = page.getByRole("region", { name: "Branch page", exact: true });
  await branch.scrollIntoViewIfNeeded();
  await branch.getByRole("button", { name: "View full-size preview" }).waitFor();
  await expectNoScrollCopy(page);
  // Focus/keyboard check on View full-size preview
  await branch.getByRole("button", { name: "View full-size preview" }).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await branch.screenshot({
    path: resolve(SHOTS, "hub-branch-preview-390.png"),
    animations: "disabled",
  });
  entries.push({
    group: "qa-fallback",
    route: "/qa/hub-preview#branch",
    viewport: 390,
    state: "ALLOW_QA_STRESS harness",
    description: "Branch Visit/Contact preview @ 390px (QA harness)",
    screenshot: "screenshots/hub-branch-preview-390.png",
  });
  await context.close();
  return entries;
}

async function expectNoScrollCopy(page) {
  const text = await page.locator("body").innerText();
  if (/Scroll sideways/i.test(text)) {
    throw new Error("Found forbidden 'Scroll sideways' copy in preview");
  }
}

async function captureAuthenticated(browser, admin) {
  const stamp = Date.now();
  const email = `d16.final.sa.${stamp}@example.invalid`;
  const user = await createUser(admin, email, "super_admin");
  const secret = await enrollTotp(email);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/auth/sign-in`, { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  await page.getByRole("heading", { name: "Add extra protection" }).waitFor({
    timeout: 25_000,
  });
  await completeMfa(page, secret);
  await skipTour(page);

  const entries = [];
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
    await page.goto(`${BASE}/admin/website/home`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await skipTour(page);
    await page.getByRole("button", { name: "Top Banner" }).click();
    const banner = page.getByRole("region", { name: "Homepage Top Banner" });
    await banner.waitFor();
    await expectNoScrollCopy(page);
    await banner.getByRole("button", { name: "View full-size preview" }).waitFor();
    entries.push({
      group: "hub",
      route: "/admin/website/home",
      viewport: width,
      state: "authenticated Hub",
      description: `Homepage Top Banner preview @ ${width}px`,
      screenshot: await capture(
        page,
        width === 390 ? "hub-home-preview-390.png" : "hub-home-preview-1280.png",
      ),
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/admin/branches/${ACCRA_BRANCH_ID}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await skipTour(page);
  const branch = page.getByRole("region", { name: "Branch page" });
  await branch.waitFor();
  await expectNoScrollCopy(page);
  await branch.getByRole("button", { name: "View full-size preview" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("dialog").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  entries.push({
    group: "hub",
    route: `/admin/branches/${ACCRA_BRANCH_ID}`,
    viewport: 390,
    state: "authenticated Hub",
    description: "Branch Visit/Contact preview @ 390px",
    screenshot: await capture(page, "hub-branch-preview-390.png"),
  });
  await context.close();
  try {
    await admin.auth.admin.deleteUser(user.id);
  } catch {
    /* synthetic */
  }
  return entries;
}

async function main() {
  if (!existsSync(resolve(ROOT, ".next"))) {
    throw new Error("No production build found. Run `npm run build` in platform/ first.");
  }
  loadLocalEnv();
  mkdirSync(SHOTS, { recursive: true });
  const server = startServer();
  try {
    await waitForServer(BASE, 90_000);
    const browser = await chromium.launch({ channel: "chrome" });
    let mode = "qa-fallback";
    let authNote = "";
    let entries;

    if (FORCE_FALLBACK) {
      authNote = "Forced QA harness fallback (QA_D16_FINAL_FORCE_FALLBACK=1).";
      entries = await captureFallback(browser);
    } else {
      const probe = await probeAuth();
      if (probe.ok) {
        try {
          entries = await captureAuthenticated(browser, probe.admin);
          mode = "authenticated-hub";
          authNote = probe.reason;
        } catch (err) {
          authNote = `Auth probe OK but Hub capture failed (${err instanceof Error ? err.message : err}); used QA harness fallback. Class: B/C harness or app Auth path.`;
          entries = await captureFallback(browser);
          mode = "qa-fallback";
        }
      } else {
        authNote = `Auth recovery insufficient (${probe.reason}). Class: A Auth service unhealthy. Used QA harness fallback.`;
        entries = await captureFallback(browser);
      }
    }

    writeIndex(entries, mode, authNote);
    await browser.close();
    console.log(JSON.stringify({ out: OUT, mode, authNote, count: entries.length }));
  } finally {
    if (server) server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
