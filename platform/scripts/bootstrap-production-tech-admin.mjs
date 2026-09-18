/**
 * Production-only: onboard the initial technical Super Admin.
 *
 * Uses Auth Admin inviteUserByEmail — does NOT invent or print passwords.
 * Assigns roles: super_admin + care_operator (Care grants via care_operator).
 *
 * Prefer scripts/bootstrap-production-handover-staff.mjs for full handover
 * (tech + media + Chris). This script remains for tech-only repair.
 * From platform/, interactive TTY (after HUMAN explicitly authorizes):
 *
 *   export NEXT_PUBLIC_SUPABASE_URL="https://rujbdozepzcsmeuexdle.supabase.co"
 *   export SUPABASE_SECRET_KEY="…"   # production secret; NOT platform/.env.local
 *   export NEXT_PUBLIC_SITE_URL="https://www.kcmi-rcc.org"
 *   export KCMI_ENVIRONMENT=production
 *   export KCMI_BOOTSTRAP_CONFIRM=production
 *   node scripts/bootstrap-production-tech-admin.mjs --dry-run
 *   node scripts/bootstrap-production-tech-admin.mjs --apply
 *   node scripts/bootstrap-production-tech-admin.mjs --verify
 *
 * Unset SUPABASE_SECRET_KEY when finished. Do not commit shell history.
 *
 * Does NOT: touch staging, create other staff, enroll MFA, print secrets,
 * or disable Vercel Deployment Protection.
 */

import { createClient } from "@supabase/supabase-js";
import { stdin, stdout } from "node:process";
import readline from "node:readline";

const PRODUCTION_PROJECT_REF = "rujbdozepzcsmeuexdle";
const PRODUCTION_URL = `https://${PRODUCTION_PROJECT_REF}.supabase.co`;
const STAGING_PROJECT_REF = "rjzpiikvvetfxveowvkf";

const TARGET_EMAIL = "tech@kcmi-rcc.org";
const TARGET_ROLES = ["super_admin", "care_operator"];
const TARGET_ROLE = "super_admin"; // primary platform role (kept for logging)
const DISPLAY_NAME = "Super Admin";

/** Canonical public origin for production invites (reject .vercel.app). */
const REQUIRED_PRODUCTION_SITE_URL = "https://www.kcmi-rcc.org";

function resolveProductionSiteUrls() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) {
    throw new Error(
      `Refusing to run: set NEXT_PUBLIC_SITE_URL=${REQUIRED_PRODUCTION_SITE_URL}`,
    );
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL is not a valid URL.");
  }
  if (parsed.hostname.endsWith(".vercel.app")) {
    throw new Error(
      "Refusing to run: production invites must not use a .vercel.app hostname. " +
        `Set NEXT_PUBLIC_SITE_URL=${REQUIRED_PRODUCTION_SITE_URL}`,
    );
  }
  const origin = parsed.origin.replace(/\/+$/, "");
  if (origin !== REQUIRED_PRODUCTION_SITE_URL) {
    throw new Error(
      `Refusing to run: NEXT_PUBLIC_SITE_URL must be exactly ${REQUIRED_PRODUCTION_SITE_URL}`,
    );
  }
  const confirm = `${origin}/auth/confirm`;
  return {
    origin,
    signIn: `${origin}/auth/sign-in`,
    setPassword: `${origin}/auth/set-password`,
    confirm,
    inviteRedirect: `${confirm}?next=/auth/set-password`,
    forgotPassword: `${origin}/auth/forgot-password`,
    mfa: `${origin}/auth/mfa`,
    admin: `${origin}/admin`,
  };
}

/** Expected grants for super_admin ∪ care_operator. */
const MUST_HAVE = [
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
];

/** No additional unexpected pastoral-only gaps — Care comes from care_operator. */
const MUST_NOT_HAVE = [];

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

function requireProductionEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  const confirm = process.env.KCMI_BOOTSTRAP_CONFIRM?.trim();
  const kcmiEnv = process.env.KCMI_ENVIRONMENT?.trim();

  if (confirm !== "production") {
    throw new Error(
      'Refusing to run: set KCMI_BOOTSTRAP_CONFIRM=production in this shell.',
    );
  }
  if (kcmiEnv !== "production") {
    throw new Error(
      "Refusing to run: set KCMI_ENVIRONMENT=production in this shell.",
    );
  }
  if (!url || !secret) {
    throw new Error(
      "Refusing to run: export hosted NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY. Do not use platform/.env.local.",
    );
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    parsed.protocol !== "https:"
  ) {
    throw new Error(
      "Refusing to run: URL is not hosted production HTTPS. This script will not target local Supabase.",
    );
  }
  if (host.includes(STAGING_PROJECT_REF)) {
    throw new Error(
      "Refusing to run: staging project ref detected. This script targets production only.",
    );
  }
  if (url.replace(/\/+$/, "") !== PRODUCTION_URL) {
    throw new Error(
      `Refusing to run: URL must be exactly ${PRODUCTION_URL} (project ${PRODUCTION_PROJECT_REF}).`,
    );
  }
  const site = resolveProductionSiteUrls();
  return { url, secret, site };
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

async function listAllUserEmails(admin) {
  const emails = [];
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email) emails.push(u.email.toLowerCase());
    }
    if (users.length < perPage) break;
    page += 1;
    if (page > 50) throw new Error("listUsers pagination exceeded safety limit.");
  }
  return emails.sort();
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

async function ensureTargetRoles(admin, userId) {
  for (const roleName of TARGET_ROLES) {
    const { data: role, error } = await admin
      .from("roles")
      .select("id, name")
      .eq("name", roleName)
      .single();
    if (error || !role) {
      throw new Error(
        `Role missing: ${roleName}. Apply migration 20260920120000_care_operator_role first.`,
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

function printPlan(site) {
  console.log("KCMI production Tech Admin bootstrap");
  console.log(`Auth Admin target: ${PRODUCTION_URL}`);
  console.log(`Project ref: ${PRODUCTION_PROJECT_REF}`);
  console.log(`User: ${TARGET_EMAIL} → roles ${TARGET_ROLES.join(" + ")} (${DISPLAY_NAME})`);
  console.log("Method: inviteUserByEmail (no password invented or printed).");
  console.log("Roles: upsert public.user_roles only for super_admin.");
  console.log("MFA: not enrolled by this script — HUMAN enrolls TOTP after invite.");
  console.log(`Hub sign-in: ${site.signIn}`);
  console.log(`Invite redirectTo: ${site.inviteRedirect}`);
  console.log(`Confirm route: ${site.confirm}`);
}

async function verify(admin, site) {
  let failed = 0;

  const emails = await listAllUserEmails(admin);
  console.log(`Auth users (count=${emails.length}): ${emails.join(", ") || "(none)"}`);
  const unexpected = emails.filter((e) => e !== TARGET_EMAIL);
  if (unexpected.length > 0) {
    console.log(
      `WARN other Auth users present (not created by this script's intended scope): ${unexpected.join(", ")}`,
    );
  }

  const user = await findUserByEmail(admin, TARGET_EMAIL);
  if (!user) {
    console.log(`FAIL ${TARGET_EMAIL} — Auth user not found`);
    console.log("HUMAN: run --apply after explicit authorization, or invite from Production Auth.");
    return false;
  }

  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("id, email, display_name, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);

  const { roles, permissions } = await loadRolesAndPermissions(admin, user.id);
  const permFailures = evaluatePermissions(permissions);
  const roleOk = TARGET_ROLES.every((r) => roles.includes(r));
  const extraRoles = roles.filter((r) => !TARGET_ROLES.includes(r));
  const profileOk =
    profile?.is_active === true &&
    (profile?.email ?? "").toLowerCase() === TARGET_EMAIL;

  const identityOk = profileOk && roleOk && permFailures.length === 0;
  console.log(
    `${identityOk ? "PASS" : "FAIL"} auth/profile/role — confirmed=${Boolean(user.email_confirmed_at)} active=${profile?.is_active === true} roles=${roles.join(",") || "(none)"}`,
  );
  console.log(`  permissions (${permissions.length}): ${permissions.join(", ") || "(none)"}`);
  for (const f of permFailures) console.log(`  ${f}`);
  if (!roleOk) {
    console.log(
      `  missing roles (want ${TARGET_ROLES.join(" + ")}): ${roles.join(", ") || "(none)"}`,
    );
    failed += 1;
  }
  if (extraRoles.length) {
    console.log(
      `  WARN extra roles present (not stripped): ${extraRoles.join(", ")}`,
    );
  }
  if (!profileOk) {
    console.log("  profile missing, inactive, or email mismatch");
    failed += 1;
  }
  if (permFailures.length) failed += 1;

  const mfa = await countVerifiedTotpFactors(admin, user.id);
  if (mfa.ok) {
    if (mfa.count > 0) {
      console.log(
        "PASS MFA factors — verified TOTP present (secret not printed)",
      );
    } else {
      console.log(
        "TECH_ADMIN_MFA_ENROLLMENT_REQUIRED — no verified TOTP (expected until HUMAN enrolls)",
      );
      console.log(`  Sign-in: ${site.signIn}`);
      console.log(`  Enroll:  ${site.mfa}`);
      console.log(`  Hub:     ${site.admin}`);
    }
  } else {
    console.log(
      `MFA factor check inconclusive (${mfa.reason}). HUMAN must enroll TOTP to AAL2 before privileged Hub actions.`,
    );
    console.log(`  Sign-in: ${site.signIn}`);
    console.log(`  Enroll:  ${site.mfa}`);
  }

  console.log("");
  console.log(
    "Note: Vercel Authentication (Deployment Protection) may block invite completion",
  );
  console.log(
    "and Hub sign-in until tech@kcmi-rcc.org is a Vercel project/team member",
  );
  console.log("or uses an authorized bypass. Do not disable protection from this script.");

  return failed === 0 && identityOk;
}

async function apply(admin, site) {
  let user = await findUserByEmail(admin, TARGET_EMAIL);
  let invited = false;

  if (!user) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(
      TARGET_EMAIL,
      {
        data: { display_name: DISPLAY_NAME },
        // SSR-safe: PKCE/default ConfirmationURL lands with ?code= on confirm,
        // which then routes to Set Password. TokenHash templates should also
        // target /auth/confirm (see HUMAN email-template instructions).
        redirectTo: site.inviteRedirect,
      },
    );
    if (error || !data?.user) {
      throw new Error(
        `inviteUserByEmail failed: ${error?.message ?? "unknown"}. HUMAN may invite from Production Auth dashboard instead.`,
      );
    }
    user = data.user;
    invited = true;
    console.log(
      `INVITED ${TARGET_EMAIL} — accept email invite and set own password (not printed here).`,
    );
  } else {
    console.log(
      `EXISTS ${TARGET_EMAIL} — invite skipped; repairing profile/role only.`,
    );
  }

  const profileAction = await ensureProfile(admin, user.id, TARGET_EMAIL);
  await ensureTargetRoles(admin, user.id);
  const { roles, permissions } = await loadRolesAndPermissions(admin, user.id);
  const failures = evaluatePermissions(permissions);
  const extraRoles = roles.filter((r) => !TARGET_ROLES.includes(r));

  console.log(
    `profile=${profileAction} invited=${invited} roles=${roles.join(",") || "(none)"}`,
  );
  console.log(`permissions (${permissions.length}): ${permissions.join(", ")}`);
  if (extraRoles.length) {
    console.log(
      `WARN extra roles present (not stripped by this script): ${extraRoles.join(", ")}`,
    );
  }
  if (failures.length) {
    throw new Error(`Permission evaluation failed: ${failures.join("; ")}`);
  }

  console.log("");
  console.log("Next HUMAN steps (MFA secret never requested or displayed):");
  console.log(
    "1. Accept the invite email (confirm → set password). Do not invent a password here.",
  );
  console.log(
    `   If the invite was already consumed without a password: ${site.forgotPassword}`,
  );
  console.log(
    "2. If Vercel Authentication blocks the app, sign in as a Vercel team member",
  );
  console.log("   or use an authorized bypass — do not disable Deployment Protection.");
  console.log(`3. Set password at ${site.setPassword} (via invite/recovery link).`);
  console.log(`4. Enroll TOTP at ${site.mfa} until AAL2`);
  console.log(`5. Open Hub at ${site.admin}`);
  console.log(
    "6. Re-run: node scripts/bootstrap-production-tech-admin.mjs --verify",
  );
  console.log(`Confirm route (email templates): ${site.confirm}`);
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
    try {
      printPlan(resolveProductionSiteUrls());
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
    console.error("");
    console.error(
      "Refusing to mutate. Pass --dry-run, --verify, or --apply. No invite sent by this invocation.",
    );
    process.exit(2);
  }

  if (args.apply && args.verify) {
    console.error("Pass only one of --apply or --verify.");
    process.exit(1);
  }

  let url;
  let secret;
  let site;
  try {
    ({ url, secret, site } = requireProductionEnv());
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
  const admin = createAdmin(url, secret);

  if (args.dryRun) {
    printPlan(site);
    console.log("");
    console.log("Current Auth state (read-only):");
    const user = await findUserByEmail(admin, TARGET_EMAIL);
    console.log(`  ${TARGET_EMAIL}: ${user ? "exists" : "absent"}`);
    const emails = await listAllUserEmails(admin);
    console.log(`  Auth user count: ${emails.length}`);
    console.log(`Must have: ${MUST_HAVE.join(", ")}`);
    console.log(`Must not have: ${MUST_NOT_HAVE.join(", ")}`);
    console.log("Dry-run complete. No users created or changed.");
    return;
  }

  if (args.verify) {
    const ok = await verify(admin, site);
    process.exit(ok ? 0 : 1);
  }

  if (!stdin.isTTY) {
    throw new Error("--apply requires an interactive TTY.");
  }
  printPlan(site);
  const typed = await promptLine(
    `Type "production" to invite/repair Tech Admin ${TARGET_EMAIL}: `,
  );
  if (typed !== "production") {
    console.error("Confirmation mismatch. No changes.");
    process.exit(1);
  }
  await apply(admin, site);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
