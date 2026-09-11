/**
 * Shared headed MFA auth for visual capture scripts.
 * Never accepts password/MFA via env or CLI. Never logs secrets.
 */
import { chmodSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { chromium } from "@playwright/test";

const DEFAULT_EMAIL = "kingdomcovenantministriesinter@gmail.com";

/**
 * @param {{
 *   baseUrl: string,
 *   authStatePath: string,
 *   email?: string,
 *   timeoutMs?: number,
 *   dashboardHeading?: RegExp | string,
 * }} options
 */
export async function ensureCaptureAuthState(options) {
  const {
    baseUrl,
    authStatePath,
    email = DEFAULT_EMAIL,
    timeoutMs = 300_000,
    dashboardHeading = /What would you like to update\?/i,
  } = options;

  if (existsSync(authStatePath)) {
    console.log(`Using existing auth state at ${authStatePath} (session cookie file; treat as secret).`);
    return { reused: true, authStatePath };
  }

  mkdirSync(dirname(authStatePath), { recursive: true });
  console.log("No storageState found — opening headed browser for password + MFA.");
  console.log(`Sign-in URL: ${baseUrl}/auth/sign-in`);
  console.log(`Prefill email: ${email}`);
  console.log("Enter password and MFA manually. Do not paste secrets into the terminal.");
  console.log(`Waiting up to ${Math.round(timeoutMs / 1000)}s for /admin…`);

  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/auth/sign-in`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const emailField = page.locator("#email");
    await emailField.waitFor({ state: "visible", timeout: 30_000 });
    await emailField.fill(email);

    await page.waitForURL(
      (url) => {
        try {
          const pathname = new URL(url).pathname;
          return pathname === "/admin" || pathname.startsWith("/admin/");
        } catch {
          return false;
        }
      },
      { timeout: timeoutMs },
    );

    await page.waitForSelector("h1, h2", { timeout: 30_000 });
    const heading = page.getByRole("heading", { name: dashboardHeading });
    await heading.waitFor({ state: "visible", timeout: 30_000 });

    await context.storageState({ path: authStatePath });
    try {
      chmodSync(authStatePath, 0o600);
    } catch {
      // Windows / unsupported FS — ignore
    }
    console.log(`Saved storageState (owner-restricted where supported). Path omitted from logs beyond filename.`);
    return { reused: false, authStatePath };
  } catch (error) {
    throw new Error(
      `Auth capture failed before Hub Dashboard was confirmed. ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    await browser.close();
  }
}
