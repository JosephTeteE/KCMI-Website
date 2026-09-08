import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright uses the installed Google Chrome channel.
 * Bundled Chromium is unsupported on this project's older Intel macOS (mac13).
 */
const port = process.env.E2E_PORT || "3012";
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 90_000,
  expect: {
    toHaveScreenshot: {
      // Explicit updates only: never auto-bless via maxDiff without review.
      maxDiffPixels: 200,
      animations: "disabled",
    },
  },
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === "1" ? "all" : "missing",
  use: {
    baseURL,
    channel: "chrome",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "public",
      testIgnore: /hub/,
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "hub-setup",
      testMatch: /hub\.auth\.setup/,
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "hub-smoke",
      testMatch: /hub-smoke/,
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "hub-ui",
      testMatch: /hub-(visual|a11y)/,
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
  ],
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: `npx next start -p ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          ALLOW_QA_STRESS: "1",
        },
      },
});
