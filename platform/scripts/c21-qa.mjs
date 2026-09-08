/**
 * Phase C2.1 public-site QA harness (ephemeral — not a product dependency).
 * Run: node scripts/c21-qa.mjs
 * Requires: server on BASE_URL (default http://127.0.0.1:3011)
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3011";
const OUT = join(process.cwd(), ".qa-c21");
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  "/",
  "/about",
  "/locations",
  "/services",
  "/sermons",
  "/contact",
  "/giving",
  "/livestream",
  "/mission",
  "/faqs",
  "/privacy",
  "/terms",
];

const LEGACY = [
  "/index.html",
  "/location.html",
  "/services.html",
  "/contact-us.html",
  "/giving-kcmi.html",
  "/livestream.html",
  "/sermons.html",
  "/mission-kcmi.html",
  "/about-apostle-aikins.html",
  "/faqs.html",
  "/privacy-policy.html",
  "/terms-of-service.html",
];

const VIEWPORTS = [
  { name: "320", width: 320, height: 720 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1280", width: 1280, height: 800 },
  { name: "1440", width: 1440, height: 900 },
];

const ZOOM_LEVELS = [1, 1.25, 1.5, 2];

async function checkOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
    const clientW = doc.clientWidth;
    const overflowX = scrollW > clientW + 1;

    const offenders = [];
    if (overflowX) {
      const all = document.querySelectorAll("body *");
      for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.width > clientW + 2 && r.height > 0) {
          const tag = el.tagName.toLowerCase();
          const cls = (el.className && String(el.className).slice?.(0, 80)) || "";
          offenders.push({
            tag,
            cls,
            right: Math.round(r.right),
            width: Math.round(r.width),
          });
          if (offenders.length >= 8) break;
        }
      }
    }

    const overlaps = [];
    const headings = [...document.querySelectorAll("h1,h2,h3")].slice(0, 12);
    for (let i = 0; i < headings.length; i++) {
      for (let j = i + 1; j < headings.length; j++) {
        const a = headings[i].getBoundingClientRect();
        const b = headings[j].getBoundingClientRect();
        const hit =
          a.left < b.right &&
          a.right > b.left &&
          a.top < b.bottom &&
          a.bottom > b.top &&
          a.width > 0 &&
          b.width > 0;
        if (hit && Math.abs(a.top - b.top) < 4) {
          overlaps.push({
            a: headings[i].textContent?.slice(0, 40),
            b: headings[j].textContent?.slice(0, 40),
          });
        }
      }
    }

    return {
      overflowX,
      scrollW,
      clientW,
      offenders,
      headingOverlaps: overlaps,
      hasMain: !!document.querySelector("main, [role='main'], #main-content"),
      hasHeader: !!document.querySelector("header"),
      hasFooter: !!document.querySelector("footer"),
      hasSkip: !!document.querySelector('a[href="#main-content"]'),
      h1Count: document.querySelectorAll("h1").length,
      iframeCount: document.querySelectorAll("iframe").length,
      scriptSrcs: [...document.querySelectorAll("script[src]")].map((s) =>
        s.getAttribute("src"),
      ),
    };
  });
}

async function collectInternalLinks(page) {
  return page.evaluate(() => {
    const hrefs = [...document.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href") || "")
      .filter(Boolean);
    return hrefs;
  });
}

async function a11yProbe(page) {
  return page.evaluate(() => {
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
      (h) => ({ level: Number(h.tagName[1]), text: h.textContent?.trim().slice(0, 60) }),
    );
    const imgs = [...document.querySelectorAll("img")].map((img) => ({
      src: img.getAttribute("src")?.slice(0, 80),
      alt: img.getAttribute("alt"),
      hasAlt: img.hasAttribute("alt"),
    }));
    const buttonsMissing = [...document.querySelectorAll("button")].filter(
      (b) => !(b.getAttribute("aria-label") || b.textContent?.trim()),
    ).length;
    const details = document.querySelectorAll("details").length;
    return { headings, imgs, buttonsMissing, details };
  });
}

async function fetchStatus(url, { follow = true } = {}) {
  const res = await fetch(url, { redirect: follow ? "follow" : "manual" });
  return {
    status: res.status,
    url: res.url,
    location: res.headers.get("location"),
  };
}

const report = {
  base: BASE,
  generatedAt: new Date().toISOString(),
  routes: {},
  viewports: [],
  zoom: [],
  links: { internal: {}, external: [], broken: [] },
  redirects: [],
  a11y: {},
  screenshots: [],
};

async function main() {
  // Link + redirect checks via fetch (no browser needed)
  for (const path of ROUTES) {
    const r = await fetchStatus(`${BASE}${path}`);
    report.routes[path] = { status: r.status, finalUrl: r.url };
    if (r.status !== 200) report.links.broken.push({ path, status: r.status });
  }

  for (const path of LEGACY) {
    const first = await fetchStatus(`${BASE}${path}`, { follow: false });
    const followed = await fetchStatus(`${BASE}${path}`, { follow: true });
    report.redirects.push({
      from: path,
      redirectStatus: first.status,
      location: first.location,
      finalStatus: followed.status,
      finalUrl: followed.url,
    });
  }

  // System Chrome — Playwright's bundled Chromium is unsupported on this macOS.
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect all internal links from every route at 1280
  await page.setViewportSize({ width: 1280, height: 800 });
  const allInternal = new Set();
  const allExternal = new Set();

  for (const path of ROUTES) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    const hrefs = await collectInternalLinks(page);
    for (const href of hrefs) {
      if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#"))
        continue;
      if (href.startsWith("http://") || href.startsWith("https://")) {
        try {
          const u = new URL(href);
          if (u.origin.includes("127.0.0.1") || u.origin.includes("localhost")) {
            allInternal.add(u.pathname);
          } else {
            allExternal.add(href);
          }
        } catch {
          report.links.broken.push({ href, reason: "malformed" });
        }
      } else if (href.startsWith("/")) {
        allInternal.add(href.split("#")[0].split("?")[0]);
      }
    }
    report.a11y[path] = await a11yProbe(page);
  }

  for (const path of [...allInternal]) {
    // Only check site public paths; skip admin/auth/api
    if (
      path.startsWith("/admin") ||
      path.startsWith("/auth") ||
      path.startsWith("/api") ||
      path.startsWith("/events")
    ) {
      continue;
    }
    const r = await fetchStatus(`${BASE}${path}`);
    report.links.internal[path] = r.status;
    if (r.status >= 400) report.links.broken.push({ path, status: r.status });
  }
  report.links.external = [...allExternal].sort();

  // Viewport overflow matrix (all routes × key viewports)
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const path of ROUTES) {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      // open mobile nav briefly on small widths for first route
      if (vp.width < 1024 && path === "/") {
        const btn = page.getByRole("button", { name: /open menu/i });
        if (await btn.count()) {
          await btn.click();
          await page.waitForTimeout(150);
        }
      }
      const metrics = await checkOverflow(page);
      const entry = {
        viewport: vp.name,
        path,
        overflowX: metrics.overflowX,
        scrollW: metrics.scrollW,
        clientW: metrics.clientW,
        offenders: metrics.offenders,
        headingOverlaps: metrics.headingOverlaps,
        iframeCount: metrics.iframeCount,
        h1Count: metrics.h1Count,
        landmarks: {
          main: metrics.hasMain,
          header: metrics.hasHeader,
          footer: metrics.hasFooter,
          skip: metrics.hasSkip,
        },
      };
      report.viewports.push(entry);
      if (metrics.overflowX || metrics.headingOverlaps.length) {
        const shot = join(OUT, `overflow-${vp.name}${path.replace(/\//g, "_") || "_home"}.png`);
        await page.screenshot({ path: shot, fullPage: true });
        report.screenshots.push(shot);
      }
    }
  }

  // Representative screenshots for visual review
  for (const path of ROUTES) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    const mobileShot = join(OUT, `visual-390${path.replace(/\//g, "_") || "_home"}.png`);
    await page.screenshot({ path: mobileShot, fullPage: true });
    report.screenshots.push(mobileShot);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    const deskShot = join(OUT, `visual-1280${path.replace(/\//g, "_") || "_home"}.png`);
    await page.screenshot({ path: deskShot, fullPage: false });
    report.screenshots.push(deskShot);
  }

  // Zoom tests — emulate via CSS zoom on documentElement (Chromium supports page.evaluate zoom)
  // Playwright also supports deviceScaleFactor; for browser zoom we use CSS zoom which
  // matches layout zoom behavior closely for overflow checks.
  const zoomSampleRoutes = ["/", "/giving", "/locations", "/contact", "/faqs", "/about", "/privacy"];
  for (const zoom of ZOOM_LEVELS) {
    for (const path of zoomSampleRoutes) {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      await page.evaluate((z) => {
        document.documentElement.style.zoom = String(z);
      }, zoom);
      await page.waitForTimeout(100);
      const metrics = await checkOverflow(page);
      // Also try keyboard skip link visibility at 200%
      let skipFocusOk = null;
      if (zoom === 2 && path === "/") {
        await page.keyboard.press("Tab");
        skipFocusOk = await page.evaluate(() => {
          const a = document.activeElement;
          return a?.getAttribute("href") === "#main-content";
        });
      }
      report.zoom.push({
        zoom: `${zoom * 100}%`,
        path,
        overflowX: metrics.overflowX,
        scrollW: metrics.scrollW,
        clientW: metrics.clientW,
        offenders: metrics.offenders.slice(0, 5),
        skipFocusOk,
      });
      if (metrics.overflowX && zoom === 2) {
        const shot = join(OUT, `zoom200${path.replace(/\//g, "_") || "_home"}.png`);
        await page.screenshot({ path: shot, fullPage: true });
        report.screenshots.push(shot);
      }
      await page.evaluate(() => {
        document.documentElement.style.zoom = "";
      });
    }
  }

  // FAQ keyboard: open details with Enter
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(`${BASE}/faqs`, { waitUntil: "domcontentloaded" });
  const faqSummary = page.locator("summary").first();
  await faqSummary.focus();
  await page.keyboard.press("Enter");
  report.a11y.faqKeyboardOpen = await page.evaluate(() => {
    const d = document.querySelector("details");
    return d?.open === true;
  });

  await browser.close();

  const summary = {
    routeStatuses: report.routes,
    overflowFailures: report.viewports.filter((v) => v.overflowX),
    zoomOverflow: report.zoom.filter((z) => z.overflowX),
    redirectFailures: report.redirects.filter(
      (r) => !(r.redirectStatus >= 300 && r.redirectStatus < 400) || r.finalStatus !== 200,
    ),
    brokenLinks: report.links.broken,
    iframeAny: report.viewports.some((v) => v.iframeCount > 0),
    missingH1: report.viewports.filter((v) => v.h1Count !== 1).map((v) => `${v.viewport}${v.path}`),
    faqKeyboardOpen: report.a11y.faqKeyboardOpen,
  };

  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  writeFileSync(join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nFull report: ${join(OUT, "report.json")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
