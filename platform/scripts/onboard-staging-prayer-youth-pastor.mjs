/**
 * Staging-only: onboard Youth Pastor for Prayer (least privilege).
 *
 * Uses Auth Admin inviteUserByEmail — does NOT invent or print passwords.
 * Assigns role: prayer_staff (hub.access + prayer.read only).
 *
 * From platform/, interactive TTY:
 *
 *   export NEXT_PUBLIC_SUPABASE_URL="https://rjzpiikvvetfxveowvkf.supabase.co"
 *   export SUPABASE_SECRET_KEY="…"   # hosted staging secret; NOT platform/.env.local
 *   export KCMI_BOOTSTRAP_CONFIRM=staging
 *   node scripts/onboard-staging-prayer-youth-pastor.mjs --dry-run
 *   node scripts/onboard-staging-prayer-youth-pastor.mjs --apply
 *   node scripts/onboard-staging-prayer-youth-pastor.mjs --verify
 *
 * Unset SUPABASE_SECRET_KEY when finished.
 */

import { createClient } from "@supabase/supabase-js";
import { stdin, stdout } from "node:process";
import readline from "node:readline";

const STAGING_PROJECT_REF = "rjzpiikvvetfxveowvkf";
const STAGING_URL = `https://${STAGING_PROJECT_REF}.supabase.co`;
const TARGET_EMAIL = "christophercookey@gmail.com";
const TARGET_ROLE = "prayer_staff";
const DISPLAY_NAME = "Youth Pastor";
const PREVIEW_SIGN_IN = "https://kcmi-preview.josephtete.com/auth/sign-in";
const PREVIEW_MFA = "https://kcmi-preview.josephtete.com/auth/mfa";
const PREVIEW_CARE_PRAYER = "https://kcmi-preview.josephtete.com/admin/care/prayer";

const MUST_HAVE = ["hub.access", "prayer.read"];
const MUST_NOT_HAVE = [
  "prayer.assign",
  "counselling.read",
  "counselling.assign",
  "welfare.read",
  "welfare.assign",
  "media.manage",
  "users.manage",
  "giving.propose",
  "giving.approve",
];

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  for (const arg of flags) {
    if (
      arg.startsWith("--password") ||
      arg.startsWith("--secret") ||
      arg.startsWith("--key=")
    ) {
      throw new Error(
        "Passwords and secrets must not be passed as command-line arguments.",
      );
    }
  }
  return {
    dryRun: flags.has("--dry-run"),
    verify: flags.has("--verify"),
    apply: flags.has("--apply"),
  };
}

function requireStagingEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  const confirm = process.env.KCMI_BOOTSTRAP_CONFIRM?.trim();
  if (confirm !== "staging") {
    throw new Error(
      "Refusing to run: set KCMI_BOOTSTRAP_CONFIRM=staging in this shell.",
    );
  }
  if (!url || !secret) {
    throw new Error(
      "Refusing to run: export hosted NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY. Do not use platform/.env.local (local CLI).",
    );
  }
  if (url.replace(/\/+$/, "") !== STAGING_URL) {
    throw new Error(`Refusing to run: URL must be exactly ${STAGING_URL}.`);
  }
  if (process.env.KCMI_ENVIRONMENT === "production") {
    throw new Error("Refusing to run: KCMI_ENVIRONMENT=production.");
  }
  return { url, secret };
}

function createAdmin(url, secret) {
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function promptLine(label) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await new Promise((resolve) => rl.question(label, resolve));
  rl.close();
  return answer.trim();
}

async function findUserByEmail(admin, email) {
  const target = email.toLowerCase();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return hit;
    if (users.length < perPage) return null;
    page += 1;
    if (page > 50) throw new Error("listUsers pagination exceeded safety limit.");
  }
}

async function ensureProfile(admin, userId, email) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(`profiles read failed: ${error.message}`);
    if (data) {
      const { error: updErr } = await admin
        .from("profiles")
        .update({
          email,
          display_name: DISPLAY_NAME,
          is_active: true,
        })
        .eq("id", userId);
      if (updErr) throw new Error(`profiles update failed: ${updErr.message}`);
      return "updated";
    }
    await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
  }
  const { error: insErr } = await admin.from("profiles").insert({
    id: userId,
    email,
    display_name: DISPLAY_NAME,
    is_active: true,
  });
  if (insErr) throw new Error(`profiles insert failed: ${insErr.message}`);
  return "inserted";
}

async function ensurePrayerStaffRole(admin, userId) {
  const { data: role, error } = await admin
    .from("roles")
    .select("id, name")
    .eq("name", TARGET_ROLE)
    .single();
  if (error || !role) {
    throw new Error(
      `Role missing: ${TARGET_ROLE}. Apply migration 20260919120000_care_prayer_staff_role.sql first.`,
    );
  }
  const { error: upErr } = await admin.from("user_roles").upsert(
    { user_id: userId, role_id: role.id },
    { onConflict: "user_id,role_id" },
  );
  if (upErr) throw new Error(`user_roles upsert failed: ${upErr.message}`);
}

async function loadRolesAndPermissions(admin, userId) {
  const { data, error } = await admin
    .from("user_roles")
    .select("roles(name, role_permissions(permissions(name)))")
    .eq("user_id", userId);
  if (error) throw new Error(`user_roles read failed: ${error.message}`);
  const roles = [];
  const perms = new Set();
  for (const row of data ?? []) {
    const nested = row.roles;
    const role = Array.isArray(nested) ? nested[0] : nested;
    if (role?.name) roles.push(role.name);
    const rp = role?.role_permissions;
    const rpList = Array.isArray(rp) ? rp : rp ? [rp] : [];
    for (const entry of rpList) {
      const perm = entry.permissions;
      const permList = Array.isArray(perm) ? perm : perm ? [perm] : [];
      for (const p of permList) {
        if (p?.name) perms.add(p.name);
      }
    }
  }
  return { roles: roles.sort(), permissions: [...perms].sort() };
}

async function countVerifiedTotpFactors(admin, userId) {
  // Auth Admin: listFactors if available; else treat as unknown.
  try {
    const { data, error } = await admin.auth.admin.mfa.listFactors({
      userId,
    });
    if (error) return { ok: false, reason: error.message, count: null };
    const all = [
      ...(data?.totp ?? []),
      ...(data?.factors ?? []),
      ...(Array.isArray(data) ? data : []),
    ];
    const verified = all.filter(
      (f) =>
        (f?.factor_type === "totp" || f?.factorType === "totp" || !f?.factor_type) &&
        (f?.status === "verified" || f?.status === "Verified"),
    );
    return { ok: true, count: verified.length, reason: null };
  } catch (err) {
    return {
      ok: false,
      count: null,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

function evaluatePermissions(permissions) {
  const failures = [];
  for (const p of MUST_HAVE) {
    if (!permissions.includes(p)) failures.push(`missing ${p}`);
  }
  for (const p of MUST_NOT_HAVE) {
    if (permissions.includes(p)) failures.push(`unexpected ${p}`);
  }
  return failures;
}

async function verify(admin) {
  const user = await findUserByEmail(admin, TARGET_EMAIL);
  if (!user) {
    console.log(`FAIL ${TARGET_EMAIL} — Auth user not found`);
    console.log("HUMAN: run --apply to send invite, or invite from Staging Auth dashboard.");
    return false;
  }
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, display_name, is_active")
    .eq("id", user.id)
    .maybeSingle();
  const { roles, permissions } = await loadRolesAndPermissions(admin, user.id);
  const permFailures = evaluatePermissions(permissions);
  const mfa = await countVerifiedTotpFactors(admin, user.id);
  const roleOk = roles.includes(TARGET_ROLE) && roles.every((r) => r === TARGET_ROLE);
  const ok =
    Boolean(user.email_confirmed_at) &&
    profile?.is_active === true &&
    permFailures.length === 0 &&
    roleOk;

  console.log(
    `${ok ? "PASS" : "FAIL"} auth/profile/role — confirmed=${Boolean(user.email_confirmed_at)} active=${profile?.is_active === true} roles=${roles.join(",") || "(none)"}`,
  );
  console.log(`  permissions: ${permissions.join(", ") || "(none)"}`);
  for (const f of permFailures) console.log(`  ${f}`);
  if (!roleOk) {
    console.log(
      `  unexpected roles (want only ${TARGET_ROLE}): ${roles.join(", ") || "(none)"}`,
    );
  }
  if (mfa.ok) {
    if (mfa.count > 0) {
      console.log("PASS MFA factors — verified TOTP present (secret not printed)");
    } else {
      console.log("YOUTH_PASTOR_MFA_ENROLLMENT_REQUIRED — no verified TOTP factor");
      console.log(`  Sign-in: ${PREVIEW_SIGN_IN}`);
      console.log(`  Enroll:  ${PREVIEW_MFA}`);
    }
  } else {
    console.log(
      `MFA factor check inconclusive (${mfa.reason}). Youth Pastor must reach AAL2 at Hub before Prayer cutover.`,
    );
    console.log(`  Sign-in: ${PREVIEW_SIGN_IN}`);
    console.log(`  Enroll:  ${PREVIEW_MFA}`);
  }
  console.log(`Care Prayer (after AAL2): ${PREVIEW_CARE_PRAYER}`);
  return ok && mfa.ok && mfa.count > 0;
}

async function apply(admin) {
  let user = await findUserByEmail(admin, TARGET_EMAIL);
  let invited = false;
  if (!user) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(
      TARGET_EMAIL,
      {
        data: { display_name: DISPLAY_NAME },
        redirectTo: PREVIEW_SIGN_IN,
      },
    );
    if (error || !data?.user) {
      throw new Error(
        `inviteUserByEmail failed: ${error?.message ?? "unknown"}. HUMAN may invite from Staging Auth dashboard instead.`,
      );
    }
    user = data.user;
    invited = true;
    console.log(
      `INVITED ${TARGET_EMAIL} — accept email invite / set password (not printed here).`,
    );
  } else {
    console.log(`EXISTS ${TARGET_EMAIL} — invite skipped; repairing profile/role.`);
  }

  const profileAction = await ensureProfile(admin, user.id, TARGET_EMAIL);
  await ensurePrayerStaffRole(admin, user.id);
  const { roles, permissions } = await loadRolesAndPermissions(admin, user.id);
  const failures = evaluatePermissions(permissions);
  console.log(
    `profile=${profileAction} invited=${invited} roles=${roles.join(",")} perms=${permissions.join(",")}`,
  );
  if (failures.length) {
    throw new Error(`Permission evaluation failed: ${failures.join("; ")}`);
  }
  console.log("");
  console.log("Next HUMAN steps:");
  console.log("1. Youth Pastor accepts invite / sets password (if newly invited).");
  console.log(`2. Sign in at ${PREVIEW_SIGN_IN}`);
  console.log(`3. Enroll TOTP at ${PREVIEW_MFA} until AAL2`);
  console.log(`4. Open ${PREVIEW_CARE_PRAYER}`);
  console.log("5. Re-run: node scripts/onboard-staging-prayer-youth-pastor.mjs --verify");
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.dryRun && !args.verify && !args.apply) {
    console.log("Youth Pastor Prayer staging onboard");
    console.log(`Target: ${TARGET_EMAIL} → role ${TARGET_ROLE}`);
    console.log("Pass --dry-run, --verify, or --apply.");
    process.exit(2);
  }
  const { url, secret } = requireStagingEnv();
  const admin = createAdmin(url, secret);

  if (args.dryRun) {
    const user = await findUserByEmail(admin, TARGET_EMAIL);
    console.log(`Auth user ${TARGET_EMAIL}: ${user ? "exists" : "absent"}`);
    console.log(`Intended role: ${TARGET_ROLE} (${MUST_HAVE.join(", ")})`);
    console.log(`Must not have: ${MUST_NOT_HAVE.join(", ")}`);
    console.log("Dry-run complete. No changes.");
    return;
  }

  if (args.verify) {
    const ok = await verify(admin);
    process.exit(ok ? 0 : 1);
  }

  if (!stdin.isTTY) {
    throw new Error("--apply requires an interactive TTY.");
  }
  const typed = await promptLine(
    `Type "staging" to invite/repair Prayer staff ${TARGET_EMAIL}: `,
  );
  if (typed !== "staging") {
    console.error("Confirmation mismatch. No changes.");
    process.exit(1);
  }
  await apply(admin);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
