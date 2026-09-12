/**
 * Bounded public performance baseline (QA1.3).
 * Median of 3 Lighthouse runs per route (+ min/max).
 * Homepage includes TTFB/FCP/LCP-element diagnosis (no product optimization).
 * Never reports null scores as a successful scored page.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT =
  process.env.QA_PERF_OUT || resolve(ROOT, ".qa-full-spectrum");
const BASE =
  process.env.QA_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
  "https://kcmi-preview.josephtete.com";
const RUNS = Math.max(3, Number(process.env.QA_PERF_RUNS || 3));

if (/kcmi-rcc\.org/i.test(BASE)) {
  console.error("Refusing performance against production.");
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

const PAGES = ["/", "/about", "/locations", "/livestream", "/contact"];

function ensureLighthouse() {
  try {
    const mod = require("lighthouse");
    const fn = typeof mod === "function" ? mod : mod.default;
    if (typeof fn !== "function") throw new Error("bad export");
    return fn;
  } catch {
    const install = spawnSync(
      "npm",
      [
        "install",
        "--no-save",
        "--no-package-lock",
        "lighthouse@12.8.2",
        "chrome-launcher@1.1.2",
      ],
      { cwd: ROOT, encoding: "utf8", timeout: 300_000 },
    );
    if (install.status !== 0) {
      throw new Error((install.stderr || install.stdout || "").slice(0, 500));
    }
    const mod = require("lighthouse");
    return typeof mod === "function" ? mod : mod.default;
  }
}

function median(nums) {
  const a = nums
    .filter((n) => typeof n === "number" && Number.isFinite(n))
    .sort((x, y) => x - y);
  if (!a.length) return null;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function minMax(nums) {
  const a = nums.filter((n) => typeof n === "number" && Number.isFinite(n));
  if (!a.length) return { min: null, max: null };
  return { min: Math.min(...a), max: Math.max(...a) };
}

function extractHomeDiagnosis(raw) {
  const audits = raw.audits || {};
  const lcpAudit = audits["largest-contentful-paint"] || {};
  const lcpElement =
    lcpAudit.details?.items?.[0] ||
    audits["largest-contentful-paint-element"]?.details?.items?.[0] ||
    null;
  const networkItems = audits["network-requests"]?.details?.items || [];
  const sortedBySize = [...networkItems].sort(
    (a, b) => (b.transferSize || 0) - (a.transferSize || 0),
  );
  const largestImage = sortedBySize.find((i) =>
    /image|jpg|jpeg|png|webp|avif/i.test(
      `${i.resourceType || ""} ${i.url || ""}`,
    ),
  );
  const jsTransfer = networkItems
    .filter((i) => /script|javascript/i.test(`${i.resourceType || ""}`))
    .reduce((s, i) => s + (i.transferSize || 0), 0);
  const documentTransfer = networkItems
    .filter((i) => /document/i.test(`${i.resourceType || ""}`))
    .reduce((s, i) => s + (i.transferSize || 0), 0);

  return {
    ttfbMs: audits["server-response-time"]?.numericValue ?? null,
    fcpMs: audits["first-contentful-paint"]?.numericValue ?? null,
    lcpMs: lcpAudit.numericValue ?? null,
    lcpElementSnippet: lcpElement
      ? {
          node: lcpElement.node?.snippet || lcpElement.node?.selector || null,
          type: lcpElement.type || null,
        }
      : null,
    largestImage: largestImage
      ? {
          url: String(largestImage.url || "").slice(0, 200),
          transferBytes: largestImage.transferSize ?? null,
          resourceSize: largestImage.resourceSize ?? null,
        }
      : null,
    jsTransferBytes: jsTransfer,
    documentTransferBytes: documentTransfer,
    totalByteWeight: audits["total-byte-weight"]?.numericValue ?? null,
  };
}

async function main() {
  const lighthouse = ensureLighthouse();
  const chromeLauncher = require("chrome-launcher");
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"],
  });

  const pageResults = [];
  let homeDiagnosis = null;
  try {
    for (const path of PAGES) {
      const url = `${BASE}${path}`;
      const runs = [];
      let lastError = null;
      for (let i = 0; i < RUNS; i++) {
        try {
          const runnerResult = await lighthouse(
            url,
            {
              port: chrome.port,
              output: "json",
              onlyCategories: [
                "performance",
                "accessibility",
                "best-practices",
                "seo",
              ],
              formFactor: "mobile",
              screenEmulation: {
                mobile: true,
                width: 412,
                height: 823,
                deviceScaleFactor: 1.75,
              },
            },
            undefined,
          );
          const raw = runnerResult.lhr;
          const scores = {
            performance: raw.categories?.performance?.score ?? null,
            accessibility: raw.categories?.accessibility?.score ?? null,
            bestPractices: raw.categories?.["best-practices"]?.score ?? null,
            seo: raw.categories?.seo?.score ?? null,
          };
          if (Object.values(scores).every((v) => v == null)) {
            lastError = "LHR categories all null";
            continue;
          }
          const audits = raw.audits || {};
          const metrics = {
            lcpMs: audits["largest-contentful-paint"]?.numericValue ?? null,
            cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
            totalByteWeight: audits["total-byte-weight"]?.numericValue ?? null,
            fcpMs: audits["first-contentful-paint"]?.numericValue ?? null,
            ttfbMs: audits["server-response-time"]?.numericValue ?? null,
          };
          runs.push({ scores, metrics, runIndex: i + 1 });
          if (path === "/" && i === 0) {
            homeDiagnosis = extractHomeDiagnosis(raw);
          }
          if (i === 0) {
            const outJson = resolve(
              OUT,
              `lighthouse${path === "/" ? "-home" : path.replace(/\//g, "-")}.json`,
            );
            writeFileSync(outJson, runnerResult.report);
          }
        } catch (e) {
          lastError = String(e).slice(0, 400);
        }
      }

      if (!runs.length) {
        pageResults.push({
          path,
          url,
          status: "COLLECTION_FAILED",
          reason: lastError || "no successful Lighthouse runs",
          scores: null,
          metrics: null,
          runsAttempted: RUNS,
        });
        continue;
      }

      const perfVals = runs.map((r) => r.scores.performance);
      const lcpVals = runs.map((r) => r.metrics.lcpMs);
      const scores = {
        performance: median(perfVals),
        accessibility: median(runs.map((r) => r.scores.accessibility)),
        bestPractices: median(runs.map((r) => r.scores.bestPractices)),
        seo: median(runs.map((r) => r.scores.seo)),
      };
      const metrics = {
        lcpMs: median(lcpVals),
        cls: median(runs.map((r) => r.metrics.cls)),
        totalByteWeight: median(runs.map((r) => r.metrics.totalByteWeight)),
        fcpMs: median(runs.map((r) => r.metrics.fcpMs)),
        ttfbMs: median(runs.map((r) => r.metrics.ttfbMs)),
      };
      const coldWarm = {
        firstRunPerformance: runs[0]?.scores.performance ?? null,
        subsequentMedianPerformance:
          runs.length > 1 ? median(perfVals.slice(1)) : null,
        firstRunLcpMs: runs[0]?.metrics.lcpMs ?? null,
        subsequentMedianLcpMs:
          runs.length > 1 ? median(lcpVals.slice(1)) : null,
      };
      let classification = "BASELINE_OK";
      if (
        path === "/" &&
        ((scores.performance != null && scores.performance < 0.5) ||
          (metrics.lcpMs != null && metrics.lcpMs > 4000))
      ) {
        classification = "PERFORMANCE_INVESTIGATION_REQUIRED";
      }

      pageResults.push({
        path,
        url,
        status: "SCORED",
        scores,
        metrics,
        range: {
          performance: minMax(perfVals),
          lcpMs: minMax(lcpVals),
        },
        coldWarm,
        runsUsed: runs.length,
        runsAttempted: RUNS,
        classification,
        notes: [
          "SEO scores on preview may reflect noindex/staging robots — separate from production SEO defects",
        ],
      });
    }
  } finally {
    await chrome.kill();
  }

  const scored = pageResults.filter((p) => p.status === "SCORED");
  const failed = pageResults.filter((p) => p.status === "COLLECTION_FAILED");
  const home = pageResults.find((p) => p.path === "/");
  const likelyCause = [];
  if (home?.classification === "PERFORMANCE_INVESTIGATION_REQUIRED") {
    if (home.coldWarm?.firstRunLcpMs > 4000 &&
      home.coldWarm?.subsequentMedianLcpMs &&
      home.coldWarm.subsequentMedianLcpMs < 3000) {
      likelyCause.push(
        "Cold-start / warm disparity: first Lighthouse run much slower than subsequent runs (preview cold start or server wake).",
      );
    }
    if (homeDiagnosis?.ttfbMs && homeDiagnosis.ttfbMs > 1500) {
      likelyCause.push(
        `Elevated TTFB (~${Math.round(homeDiagnosis.ttfbMs)}ms) — server response / Supabase SSR latency candidate.`,
      );
    }
    if (homeDiagnosis?.largestImage?.transferBytes > 400_000) {
      likelyCause.push(
        `Large LCP-related image transfer (~${Math.round(homeDiagnosis.largestImage.transferBytes / 1024)}KB): ${homeDiagnosis.largestImage.url}`,
      );
    }
    if (homeDiagnosis?.lcpElementSnippet?.node) {
      likelyCause.push(
        `LCP element candidate: ${homeDiagnosis.lcpElementSnippet.node}`,
      );
    }
    if (!likelyCause.length) {
      likelyCause.push(
        "Median Homepage performance below threshold — inspect hero/LCP media, fonts, and SSR timing; no product optimization applied in QA1.3.",
      );
    }
  }

  const summary = {
    status: scored.length ? "BASELINE_REPORTED" : "FAILED",
    engine: "lighthouse-api-median",
    site: BASE,
    runsPerRoute: RUNS,
    pagesAttempted: PAGES.length,
    pagesScored: scored.length,
    pagesCollectionFailed: failed.length,
    pages: pageResults,
    homeDiagnosis,
    homepageInvestigation: {
      required: home?.classification === "PERFORMANCE_INVESTIGATION_REQUIRED",
      likelyCause,
      note: "Diagnosis only — QA1.3 does not apply performance product optimizations.",
    },
    note: "Median of ≥3 runs. Null scores are never treated as success. Preview noindex SEO is separated from production SEO defects.",
  };

  writeFileSync(
    resolve(OUT, "performance-summary.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log(JSON.stringify(summary, null, 2));
  if (!scored.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
