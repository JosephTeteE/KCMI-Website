import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/authorization/rbac";

const SCRIPT = resolve(
  process.cwd(),
  "scripts/bootstrap-production-tech-admin.mjs",
);

describe("production tech admin bootstrap script guards", () => {
  const source = readFileSync(SCRIPT, "utf8");

  it("targets only production project ref and tech@kcmi-rcc.org", () => {
    expect(source).toContain('PRODUCTION_PROJECT_REF = "rujbdozepzcsmeuexdle"');
    expect(source).toContain('TARGET_EMAIL = "tech@kcmi-rcc.org"');
    expect(source).toContain('TARGET_ROLE = "super_admin"');
    expect(source).toContain("inviteUserByEmail");
    expect(source).not.toMatch(/createUser\s*\(/);
    expect(source).not.toContain("christophercookey@gmail.com");
    expect(source).not.toContain("kingdomcovenantministriesinter@gmail.com");
  });

  it("requires production confirm + environment and refuses staging", () => {
    expect(source).toContain('KCMI_BOOTSTRAP_CONFIRM=production');
    expect(source).toContain("KCMI_ENVIRONMENT=production");
    expect(source).toContain("rjzpiikvvetfxveowvkf");
    expect(source).toMatch(/staging project ref detected/i);
    expect(source).toMatch(/Type "production"/);
  });

  it("never accepts password/secret argv and does not enroll MFA", () => {
    expect(source).toMatch(/Passwords and secrets must not be passed/);
    expect(source).toMatch(/MFA: not enrolled by this script/);
    expect(source).not.toMatch(/enrollFactor|challengeAndVerify/);
    expect(source).not.toMatch(/promptHidden|getpass/);
  });

  it("expects super_admin grants aligned with RBAC matrix", () => {
    const expected = DEFAULT_ROLE_PERMISSIONS.super_admin;
    for (const perm of expected) {
      expect(source).toContain(`"${perm}"`);
    }
    for (const blocked of [
      "prayer.read",
      "counselling.read",
      "welfare.read",
    ]) {
      expect(source).toContain(`"${blocked}"`);
    }
  });

  it("points invite redirect at the production Vercel origin", () => {
    expect(source).toContain(
      'PROD_ORIGIN = "https://kcmi-platform-production-ten.vercel.app"',
    );
    expect(source).toContain("PROD_SIGN_IN");
    expect(source).toContain("redirectTo: PROD_SIGN_IN");
  });
});
