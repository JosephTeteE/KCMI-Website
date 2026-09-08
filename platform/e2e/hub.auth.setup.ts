import { test as setup } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { hasHubEnv } from "./helpers/env";
import { createSyntheticUser, signInStaff } from "./helpers/hub";

const statePath = resolve(process.cwd(), "e2e/.auth/staff.json");
const metaPath = resolve(process.cwd(), "e2e/.auth/staff-user.json");

setup("authenticate Hub staff", async ({ page }) => {
  setup.skip(!hasHubEnv(), "Local Supabase env is not configured");
  const email = `d12.visual.${Date.now()}@example.invalid`;
  const user = await createSyntheticUser(email, "super_admin");
  await signInStaff(page, user.email);
  mkdirSync(dirname(statePath), { recursive: true });
  await page.context().storageState({ path: statePath });
  writeFileSync(metaPath, JSON.stringify({ id: user.id, email: user.email }));
});
