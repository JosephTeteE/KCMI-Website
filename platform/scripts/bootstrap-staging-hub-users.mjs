/**
 * One-time KCMI Hub user bootstrap for HOSTED STAGING only.
 *
 * Uses the Auth Admin API (SUPABASE_SECRET_KEY). Never uses the browser client.
 * Never writes auth.users via SQL. Never logs passwords or secret keys.
 *
 * Does nothing unless you pass --apply (or --verify / --dry-run).
 *
 * From platform/, in an interactive terminal:
 *
 *   export NEXT_PUBLIC_SUPABASE_URL="https://rjzpiikvvetfxveowvkf.supabase.co"
 *   export SUPABASE_SECRET_KEY="…"   # hosted staging secret; not platform/.env.local
 *   export KCMI_BOOTSTRAP_CONFIRM=staging
 *   node scripts/bootstrap-staging-hub-users.mjs --dry-run
 *   node scripts/bootstrap-staging-hub-users.mjs --apply
 *   node scripts/bootstrap-staging-hub-users.mjs --verify
 *
 * Unset SUPABASE_SECRET_KEY when finished. Do not commit this shell history.
 *
 * Passwords: typed on a TTY with echo disabled. Not accepted as CLI arguments.
 * Existing users: confirmed + profile/role repaired; password unchanged unless
 * you also pass --reset-passwords (still TTY getpass, not argv).
 */

import { createClient } from "@supabase/supabase-js";
import readline from "node:readline";
import { stdin, stdout } from "node:process";

const STAGING_PROJECT_REF = "rjzpiikvvetfxveowvkf";
const STAGING_URL = `https://${STAGING_PROJECT_REF}.supabase.co`;
const HUB_SIGN_IN = "https://kcmi-website-seven.vercel.app/auth/sign-in";
const HUB_MFA = "https://kcmi-website-seven.vercel.app/auth/mfa";
const HUB_ADMIN = "https://kcmi-website-seven.vercel.app/admin";

const PASTORAL_READ = ["prayer.read", "counselling.read", "welfare.read"];

const ROLE_PERMISSIONS = {
  super_admin: [
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
  ],
  media_admin: [
    "hub.access",
    "programs.create",
    "programs.update",
    "programs.publish",
    "sermons.manage",
    "media.manage",
    "website.manage",
    "livestream.manage",
    "branches.manage",
  ],
};

const INTENDED_USERS = [
  {
    email: "tech@kcmi-rcc.org",
    role: "super_admin",
    operatingName: "Super Admin",
    mustHave: [
      "hub.access",
      "users.manage",
      "programs.publish",
      "sermons.manage",
      "media.manage",
      "livestream.manage",
      "website.manage",
      "branches.manage",
    ],
    mustNotHave: [...PASTORAL_READ],
  },
  {
    email: "kingdomcovenantministriesinter@gmail.com",
    role: "media_admin",
    operatingName: "HQ Content Admin",
    mustHave: [
      "hub.access",
      "programs.create",
      "programs.update",
      "programs.publish",
      "sermons.manage",
      "media.manage",
      "livestream.manage",
      "website.manage",
      "branches.manage",
    ],
    mustNotHave: [...PASTORAL_READ, "users.manage", "giving.propose", "giving.approve"],
  },
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
    resetPasswords: flags.has("--reset-passwords"),
  };
}

function permissionsForRoles(roleNames) {
  const set = new Set();
  for (const name of roleNames) {
    for (const p of ROLE_PERMISSIONS[name] ?? []) set.add(p);
  }
  return set;
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
      "Refusing to run: export hosted NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in this shell. Do not use platform/.env.local (that is local CLI).",
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
      "Refusing to run: URL is not hosted staging HTTPS. This script will not target local Supabase.",
    );
  }
  if (url.replace(/\/+$/, "") !== STAGING_URL) {
    throw new Error(
      `Refusing to run: URL must be exactly ${STAGING_URL} (KCMI Platform - Staging).`,
    );
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

function promptHidden(label) {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error(
      "A TTY is required to enter passwords (echo hidden). Do not pipe a password.",
    );
  }
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: stdin,
      output: stdout,
      terminal: true,
    });
    stdout.write(label);
    const onData = (chunk) => {
      const s = chunk.toString("utf8");
      if (s === "\u0003") {
        cleanup();
        reject(new Error("Cancelled."));
        return;
      }
      if (s === "\n" || s === "\r") {
        cleanup();
        stdout.write("\n");
        resolve(value);
        return;
      }
      if (s === "\u007f" || s === "\b") {
        value = value.slice(0, -1);
        return;
      }
      if (s === "\u0015") {
        value = "";
        return;
      }
      if (s.length === 1 && s >= " ") {
        value += s;
      }
    };
    let value = "";
    const cleanup = () => {
      stdin.removeListener("data", onData);
      if (typeof stdin.setRawMode === "function") stdin.setRawMode(false);
      rl.close();
    };
    if (typeof stdin.setRawMode === "function") stdin.setRawMode(true);
    stdin.on("data", onData);
  });
}

async function promptLine(label) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await new Promise((resolve) => rl.question(label, resolve));
  rl.close();
  return answer.trim();
}

function assertPasswordShape(password, email) {
  if (password.length < 12) {
    throw new Error(`Password for ${email} must be at least 12 characters.`);
  }
  if (password.toLowerCase().includes(email.toLowerCase())) {
    throw new Error(`Password for ${email} must not contain the email address.`);
  }
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

async function ensureRole(admin, userId, roleName) {
  const { data: role, error } = await admin
    .from("roles")
    .select("id, name")
    .eq("name", roleName)
    .single();
  if (error || !role) throw new Error(`Role missing in RBAC tables: ${roleName}`);
  const { error: upErr } = await admin.from("user_roles").upsert(
    { user_id: userId, role_id: role.id },
    { onConflict: "user_id,role_id" },
  );
  if (upErr) throw new Error(`user_roles upsert failed: ${upErr.message}`);
  return role.id;
}

async function loadAssignedRoles(admin, userId) {
  const { data, error } = await admin
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);
  if (error) throw new Error(`user_roles read failed: ${error.message}`);
  const names = [];
  for (const row of data ?? []) {
    const nested = row.roles;
    const name = Array.isArray(nested) ? nested[0]?.name : nested?.name;
    if (typeof name === "string") names.push(name);
  }
  return names.sort();
}

async function bootstrapOne(admin, spec, { resetPasswords }) {
  const existing = await findUserByEmail(admin, spec.email);
  let user = existing;
  let created = false;

  if (!user) {
    const password = await promptHidden(
      `New password for ${spec.email} (${spec.operatingName}) [hidden]: `,
    );
    const again = await promptHidden("Repeat password [hidden]: ");
    if (password !== again) {
      throw new Error(`Passwords did not match for ${spec.email}.`);
    }
    assertPasswordShape(password, spec.email);
    const { data, error } = await admin.auth.admin.createUser({
      email: spec.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: spec.operatingName },
    });
    if (error || !data.user) {
      throw new Error(
        `createUser failed for ${spec.email}: ${error?.message ?? "unknown"}`,
      );
    }
    user = data.user;
    created = true;
  } else if (resetPasswords) {
    const password = await promptHidden(
      `Replacement password for existing ${spec.email} [hidden]: `,
    );
    const again = await promptHidden("Repeat password [hidden]: ");
    if (password !== again) {
      throw new Error(`Passwords did not match for ${spec.email}.`);
    }
    assertPasswordShape(password, spec.email);
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { display_name: spec.operatingName },
    });
    if (error) {
      throw new Error(`updateUserById password failed: ${error.message}`);
    }
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      user_metadata: {
        ...(user.user_metadata ?? {}),
        display_name: spec.operatingName,
      },
    });
    if (error) {
      throw new Error(`updateUserById confirm failed: ${error.message}`);
    }
  }

  const profileAction = await ensureProfile(
    admin,
    user.id,
    spec.email,
    spec.operatingName,
  );
  await ensureRole(admin, user.id, spec.role);
  const roles = await loadAssignedRoles(admin, user.id);
  const extra = roles.filter((r) => r !== spec.role);

  return {
    email: spec.email,
    operatingName: spec.operatingName,
    role: spec.role,
    created,
    passwordChanged: Boolean(created || resetPasswords),
    profileAction,
    emailConfirmed: true,
    roles,
    extraRoles: extra,
  };
}

function evaluateSpec(spec, roleNames) {
  const perms = permissionsForRoles(roleNames);
  const failures = [];
  if (!roleNames.includes(spec.role)) {
    failures.push(`missing role ${spec.role}`);
  }
  for (const p of spec.mustHave) {
    if (!perms.has(p)) failures.push(`missing permission ${p}`);
  }
  for (const p of spec.mustNotHave) {
    if (perms.has(p)) failures.push(`unexpected permission ${p}`);
  }
  return { perms, failures };
}

async function verify(admin) {
  let failed = 0;
  const report = [];

  for (const spec of INTENDED_USERS) {
    const user = await findUserByEmail(admin, spec.email);
    if (!user) {
      console.log(`FAIL ${spec.email} — Auth user not found`);
      failed += 1;
      continue;
    }
    const confirmed = Boolean(user.email_confirmed_at);
    const { data: profile, error: pErr } = await admin
      .from("profiles")
      .select("id, email, display_name, is_active")
      .eq("id", user.id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    const roles = user.id ? await loadAssignedRoles(admin, user.id) : [];
    const { failures } = evaluateSpec(spec, roles);
    const ok =
      confirmed &&
      profile?.is_active === true &&
      profile?.email === spec.email &&
      failures.length === 0 &&
      roles.filter((r) => r !== spec.role).length === 0;

    const line = ok ? "PASS" : "FAIL";
    if (!ok) failed += 1;
    console.log(
      `${line} ${spec.email} — ${spec.operatingName}; confirmed=${confirmed}; active=${profile?.is_active === true}; roles=${roles.join(",") || "(none)"}`,
    );
    for (const f of failures) console.log(`     ${f}`);
    if (!confirmed) console.log("     email is not confirmed");
    if (!profile) console.log("     profile row missing");
    report.push({ email: spec.email, ok, roles });
  }

  const noRolePerms = permissionsForRoles([]);
  const cms = [
    "programs.create",
    "programs.publish",
    "sermons.manage",
    "media.manage",
    "livestream.manage",
    "branches.manage",
    "users.manage",
    "giving.propose",
    "giving.approve",
  ];
  const leftover = cms.filter((p) => noRolePerms.has(p));
  if (leftover.length === 0) {
    console.log(
      "PASS authenticated-without-hub-roles — no CMS privileges in RBAC matrix",
    );
  } else {
    failed += 1;
    console.log(`FAIL authenticated-without-hub-roles — ${leftover.join(", ")}`);
  }

  console.log("");
  console.log("MFA: Hub layout redirects to /auth/mfa until AAL2. Sign in, enroll TOTP, then open /admin.");
  console.log(`  ${HUB_SIGN_IN}`);
  console.log(`  ${HUB_MFA}`);
  console.log(`  ${HUB_ADMIN}`);
  return failed === 0;
}

function printPlan() {
  console.log("KCMI staging Hub bootstrap plan (KCMI Platform - Staging)");
  console.log(`Auth Admin target: ${STAGING_URL}`);
  console.log("Users:");
  for (const spec of INTENDED_USERS) {
    console.log(`  - ${spec.email} → ${spec.role} (${spec.operatingName})`);
  }
  console.log("New users: Auth Admin createUser + email_confirm=true.");
  console.log("Existing users: confirm email + repair profile/role; password unchanged unless --reset-passwords.");
  console.log("Roles: upsert public.user_roles (PK user_id, role_id).");
  console.log("MFA: not enrolled by this script; Hub requires AAL2 before /admin.");
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
    printPlan();
    console.error("");
    console.error(
      "Refusing to mutate. Pass --dry-run, --verify, or --apply. Users are not created by this invocation.",
    );
    process.exit(2);
  }

  if (args.apply && args.verify) {
    console.error("Pass only one of --apply or --verify.");
    process.exit(1);
  }

  const { url, secret } = requireStagingEnv();
  const admin = createAdmin(url, secret);

  if (args.dryRun) {
    printPlan();
    console.log("");
    console.log("Current Auth state (read-only):");
    for (const spec of INTENDED_USERS) {
      const user = await findUserByEmail(admin, spec.email);
      console.log(
        `  ${spec.email}: ${user ? "exists" : "absent"}`,
      );
    }
    console.log("Dry-run complete. No users created or changed.");
    return;
  }

  if (args.verify) {
    const ok = await verify(admin);
    process.exit(ok ? 0 : 1);
  }

  if (args.resetPasswords && !args.apply) {
    console.error("--reset-passwords requires --apply.");
    process.exit(1);
  }

  printPlan();
  if (!stdin.isTTY) {
    throw new Error("--apply requires an interactive TTY.");
  }
  const typed = await promptLine(
    'Type "staging" to create/update the two Hub users: ',
  );
  if (typed !== "staging") {
    console.error("Confirmation mismatch. No users created.");
    process.exit(1);
  }

  const results = [];
  for (const spec of INTENDED_USERS) {
    results.push(
      await bootstrapOne(admin, spec, { resetPasswords: args.resetPasswords }),
    );
  }

  console.log("");
  console.log("Bootstrap apply finished (passwords not logged):");
  for (const row of results) {
    console.log(
      `  ${row.email}: created=${row.created} profile=${row.profileAction} roles=${row.roles.join(",")}`,
    );
    if (row.extraRoles.length > 0) {
      console.log(
        `    WARN extra roles present (not stripped): ${row.extraRoles.join(", ")}`,
      );
    }
  }
  console.log("");
  console.log("Next: each person signs in, enrolls TOTP, then uses Hub.");
  console.log(`  ${HUB_SIGN_IN}`);
  console.log("If a temporary password was chosen, rerun with --apply --reset-passwords");
  console.log("or set a new password in the Staging Auth dashboard as the operator");
  console.log("(do not add these emails as organization members).");
  console.log("Then: node scripts/bootstrap-staging-hub-users.mjs --verify");
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
