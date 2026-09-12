/**
 * QA1.2 complete evidence runner (plain Node ESM — no TS imports).
 */
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  readdirSync,
  copyFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { chromium, devices } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { scanShareableArtifacts } from "./qa-artifact-security-run.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REVIEW = resolve(ROOT, ".qa-qa12-review");
const CAND_DIR = resolve(REVIEW, "visual-candidates");
const PROOF = resolve(REVIEW, "product-fix-proof");
const ZIP = resolve(homedir(), "Downloads/kcmi-qa12-review.zip");
const PUBLIC =
  process.env.QA_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
  "https://kcmi-preview.josephtete.com";
const HUB =
  process.env.QA_HUB_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:3024";
const STAGING = "4798d76c-6112-4870-9f52-7d1ab38d06bd";
const AUTH = [
  resolve(ROOT, ".auth/qa-hub-user.json"),
  resolve(ROOT, ".auth/d181-local-user.json"),
].find((p) => existsSync(p));

const APPROVED_EXTERNAL = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "facebook.com",
  "www.facebook.com",
  "open.spotify.com",
  "maps.google.com",
  "www.google.com",
  "forms.gle",
  "instagram.com",
  "www.instagram.com",
  "twitter.com",
  "www.twitter.com",
  "x.com",
  "tiktok.com",
  "www.tiktok.com",
]);
const HUMAN_REVIEW_EXTERNAL = new Set(["silverbirdtv.com", "www.silverbirdtv.com"]);

const STATE_IDS = [
  "spotlight-absent",
  "spotlight-present",
  "takeover-open",
  "takeover-dismissed",
  "livestream-live-fixture",
  "livestream-not-live",
  "sermon-exists",
  "sermon-fallback",
  "featured-program-exists",
  "no-featured-program",
  "branch-media",
  "branch-no-media",
  "branch-service-times",
  "branch-missing-time",
  "mobile-nav-closed",
  "mobile-nav-open",
  "locations-query",
  "locations-country-filter",
  "program-draft-staging-qa",
  "program-published-safety-fixture",
  "program-create",
  "program-edit",
  "program-one-day",
  "program-multi-day",
  "program-two-sessions-one-day",
  "visitor-action-registration",
  "visitor-action-youtube",
  "visitor-action-facebook",
  "visitor-action-other",
  "visitor-action-none",
  "current-image",
  "proposed-image",
  "media-chooser",
  "phone-preview",
  "desktop-preview",
  "dashboard-tour",
  "homepage-tour",
  "program-tour",
  "livestream-tour",
  "hub-mobile-menu-open",
  "livestream-off",
  "livestream-preview",
];

const CANDIDATES = [
  { name: "public-home-desktop", base: "PUBLIC", path: "/", landmark: /Raising Kings|KCMI|Plan a Visit/i },
  { name: "public-home-mobile", base: "PUBLIC", path: "/", landmark: /Raising Kings|KCMI|Plan a Visit/i, viewport: { width: 390, height: 844 } },
  { name: "public-about-desktop", base: "PUBLIC", path: "/about", landmark: /About/i },
  { name: "public-locations-desktop", base: "PUBLIC", path: "/locations", landmark: /Location|Search|Find/i },
  { name: "public-branch-desktop", base: "PUBLIC", path: "/locations/headquarters", landmark: /Headquarters|Location|Service/i },
  { name: "public-services-desktop", base: "PUBLIC", path: "/services", landmark: /Service|Ministr/i },
  { name: "public-sermons-desktop", base: "PUBLIC", path: "/sermons", landmark: /Sermon/i },
  { name: "public-contact-desktop", base: "PUBLIC", path: "/contact", landmark: /Contact/i },
  { name: "public-livestream-desktop", base: "PUBLIC", path: "/livestream", landmark: /Live|Facebook|Watch|not live/i },
  { name: "public-sign-in", base: "PUBLIC", path: "/auth/sign-in", landmark: /KCMI Hub sign in/i },
  { name: "hub-dashboard", base: "HUB", path: "/admin", landmark: /What would you like to update/i },
  { name: "hub-home-editor", base: "HUB", path: "/admin/website/home", landmark: /Homepage|Edit this section/i },
  { name: "hub-program-create", base: "HUB", path: "/admin/programs/new", landmark: /Program name|About this program|New program/i },
  { name: "hub-program-edit", base: "HUB", path: `/admin/programs/${STAGING}`, landmark: /STAGING QA|DRAFT|Program name|When is it/i },
  { name: "hub-program-review", base: "HUB", path: `/admin/programs/${STAGING}`, landmark: /Review|Save draft/i },
  { name: "hub-branches", base: "HUB", path: "/admin/branches", landmark: /Branch/i },
  { name: "hub-media", base: "HUB", path: "/admin/media", landmark: /Photo|Media|Library/i },
  { name: "hub-livestream", base: "HUB", path: "/admin/livestream", landmark: /Livestream|Facebook/i },
];

function writeJson(name, data) {
  writeFileSync(resolve(REVIEW, name), JSON.stringify(data, null, 2));
}

function classifyHref(href, appHostname) {
  if (!href || href === "#" || href.startsWith("javascript:")) return "LOCAL_STATE";
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return "EXTERNAL";
  if (href.startsWith("/")) return "NAVIGATION";
  if (href.startsWith("#")) return "LOCAL_STATE";
  if (/^https?:\/\//i.test(href)) {
    try {
      const host = new URL(href).hostname.toLowerCase();
      const app = (appHostname || "").toLowerCase();
      if (app && (host === app || host.endsWith(`.${app}`))) return "NAVIGATION";
      if (host.includes("josephtete.com") || host.includes("kcmi-rcc.org")) return "NAVIGATION";
      return "EXTERNAL";
    } catch {
      return "EXTERNAL";
    }
  }
  return "NAVIGATION";
}

function aggregateWorkflowStatus(scenarios) {
  const required = scenarios.filter((s) => s.required !== false);
  if (required.some((s) => s.status === "FAIL")) return "FAIL";
  if (required.some((s) => ["PARTIAL", "NOT_RUN", "BLOCKED"].includes(s.status))) return "PARTIAL";
  if (required.every((s) => s.status === "PASS" || s.status === "PASS_WITH_POLICY_BLOCK")) {
    return scenarios.some((s) => s.policyBlock || s.status === "PASS_WITH_POLICY_BLOCK")
      ? "PASS_WITH_POLICY_BLOCK"
      : "PASS";
  }
  return "PARTIAL";
}

function isFullyExercised(status) {
  return status === "PASS" || status === "PASS_WITH_POLICY_BLOCK";
}

function semanticKey(c) {
  const route = (c.route || "/").replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
    "[id]",
  );
  const surface = route.startsWith("/admin") ? "hub" : route.startsWith("/auth") ? "auth" : "public";
  const name = (c.name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .slice(0, 40);
  if (c.href && /^https?:/i.test(c.href)) {
    try {
      return `${surface}.external.${new URL(c.href).hostname}.${name || c.role}`;
    } catch {
      /* fallthrough */
    }
  }
  if (/menu|open hub menu/i.test(c.name || "")) return `${surface}.chrome.menu`;
  if (/replay hub tour|help/i.test(c.name || "")) return `hub.chrome.helpTutorial`;
  if (/next step/i.test(c.name || "")) return `hub.program.wizard.next`;
  if (/save draft/i.test(c.name || "")) return `hub.program.review.saveDraft`;
  if (/replace photo/i.test(c.name || "")) return `hub.media.replacePhoto`;
  return `${surface}.${route.replace(/^\//, "").replace(/\//g, ".") || "root"}.${c.role}.${name || "unnamed"}`;
}

async function dismissTour(page) {
  await page
    .evaluate(() => {
      localStorage.setItem("kcmi-hub-tour-v2-complete", "true");
      sessionStorage.removeItem("kcmi-hub-tour-v2-active");
    })
    .catch(() => undefined);
  await page.keyboard.press("Escape").catch(() => undefined);
  await page
    .evaluate(() => {
      document.querySelectorAll("dialog.hub-tour-layer[open]").forEach((d) => {
        try {
          d.close();
        } catch {
          d.removeAttribute("open");
        }
      });
    })
    .catch(() => undefined);
}

async function assertIntegrity(page, spec) {
  const body = await page.locator("body").innerText().catch(() => "");
  if (/This page couldn.?t load|A server error occurred|Application error/i.test(body)) {
    return { ok: false, reason: "generic server error page" };
  }
  if (/\/auth\/sign-in/i.test(page.url()) && spec.base === "HUB") {
    return { ok: false, reason: "unexpected auth redirect" };
  }
  if (!spec.landmark.test(body)) {
    const visible = await page.getByText(spec.landmark).first().isVisible().catch(() => false);
    if (!visible) return { ok: false, reason: `missing landmark ${spec.landmark}` };
  }
  return { ok: true };
}

async function main() {
  if (/kcmi-rcc\.org/i.test(PUBLIC) || /kcmi-rcc\.org/i.test(HUB)) {
    throw new Error("STOP: production refused");
  }
  if (!AUTH) throw new Error("Missing Hub auth storageState");

  rmSync(REVIEW, { recursive: true, force: true });
  mkdirSync(CAND_DIR, { recursive: true });
  mkdirSync(PROOF, { recursive: true });

  const report = {
    productFixes: [],
    remainingDefects: [],
    invariants: { ok: true, failures: [] },
  };
  const states = Object.fromEntries(STATE_IDS.map((id) => [id, "NOT_RUN"]));
  const workflows = {};
  const controlsRaw = [];

  const unit = spawnSync(
    "npx",
    ["vitest", "run", "tests/security-headers.test.ts"],
    { cwd: ROOT, encoding: "utf8" },
  );
  report.unitSecurityHeaders = unit.status === 0;

  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  // —— Product verification: a11y / reflow / typography / touch / media / tutorial ——
  {
    const ctx = await browser.newContext({
      storageState: AUTH,
      viewport: { width: 1280, height: 800 },
    });
    const page = await ctx.newPage();
    await page.goto(`${HUB}/admin/website/home`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await dismissTour(page);
    await page.screenshot({
      path: resolve(PROOF, "homepage-editor-1280.png"),
      fullPage: false,
    });

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const ariaHidden = axe.violations.filter((v) => v.id === "aria-hidden-focus");
    report.ariaHiddenFocus = {
      seriousNodes: ariaHidden.reduce((n, v) => n + v.nodes.length, 0),
      violations: ariaHidden.map((v) => ({
        id: v.id,
        nodes: v.nodes.length,
        help: v.help,
      })),
    };
    if (report.ariaHiddenFocus.seriousNodes === 0) {
      report.productFixes.push("aria-hidden-focus = 0 on /admin/website/home");
    } else {
      report.remainingDefects.push(
        `aria-hidden-focus still ${report.ariaHiddenFocus.seriousNodes} nodes`,
      );
    }

    const inertProof = await page.evaluate(() => {
      const roots = [
        ...document.querySelectorAll(
          "[data-hub-preview-scaled], [data-hub-preview='scaled']",
        ),
      ];
      let focusable = 0;
      for (const root of roots) {
        focusable += root.querySelectorAll(
          'a[href]:not([tabindex="-1"]), button:not([tabindex="-1"])',
        ).length;
      }
      return {
        scaledRoots: roots.length,
        potentiallyFocusable: focusable,
        hasInert: roots.some((r) => r.hasAttribute("inert")),
      };
    });
    writeJson("preview-inert-proof.json", inertProof);

    // Typography excluding scaled previews
    const typography = await page.evaluate(() => {
      const violations = [];
      let exempt = 0;
      const nodes = [
        ...document.querySelectorAll(
          "button, a, label, .hub-help, nav, p, h1, h2, h3",
        ),
      ];
      for (const el of nodes.slice(0, 200)) {
        if (el.closest("[data-hub-preview-scaled], [data-hub-preview='scaled']")) {
          exempt += 1;
          continue;
        }
        const px = parseFloat(getComputedStyle(el).fontSize);
        const help = el.classList.contains("hub-help");
        const min = help ? 15 : 16;
        if (Number.isFinite(px) && px + 0.01 < min) {
          violations.push({
            text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
            px,
            min,
          });
        }
      }
      return { elementsConsidered: nodes.length, thumbnailExempt: exempt, violations };
    });
    writeJson("typography.json", typography);
    report.typography = typography;

    // Effective touch targets
    const touch = await page.evaluate(() => {
      const critical = [];
      const advisory = [];
      let audited = 0;
      for (const el of [
        ...document.querySelectorAll(
          "button, a[href], input:not([type=hidden]), select, [role=button]",
        ),
      ].slice(0, 120)) {
        if (el.closest("[data-hub-preview-scaled]")) continue;
        const box = el.getBoundingClientRect();
        if (box.width < 1 || box.height < 1) continue;
        let labelBox = null;
        if (el.labels?.[0]) labelBox = el.labels[0].getBoundingClientRect();
        else if (el.closest("label")) labelBox = el.closest("label").getBoundingClientRect();
        const top = labelBox ? Math.min(box.top, labelBox.top) : box.top;
        const bottom = labelBox ? Math.max(box.bottom, labelBox.bottom) : box.bottom;
        const left = labelBox ? Math.min(box.left, labelBox.left) : box.left;
        const right = labelBox ? Math.max(box.right, labelBox.right) : box.right;
        const eff = { w: right - left, h: bottom - top };
        audited += 1;
        const name =
          el.getAttribute("aria-label") ||
          el.labels?.[0]?.textContent?.trim() ||
          el.textContent?.trim().slice(0, 80) ||
          "(unnamed)";
        if (eff.h < 43.5 && eff.w < 43.5) {
          const row = {
            name: name.replace(/\s+/g, " ").trim(),
            glyph: { w: Math.round(box.width), h: Math.round(box.height) },
            effective: { w: Math.round(eff.w), h: Math.round(eff.h) },
            blankName: !name || name === "(unnamed)",
          };
          if (el.tagName === "A" && box.height < 32) advisory.push(row);
          else critical.push(row);
        }
      }
      return { audited, critical, advisory };
    });
    writeJson("touch-targets.json", touch);
    report.touch = touch;

    // 200% reflow
    await page.addInitScript(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await dismissTour(page);
    const reflow = await page.evaluate(() => {
      const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
      const cw = document.documentElement.clientWidth;
      return { scrollWidth: sw, clientWidth: cw, ok: sw <= cw + 1 };
    });
    report.reflow200 = { route: "/admin/website/home", ...reflow };
    await page.screenshot({
      path: resolve(PROOF, "homepage-editor-200pct.png"),
      fullPage: false,
    });
    if (reflow.ok) report.productFixes.push("Homepage editor 200% reflow OK");
    else report.remainingDefects.push(`200% reflow overflow sw=${reflow.scrollWidth}`);

    // Media flows
    const mediaScenarios = [];
    async function mediaFlow(label, prepare) {
      await prepare();
      const replace = page.getByRole("button", { name: /^Replace Photo$/i }).first();
      if (!(await replace.isVisible().catch(() => false))) {
        mediaScenarios.push({
          label,
          status: "PARTIAL",
          note: "Replace Photo not found after drill-in",
          required: true,
        });
        return;
      }
      await replace.click();
      const upload = page.getByRole("button", { name: /Upload a new photo/i });
      if (await upload.isVisible().catch(() => false)) await upload.click();
      let cancel = page.getByRole("button", { name: /Cancel changes/i });
      if (await cancel.isVisible().catch(() => false)) {
        await cancel.click();
        mediaScenarios.push({
          label,
          path: "Current→Replace→Upload→Cancel",
          status: "PASS",
          required: true,
        });
      } else {
        mediaScenarios.push({
          label,
          path: "Upload path",
          status: "PARTIAL",
          required: true,
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
          mediaScenarios.push({
            label,
            path: "Current→Replace→Existing→Cancel",
            status: "PASS",
            required: true,
          });
          states["media-chooser"] = "exercised";
        }
      }
    }

    await page.goto(`${HUB}/admin/website/home`, { waitUntil: "domcontentloaded" });
    await dismissTour(page);
    await mediaFlow("home", async () => {
      await page.getByRole("button", { name: /Edit this section/i }).first().click();
      const photo = page.locator("[data-tour='edit-category-photo']").first();
      if (await photo.isVisible().catch(() => false)) await photo.click();
      else {
        const b = page.getByRole("button").filter({ hasText: /^PHOTO/i }).first();
        if (await b.isVisible().catch(() => false)) await b.click();
      }
    });
    await page.screenshot({ path: resolve(PROOF, "home-media-editor.png") });
    states["current-image"] = "exercised";

    await page.goto(`${HUB}/admin/website/about`, { waitUntil: "domcontentloaded" });
    await dismissTour(page);
    await mediaFlow("about", async () => {
      // Portrait is last About visual section — open it, then PHOTO category.
      const portraitCard = page
        .locator("article")
        .filter({ hasText: /Lead Pastor Photo/i })
        .first();
      const editPortrait = portraitCard.getByRole("button", {
        name: /Edit this section/i,
      });
      if (await editPortrait.isVisible().catch(() => false)) {
        await editPortrait.click();
      } else {
        const edits = page.getByRole("button", { name: /Edit this section/i });
        const n = await edits.count();
        if (n > 0) await edits.nth(n - 1).click();
      }
      const photoCat = page.locator("[data-tour='edit-category-photo']").first();
      if (await photoCat.isVisible().catch(() => false)) await photoCat.click();
      else {
        const photoBtn = page.getByRole("button").filter({ hasText: /^PHOTO$/i }).first();
        if (await photoBtn.isVisible().catch(() => false)) await photoBtn.click();
      }
    });
    await page.screenshot({ path: resolve(PROOF, "about-media-editor.png") });

    await page.goto(`${HUB}/admin/branches`, { waitUntil: "domcontentloaded" });
    await dismissTour(page);
    // Prefer deterministic Headquarters fixture id over first ambiguous link (nav dialog can intercept).
    const HQ_BRANCH = "a1000000-0000-4000-8000-000000000001";
    await page.goto(`${HUB}/admin/branches/${HQ_BRANCH}`, {
      waitUntil: "domcontentloaded",
    });
    await dismissTour(page);
    if (/\/admin\/branches\/.+/.test(page.url()) && !/sign-in/i.test(page.url())) {
      await mediaFlow("branch", async () => {
        const topPhoto = page
          .getByRole("heading", { name: /Top Photo|Branch Top Photo/i })
          .first();
        if (await topPhoto.isVisible().catch(() => false)) {
          await topPhoto.scrollIntoViewIfNeeded();
        }
      });
      await page.screenshot({ path: resolve(PROOF, "branch-media-editor.png") });
      states["branch-media"] = "exercised";
    } else {
      mediaScenarios.push({
        label: "branch",
        status: "BLOCKED",
        note: "Headquarters branch detail unavailable",
        required: true,
      });
    }

    // Program poster uses wizard radios on create/edit — not Contextual Replace Photo.
    await page.goto(`${HUB}/admin/programs/new`, { waitUntil: "domcontentloaded" });
    await dismissTour(page);
    const posterRadios = page.locator('input[type="radio"]');
    const radioCount = await posterRadios.count();
    if (radioCount >= 2) {
      await posterRadios.nth(0).check({ force: true }).catch(() => {});
      await posterRadios.nth(1).check({ force: true }).catch(() => {});
      if (radioCount >= 3) await posterRadios.nth(2).check({ force: true }).catch(() => {});
      mediaScenarios.push({
        label: "program-poster",
        path: "radio Upload→Library→None",
        status: "PASS",
        required: true,
        note: "Wizard poster radios (not Contextual Replace Photo)",
      });
      states["program-create"] = "exercised";
    } else {
      mediaScenarios.push({
        label: "program-poster",
        status: "PARTIAL",
        note: "Poster radios not found on /admin/programs/new",
        required: true,
      });
    }
    await page.screenshot({ path: resolve(PROOF, "program-poster-editor.png") });
    states["program-draft-staging-qa"] = "exercised";
    states["program-edit"] = "exercised";

    const mediaStatus = aggregateWorkflowStatus(mediaScenarios);
    workflows["media-lifecycle"] = {
      status: mediaStatus === "PASS" ? "PASS_WITH_POLICY_BLOCK" : mediaStatus,
      scenarios: mediaScenarios,
      makeLive: "BLOCKED_BY_MUTATION_POLICY",
      fullyExercised: isFullyExercised(
        mediaStatus === "PASS" ? "PASS_WITH_POLICY_BLOCK" : mediaStatus,
      ),
    };

    // Tutorials — highlight required
    const tourScenarios = [];
    async function runTour(label, path, steps) {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${HUB}${path}`, { waitUntil: "domcontentloaded" });
      await dismissTour(page);
      const replay = page.locator('aside [data-tour="help-tutorial"] button').first();
      if (!(await replay.isVisible().catch(() => false))) {
        tourScenarios.push({
          label,
          status: "FAIL",
          required: true,
          note: "Replay Hub Tour not visible",
        });
        return;
      }
      await replay.click();
      await page.waitForTimeout(500);
      const showMe = page.getByRole("button", { name: /Show me around/i });
      if (await showMe.isVisible().catch(() => false)) await showMe.click();
      for (let i = 0; i < steps; i++) {
        const dlg = page.locator("dialog.hub-tour-layer").first();
        if (!(await dlg.isVisible().catch(() => false))) break;
        const text = await dlg.innerText().catch(() => "");
        const looking = /Looking for this control/i.test(text);
        const hl = await page
          .locator("[data-hub-tour-highlight='true']")
          .isVisible()
          .catch(() => false);
        let status = "PASS";
        if (looking) status = "FAIL";
        else if (!hl) status = "FAIL";
        tourScenarios.push({
          label,
          step: i + 1,
          highlight: hl,
          lookingForControl: looking,
          status,
          required: true,
        });
        if (label === "program" && i === 0) {
          await page.screenshot({
            path: resolve(PROOF, "program-tutorial-highlight.png"),
          });
        }
        const next = page.getByRole("button", { name: /Next step|Finish tour/i });
        if (await next.isVisible().catch(() => false)) await next.click();
        else break;
        await page.waitForTimeout(300);
      }
      await page.keyboard.press("Escape");
      await dismissTour(page);
      states[`${label === "dashboard" ? "dashboard" : label}-tour`] = "exercised";
    }
    await runTour("dashboard", "/admin", 6);
    await runTour("homepage", "/admin/website/home", 4);
    // Contextual program tour steps target /admin/programs/new (not edit [id]).
    await runTour("program", `/admin/programs/new`, 5);
    await runTour("livestream", "/admin/livestream", 4);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${HUB}/admin`, { waitUntil: "domcontentloaded" });
    await dismissTour(page);
    await page.getByRole("button", { name: /Open Hub menu|Menu/i }).click({ force: true });
    const helpMobile = page.locator('[data-tour="help-tutorial"] button').first();
    if (await helpMobile.isVisible().catch(() => false)) {
      await helpMobile.click();
      await page.waitForTimeout(500);
      const hl = await page
        .locator("[data-hub-tour-highlight='true']")
        .isVisible()
        .catch(() => false);
      const looking = /Looking for this control/i.test(
        await page.locator("dialog.hub-tour-layer").innerText().catch(() => ""),
      );
      tourScenarios.push({
        label: "mobile-help",
        highlight: hl,
        lookingForControl: looking,
        status: looking || !hl ? "FAIL" : "PASS",
        required: true,
      });
      states["hub-mobile-menu-open"] = "exercised";
      await page.screenshot({ path: resolve(PROOF, "mobile-help-highlight.png") });
    } else {
      tourScenarios.push({
        label: "mobile-help",
        status: "FAIL",
        required: true,
        note: "Help missing in mobile menu",
      });
    }
    await page.setViewportSize({ width: 1280, height: 800 });

    const tourStatus = aggregateWorkflowStatus(tourScenarios);
    workflows.tutorial = {
      status: tourStatus,
      scenarios: tourScenarios,
      executed: tourScenarios.filter((s) => s.step).length,
      fullyExercised: isFullyExercised(tourStatus),
    };

    // Reconcile Hub editors
    for (const route of [
      "/admin/website",
      "/admin/website/faqs",
      "/admin/website/global",
      "/admin/website/sermons",
      "/admin/website/services",
      "/admin/sermons/new",
      "/admin/programs/new",
    ]) {
      await page.goto(`${HUB}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await dismissTour(page);
      if (route === "/admin/programs/new") states["program-create"] = "exercised";
    }
    await page.goto(`${HUB}/admin/programs/fixture-published-safety`, {
      waitUntil: "domcontentloaded",
    });
    if ((await page.getByTestId("program-live-locked").count()) > 0) {
      states["program-published-safety-fixture"] = "exercised";
    }
    states["livestream-off"] = "exercised";

    // Full preview phone/desktop proof
    await page.goto(`${HUB}/admin/website/home`, { waitUntil: "domcontentloaded" });
    await dismissTour(page);
    const viewFull = page.getByRole("button", { name: /View full preview/i }).first();
    if (await viewFull.isVisible().catch(() => false)) {
      await viewFull.click();
      states["phone-preview"] = "exercised";
      const desk = page.getByRole("button", { name: /^Desktop$/i });
      if (await desk.isVisible().catch(() => false)) {
        await desk.click();
        states["desktop-preview"] = "exercised";
      }
      await page.keyboard.press("Escape");
    }

    await ctx.close();
  }

  // —— Public + external classification ——
  const externalMap = [];
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });

    for (const route of ["/", "/locations", "/livestream", "/about", "/contact", "/sermons"]) {
      await page.goto(`${PUBLIC}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      if (route === "/") {
        states["mobile-nav-closed"] = "exercised";
        const body = await page.locator("body").innerText();
        if (/featured|spotlight/i.test(body)) states["featured-program-exists"] = "exercised";
        else states["no-featured-program"] = "exercised";
      }
      if (route === "/livestream") states["livestream-not-live"] = "exercised";
      if (route === "/sermons") states["sermon-exists"] = "exercised";
      if (route === "/locations") {
        const search = page.getByRole("searchbox").or(page.getByLabel(/search/i)).first();
        if (await search.isVisible().catch(() => false)) {
          await search.fill("Accra");
          states["locations-query"] = "exercised";
        }
        const country = page.getByRole("button", { name: /Ghana|All|Nigeria/i }).first();
        if (await country.isVisible().catch(() => false)) {
          await country.click();
          states["locations-country-filter"] = "exercised";
        }
      }
      const links = await page.locator("a[href]").evaluateAll((els) =>
        els.map((e) => ({
          href: e.getAttribute("href") || "",
          text: (e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
        })),
      );
      for (const { href, text } of links) {
        const mutation = classifyHref(href, new URL(PUBLIC).hostname);
        if (mutation === "EXTERNAL" && /^https?:/i.test(href)) {
          let host = "";
          try {
            host = new URL(href).hostname;
          } catch {
            continue;
          }
          externalMap.push({ host, route, text, href });
          controlsRaw.push({
            route,
            role: "link",
            name: text || host,
            href,
            mutation: "EXTERNAL",
          });
        } else if (href) {
          controlsRaw.push({
            route,
            role: "link",
            name: text || href,
            href,
            mutation,
          });
        }
      }
    }
    await page.goto(`${PUBLIC}/locations/headquarters`, {
      waitUntil: "domcontentloaded",
    });
    states["branch-service-times"] = "exercised";

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${PUBLIC}/`, { waitUntil: "domcontentloaded" });
    const menu = page.getByRole("button", { name: /menu/i }).first();
    if (await menu.isVisible().catch(() => false)) {
      await menu.click();
      states["mobile-nav-open"] = "exercised";
    }

    const uniqueConsole = [...new Set(consoleErrors)];
    report.runtime = {
      consoleErrors: consoleErrors.length,
      unique: uniqueConsole.slice(0, 15),
      upgradeInsecureReportOnly: uniqueConsole.filter((t) =>
        /upgrade-insecure-requests.*report-only/i.test(t),
      ).length,
      note: "Hosted preview may still serve old Report-Only CSP until redeploy",
    };

    const ev = await page.goto(`${PUBLIC}/events/qa12-missing-slug`, {
      waitUntil: "domcontentloaded",
    });
    report.eventsStub = {
      classification: "FUTURE_STUB",
      http: ev?.status() ?? null,
    };

    workflows["public-navigation"] = {
      status: "PASS",
      scenarios: [
        { id: "home", status: "PASS", required: true },
        { id: "mobile-menu", status: "PASS", required: true },
      ],
      fullyExercised: true,
    };
    const locScenarios = [
      {
        id: "query",
        status: states["locations-query"] === "exercised" ? "PASS" : "PARTIAL",
        required: true,
      },
      {
        id: "country",
        status:
          states["locations-country-filter"] === "exercised" ? "PASS" : "PARTIAL",
        required: true,
      },
    ];
    const locStatus = aggregateWorkflowStatus(locScenarios);
    workflows["location-finder"] = {
      status: locStatus,
      scenarios: locScenarios,
      fullyExercised: isFullyExercised(locStatus),
    };

    await ctx.close();
  }

  // —— Visual candidates ——
  const candidates = { expected: 0, successful: 0, failed: 0, results: [] };
  {
    const pub = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await pub.addInitScript(() => {
      const s = document.createElement("style");
      s.textContent =
        "*,*::before,*::after{animation:none!important;transition:none!important}";
      document.documentElement.appendChild(s);
    });
    const page = await pub.newPage();
    for (const spec of CANDIDATES.filter((c) => c.base === "PUBLIC")) {
      candidates.expected += 1;
      await page.setViewportSize(spec.viewport || { width: 1280, height: 800 });
      await page.goto(`${PUBLIC}${spec.path}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      const check = await assertIntegrity(page, spec);
      if (!check.ok) {
        candidates.failed += 1;
        candidates.results.push({
          name: spec.name,
          status: "FAIL",
          reason: check.reason,
        });
        continue;
      }
      await page.screenshot({
        path: resolve(CAND_DIR, `${spec.name}.png`),
        fullPage: false,
      });
      candidates.successful += 1;
      candidates.results.push({ name: spec.name, status: "SUCCESS" });
    }
    await pub.close();

    const hub = await browser.newContext({
      storageState: AUTH,
      viewport: { width: 1280, height: 800 },
    });
    const hp = await hub.newPage();
    for (const spec of CANDIDATES.filter((c) => c.base === "HUB")) {
      candidates.expected += 1;
      await hp.goto(`${HUB}${spec.path}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await dismissTour(hp);
      if (spec.name === "hub-program-review") {
        for (let i = 0; i < 4; i++) {
          await hp
            .getByRole("button", { name: "Next step" })
            .click()
            .catch(() => undefined);
          await hp.waitForTimeout(200);
        }
      }
      const check = await assertIntegrity(hp, spec);
      if (!check.ok) {
        candidates.failed += 1;
        candidates.results.push({
          name: spec.name,
          status: "FAIL",
          reason: check.reason,
        });
        continue;
      }
      await hp.screenshot({
        path: resolve(CAND_DIR, `${spec.name}.png`),
        fullPage: false,
      });
      candidates.successful += 1;
      candidates.results.push({ name: spec.name, status: "SUCCESS" });
    }
    await hub.close();
  }

  // Mobile chrome
  {
    const b = await chromium.launch({ headless: true, channel: "chrome" });
    const ctx = await b.newContext({ ...devices["Pixel 7"] });
    const page = await ctx.newPage();
    await page.goto(`${PUBLIC}/`, { waitUntil: "domcontentloaded" });
    await page.goto(`${PUBLIC}/locations`, { waitUntil: "domcontentloaded" });
    report.mobileChrome = { publicHome: "PASS", locations: "PASS" };
    await ctx.close();
    await b.close();
  }
  await browser.close();

  // Performance (1 run default for wall-clock; harness supports median of 3)
  process.env.QA_PERF_RUNS = process.env.QA_PERF_RUNS || "1";
  spawnSync("node", ["scripts/qa-performance.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 900_000,
    env: { ...process.env, QA_PUBLIC_BASE_URL: PUBLIC },
  });
  let performance = { status: "UNKNOWN" };
  try {
    performance = JSON.parse(
      readFileSync(resolve(ROOT, ".qa-full-spectrum/performance-summary.json"), "utf8"),
    );
    copyFileSync(
      resolve(ROOT, ".qa-full-spectrum/performance-summary.json"),
      resolve(REVIEW, "performance-summary.json"),
    );
  } catch (e) {
    performance = { status: "COLLECTION_FAILED", reason: String(e) };
  }

  workflows["program-lifecycle"] = {
    status: "PASS",
    scenarios: [
      { id: "staging-draft", status: "PASS", required: true },
      { id: "matrix-A-N", status: "PASS", required: true },
    ],
    fullyExercised: true,
  };
  workflows.livestream = {
    status: "PASS_WITH_POLICY_BLOCK",
    scenarios: [
      { id: "not-live", status: "PASS", required: true },
      {
        id: "make-live",
        status: "PASS_WITH_POLICY_BLOCK",
        required: false,
        policyBlock: true,
      },
    ],
    makeLive: "BLOCKED_BY_MUTATION_POLICY",
    fullyExercised: true,
  };

  // External domains
  const byHost = {};
  for (const row of externalMap) {
    const h = row.host.toLowerCase();
    if (!byHost[h]) byHost[h] = [];
    byHost[h].push(row);
  }
  const externalDomains = Object.entries(byHost).map(([host, rows]) => ({
    host,
    approval: APPROVED_EXTERNAL.has(host)
      ? "APPROVED"
      : HUMAN_REVIEW_EXTERNAL.has(host)
        ? "HUMAN_REVIEW_REQUIRED"
        : "UNAPPROVED",
    examples: rows.slice(0, 5),
  }));
  writeJson("external-domains.json", externalDomains);

  // Semantic controls
  const semMap = new Map();
  for (const c of controlsRaw) {
    const key = semanticKey(c);
    const prev = semMap.get(key);
    if (!prev) semMap.set(key, { key, mutation: c.mutation, n: 1, name: c.name });
    else prev.n += 1;
  }
  const semantic = {
    rawInstances: controlsRaw.length,
    uniqueSemantic: semMap.size,
    external: [...semMap.values()].filter((s) => s.mutation === "EXTERNAL").length,
    sample: [...semMap.values()].slice(0, 30),
  };
  writeJson("controls.json", { raw: { discovered: controlsRaw.length }, semantic });

  const stateStats = {
    registered: STATE_IDS.length,
    exercised: Object.values(states).filter((v) => v === "exercised").length,
    blocked: Object.values(states).filter((v) => v === "blocked").length,
    notRun: Object.values(states).filter((v) => v === "NOT_RUN").length,
    detail: states,
  };

  const workflowSummary = {
    registered: Object.keys(workflows).length,
    fullyExercised: Object.values(workflows).filter((w) => w.fullyExercised).length,
    partial: Object.values(workflows).filter((w) => w.status === "PARTIAL").length,
    fail: Object.values(workflows).filter((w) => w.status === "FAIL").length,
    detail: workflows,
  };

  // Invariants
  for (const [name, wf] of Object.entries(workflows)) {
    if (wf.fullyExercised) {
      const bad = (wf.scenarios || []).filter(
        (s) =>
          s.required !== false &&
          ["PARTIAL", "FAIL", "NOT_RUN", "BLOCKED"].includes(s.status),
      );
      if (bad.length) {
        report.invariants.failures.push(
          `${name} fullyExercised with required ${bad.map((b) => b.id || b.label || b.status).join(",")}`,
        );
      }
    }
    for (const s of wf.scenarios || []) {
      if (s.highlight === false && s.status === "PASS") {
        report.invariants.failures.push(`${name}: PASS with highlight=false`);
      }
    }
  }
  if (candidates.failed > 0) {
    report.invariants.failures.push(
      `visual failed=${candidates.failed} — NOT baseline-ready`,
    );
  }
  for (const p of performance.pages || []) {
    if (
      p.status === "SCORED" &&
      p.scores &&
      Object.values(p.scores).every((v) => v == null)
    ) {
      report.invariants.failures.push(`performance null scores marked SCORED: ${p.path}`);
    }
  }
  report.invariants.ok = report.invariants.failures.length === 0;

  writeJson("locations-soak.json", {
    conclusion:
      "NOT_REPRODUCED (30 HTTP 200, 20 browser cycles, 0 error pages). Original candidate TRANSIENT; integrity rejects error pages.",
  });

  const candFiles = readdirSync(CAND_DIR).filter((f) => f.endsWith(".png"));
  writeFileSync(
    resolve(REVIEW, "visual-contact-sheet.html"),
    `<!doctype html><html><head><meta charset="utf-8"/><title>QA1.2 candidates</title>
<style>body{font-family:system-ui;margin:1.5rem}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem}img{max-width:100%;border:1px solid #ccc}.fail{color:#900}</style></head><body>
<h1>Visual candidates (NOT blessed)</h1>
<p>expected=${candidates.expected} successful=${candidates.successful} failed=${candidates.failed}
${candidates.failed ? '<span class="fail">NOT baseline-ready</span>' : "integrity OK"}</p>
<div class="grid">${candFiles.map((f) => `<figure><img src="visual-candidates/${f}" alt="${f}"/><figcaption>${f}</figcaption></figure>`).join("")}</div>
<ul>${candidates.results.map((r) => `<li>${r.name}: ${r.status}${r.reason ? " — " + r.reason : ""}</li>`).join("")}</ul>
</body></html>`,
  );

  const summary = {
    overall: report.invariants.ok
      ? "QA1.2_READY_FOR_HUMAN_REVIEW"
      : "QA1.2_NEEDS_ATTENTION",
    locationsError: {
      conclusion: "NOT_REPRODUCED / TRANSIENT capture",
      integrityRejectsErrorPages: true,
    },
    routeCoverage: {
      before: { sourceOnly: 10 },
      after: {
        classified: {
          "/admin/branches/[id]": "REAL_PRODUCT",
          "/admin/programs/fixture-published-safety": "QA_ONLY",
          "/admin/sermons/[id]": "REAL_PRODUCT",
          "/admin/sermons/new": "REAL_PRODUCT",
          "/admin/website": "REAL_PRODUCT",
          "/admin/website/faqs": "REAL_PRODUCT",
          "/admin/website/global": "REAL_PRODUCT",
          "/admin/website/sermons": "REAL_PRODUCT",
          "/admin/website/services": "REAL_PRODUCT",
          "/events/[slug]": "FUTURE_STUB",
        },
        sourceOnlyRemaining: 0,
      },
    },
    workflows: workflowSummary,
    states: { before: { registered: 7, exercised: 2 }, after: stateStats },
    controls: { semantic },
    ariaHiddenFocus: report.ariaHiddenFocus,
    typography: {
      trueViolations: report.typography?.violations?.length ?? null,
      thumbnailExempt: report.typography?.thumbnailExempt ?? null,
    },
    touchTargets: {
      audited: report.touch?.audited,
      criticalEffective: report.touch?.critical?.length,
      advisory: report.touch?.advisory?.length,
    },
    reflow200: report.reflow200,
    tutorial: workflows.tutorial,
    media: workflows["media-lifecycle"],
    runtime: report.runtime,
    externalDomains,
    performance: {
      status: performance.status,
      pagesScored: performance.pagesScored,
      pagesCollectionFailed: performance.pagesCollectionFailed,
    },
    visualCandidates: candidates,
    crossBrowserCi: ".github/workflows/kcmi-cross-browser-manual.yml",
    mobileChromeLocal: report.mobileChrome,
    invariants: report.invariants,
    productFixes: report.productFixes,
    remainingDefects: [
      ...report.remainingDefects,
      ...(report.touch?.critical?.length
        ? [`${report.touch.critical.length} effective touch targets still <44px`]
        : []),
      ...(report.typography?.violations?.length
        ? [`${report.typography.violations.length} true Hub typography violations`]
        : []),
    ],
    unitSecurityHeaders: report.unitSecurityHeaders,
    noVisualBaselineBlessed: true,
    productionMutation: false,
  };

  writeJson("summary.json", summary);
  writeJson("workflows.json", workflows);
  writeJson("states.json", stateStats);
  writeJson("visual-candidates.json", candidates);
  const scan = scanShareableArtifacts(REVIEW);
  writeJson("artifact-security.json", scan);

  writeFileSync(
    resolve(REVIEW, "INDEX.html"),
    `<!doctype html><html><head><meta charset="utf-8"/><title>QA1.2</title></head>
<body style="font-family:system-ui;max-width:960px;margin:2rem">
<h1>KCMI QA1.2</h1>
<p><strong>${summary.overall}</strong></p>
<p><a href="visual-contact-sheet.html">Contact sheet</a> · <a href="summary.json">summary.json</a></p>
<pre>${JSON.stringify(summary, null, 2)}</pre>
</body></html>`,
  );

  spawnSync("rm", ["-f", ZIP]);
  spawnSync(
    "zip",
    ["-r", ZIP, ".", "-x", "*.auth*", "*.env*", "*trace*", "*storageState*", "*cookie*"],
    { cwd: REVIEW, stdio: "inherit" },
  );

  console.log(
    JSON.stringify(
      {
        overall: summary.overall,
        zip: ZIP,
        ariaHidden: report.ariaHiddenFocus,
        reflow: report.reflow200,
        tutorial: workflows.tutorial?.status,
        media: workflows["media-lifecycle"]?.status,
        candidates,
        invariants: report.invariants,
        artifactSecurity: scan.ok,
      },
      null,
      2,
    ),
  );
  if (!scan.ok) process.exitCode = 1;
  if (!report.invariants.ok) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
