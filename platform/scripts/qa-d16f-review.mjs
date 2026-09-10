/**
 * D1.6F focused review-only visual bundle from the local production build.
 * Writes platform/.qa-d16f-review/ (gitignored via .qa-*).
 * Does not update Playwright visual baselines.
 * Does not capture passwords, session tokens, API keys, or real MFA QR/secrets.
 *
 * Usage (from platform/, after `next build`):
 *   node scripts/qa-d16f-review.mjs
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
const OUT = resolve(ROOT, ".qa-d16f-review");
const SHOTS = resolve(OUT, "screenshots");
const PORT = process.env.QA_D16F_PORT || "3018";
const BASE = process.env.QA_D16F_BASE_URL || `http://127.0.0.1:${PORT}`;
const TEST_PASSWORD = "Local-Test-Only-Passw0rd!";
const ACCRA_BRANCH_ID = "a1000000-0000-4000-8000-000000000005";
const SYNTHETIC_FACEBOOK_URL = "https://www.facebook.com/watch/?v=123456789";

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
  if (process.env.QA_D16F_BASE_URL) return null;
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
    friendlyName: `d16f-review-${Date.now()}`,
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
      .or(page.getByRole("button", { name: "Open Hub menu" }))
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

async function captureHubScreen(page, entries, {
  route,
  width,
  state,
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
    role: "Super Admin",
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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KCMI D1.6F visual review (NOT APPROVED)</title>
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
    <h1>KCMI D1.6F visual review — not approved</h1>
    <p>Focused release-closure screenshots only. These files are gitignored and have not been blessed as visual baselines.</p>
    <p>No passwords, session tokens, API keys, or authenticator QR/secrets are included.</p>
    <p>Inventory: <strong>${entries.length}</strong> screenshots in <code>platform/.qa-d16f-review/</code></p>
  </header>
  <main class="wrap">
    <h2>Public</h2>
    <section class="route"><div class="row">${publicRows.map(card).join("")}</div></section>
    <h2>Hub</h2>
    <section class="route"><div class="row">${hubRows.map(card).join("")}</div></section>
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
  let livestreamBefore = null;
  try {
    await waitForServer(BASE, 90_000);
    const browser = await chromium.launch({ channel: "chrome" });
    const entries = [];

    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();
    for (const route of ["/about", "/sermons"]) {
      for (const width of [390, 1280]) {
        await publicPage.setViewportSize({
          width,
          height: width <= 390 ? 844 : 900,
        });
        await publicPage.goto(`${BASE}${route}`, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
        await publicPage.locator("footer.site-footer").waitFor({
          state: "visible",
          timeout: 30_000,
        }).catch(() => {});
        const name = route === "/about" ? "about" : "sermons";
        record(entries, {
          group: "public",
          route,
          viewport: width,
          state: "public logged-out",
          role: "logged-out",
          description: `Public ${route} at ${width}px`,
          screenshot: await capture(publicPage, `public-${name}-${width}.png`),
        });
      }
    }
    await publicContext.close();

    const stamp = Date.now();
    const superEmail = `d16f.review.sa.${stamp}@example.invalid`;
    const superUser = await createUser(superEmail, "super_admin");
    userIds.push(superUser.id);
    adminClient = superUser.admin;
    const { data: programRow } = await adminClient
      .from("programs")
      .insert({
        title: "Review-only program",
        slug: `review-only-d16f-${stamp}`,
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

    const { data: livestreamSnapshot } = await adminClient
      .from("livestream_settings")
      .select("facebook_url, is_live")
      .eq("singleton_key", "default")
      .maybeSingle();
    livestreamBefore = livestreamSnapshot;

    const authContext = await browser.newContext();
    const authPage = await authContext.newPage();
    await signInToMfa(authPage, superEmail);
    await completeMfa(authPage, superSecret);
    await skipTour(authPage);

    if (reviewProgramId) {
      await captureHubScreen(authPage, entries, {
        route: `/admin/programs/${reviewProgramId}`,
        width: 1280,
        state: "draft",
        description: "Program — Current draft actions",
        file: "hub-program-draft-1280.png",
      });
      await captureHubScreen(authPage, entries, {
        route: `/admin/programs/${reviewProgramId}`,
        width: 390,
        state: "draft",
        description: "Program — Current draft actions (mobile)",
        file: "hub-program-draft-390.png",
      });
      await adminClient
        .from("programs")
        .update({ status: "published", updated_by: superUser.id })
        .eq("id", reviewProgramId);
      await captureHubScreen(authPage, entries, {
        route: `/admin/programs/${reviewProgramId}`,
        width: 1280,
        state: "published",
        description: "Program — published actions (no draft lifecycle)",
        file: "hub-program-published-1280.png",
      });
      await captureHubScreen(authPage, entries, {
        route: `/admin/programs/${reviewProgramId}`,
        width: 390,
        state: "published",
        description: "Program — published actions (mobile)",
        file: "hub-program-published-390.png",
      });
    }

    if (reviewSermonId) {
      await captureHubScreen(authPage, entries, {
        route: `/admin/sermons/${reviewSermonId}`,
        width: 1280,
        state: "draft",
        description: "Sermon — Current draft actions",
        file: "hub-sermon-draft-1280.png",
      });
      await adminClient
        .from("sermons")
        .update({ status: "published", updated_by: superUser.id })
        .eq("id", reviewSermonId);
      await captureHubScreen(authPage, entries, {
        route: `/admin/sermons/${reviewSermonId}`,
        width: 1280,
        state: "published",
        description: "Sermon — published actions (no draft lifecycle)",
        file: "hub-sermon-published-1280.png",
      });
    }

    await adminClient
      .from("livestream_settings")
      .update({ is_live: false, facebook_url: null })
      .eq("singleton_key", "default");
    await captureHubScreen(authPage, entries, {
      route: "/admin/livestream",
      width: 1280,
      state: "not live",
      description: "Livestream — not live (Start only, no Turn off)",
      file: "hub-livestream-not-live-1280.png",
    });
    await captureHubScreen(authPage, entries, {
      route: "/admin/livestream",
      width: 390,
      state: "not live",
      description: "Livestream — not live (mobile)",
      file: "hub-livestream-not-live-390.png",
    });
    await adminClient
      .from("livestream_settings")
      .update({
        is_live: true,
        facebook_url: SYNTHETIC_FACEBOOK_URL,
      })
      .eq("singleton_key", "default");
    await captureHubScreen(authPage, entries, {
      route: "/admin/livestream",
      width: 1280,
      state: "live",
      description: "Livestream — live (Change / Turn off, not Make Livestream Live)",
      file: "hub-livestream-live-1280.png",
    });
    await captureHubScreen(authPage, entries, {
      route: "/admin/livestream",
      width: 390,
      state: "live",
      description: "Livestream — live (mobile)",
      file: "hub-livestream-live-390.png",
    });

    await captureHubScreen(authPage, entries, {
      route: "/admin/website/home",
      width: 1280,
      state: "homepage top banner preview",
      description: "Homepage Top Banner preview frame",
      file: "hub-home-preview-1280.png",
      prepare: async (page) => {
        await page.getByRole("button", { name: "Top Banner" }).click();
        await page.getByText("Currently on the website").first().waitFor();
        await page.getByRole("button", { name: "View larger preview" }).first().waitFor();
      },
    });
    await captureHubScreen(authPage, entries, {
      route: "/admin/website/home",
      width: 390,
      state: "homepage top banner preview",
      description: "Homepage Top Banner preview frame (mobile)",
      file: "hub-home-preview-390.png",
      prepare: async (page) => {
        await page.getByRole("button", { name: "Top Banner" }).click();
        await page.getByText("Currently on the website").first().waitFor();
      },
    });

    await captureHubScreen(authPage, entries, {
      route: `/admin/branches/${ACCRA_BRANCH_ID}`,
      width: 1280,
      state: "branch visit/contact preview",
      description: "Branch Visit/Contact preview frame",
      file: "hub-branch-preview-1280.png",
    });
    await captureHubScreen(authPage, entries, {
      route: `/admin/branches/${ACCRA_BRANCH_ID}`,
      width: 390,
      state: "branch visit/contact preview",
      description: "Branch Visit/Contact preview frame (mobile)",
      file: "hub-branch-preview-390.png",
    });

    await authContext.close();
    await browser.close();

    writeIndex(entries);
    writeFileSync(
      resolve(OUT, "README.txt"),
      [
        "KCMI D1.6F visual review — review only.",
        `Origin: ${BASE}`,
        `Screenshots: ${entries.length}`,
        "Open INDEX.html. Do not bless Playwright visual baselines from this folder.",
        "",
      ].join("\n"),
    );
    console.log(`Wrote ${entries.length} captures to ${OUT}`);
  } finally {
    if (adminClient) {
      if (livestreamBefore) {
        try {
          await adminClient
            .from("livestream_settings")
            .update({
              facebook_url: livestreamBefore.facebook_url ?? null,
              is_live: livestreamBefore.is_live ?? false,
            })
            .eq("singleton_key", "default");
        } catch {
          /* restore livestream */
        }
      }
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
