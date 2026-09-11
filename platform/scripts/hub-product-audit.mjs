/**
 * READ-ONLY Hub product / interaction audit harness.
 * Uses local production server + optional .auth/d17-review-user.json.
 * Does not publish, delete, or mutate hosted CMS (stops before mutating submits).
 *
 * Usage (from platform/):
 *   CAPTURE_BASE_URL=http://127.0.0.1:3017 node scripts/hub-product-audit.mjs
 */
import { spawn, spawnSync } from "node:child_process";
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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, ".qa-hub-product-audit");
const SHOTS = resolve(OUT, "screenshots");
const TRACES = resolve(OUT, "traces");
const AUTH = resolve(ROOT, ".auth/d17-review-user.json");
const FALLBACK_AUTH = resolve(ROOT, ".auth/user.json");
const ZIP = resolve(homedir(), "Downloads/kcmi-hub-product-audit.zip");
const BASE =
  process.env.CAPTURE_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:3017";
const PORT = new URL(BASE).port || "3017";

const ROUTES = [
  "/auth/sign-in",
  "/auth/mfa",
  "/admin",
  "/admin/website",
  "/admin/website/home",
  "/admin/website/about",
  "/admin/website/services",
  "/admin/website/sermons",
  "/admin/website/faqs",
  "/admin/website/global",
  "/admin/programs",
  "/admin/programs/new",
  "/admin/sermons",
  "/admin/sermons/new",
  "/admin/media",
  "/admin/branches",
  "/admin/livestream",
];

const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 800 },
  { name: "1920", width: 1920, height: 1080 },
  { name: "2560", width: 2560, height: 1440 },
];

/** @type {any} */
const results = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  authUsed: false,
  routes: [],
  controls: [],
  typographyViolations: [],
  navigationFindings: [],
  tour: { steps: [], issue: null },
  preview: [],
  a11y: [],
  scorecardHints: [],
  notes: [],
};

function ensureDirs() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(SHOTS, { recursive: true });
  mkdirSync(TRACES, { recursive: true });
}

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  /** @type {Record<string,string>} */
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    out[t.slice(0, i)] = t.slice(i + 1);
  }
  return out;
}

async function maybeStartServer() {
  // Default ON so the audit owns a stable server for the whole run.
  if (process.env.CAPTURE_START_SERVER === "0") return null;
  // If something already responds, reuse it.
  try {
    const res = await fetch(`${BASE}/auth/sign-in`);
    if (res.ok || res.status === 307 || res.status === 308) {
      console.log("Reusing existing server at", BASE);
      return null;
    }
  } catch {
    /* start below */
  }
  const review = {
    ...process.env,
    ...loadEnvFile(resolve(ROOT, ".env.d17-review.local")),
    ALLOW_QA_STRESS: "0",
    PORT,
  };
  console.log("Starting next start on", PORT);
  const child = spawn("npx", ["next", "start", "-H", "127.0.0.1", "-p", PORT], {
    cwd: ROOT,
    env: review,
    stdio: "ignore",
    detached: true,
  });
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE}/auth/sign-in`);
      if (res.ok || res.status === 307 || res.status === 308) {
        console.log("Server ready");
        return child;
      }
    } catch {
      /* wait */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  console.warn("Server did not become ready in time");
  return child;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} route
 */
async function inventoryControls(page, route) {
  const items = await page.evaluate((routePath) => {
    const actionable = Array.from(
      document.querySelectorAll(
        "a[href], button, input, select, textarea, summary, [role='button'], [role='menuitem'], [role='link']",
      ),
    );
    return actionable.map((el, index) => {
      const tag = el.tagName.toLowerCase();
      const type =
        tag === "input"
          ? `input:${el.getAttribute("type") || "text"}`
          : tag === "a"
            ? "link"
            : tag === "summary"
              ? "disclosure"
              : tag;
      const label = (
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
          ? el.labels?.[0]?.textContent
          : null) ||
        el.textContent ||
        ""
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120);
      const href = el instanceof HTMLAnchorElement ? el.getAttribute("href") : null;
      const disabled =
        el.hasAttribute("disabled") ||
        el.getAttribute("aria-disabled") === "true";
      const rect = el.getBoundingClientRect();
      return {
        route: routePath,
        index,
        type,
        label,
        href,
        disabled,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        visible: rect.width > 0 && rect.height > 0,
      };
    });
  }, route);
  results.controls.push(...items.filter((c) => c.visible || c.href));
  return items;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} route
 * @param {string} vp
 */
async function collectTypography(page, route, vp) {
  const rows = await page.evaluate(({ routePath, viewport }) => {
    const nodes = Array.from(
      document.querySelectorAll(
        "h1,h2,h3,h4,p,label,button,a,span,li,td,th,summary,legend,input,select,textarea",
      ),
    );
    /** @type {any[]} */
    const out = [];
    for (const el of nodes) {
      const style = window.getComputedStyle(el);
      const size = parseFloat(style.fontSize);
      if (!Number.isFinite(size)) continue;
      const text = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
      if (!text && el.tagName !== "INPUT" && el.tagName !== "SELECT") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      const tag = el.tagName.toLowerCase();
      const role =
        tag === "button" || el.getAttribute("role") === "button"
          ? "button"
          : tag === "label"
            ? "label"
            : tag === "a"
              ? "nav/link"
              : tag === "input" || tag === "textarea" || tag === "select"
                ? "field"
                : tag.startsWith("h")
                  ? "heading"
                  : "body/other";
      let floor = 16;
      if (
        el.classList.contains("hub-help") ||
        style.fontSize === "0.9375rem" ||
        /help|hint|recommended/i.test(text)
      ) {
        floor = 15;
      }
      if (
        /badge|status|KB ·|Live on website|Draft —|Step \d/i.test(text) ||
        (role === "body/other" && size <= 14.5 && text.length < 40)
      ) {
        floor = 14;
      }
      if (size + 0.01 < floor) {
        out.push({
          route: routePath,
          viewport: viewport,
          text,
          tag,
          role,
          computedPx: Math.round(size * 100) / 100,
          floor,
          selector: el.id
            ? `#${el.id}`
            : `${tag}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`,
        });
      }
    }
    return out;
  }, { routePath: route, viewport: vp });
  results.typographyViolations.push(...rows);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} route
 * @param {string} name
 */
async function shot(page, route, name) {
  const file = `${route.replace(/\//g, "_").replace(/^_/, "") || "root"}-${name}.png`;
  await page.screenshot({
    path: resolve(SHOTS, file),
    fullPage: true,
  });
  return file;
}

async function main() {
  ensureDirs();
  const server = await maybeStartServer();
  const authPath = existsSync(AUTH)
    ? AUTH
    : existsSync(FALLBACK_AUTH)
      ? FALLBACK_AUTH
      : null;
  results.authUsed = Boolean(authPath);
  if (!authPath) {
    results.notes.push(
      "No storageState found — Hub routes may redirect to sign-in. Typography on Auth still collected.",
    );
  }

  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext(
    authPath
      ? { storageState: authPath, viewport: { width: 1280, height: 800 } }
      : { viewport: { width: 1280, height: 800 } },
  );
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();

  for (const route of ROUTES) {
    /** @type {any} */
    const routeResult = {
      route,
      status: null,
      title: null,
      redirectedTo: null,
      controlCount: 0,
      backLinks: [],
      error: null,
      shots: [],
    };
    try {
      const res = await page.goto(`${BASE}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      routeResult.status = res?.status() ?? null;
      routeResult.redirectedTo =
        page.url() !== `${BASE}${route}` ? page.url() : null;
      routeResult.title = await page.title();
      const controls = await inventoryControls(page, route);
      routeResult.controlCount = controls.filter((c) => c.visible).length;
      routeResult.backLinks = controls.filter(
        (c) =>
          /back|return|←/i.test(c.label) ||
          (c.href && /\/admin(\/|$)/.test(c.href) && /back/i.test(c.label)),
      );
      if (routeResult.backLinks.length > 1) {
        results.navigationFindings.push({
          route,
          issue: "Multiple Back-style controls",
          labels: routeResult.backLinks.map((b) => b.label),
        });
      }
      // Safe click pass: non-mutating links within Hub only
      const safeLinks = controls.filter(
        (c) =>
          c.type === "link" &&
          c.href &&
          c.href.startsWith("/admin") &&
          !/sign.?out|remove|delete|archive|make.*live|publish/i.test(c.label),
      );
      for (const link of safeLinks.slice(0, 3)) {
        // inventory only — do not chase nested navigation loops
        void link;
      }
      if (
        route.includes("/admin") &&
        !routeResult.redirectedTo?.includes("/auth")
      ) {
        routeResult.shots.push(await shot(page, route, "1280"));
      }
    } catch (err) {
      routeResult.error = err instanceof Error ? err.message : String(err);
    }
    results.routes.push(routeResult);
  }

  // Typography sweep on key Hub screens
  const typoRoutes = [
    "/admin",
    "/admin/website/home",
    "/admin/programs",
    "/admin/programs/new",
    "/admin/media",
    "/admin/branches",
    "/admin/livestream",
  ];
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const route of typoRoutes) {
      try {
        await page.goto(`${BASE}${route}`, {
          waitUntil: "domcontentloaded",
          timeout: 45000,
        });
        if (page.url().includes("/auth/")) continue;
        await collectTypography(page, route, vp.name);
        if (vp.name === "390" || vp.name === "1280") {
          await shot(page, route, `typo-${vp.name}`);
        }
      } catch {
        /* skip */
      }
    }
  }

  // Preview frame evidence on homepage editor
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/admin/website/home`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    if (!page.url().includes("/auth/")) {
      const previewMeta = await page.evaluate(() => {
        const frames = Array.from(
          document.querySelectorAll('[aria-label]'),
        ).filter((el) =>
          /preview|Currently on the website|Preview only/i.test(
            el.textContent || "",
          ),
        );
        return frames.slice(0, 3).map((el) => {
          const rect = el.getBoundingClientRect();
          const text = (el.textContent || "").replace(/\s+/g, " ").slice(0, 100);
          const scaled = el.querySelector("[style*='scale']");
          return {
            text,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            hasScaleTransform: Boolean(scaled),
          };
        });
      });
      results.preview = previewMeta;
      await shot(page, "/admin/website/home", "preview-390");
    }
  } catch (err) {
    results.notes.push(
      `Preview audit skipped: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Tour step 5→6 reproduction (read-only)
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/admin`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    if (!page.url().includes("/auth/")) {
      await page.evaluate(() => {
        try {
          localStorage.removeItem("kcmi-hub-tour-v1-complete");
          sessionStorage.setItem("kcmi-hub-tour-v1-active", "true");
          sessionStorage.setItem("kcmi-hub-tour-v1-step", "4");
        } catch {
          /* ignore */
        }
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      const before = await page.evaluate(() => ({
        stepText: document.querySelector('[role="dialog"] h2')?.textContent,
        menuOpen: Boolean(document.querySelector("dialog.hub-nav-dialog[open]")),
        nextDisabled: false,
      }));
      // Advance to step 6 (index 5) via Next if present
      const next = page.getByRole("button", { name: /^Next$/i });
      if (await next.count()) {
        await next.click();
        await page.waitForTimeout(1500);
      }
      const after = await page.evaluate(() => ({
        url: location.pathname,
        stepText: document.querySelector('[role="dialog"] h2')?.textContent,
        looking: Boolean(
          Array.from(document.querySelectorAll("p")).some((p) =>
            /Looking for this control/i.test(p.textContent || ""),
          ),
        ),
        menuOpen: Boolean(document.querySelector("dialog.hub-nav-dialog[open]")),
        tourButtons: Array.from(
          document.querySelectorAll('[role="dialog"] button'),
        ).map((b) => (b.textContent || "").trim()),
      }));
      results.tour = {
        steps: [
          "Welcome prompt",
          ...[
            "Homepage",
            "Programs",
            "Branches",
            "Livestream",
            "Help & Tutorial",
            "Homepage sections",
            "Top of Homepage",
            "Choose Words",
            "Change this section",
            "Preview my changes",
            "Make this live",
          ],
        ],
        beforeStep5: before,
        afterNextFromStep5: after,
        issue:
          after.menuOpen
            ? "Mobile menu dialog remains open after Help step when advancing to Homepage editor — modal can block interaction."
            : after.looking
              ? "Target not found after cross-route navigation (Looking for this control…)."
              : "No hard failure observed in this automated pass; verify headed.",
      };
      await shot(page, "/admin-tour", "step5-to-6");
    }
  } catch (err) {
    results.tour.issue =
      err instanceof Error ? err.message : String(err);
  }

  // Touch target undersize sample
  results.a11y = results.controls
    .filter(
      (c) =>
        c.visible &&
        (c.type === "button" || c.type === "link") &&
        (c.height < 44 || c.width < 44) &&
        c.height > 0,
    )
    .slice(0, 80)
    .map((c) => ({
      route: c.route,
      label: c.label,
      type: c.type,
      height: c.height,
      width: c.width,
      note: "Below preferred ~44px touch target",
    }));

  await context.tracing.stop({
    path: resolve(TRACES, "hub-product-audit.zip"),
  });
  await browser.close();
  if (server) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      try {
        server.kill("SIGTERM");
      } catch {
        /* ignore */
      }
    }
  }

  // Deduplicate typography
  const seen = new Set();
  results.typographyViolations = results.typographyViolations.filter((v) => {
    const key = `${v.route}|${v.viewport}|${v.computedPx}|${v.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  writeFileSync(resolve(OUT, "audit-results.json"), JSON.stringify(results, null, 2));

  const { readdirSync } = await import("node:fs");
  const severe = results.typographyViolations.filter((v) => v.computedPx < 14);
  const shotFiles = readdirSync(SHOTS);
  const figures = shotFiles
    .map(
      (f) =>
        `<figure><figcaption>${f}</figcaption><a href="screenshots/${f}"><img src="screenshots/${f}" alt="${f}"></a></figure>`,
    )
    .join("\n");
  const htmlFinal = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>KCMI Hub Product Audit</title>
<style>
body{font-family:system-ui,sans-serif;margin:1.5rem;background:#f4f1f5;color:#141216;line-height:1.45}
.grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
figure{margin:0;background:#fff;border:1px solid #d4dde0;border-radius:12px;overflow:hidden}
figcaption{padding:.75rem 1rem;font-size:.9rem}
img{display:block;width:100%;height:auto}
table{border-collapse:collapse;width:100%;background:#fff}
td,th{border:1px solid #d4dde0;padding:.4rem .6rem;font-size:.85rem;text-align:left}
</style></head><body>
<h1>KCMI Hub Product Audit</h1>
<p>READ-ONLY evidence. Auth/session excluded from ZIP. Generated ${results.generatedAt}</p>
<p>Routes probed: ${results.routes.length}. Controls inventoried: ${results.controls.length}. Typography violations: ${results.typographyViolations.length} (severe &lt;14px: ${severe.length}).</p>
<p><strong>Tour issue:</strong> ${results.tour.issue || "n/a"}</p>
<h2>Route statuses</h2>
<table><tr><th>Route</th><th>Status</th><th>Controls</th><th>Redirect</th><th>Error</th></tr>
${results.routes
  .map(
    (r) =>
      `<tr><td>${r.route}</td><td>${r.status}</td><td>${r.controlCount}</td><td>${r.redirectedTo || ""}</td><td>${r.error || ""}</td></tr>`,
  )
  .join("")}
</table>
<h2>Problem screenshots</h2>
<div class="grid">${figures}</div>
</body></html>`;
  writeFileSync(resolve(OUT, "INDEX.html"), htmlFinal);

  if (existsSync(ZIP)) rmSync(ZIP);
  spawnSync(
    "zip",
    ["-r", ZIP, ".", "-x", "*.auth*", "*user.json*", "*d17-review-user.json*"],
    { cwd: OUT, stdio: "inherit" },
  );
  console.log(
    JSON.stringify(
      {
        out: OUT,
        zip: ZIP,
        routes: results.routes.length,
        controls: results.controls.length,
        typography: results.typographyViolations.length,
        tourIssue: results.tour.issue,
        authUsed: results.authUsed,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
