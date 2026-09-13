/**
 * Codespaces / cloud Linux QA config.
 *
 * - Bundled Chromium/Firefox/WebKit (no Google Chrome channel — Mac-only workaround)
 * - No storageState / Hub credentials
 * - Hosted preview by default (E2E_BASE_URL + E2E_SKIP_WEBSERVER)
 *
 * Used by: npm run qa:cloud / qa:cloud:cross-browser
 */
import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.E2E_BASE_URL || "https://kcmi-preview.josephtete.com";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: ".qa-local-sensitive/playwright-cloud-results.json" }],
  ],
  timeout: 90_000,
  use: {
    baseURL,
    // No channel — official Playwright Linux image browsers
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "fs-chromium",
      testMatch: /full-spectrum\//,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "fs-firefox",
      testMatch:
        /full-spectrum\/(cross-browser-critical|public-interactions|smoke)\.spec\.ts/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "fs-webkit",
      testMatch:
        /full-spectrum\/(cross-browser-critical|public-interactions|smoke)\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "fs-mobile-chrome",
      testMatch:
        /full-spectrum\/(public-interactions|cross-browser-critical|responsive-layout)\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "fs-mobile-webkit",
      testMatch:
        /full-spectrum\/(public-interactions|cross-browser-critical)\.spec\.ts/,
      use: { ...devices["iPhone 14"] },
    },
  ],
  // Hosted preview only — no local Next/Supabase in cloud-safe mode
  webServer: undefined,
});
