/**
 * Production handover staff bootstrap (tech + media + Pastor Chris).
 *
 * Uses Auth Admin inviteUserByEmail — does NOT invent or print passwords.
 *
 * From platform/ (after HUMAN explicitly authorizes):
 *
 *   export NEXT_PUBLIC_SUPABASE_URL="https://rujbdozepzcsmeuexdle.supabase.co"
 *   export SUPABASE_SECRET_KEY="…"
 *   export KCMI_ENVIRONMENT=production
 *   export KCMI_BOOTSTRAP_CONFIRM=production
 *   node scripts/bootstrap-production-handover-staff.mjs --dry-run
 *   node scripts/bootstrap-production-handover-staff.mjs --apply
 *   node scripts/bootstrap-production-handover-staff.mjs --verify
 *   node scripts/bootstrap-production-handover-staff.mjs --apply --only=tech
 *   node scripts/bootstrap-production-handover-staff.mjs --verify --only=media
 *
 * Unset SUPABASE_SECRET_KEY when finished. Do not commit shell history.
 *
 * Requires migration 20260920120000_care_operator_role (care_operator role).
 * Does NOT: touch staging, enroll MFA, print secrets, disable Vercel protection.
 */

import { createClient } from "@supabase/supabase-js";
import { stdin, stdout } from "node:process";
import readline from "node:readline";

const PRODUCTION_PROJECT_REF = "rujbdozepzcsmeuexdle";
const PRODUCTION_URL = `https://${PRODUCTION_PROJECT_REF}.supabase.co`;
const STAGING_PROJECT_REF = "rjzpiikvvetfxveowvkf";

const PROD_ORIGIN = "https://kcmi-platform-production-ten.vercel.app";
const PROD_SIGN_IN = `${PROD_ORIGIN}/auth/sign-in`;
const PROD_SET_PASSWORD = `${PROD_ORIGIN}/auth/set-password`;
const PROD_CONFIRM = `${PROD_ORIGIN}/auth/confirm`;
const PROD_INVITE_REDIRECT = `${PROD_CONFIRM}?next=/auth/set-password`;
const PROD_FORGOT_PASSWORD = `${PROD_ORIGIN}/auth/forgot-password`;
const PROD_MFA = `${PROD_ORIGIN}/auth/mfa`;
const PROD_ADMIN = `${PROD_ORIGIN}/admin`;

const STAFF = {
  tech: {
    key: "tech",
    email: "tech@kcmi-rcc.org",
    displayName: "Super Admin",
    roles: ["super_admin", "care_operator"],
    mustHave: [
      "hub.access",
      "users.manage",
      "programs.create",
      "programs.update",
      "programs.publish",
      "sermons.manage",
      "events.manage",
      "registrations.manage",
      "payment_evidence.review",
      "giving.propose",
      "giving.approve",
      "livestream.manage",
      "media.manage",
      "website.manage",
      "branches.manage",
      "audit.read",
      "prayer.read",
      "prayer.assign",
      "counselling.read",
      "counselling.assign",
      "welfare.read",
      "welfare.assign",
    ],
    mustNotHave: [],
    allowOnlyRoles: ["super_admin", "care_operator"],
  },
  media: {
    key: "media",
    email: "kingdomcovenantministriesinter@gmail.com",
    displayName: "HQ Content Admin",
    roles: ["media_admin"],
    mustHave: [
      "hub.access",
      "programs.create",
      "programs.update",
      "programs.publish",
      "sermons.manage",
      "events.manage",
      "media.manage",
      "website.manage",
      "livestream.manage",
      "branches.manage",
    ],
    mustNotHave: [
      "prayer.read",
      "prayer.assign",
      "counselling.read",
      "counselling.assign",
      "welfare.read",
      "welfare.assign",
      "giving.propose",
      "giving.approve",
      "users.manage",
      "audit.read",
      "registrations.manage",
      "payment_evidence.review",
    ],
    allowOnlyRoles: ["media_admin"],
  },
  chris: {
    key: "chris",
    email: "christophercookey@gmail.com",
    displayName: "Pastor Chris",
    roles: ["care_operator"],
    mustHave: [
      "hub.access",
      "prayer.read",
      "prayer.assign",
      "counselling.read",
      "counselling.assign",
      "welfare.read",
      "welfare.assign",
    ],
    mustNotHave: [
      "users.manage",
      "giving.propose",
      "giving.approve",
      "media.manage",
      "website.manage",
      "branches.manage",
      "livestream.manage",
      "events.manage",
      "sermons.manage",
      "audit.read",
      "programs.create",
      "programs.update",
      "programs.publish",
      "registrations.manage",
      "payment_evidence.review",
    ],
    allowOnlyRoles: ["care_operator"],
  },
};

function parseArgs(argv) {
  const flags = new Set();
  let only = null;
  for (const arg of argv.slice(2)) {
    if (
      arg.startsWith("--password") ||
      arg.startsWith("--secret") ||
      arg.startsWith("--key=")
    ) {
      throw new Error(
        "Passwords and secrets must not be passed as command-line arguments.",
      );
    }
    if (arg.startsWith("--only=")) {
      only = arg.slice("--only=".length).trim();
      continue;
    }
    flags.add(arg);
  }
  if (only && !STAFF[only]) {
    throw new Error(`Unknown --only=${only}. Use tech|media|chris.`);
  }
  return {
    dryRun: flags.has("--dry-run"),
    verify: flags.has("--verify"),
    apply: flags.has("--apply"),
    only,
  };
}

function requireProductionEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  const confirm = process.env.KCMI_BOOTSTRAP_CONFIRM?.trim();
  const kcmiEnv = process.env.KCMI_ENVIRONMENT?.trim();

  if (confirm !== "production") {
    throw new Error(
      "Refusing to run: set KCMI_BOOTSTRAP_CONFIRM=production in this shell.",
    );
  }
  if (kcmiEnv !== "production") {
    throw new Error(
      "Refusing to run: set KCMI_ENVIRONMENT=production in this shell.",
    );
  }
  if (!url || !secret) {
    throw new Error(
      "Refusing to run: export hosted NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.",
    );
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
  }
  const host = parsed.hostname;
  if (host.includes(STAGING_PROJECT_REF)) {
    throw new Error("Refusing to run: staging project ref detected.");
  }
  if (!host.includes(PRODUCTION_PROJECT_REF)) {
    throw new Error(
      `Refusing to run: URL host must include production ref ${PRODUCTION_PROJECT_REF}.`,
    );
  }
  if (url.replace(/\/+$/, "") !== PRODUCTION_URL) {
    throw new Error(`Refusing to run: expected URL ${PRODUCTION_URL}`);
  }
  return { url, secret };
}

function createAdmin(url, secret) {
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function findUserByEmail(admin, email) {
  const target = email.toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return hit;
    if (users.length < 200) return null;
    page += 1;
  }
}

async function listAllUserEmails(admin) {
  const emails = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email) emails.push(u.email.toLowerCase());
    }
    if (users.length < 200) break;
    page += 1;
  }
  return emails.sort();
}

async function ensureProfile(admin, userId, email, displayName) {
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
          display_name: displayName,
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
    display_name: displayName,
    is_active: true,
  });
  if (insErr) throw new Error(`profiles insert failed: ${insErr.message}`);
  return "inserted";
}

async function ensureRoles(admin, userId, roleNames) {
  for (const roleName of roleNames) {
    const { data: role, error } = await admin
      .from("roles")
      .select("id, name")
      .eq("name", roleName)
      .single();
    if (error || !role) {
      throw new Error(
        `Role missing: ${roleName}. Apply migration 20260920120000_care_operator_role (and foundation) first.`,
      );
    }
    const { error: upErr } = await admin.from("user_roles").upsert(
      { user_id: userId, role_id: role.id },
      { onConflict: "user_id,role_id" },
    );
    if (upErr) throw new Error(`user_roles upsert failed: ${upErr.message}`);
  }
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
  try {
    const { data, error } = await admin.auth.admin.mfa.listFactors({ userId });
    if (error) return { ok: false, reason: error.message, count: null };
    const all = [
      ...(data?.totp ?? []),
      ...(data?.factors ?? []),
      ...(Array.isArray(data) ? data : []),
    ];
    const verified = all.filter(
      (f) =>
        (f?.factor_type === "totp" ||
          f?.factorType === "totp" ||
          !f?.factor_type) &&
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

function evaluateStaff(spec, roles, permissions) {
  const failures = [];
  for (const p of spec.mustHave) {
    if (!permissions.includes(p)) failures.push(`missing ${p}`);
  }
  for (const p of spec.mustNotHave) {
    if (permissions.includes(p)) failures.push(`unexpected ${p}`);
  }
  for (const r of spec.roles) {
    if (!roles.includes(r)) failures.push(`missing role ${r}`);
  }
  const extras = roles.filter((r) => !spec.allowOnlyRoles.includes(r));
  return { failures, extras };
}

function selectedStaff(only) {
  if (only) return [STAFF[only]];
  return [STAFF.tech, STAFF.media, STAFF.chris];
}

function printPlan(only) {
  console.log("KCMI production handover staff bootstrap");
  console.log(`Auth Admin target: ${PRODUCTION_URL}`);
  console.log(`Invite redirectTo: ${PROD_INVITE_REDIRECT}`);
  for (const spec of selectedStaff(only)) {
    console.log(
      `  ${spec.email} → roles [${spec.roles.join(", ")}] (${spec.displayName})`,
    );
  }
  console.log("Method: inviteUserByEmail (no password invented or printed).");
  console.log("MFA: not enrolled by this script — HUMAN enrolls TOTP.");
}

async function verifyOne(admin, spec) {
  let failed = 0;
  const user = await findUserByEmail(admin, spec.email);
  if (!user) {
    console.log(`FAIL ${spec.email} — Auth user not found`);
    return false;
  }
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, display_name, is_active")
    .eq("id", user.id)
    .maybeSingle();
  const { roles, permissions } = await loadRolesAndPermissions(admin, user.id);
  const { failures, extras } = evaluateStaff(spec, roles, permissions);
  const identityOk =
    Boolean(user.email_confirmed_at) &&
    profile?.is_active === true &&
    failures.length === 0;

  console.log("");
  console.log(`=== ${spec.email} ===`);
  console.log(
    `${identityOk ? "PASS" : "FAIL"} confirmed=${Boolean(user.email_confirmed_at)} active=${profile?.is_active === true} roles=${roles.join(",") || "(none)"}`,
  );
  console.log(`permissions (${permissions.length}): ${permissions.join(", ")}`);
  if (extras.length) {
    console.log(`WARN extra roles present (not stripped): ${extras.join(", ")}`);
  }
  if (failures.length) {
    failed += 1;
    for (const f of failures) console.log(`  FAIL ${f}`);
  }
  const mfa = await countVerifiedTotpFactors(admin, user.id);
  if (mfa.ok && mfa.count === 0) {
    console.log("MFA: not enrolled yet — HUMAN must enroll TOTP to AAL2.");
  } else if (mfa.ok) {
    console.log(`MFA: verified TOTP factor count=${mfa.count}`);
  } else {
    console.log(`MFA check inconclusive (${mfa.reason}).`);
  }
  return failed === 0 && identityOk;
}

async function applyOne(admin, spec) {
  let user = await findUserByEmail(admin, spec.email);
  let invited = false;
  if (!user) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(
      spec.email,
      {
        data: { display_name: spec.displayName },
        redirectTo: PROD_INVITE_REDIRECT,
      },
    );
    if (error || !data?.user) {
      throw new Error(
        `inviteUserByEmail failed for ${spec.email}: ${error?.message ?? "unknown"}`,
      );
    }
    user = data.user;
    invited = true;
    console.log(`INVITED ${spec.email}`);
  } else {
    console.log(`EXISTS ${spec.email} — invite skipped; repairing profile/roles.`);
  }
  const profileAction = await ensureProfile(
    admin,
    user.id,
    spec.email,
    spec.displayName,
  );
  await ensureRoles(admin, user.id, spec.roles);
  const { roles, permissions } = await loadRolesAndPermissions(admin, user.id);
  const { failures, extras } = evaluateStaff(spec, roles, permissions);
  console.log(
    `profile=${profileAction} invited=${invited} roles=${roles.join(",")}`,
  );
  if (extras.length) {
    console.log(`WARN extra roles present: ${extras.join(", ")}`);
  }
  if (failures.length) {
    throw new Error(
      `Permission evaluation failed for ${spec.email}: ${failures.join("; ")}`,
    );
  }
}

async function promptProduction() {
  if (!stdin.isTTY) {
    throw new Error('Interactive TTY required. Type "production" to confirm.');
  }
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await new Promise((resolve) => {
    rl.question('Type "production" to invite/repair handover staff: ', resolve);
  });
  rl.close();
  if (answer.trim() !== "production") {
    throw new Error("Confirmation mismatch — aborting.");
  }
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  if (!args.dryRun && !args.verify && !args.apply) {
    printPlan(args.only);
    console.error("");
    console.error(
      "Refusing to mutate. Pass --dry-run, --verify, or --apply.",
    );
    process.exit(2);
  }
  if (args.apply && args.verify) {
    console.error("Pass only one of --apply or --verify.");
    process.exit(1);
  }

  const { url, secret } = requireProductionEnv();
  const admin = createAdmin(url, secret);
  const staff = selectedStaff(args.only);

  if (args.dryRun) {
    printPlan(args.only);
    console.log("");
    console.log("Current Auth state (read-only):");
    for (const spec of staff) {
      const user = await findUserByEmail(admin, spec.email);
      console.log(`  ${spec.email}: ${user ? "exists" : "absent"}`);
    }
    const emails = await listAllUserEmails(admin);
    console.log(`  Auth user count: ${emails.length}`);
    console.log("Dry-run complete. No users created or changed.");
    return;
  }

  if (args.verify) {
    printPlan(args.only);
    let ok = true;
    for (const spec of staff) {
      const pass = await verifyOne(admin, spec);
      if (!pass) ok = false;
    }
    console.log("");
    console.log(`Sign-in: ${PROD_SIGN_IN}`);
    console.log(`Forgot password: ${PROD_FORGOT_PASSWORD}`);
    console.log(`Set password: ${PROD_SET_PASSWORD}`);
    console.log(`MFA: ${PROD_MFA}`);
    console.log(`Hub: ${PROD_ADMIN}`);
    process.exit(ok ? 0 : 1);
  }

  printPlan(args.only);
  await promptProduction();
  for (const spec of staff) {
    console.log("");
    await applyOne(admin, spec);
  }
  console.log("");
  console.log("Next HUMAN steps:");
  console.log("1. Each invitee accepts email → confirm → set password → MFA.");
  console.log(
    `2. Existing tech without password: ${PROD_FORGOT_PASSWORD}`,
  );
  console.log("3. After MFA for Care staff, enable Care flags on Vercel:");
  console.log("   KCMI_PRAYER_INTAKE_ENABLED=1");
  console.log("   KCMI_PASTORAL_INTAKE_ENABLED=1");
  console.log("   KCMI_WELFARE_INTAKE_ENABLED=1");
  console.log(
    "4. Re-run: node scripts/bootstrap-production-handover-staff.mjs --verify",
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
