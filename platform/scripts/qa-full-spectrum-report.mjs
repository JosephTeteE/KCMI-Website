/**
 * First full-spectrum audit + shareable sanitized report.
 */
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { scanShareableArtifacts } from "./qa-artifact-security-run.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHARE = resolve(ROOT, ".qa-full-spectrum");
const LOCAL = resolve(ROOT, ".qa-local-sensitive");
const ZIP = resolve(homedir(), "Downloads/kcmi-qa1-full-spectrum.zip");

function run(cmd, args, env = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  return spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, ...env },
    shell: process.platform === "win32",
  });
}

function main() {
  rmSync(SHARE, { recursive: true, force: true });
  mkdirSync(resolve(SHARE, "screenshots"), { recursive: true });
  mkdirSync(LOCAL, { recursive: true });

  const publicBase =
    process.env.QA_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    "https://kcmi-preview.josephtete.com";
  const hubBase =
    process.env.QA_HUB_BASE_URL?.replace(/\/$/, "") ||
    process.env.E2E_BASE_URL?.replace(/\/$/, "") ||
    publicBase;

  if (/kcmi-rcc\.org/i.test(publicBase) || /kcmi-rcc\.org/i.test(hubBase)) {
    throw new Error("Refusing full-spectrum run against production hostname");
  }

  const blocked = [];
  const results = {
    phase: "QA1-full-spectrum-first-run",
    generatedAt: new Date().toISOString(),
    publicBase,
    hubBase,
    suites: {},
    blocked,
    d181: {},
  };

  const publicRun = run(
    "npx",
    [
      "playwright",
      "test",
      "--project=fs-chromium",
      "e2e/full-spectrum/smoke.spec.ts",
      "e2e/full-spectrum/accessibility.spec.ts",
      "e2e/full-spectrum/responsive-layout.spec.ts",
      "e2e/full-spectrum/content-quality.spec.ts",
      "e2e/full-spectrum/links.spec.ts",
      "e2e/full-spectrum/runtime-network.spec.ts",
      "e2e/full-spectrum/public-interactions.spec.ts",
      "e2e/full-spectrum/cross-browser-critical.spec.ts",
    ],
    {
      E2E_BASE_URL: publicBase,
      E2E_SKIP_WEBSERVER: "1",
      QA_VISUAL_SOFT: "1",
    },
  );
  results.suites.publicHosted = {
    status: publicRun.status === 0 ? "PASS" : "FAIL",
    exitCode: publicRun.status,
    stdoutTail: (publicRun.stdout || "").slice(-2500),
    stderrTail: (publicRun.stderr || "").slice(-1500),
  };

  const unit = run("npx", [
    "vitest",
    "run",
    "tests/program-review-schedule.test.ts",
    "tests/program-edit-roundtrip.test.ts",
  ]);
  results.suites.programUnit = {
    status: unit.status === 0 ? "PASS" : "FAIL",
    exitCode: unit.status,
  };

  const authExists =
    existsSync(resolve(ROOT, ".auth/qa-hub-user.json")) ||
    existsSync(resolve(ROOT, ".auth/d181-local-user.json"));
  if (!authExists) {
    blocked.push("BLOCKED — Hub storageState missing (run npm run qa:auth)");
    results.d181.lifecycleSuite = "BLOCKED";
    results.suites.hub = { status: "BLOCKED" };
  } else {
    const hubRun = run(
      "npx",
      [
        "playwright",
        "test",
        "--project=fs-chromium",
        "e2e/full-spectrum/program-lifecycle.spec.ts",
        "e2e/full-spectrum/hub-interactions.spec.ts",
        "e2e/full-spectrum/tutorial-workflows.spec.ts",
        "e2e/full-spectrum/typography.spec.ts",
        "e2e/full-spectrum/media-lifecycle.spec.ts",
        "e2e/full-spectrum/livestream-workflows.spec.ts",
      ],
      {
        E2E_BASE_URL: hubBase,
        E2E_SKIP_WEBSERVER: "1",
        KCMI_ALLOW_QA_FIXTURES: "1",
        QA_ALLOW_STAGING_DRAFT_WRITE:
          process.env.QA_ALLOW_STAGING_DRAFT_WRITE || "",
      },
    );
    results.suites.hub = {
      status: hubRun.status === 0 ? "PASS" : "FAIL",
      exitCode: hubRun.status,
      stdoutTail: (hubRun.stdout || "").slice(-3000),
      note:
        hubBase.includes("josephtete.com")
          ? "Hosted Hub may lag D1.8.1 until deploy"
          : "Local/Hub base",
    };
    results.d181.lifecycleSuite = results.suites.hub.status;
    if (hubRun.status !== 0 && hubBase.includes("josephtete.com")) {
      blocked.push(
        "BLOCKED/FAIL — Hosted Hub Program lifecycle (deploy D1.8.1 or use QA_HUB_BASE_URL=local)",
      );
    }
  }

  const workflowsRegistered = [
    "program-lifecycle",
    "media-lifecycle",
    "public-navigation",
    "location-finder",
    "tutorial",
    "livestream",
  ];

  const coverage = {
    routes: {
      publicManifest: 15,
      hubManifest: 11,
      authManifest: 2,
      qaOnly: 3,
      note: "Authoritative list: e2e/qa/manifest.ts",
    },
    workflows: {
      registered: workflowsRegistered,
      exercised: [
        results.suites.programUnit?.status === "PASS"
          ? "program-lifecycle (unit Review schedule)"
          : null,
        results.d181.lifecycleSuite === "PASS"
          ? "program-lifecycle (browser)"
          : null,
        results.suites.publicHosted?.status === "PASS"
          ? "public-navigation / locations / runtime"
          : null,
      ].filter(Boolean),
      incomplete:
        results.d181.lifecycleSuite !== "PASS"
          ? ["program-lifecycle browser incomplete"]
          : [],
    },
    states: {
      registered: 7,
      note: "See QA_STATES in manifest.ts",
    },
    controls: {
      note: "Heuristic classification via mutation-policy; FULL reconciliation TBD",
    },
    visual: { status: "UNBASELINED", humanApprovalRequired: true },
    performance: {
      status: "NOT_RUN",
      note: "npm run qa:performance (Unlighthouse/Lighthouse) supplementary",
    },
  };

  const summary = {
    overall:
      results.suites.programUnit?.status === "PASS" &&
      (results.suites.publicHosted?.status === "PASS" ||
        results.suites.publicHosted?.status === "FAIL")
        ? results.suites.publicHosted?.status === "PASS" &&
          results.d181.lifecycleSuite === "PASS"
          ? "HEALTHY_WITH_GAPS"
          : "NEEDS_ATTENTION"
        : "NEEDS_ATTENTION",
    blocked,
    humanVisualReviewRequired: true,
    noFakeHundredPercent: true,
    productionMutation: false,
  };

  const files = {
    "summary.json": summary,
    "coverage.json": coverage,
    "workflows.json": {
      registered: workflowsRegistered,
      d181: results.d181,
    },
    "controls.json": {
      discovered: "runtime suites",
      classified: "heuristic",
      exercised: coverage.workflows.exercised,
      unclassified: [],
    },
    "responsive.json": {
      sampledWidths: [320, 390, 640, 768, 1024, 1280, 1920],
      fullBoundaries: "QA_LAYOUT_FULL=1",
    },
    "typography.json": { hubBodyMinPx: 16, hubHelpMinPx: 15 },
    "content.json": { suite: results.suites.publicHosted?.status },
    "links.json": { suite: "links.spec" },
    "runtime.json": { suite: "runtime-network.spec" },
    "accessibility-summary.json": { suite: "accessibility.spec" },
    "performance-summary.json": { status: "NOT_RUN" },
    "visual-summary.json": {
      status: "UNBASELINED",
      humanApprovalRequired: true,
    },
  };

  for (const [name, data] of Object.entries(files)) {
    writeFileSync(resolve(SHARE, name), JSON.stringify(data, null, 2));
  }

  writeFileSync(
    resolve(SHARE, "INDEX.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>KCMI QA1</title>
<style>body{font-family:system-ui;margin:2rem;max-width:920px;line-height:1.45}
.card{border:1px solid #bbb;border-radius:8px;padding:1rem;margin:1rem 0}
.pass{color:#060}.fail{color:#900}.blocked{color:#960}</style></head><body>
<h1>KCMI QA1 — Full-spectrum</h1>
<p><strong>Overall:</strong> ${summary.overall}</p>
<p>Coverage is multi-dimensional. This is not a fake 100% score. Human visual review remains required.</p>
<div class="card"><h2>D1.8.1 Program lifecycle</h2>
<p>Unit Review schedule: <span class="${results.suites.programUnit?.status === "PASS" ? "pass" : "fail"}">${results.suites.programUnit?.status}</span></p>
<p>Browser: <span class="${results.d181.lifecycleSuite === "PASS" ? "pass" : "blocked"}">${results.d181.lifecycleSuite}</span></p></div>
<div class="card"><h2>Blocked</h2><ul>${blocked.map((b) => `<li>${b}</li>`).join("") || "<li>None</li>"}</ul></div>
<div class="card"><h2>Suites</h2><pre>${JSON.stringify(results.suites, null, 2)}</pre></div>
<div class="card"><h2>Coverage</h2><pre>${JSON.stringify(coverage, null, 2)}</pre></div>
<p>Local-sensitive report: <code>platform/playwright-report/</code> and <code>platform/.qa-local-sensitive/</code></p>
</body></html>`,
  );

  writeFileSync(
    resolve(SHARE, "screenshots/README.txt"),
    "Shareable screenshots only. No .auth, cookies, or traces.\n",
  );

  const scan = scanShareableArtifacts(SHARE);
  writeFileSync(
    resolve(SHARE, "artifact-security.json"),
    JSON.stringify(scan, null, 2),
  );
  if (!scan.ok) {
    console.error("ARTIFACT SECURITY FAIL", scan.violations);
    process.exitCode = 1;
    return;
  }

  spawnSync(
    "zip",
    ["-r", ZIP, ".", "-x", "*.auth*", "*.env*", "*trace*", "*storageState*"],
    { cwd: SHARE, stdio: "inherit" },
  );

  writeFileSync(resolve(LOCAL, "first-run-raw.json"), JSON.stringify(results, null, 2));

  console.log(
    JSON.stringify(
      {
        shareable: SHARE,
        zip: ZIP,
        localSensitive: LOCAL,
        overall: summary.overall,
        blocked,
        artifactSecurity: scan.ok,
        d181: results.d181,
      },
      null,
      2,
    ),
  );
}

main();
