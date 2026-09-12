import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

/**
 * Playwright uses the installed Google Chrome channel.
 * Bundled Chromium is unsupported on this project's older Intel macOS (mac13).
 *
 * QA1 full-spectrum lives under e2e/full-spectrum/.
 * Legacy D1.x specs remain under e2e/*.spec.ts.
 */
const port = process.env.E2E_PORT || "3012";
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${port}`;
const hosted = /josephtete\.com|kcmi-rcc\.org/i.test(baseURL);
const traceMode =
  process.env.QA_TRACE === "on"
    ? "on"
    : (("retain-on-failure" as const));

const hubStateCandidates = [
  resolve(process.cwd(), ".auth/qa-hub-user.json"),
  resolve(process.cwd(), ".auth/d181-local-user.json"),
  resolve(process.cwd(), ".auth/d17-review-user.json"),
  resolve(process.cwd(), "e2e/.auth/staff.json"),
];
const hubStorageState =
  hubStateCandidates.find((p) => existsSync(p)) ?? undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: ".qa-local-sensitive/playwright-results.json" }],
  ],
  timeout: 90_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 200,
      animations: "disabled",
    },
  },
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === "1" ? "all" : "none",
  use: {
    baseURL,
    channel: "chrome",
    trace: traceMode,
    screenshot: "only-on-failure",
  },
  projects: [
    // —— Legacy D1.x projects (unchanged names) ——
    {
      name: "public",
      testIgnore: [/hub/, /full-spectrum/],
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "hub-setup",
      testMatch: /hub\.auth\.setup/,
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "hub-smoke",
      testMatch: /hub-(smoke|ux)/,
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "hub-ui",
      testMatch: /hub-a11y/,
      dependencies: ["hub-setup"],
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        storageState: "e2e/.auth/staff.json",
      },
    },
    {
      name: "hub-visual",
      testMatch: /hub-visual/,
      dependencies: ["hub-setup"],
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        storageState: "e2e/.auth/staff.json",
      },
    },
    {
      name: "hub-teardown",
      testMatch: /hub\.auth\.teardown/,
      dependencies: ["hub-ui"],
    },

    // —— QA1 full-spectrum ——
    {
      name: "fs-chromium",
      testMatch: /full-spectrum\//,
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        storageState: hubStorageState,
      },
    },
    {
      name: "fs-firefox",
      testMatch: /full-spectrum\/(cross-browser-critical|public-interactions|smoke)/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "fs-webkit",
      testMatch: /full-spectrum\/(cross-browser-critical|public-interactions|smoke|tutorial-workflows|program-lifecycle)/,
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "fs-mobile-chrome",
      testMatch: /full-spectrum\/(public-interactions|cross-browser-critical|responsive-layout)/,
      use: { ...devices["Pixel 7"], channel: "chrome" },
    },
    {
      name: "fs-mobile-webkit",
      testMatch: /full-spectrum\/(public-interactions|cross-browser-critical)/,
      use: { ...devices["iPhone 14"] },
    },
  ],
  webServer:
    process.env.E2E_SKIP_WEBSERVER || hosted
      ? undefined
      : {
          command: `npx next start -p ${port}`,
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            ...process.env,
            ALLOW_QA_STRESS: "1",
            KCMI_ALLOW_QA_FIXTURES: "1",
          },
        },
});
