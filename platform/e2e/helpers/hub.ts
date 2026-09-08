import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TOTP } from "otpauth";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { loadLocalEnv } from "./env";

export type SyntheticUser = {
  id: string;
  email: string;
};

export const TEST_PASSWORD = "Local-Test-Only-Passw0rd!";
export const ACCRA_BRANCH_ID = "a1000000-0000-4000-8000-000000000005";
export const TOGO_BRANCH_ID = "a1000000-0000-4000-8000-000000000004";

export function serviceClient(): SupabaseClient {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    throw new Error("Missing local Supabase service configuration");
  }
  return createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function ensureRole(
  admin: SupabaseClient,
  userId: string,
  roleName: string,
) {
  const { data: role, error } = await admin
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single();
  if (error || !role) throw new Error(`Role missing: ${roleName}`);
  await admin.from("user_roles").upsert({ user_id: userId, role_id: role.id });
}

export async function enrollTotpSecret(email: string): Promise<string> {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing public Supabase configuration");
  const client = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signErr } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (signErr) throw signErr;
  const { data: enrolled, error: enrollErr } = await client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `d12-${Date.now()}`,
  });
  if (enrollErr || !enrolled?.totp?.secret) {
    throw enrollErr ?? new Error("TOTP enroll failed");
  }
  const secret = enrolled.totp.secret;
  const totp = new TOTP({ secret, digits: 6, period: 30 });
  const { data: challenge, error: challengeErr } = await client.auth.mfa.challenge({
    factorId: enrolled.id,
  });
  if (challengeErr || !challenge) {
    throw challengeErr ?? new Error("TOTP challenge failed");
  }
  const { error: verifyErr } = await client.auth.mfa.verify({
    factorId: enrolled.id,
    challengeId: challenge.id,
    code: totp.generate(),
  });
  if (verifyErr) throw verifyErr;
  await client.auth.signOut();
  return secret;
}

export async function createSyntheticUser(
  email: string,
  roleName: string,
): Promise<SyntheticUser> {
  const admin = serviceClient();
  let lastErr: { message?: string } | null = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: email },
    });
    if (!error && data.user) {
      await admin
        .from("profiles")
        .update({ is_active: true, display_name: email })
        .eq("id", data.user.id);
      await ensureRole(admin, data.user.id, roleName);
      await new Promise((r) => setTimeout(r, 2000));
      return { id: data.user.id, email };
    }
    lastErr = error;
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
  throw new Error(lastErr?.message || "createUser failed");
}

export async function completeMfa(page: Page, knownSecret?: string) {
  await expect(page.getByRole("heading", { name: /Hub MFA/i })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator("#code")).toBeVisible({ timeout: 20_000 });

  let secret = knownSecret ?? "";
  const secretEl = page.getByText(/Manual secret:/);
  try {
    await secretEl.waitFor({ timeout: 12_000 });
    secret = ((await secretEl.textContent()) ?? "")
      .replace(/Manual secret:\s*/i, "")
      .trim();
  } catch {
    if (!secret) throw new Error("TOTP secret not available for MFA");
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const totp = new TOTP({ secret, digits: 6, period: 30 });
    await page.locator("#code").fill(totp.generate());
    await page.getByRole("button", { name: /Verify and continue/i }).click();
    const reachedHub = await page
      .getByText("KCMI Hub")
      .waitFor({ timeout: 12_000 })
      .then(() => true)
      .catch(() => false);
    if (reachedHub) return;
  }
  throw new Error("MFA verify did not reach Hub");
}

export async function signInStaff(page: Page, email: string) {
  await page.goto("/auth/sign-in");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /Sign in/i }).click();
  const mfaHeading = page.getByRole("heading", { name: /Hub MFA/i });
  const hubLabel = page.getByText("KCMI Hub");
  await expect(mfaHeading.or(hubLabel)).toBeVisible({ timeout: 25_000 });
  if (await mfaHeading.isVisible()) {
    await completeMfa(page);
  }
  await expect(hubLabel).toBeVisible({ timeout: 20_000 });
}

export async function cleanupSyntheticRecords(ids: {
  programId?: string | null;
  sermonId?: string | null;
  mediaIds?: string[];
  branchMediaId?: string | null;
  userIds?: string[];
  restoreLivestream?: { facebook_url: string | null; is_live: boolean } | null;
}) {
  const admin = serviceClient();
  if (ids.branchMediaId) {
    await admin.from("branch_media").delete().eq("id", ids.branchMediaId);
  }
  if (ids.programId) {
    await admin.from("programs").delete().eq("id", ids.programId);
  }
  if (ids.sermonId) {
    await admin.from("sermons").delete().eq("id", ids.sermonId);
  }
  for (const mediaId of ids.mediaIds ?? []) {
    const { data: asset } = await admin
      .from("media_assets")
      .select("storage_path")
      .eq("id", mediaId)
      .maybeSingle();
    if (asset?.storage_path) {
      await admin.storage.from("marketing-public").remove([asset.storage_path]);
    }
    await admin.from("media_assets").delete().eq("id", mediaId);
  }
  if (ids.restoreLivestream) {
    await admin
      .from("livestream_settings")
      .update({
        facebook_url: ids.restoreLivestream.facebook_url,
        is_live: ids.restoreLivestream.is_live,
      })
      .eq("singleton_key", "default");
  }
  for (const userId of ids.userIds ?? []) {
    await admin.auth.admin.deleteUser(userId);
  }
}
