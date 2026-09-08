/**
 * Local Storage authorization checks (JWT vs server secret-key path).
 * Canonical env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY.
 * Synthetic users only. Does not print secrets. Does not deploy.
 *
 * Usage (from platform/, local Supabase running):
 *   node scripts/storage-authz-check.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) throw new Error("Missing .env.local");
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i);
    let val = t.slice(i + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function tinyPng() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
}

loadEnvLocal();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !publishable || !secret) {
  console.error("FAIL env — missing local Supabase keys");
  process.exit(1);
}

const admin = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const password = "Local-Test-Only-Passw0rd!";
const stamp = Date.now().toString(36);

async function ensureRole(userId, roleName) {
  const { data: role, error } = await admin
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single();
  if (error || !role) throw new Error(`role missing: ${roleName}`);
  const { error: urErr } = await admin.from("user_roles").upsert({
    user_id: userId,
    role_id: role.id,
  });
  if (urErr) throw urErr;
}

async function createUser(email, roleName) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: email },
  });
  if (error || !data.user) throw new Error(error?.message || "createUser failed");
  await admin
    .from("profiles")
    .update({ is_active: true, display_name: email })
    .eq("id", data.user.id);
  await ensureRole(data.user.id, roleName);
  return data.user;
}

async function clientAs(email) {
  const c = createClient(url, publishable, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}

async function tryUpload(client, label) {
  const path = `authz-${label}-${randomUUID()}.png`;
  const { error } = await client.storage.from("marketing-public").upload(path, tinyPng(), {
    contentType: "image/png",
    upsert: false,
  });
  return { path, error };
}

function mark(id, pass, detail) {
  console.log(`${pass ? "PASS" : "FAIL"} ${id}${detail ? ` — ${detail}` : ""}`);
  return pass;
}

const ACCRA = "a1000000-0000-4000-8000-000000000005";
const TOGO = "a1000000-0000-4000-8000-000000000004";

async function main() {
  let failed = 0;
  const users = [];

  const media = await createUser(`storage.media.${stamp}@example.invalid`, "media_admin");
  const auditor = await createUser(`storage.auditor.${stamp}@example.invalid`, "auditor");
  const pastor = await createUser(`storage.pastor.${stamp}@example.invalid`, "pastor");
  const baNone = await createUser(`storage.ba.none.${stamp}@example.invalid`, "branch_admin");
  const baAccra = await createUser(`storage.ba.accra.${stamp}@example.invalid`, "branch_admin");
  users.push(media.id, auditor.id, pastor.id, baNone.id, baAccra.id);

  await admin.from("branch_staff_assignments").upsert({
    user_id: baAccra.id,
    branch_id: ACCRA,
  });

  const anonClient = createClient(url, publishable, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anonUp = await tryUpload(anonClient, "anon");
  if (!mark("anon-upload-denied", !!anonUp.error, anonUp.error?.message || "unexpected success")) {
    failed += 1;
  }

  const pastorC = await clientAs(pastor.email);
  const pastorUp = await tryUpload(pastorC, "pastor");
  if (!mark("ordinary-auth-upload-denied", !!pastorUp.error, pastorUp.error?.message || "unexpected success")) {
    failed += 1;
  }

  const auditorC = await clientAs(auditor.email);
  const auditorUp = await tryUpload(auditorC, "auditor");
  if (!mark("auditor-upload-denied", !!auditorUp.error, auditorUp.error?.message || "unexpected success")) {
    failed += 1;
  }

  const baNoneC = await clientAs(baNone.email);
  const baNoneUp = await tryUpload(baNoneC, "ba-none");
  if (!mark("unassigned-branch-admin-upload-denied", !!baNoneUp.error, baNoneUp.error?.message || "unexpected success")) {
    failed += 1;
  }

  const baAccraC = await clientAs(baAccra.email);
  const baAccraUp = await tryUpload(baAccraC, "ba-accra");
  if (!mark("assigned-branch-admin-jwt-upload-denied", !!baAccraUp.error, baAccraUp.error?.message || "unexpected success")) {
    failed += 1;
  }

  const mediaC = await clientAs(media.email);
  const mediaJwtUp = await tryUpload(mediaC, "media-jwt");
  if (!mark("media-admin-jwt-direct-upload-denied", !!mediaJwtUp.error, mediaJwtUp.error?.message || "unexpected success")) {
    failed += 1;
  }

  const serverPath = `authz-server-${randomUUID()}.png`;
  const { error: serverErr } = await admin.storage
    .from("marketing-public")
    .upload(serverPath, tinyPng(), { contentType: "image/png", upsert: false });
  if (!mark("media-admin-server-secret-key-upload-allowed", !serverErr, serverErr?.message)) {
    failed += 1;
  } else {
    await admin.storage.from("marketing-public").remove([serverPath]);
  }

  const { data: canAccra } = await admin.rpc("can_manage_branch", {
    p_branch_id: TOGO,
  });
  // rpc as service role bypasses auth.uid — not a user test. Skip.
  void canAccra;
  void TOGO;

  for (const id of users) {
    await admin.auth.admin.deleteUser(id);
  }

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("FAIL storage-authz-check", err instanceof Error ? err.message : "error");
  process.exit(1);
});
