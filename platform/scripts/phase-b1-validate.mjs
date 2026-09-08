/**
 * Phase B.1 local Auth/MFA + Hub gate validation.
 * LOCAL Supabase only. Synthetic identities. Never prints secrets.
 *
 * Usage (with Next already running on NEXT_PUBLIC_SITE_URL):
 *   npm run validate:b1
 */

import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { TOTP } = require("otpauth");

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) {
    throw new Error("Missing .env.local — create from local supabase status keys");
  }
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    const key = trimmed.slice(0, i);
    let val = trimmed.slice(i + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function result(id, pass, detail) {
  const status = pass ? "PASS" : "FAIL";
  console.log(`${status} ${id}${detail ? ` — ${detail}` : ""}`);
  return pass;
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
const site = process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000";
if (!url || !publishable || !secret) {
  console.error("FAIL env — missing local Supabase URL/publishable/secret in .env.local");
  process.exit(1);
}

const admin = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const password = "Local-Test-Only-Passw0rd!";
const stamp = Date.now();

const users = {
  staff: {
    email: `staff.localtest.${stamp}@example.invalid`,
    role: "media_admin",
  },
  super: {
    email: `super.localtest.${stamp}@example.invalid`,
    role: "super_admin",
  },
  inactive: {
    email: `inactive.localtest.${stamp}@example.invalid`,
    role: "media_admin",
  },
};

async function ensureUser(email, roleName, { inactive = false } = {}) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Local Synthetic Tester" },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  const id = created.user.id;

  const { data: role, error: roleErr } = await admin
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single();
  if (roleErr) throw roleErr;

  const { error: grantErr } = await admin.from("user_roles").insert({
    user_id: id,
    role_id: role.id,
  });
  if (grantErr) throw grantErr;

  if (inactive) {
    const { error: inactiveErr } = await admin
      .from("profiles")
      .update({ is_active: false })
      .eq("id", id);
    if (inactiveErr) throw inactiveErr;
  }

  return id;
}

function clientForUser() {
  return createClient(url, publishable, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchAdmin(cookie) {
  return fetch(`${site}/admin`, {
    redirect: "manual",
    headers: cookie ? { cookie } : {},
  });
}

async function hubSession(accessToken) {
  return fetch(`${site}/api/hub/session`, {
    headers: accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {},
  });
}

async function enrollAndVerify(c, friendlyName) {
  const enroll = await c.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
  });
  if (enroll.error) throw new Error(enroll.error.message);
  const totp = new TOTP({
    secret: enroll.data.totp.secret,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });
  return { enroll, totp, factorId: enroll.data.id };
}

async function main() {
  const outcomes = [];
  const createdIds = [];

  try {
    for (const key of Object.keys(users)) {
      const u = users[key];
      const id = await ensureUser(u.email, u.role, {
        inactive: key === "inactive",
      });
      u.id = id;
      createdIds.push(id);
    }

    // A — unauthenticated /admin
    {
      const res = await fetchAdmin();
      const loc = res.headers.get("location") || "";
      outcomes.push(
        result(
          "A",
          (res.status === 307 || res.status === 302) &&
            loc.includes("/auth/sign-in"),
          `status=${res.status} location=${loc}`,
        ),
      );

      const probe = await hubSession(null);
      outcomes.push(
        result("A.api", probe.status === 401, `api status=${probe.status}`),
      );
    }

    // B — authenticated without MFA → MFA gate
    {
      const c = clientForUser();
      const { data, error } = await c.auth.signInWithPassword({
        email: users.staff.email,
        password,
      });
      if (error) throw error;

      const aal = await c.auth.mfa.getAuthenticatorAssuranceLevel();
      outcomes.push(
        result(
          "B.aal",
          aal.data?.currentLevel === "aal1",
          `currentLevel=${aal.data?.currentLevel}`,
        ),
      );

      const probe = await hubSession(data.session.access_token);
      const body = await probe.json();
      outcomes.push(
        result(
          "B",
          body.gate === "mfa" && body.aal2ActionAllowed === false,
          `gate=${body.gate} aal=${body.aal}`,
        ),
      );

      // F — AAL1 cannot pass aal2 action
      outcomes.push(
        result(
          "F",
          body.aal2ActionAllowed === false && body.aal2DenyReason === "aal2_required",
          `aal2ActionAllowed=${body.aal2ActionAllowed}`,
        ),
      );

      // C — TOTP enrollment
      const { enroll, totp, factorId } = await enrollAndVerify(
        c,
        "Local Test TOTP",
      );
      outcomes.push(
        result(
          "C",
          !enroll.error && Boolean(enroll.data?.totp?.secret),
          enroll.error?.message,
        ),
      );

      // E — invalid TOTP fails
      const badChallenge = await c.auth.mfa.challenge({ factorId });
      const badVerify = await c.auth.mfa.verify({
        factorId,
        challengeId: badChallenge.data.id,
        code: "000000",
      });
      outcomes.push(
        result(
          "E",
          Boolean(badVerify.error),
          badVerify.error?.message || "unexpected success",
        ),
      );

      // D — correct TOTP → AAL2
      const goodChallenge = await c.auth.mfa.challenge({ factorId });
      const goodVerify = await c.auth.mfa.verify({
        factorId,
        challengeId: goodChallenge.data.id,
        code: totp.generate(),
      });
      const aal2 = await c.auth.mfa.getAuthenticatorAssuranceLevel();
      outcomes.push(
        result(
          "D",
          !goodVerify.error && aal2.data?.currentLevel === "aal2",
          `verifyErr=${goodVerify.error?.message || "none"} aal=${aal2.data?.currentLevel}`,
        ),
      );

      // G — AAL2 authorized
      const { data: refreshed } = await c.auth.getSession();
      const probe2 = await hubSession(refreshed.session.access_token);
      const body2 = await probe2.json();
      outcomes.push(
        result(
          "G",
          body2.gate === "ok" &&
            body2.aal2ActionAllowed === true &&
            body2.aal === "aal2",
          `gate=${body2.gate} aal=${body2.aal}`,
        ),
      );

      // H — logout
      await c.auth.signOut();
      const after = await c.auth.getSession();
      const probeAfter = await hubSession(
        after.data.session?.access_token || "invalid",
      );
      const adminAfter = await fetchAdmin();
      const locAfter = adminAfter.headers.get("location") || "";
      outcomes.push(
        result(
          "H",
          !after.data.session &&
            locAfter.includes("/auth/sign-in") &&
            (probeAfter.status === 401 || probeAfter.status === 403),
          `session=${Boolean(after.data.session)} admin=${adminAfter.status} api=${probeAfter.status}`,
        ),
      );
    }

    // I — inactive denied
    {
      const c = clientForUser();
      const { error } = await c.auth.signInWithPassword({
        email: users.inactive.email,
        password,
      });
      if (error) throw error;

      const { totp, factorId } = await enrollAndVerify(
        c,
        "Inactive Local TOTP",
      );
      const ch = await c.auth.mfa.challenge({ factorId });
      await c.auth.mfa.verify({
        factorId,
        challengeId: ch.data.id,
        code: totp.generate(),
      });
      const { data: sess } = await c.auth.getSession();
      const probe = await hubSession(sess.session.access_token);
      const body = await probe.json();
      outcomes.push(
        result(
          "I",
          probe.status === 403 && body.gate === "inactive",
          `status=${probe.status} gate=${body.gate}`,
        ),
      );
      await c.auth.signOut();
    }

    // J — Super Admin pastoral exclusion
    {
      const { data: perms } = await admin
        .from("role_permissions")
        .select("permissions(name), roles!inner(name)")
        .eq("roles.name", "super_admin");
      const names = (perms || [])
        .map((r) => r.permissions?.name)
        .filter(Boolean);
      const pastoral = names.filter((n) =>
        ["prayer.read", "counselling.read", "welfare.read"].includes(n),
      );
      outcomes.push(
        result(
          "J",
          pastoral.length === 0,
          `pastoralPerms=${pastoral.join(",") || "none"}`,
        ),
      );

      const c = clientForUser();
      await c.auth.signInWithPassword({
        email: users.super.email,
        password,
      });
      const { totp, factorId } = await enrollAndVerify(c, "Super Local TOTP");
      const ch = await c.auth.mfa.challenge({ factorId });
      await c.auth.mfa.verify({
        factorId,
        challengeId: ch.data.id,
        code: totp.generate(),
      });
      const { data: sess } = await c.auth.getSession();
      const probe = await hubSession(sess.session.access_token);
      const body = await probe.json();
      const hasPastoral = (body.permissions || []).some((p) =>
        ["prayer.read", "counselling.read", "welfare.read"].includes(p),
      );
      outcomes.push(
        result(
          "J.session",
          body.gate === "ok" && !hasPastoral,
          `gate=${body.gate} pastoralLeak=${hasPastoral}`,
        ),
      );
      await c.auth.signOut();
    }
  } catch (err) {
    console.error("FAIL suite —", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    for (const id of createdIds) {
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
  }

  const failed = outcomes.filter((x) => x === false).length;
  console.log(
    `\nSummary: ${outcomes.length - failed} passed / ${failed} failed (of ${outcomes.length} checks)`,
  );
  if (failed > 0) process.exitCode = 1;
}

main();
