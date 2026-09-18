import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROLE_PERMISSIONS,
  mergeStaffPermissions,
  permissionsForRoles,
} from "@/lib/authorization/rbac";
import { requiresMfaEnrollment } from "@/lib/auth/session";
import { getGivingAccountsSeed } from "@/content";
import { defaultHomeDocument, defaultServicesDocument } from "@/content/website/defaults";
import { privacyPolicy } from "@/content/seed/legal-privacy";
import {
  isPastoralIntakeEnabled,
} from "@/lib/care/pastoral-intake";
import { isPrayerIntakeEnabled } from "@/lib/care/prayer-intake";
import { isWelfareIntakeEnabled } from "@/lib/care/welfare-intake";
import { serviceOfferings } from "@/content/seed/pages";
import { prayerCta } from "@/content/seed/engagement";

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function collectPublicRuntimeSources(): string[] {
  const roots = [
    "src/app/(site)",
    "src/app/events",
    "src/app/not-found.tsx",
    "src/components/home",
    "src/components/layout",
    "src/components/content",
    "src/components/events",
    "src/components/search",
    "src/components/care",
    "src/components/prayer",
    "src/content/seed",
    "src/content/website/defaults.ts",
    "src/content/website/public-map.ts",
    "src/content/website/resolve.ts",
    "src/lib/care",
  ];
  const files: string[] = [];
  for (const root of roots) {
    const abs = resolve(process.cwd(), root);
    try {
      const st = readFileSync(abs);
      if (st) files.push(root);
      continue;
    } catch {
      // directory
    }
    const walk = (dir: string, rel: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const nextAbs = resolve(dir, entry.name);
        const nextRel = `${rel}/${entry.name}`;
        if (entry.isDirectory()) walk(nextAbs, nextRel);
        else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(nextRel);
      }
    };
    walk(abs, root);
  }
  return files;
}

describe("handover care_operator + staff matrix", () => {
  it("defines care_operator exact permissions", () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.care_operator;
    expect([...perms].sort()).toEqual(
      [
        "counselling.assign",
        "counselling.read",
        "hub.access",
        "prayer.assign",
        "prayer.read",
        "welfare.assign",
        "welfare.read",
      ].sort(),
    );
    for (const blocked of [
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
    ]) {
      expect(perms.includes(blocked as never)).toBe(false);
    }
  });

  it("keeps super_admin without Care by default", () => {
    const perms = permissionsForRoles(["super_admin"]);
    expect(perms.has("users.manage")).toBe(true);
    expect(perms.has("prayer.read")).toBe(false);
  });

  it("Tech effective roles = super_admin + care_operator (DB Care grants)", () => {
    const merged = mergeStaffPermissions(
      ["super_admin", "care_operator"],
      [...DEFAULT_ROLE_PERMISSIONS.care_operator],
    );
    expect(merged.includes("users.manage")).toBe(true);
    expect(merged.includes("prayer.read")).toBe(true);
    expect(merged.includes("welfare.assign")).toBe(true);
  });

  it("Media = media_admin only without Care/giving/users", () => {
    const perms = permissionsForRoles(["media_admin"]);
    expect(perms.has("media.manage")).toBe(true);
    expect(perms.has("prayer.read")).toBe(false);
    expect(perms.has("giving.approve")).toBe(false);
    expect(perms.has("users.manage")).toBe(false);
  });

  it("Chris = care_operator only", () => {
    const merged = mergeStaffPermissions(
      ["care_operator"],
      [...DEFAULT_ROLE_PERMISSIONS.care_operator],
    );
    expect(merged.includes("hub.access")).toBe(true);
    expect(merged.includes("prayer.assign")).toBe(true);
    expect(merged.includes("users.manage")).toBe(false);
    expect(merged.includes("media.manage")).toBe(false);
    expect(merged.includes("audit.read")).toBe(false);
  });
});

describe("handover zero public Google Forms", () => {
  it("has no forms.gle or docs.google.com/forms in public runtime sources", () => {
    const files = collectPublicRuntimeSources();
    expect(files.length).toBeGreaterThan(20);
    for (const file of files) {
      const source = readSrc(file);
      expect(source, file).not.toMatch(/forms\.gle/);
      expect(source, file).not.toMatch(/docs\.google\.com\/forms/);
    }
  });

  it("routes Prayer/Pastoral/Welfare and ministry CTAs internally", () => {
    expect(prayerCta.ctaHref).toBe("/prayer");
    expect(defaultHomeDocument.prayerCtaHref).toBe("/prayer");
    expect(defaultServicesDocument.cellCta.href).toBe("/contact");
    expect(defaultServicesDocument.teamsCta.href).toBe("/contact");
    expect(defaultServicesDocument.careLinks.map((l) => l.href)).toEqual([
      "/prayer",
      "/pastoral-care",
      "/welfare",
    ]);
    expect(
      defaultServicesDocument.careLinks.some((l) =>
        /celebrat/i.test(l.label),
      ),
    ).toBe(false);
    expect(defaultServicesDocument.testimoniesTitle).toMatch(/Testimonies/i);
    expect(defaultServicesDocument.testimoniesCta.href).toBe("/contact");

    const care = serviceOfferings.find((o) => o.id === "care");
    expect(care?.links?.map((l) => l.href)).toEqual([
      "/prayer",
      "/pastoral-care",
      "/welfare",
    ]);
    const cell = serviceOfferings.find((o) => o.id === "cell-fellowships");
    expect(cell?.cta?.href).toBe("/contact");
    const teams = serviceOfferings.find((o) => o.id === "service-teams");
    expect(teams?.cta?.href).toBe("/contact");
  });

  it("Care gate-off never exposes Google Form and stays fail-closed", () => {
    delete process.env.KCMI_PRAYER_INTAKE_ENABLED;
    delete process.env.KCMI_PASTORAL_INTAKE_ENABLED;
    delete process.env.KCMI_WELFARE_INTAKE_ENABLED;
    expect(isPrayerIntakeEnabled()).toBe(false);
    expect(isPastoralIntakeEnabled()).toBe(false);
    expect(isWelfareIntakeEnabled()).toBe(false);

    for (const path of [
      "src/app/(site)/prayer/page.tsx",
      "src/app/(site)/pastoral-care/page.tsx",
      "src/app/(site)/welfare/page.tsx",
    ]) {
      const source = readSrc(path);
      expect(source).toContain("CareIntakeUnavailable");
      expect(source).not.toMatch(/forms\.gle|LEGACY_.*GOOGLE_FORM/);
    }

    const unavailable = readSrc(
      "src/components/care/care-intake-unavailable.tsx",
    );
    expect(unavailable).toContain('href="/contact"');
    expect(unavailable).toMatch(/temporarily unavailable/i);
    expect(unavailable).not.toMatch(/forms\.gle|docs\.google\.com\/forms/);
  });

  it("Privacy no longer claims Care relies on Google Forms", () => {
    const text = privacyPolicy.sections
      .flatMap((s) => s.paragraphs)
      .join("\n");
    expect(text).not.toMatch(/Google Forms/i);
    expect(text).toMatch(/Prayer, Pastoral Care, and Welfare/i);
    expect(text).toMatch(/protected application and database/i);
    expect(text).toMatch(/not an emergency service/i);
    expect(text).toMatch(/Automated Care retention/i);
  });

  it("Giving values and MFA requirements remain intact", () => {
    const accounts = getGivingAccountsSeed();
    expect(accounts[0]?.accountNumber).toBe("1602002211");
    expect(accounts[1]?.accountNumber).toBe("0055484937");
    expect(accounts[2]?.swiftCode).toBe("ZEIBNGLA");
    expect(requiresMfaEnrollment("aal1")).toBe(true);
    expect(requiresMfaEnrollment("aal2")).toBe(false);
    expect(readSrc("src/app/admin/layout.tsx")).toContain(
      'redirect("/auth/mfa")',
    );
  });
});

describe("handover bootstrap tooling", () => {
  it("handover script targets the three production identities", () => {
    const source = readSrc("scripts/bootstrap-production-handover-staff.mjs");
    expect(source).toContain("tech@kcmi-rcc.org");
    expect(source).toContain("kingdomcovenantministriesinter@gmail.com");
    expect(source).toContain("christophercookey@gmail.com");
    expect(source).toContain('"super_admin", "care_operator"');
    expect(source).toContain('"media_admin"');
    expect(source).toContain("care_operator");
    expect(source).toContain("inviteUserByEmail");
    expect(source).toContain("redirectTo: site.inviteRedirect");
    expect(source).not.toMatch(/createUser\s*\(/);
  });

  it("derives invite redirect from NEXT_PUBLIC_SITE_URL and rejects vercel.app", () => {
    const source = readSrc("scripts/bootstrap-production-handover-staff.mjs");
    expect(source).toContain(
      'REQUIRED_PRODUCTION_SITE_URL = "https://www.kcmi-rcc.org"',
    );
    expect(source).toContain("resolveProductionSiteUrls");
    expect(source).toContain("NEXT_PUBLIC_SITE_URL");
    expect(source).toContain(
      "inviteRedirect: `${confirm}?next=/auth/set-password`",
    );
    expect(source).toMatch(/\.vercel\.app/);
    expect(source).toMatch(
      /production handover invites must not use a \.vercel\.app hostname/,
    );
    expect(source).not.toContain(
      "kcmi-platform-production-ten.vercel.app",
    );
  });

  it("migration defines care_operator and expands assignable staff", () => {
    const sql = readSrc(
      "supabase/migrations/20260920120000_care_operator_role.sql",
    );
    expect(sql).toContain("'care_operator'");
    expect(sql).toContain("'prayer.assign'");
    expect(sql).toContain("care_operator");
    expect(sql).toMatch(/r\.name in \('pastor', 'pastoral_admin', 'care_operator'\)/);
    expect(sql).toContain("forms.gle/gKTwNc9gNiVCWWrJ6");
  });
});
