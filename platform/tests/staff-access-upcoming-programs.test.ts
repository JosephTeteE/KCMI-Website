import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  isScheduledUpcomingForHomepage,
  isProgramVisibleOnUpcomingSurfaces,
  nextUpcomingSessionStartIso,
} from "@/lib/programs/expiry";
import {
  isStaffAssignableRole,
  parseAssignableRolesFromForm,
  STAFF_ASSIGNABLE_ROLE_PRESETS,
} from "@/lib/hub/staff-presets";
import { staffInviteRedirectTo } from "@/lib/hub/staff-invite-url";
import { roleHasPermission, permissionsForRoles } from "@/lib/authorization/rbac";

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function form(entries: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    if (Array.isArray(v)) {
      for (const item of v) fd.append(k, item);
    } else {
      fd.set(k, v);
    }
  }
  return fd;
}

describe("Staff & Access authorization contracts", () => {
  it("requires users.manage and only super_admin has it by default", () => {
    expect(roleHasPermission("super_admin", "users.manage")).toBe(true);
    expect(roleHasPermission("media_admin", "users.manage")).toBe(false);
    expect(roleHasPermission("care_operator", "users.manage")).toBe(false);
    expect(permissionsForRoles(["media_admin"]).has("users.manage")).toBe(
      false,
    );
    expect(permissionsForRoles(["care_operator"]).has("users.manage")).toBe(
      false,
    );
  });

  it("gates /admin/users page and actions on users.manage + AAL2 helper", () => {
    const page = readSrc("src/app/admin/users/page.tsx");
    const actions = readSrc("src/app/admin/users/actions.ts");
    const nav = readSrc("src/components/layout/hub-nav.tsx");
    expect(page).toContain('staffHasPermission(session.profile, "users.manage")');
    expect(page).toContain("Your account cannot manage Hub staff");
    expect(actions).toContain('requireStaffAction("users.manage")');
    expect(actions).toContain("inviteUserByEmail");
    expect(nav).toContain("Staff & Access");
    expect(nav).toContain('permissions.includes("users.manage")');
  });

  it("never exposes secret key or TOTP material in Staff UI", () => {
    const panel = readSrc("src/components/hub/staff-access-panel.tsx");
    const page = readSrc("src/app/admin/users/page.tsx");
    const actions = readSrc("src/app/admin/users/actions.ts");
    for (const source of [panel, page, actions]) {
      expect(source).not.toMatch(/SUPABASE_SECRET_KEY/);
      expect(source).not.toMatch(/service_role/i);
      expect(source).not.toContain("totp_secret");
      expect(source).not.toContain("qr");
      expect(source).not.toContain("password_hash");
    }
    expect(actions).toContain('from "@/lib/supabase/admin"');
    expect(panel).not.toContain("@/lib/supabase/admin");
  });

  it("invite redirect uses canonical site URL helper and rejects vercel.app", () => {
    const actions = readSrc("src/app/admin/users/actions.ts");
    expect(actions).toContain("staffInviteRedirectTo");
    expect(actions).toContain("inviteUserByEmail");
    expect(actions).toContain(
      "This person already has a KCMI Hub account. You can update their access below.",
    );
    const prev = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.kcmi-rcc.org";
    expect(staffInviteRedirectTo()).toBe(
      "https://www.kcmi-rcc.org/auth/confirm?next=/auth/set-password",
    );
    process.env.NEXT_PUBLIC_SITE_URL = "https://kcmi-platform.vercel.app";
    expect(() => staffInviteRedirectTo()).toThrow(/vercel\.app/);
    if (prev === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prev;
  });

  it("assignable presets exclude super_admin and map to real roles", () => {
    const roles = STAFF_ASSIGNABLE_ROLE_PRESETS.map((p) => p.role);
    expect(roles).toContain("media_admin");
    expect(roles).toContain("care_operator");
    expect(roles).toContain("prayer_staff");
    expect(roles).toContain("finance_reviewer");
    expect(roles).not.toContain("super_admin");
    expect(isStaffAssignableRole("super_admin")).toBe(false);
    expect(
      parseAssignableRolesFromForm(
        form({ roles: ["media_admin", "super_admin", "care_operator"] }),
      ),
    ).toEqual(["media_admin", "care_operator"]);
  });

  it("role updates go through user_roles and preserve Super Admin safeguards", () => {
    const actions = readSrc("src/app/admin/users/actions.ts");
    expect(actions).toContain('.from("user_roles")');
    expect(actions).toContain("preserveSuperAdmin");
    expect(actions).toContain("staff.roles.updated");
    expect(actions).toContain("staff.access.disabled");
    expect(actions).toContain("staff.invited");
    expect(actions).toContain(
      "Super Admin accounts cannot have all access removed from this screen.",
    );
    expect(actions).toContain(
      "You cannot disable your own Hub access from this screen.",
    );
  });

  it("pending staff get resend setup; confirmed staff get password reset", () => {
    const panel = readSrc("src/components/hub/staff-access-panel.tsx");
    const actions = readSrc("src/app/admin/users/actions.ts");
    expect(panel).toContain('accountStatus === "invitation_pending"');
    expect(panel).toContain("Resend setup email");
    expect(panel).toContain("resendStaffSetupEmail");
    expect(panel).toContain('accountStatus === "active"');
    expect(panel).toContain("Password & sign-in");
    expect(panel).toContain("Send password reset");
    expect(panel).toContain("sendStaffPasswordReset");
    expect(actions).toContain("export async function resendStaffSetupEmail");
    expect(actions).toContain("export async function sendStaffPasswordReset");
    expect(actions).toContain("inviteUserByEmail");
    expect(actions).toContain("resetPasswordForEmail");
    expect(actions).toContain("staff.invitation.resent");
    expect(actions).toContain("staff.password_reset.sent");
    expect(actions).toContain("Setup email sent.");
    expect(actions).toContain("Password reset email sent.");
  });

  it("staff email actions require users.manage, use canonical redirect, never delete Auth users or audit secrets", () => {
    const actions = readSrc("src/app/admin/users/actions.ts");
    const panel = readSrc("src/components/hub/staff-access-panel.tsx");
    const requireCount = (
      actions.match(/requireStaffAction\("users\.manage"\)/g) ?? []
    ).length;
    expect(requireCount).toBeGreaterThanOrEqual(4);
    expect(roleHasPermission("media_admin", "users.manage")).toBe(false);
    expect(roleHasPermission("care_operator", "users.manage")).toBe(false);
    expect(actions).toContain("staffInviteRedirectTo");
    expect(actions).not.toContain("deleteUser");
    expect(actions).not.toContain("deleteUserById");
    expect(actions).not.toMatch(/action_link|email_otp|hashed_token|recovery_link/);
    expect(actions).not.toMatch(/totp_secret|password_hash|SUPABASE_SECRET_KEY/);
    expect(panel).not.toMatch(/action_link|email_otp|hashed_token|token_hash/);
    expect(panel).not.toMatch(/SUPABASE_SECRET_KEY|totp_secret|password_hash/);
    const prev = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.kcmi-rcc.org";
    expect(staffInviteRedirectTo()).toBe(
      "https://www.kcmi-rcc.org/auth/confirm?next=/auth/set-password",
    );
    if (prev === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prev;
  });
});

describe("Homepage Upcoming Programs", () => {
  it("section omits itself when empty and links to program slug", () => {
    const section = readSrc("src/components/home/upcoming-programs-section.tsx");
    const home = readSrc("src/app/(site)/page.tsx");
    expect(section).toContain("View Program");
    expect(section).toContain("program.href");
    expect(section).toContain("if (visible.length === 0)");
    expect(section).toContain("return null");
    expect(home).toContain("UpcomingProgramsSection");
    expect(home).toContain("fetchUpcomingProgramsForHomepage");
  });

  it("shows scheduled upcoming and hides expired / unscheduled from homepage list", () => {
    const now = new Date("2026-09-19T12:00:00.000Z");
    expect(
      isScheduledUpcomingForHomepage(
        [{ sessionDate: "2026-12-01", startTime: "17:30", endTime: null }],
        { timeZone: "Africa/Lagos", now },
      ),
    ).toBe(true);
    expect(
      isScheduledUpcomingForHomepage(
        [{ sessionDate: "2020-01-01", startTime: "10:00", endTime: "12:00" }],
        { timeZone: "Africa/Lagos", now },
      ),
    ).toBe(false);
    expect(isScheduledUpcomingForHomepage([], { now })).toBe(false);
    // Search/featured surfaces may still keep unscheduled published programs.
    expect(isProgramVisibleOnUpcomingSurfaces([], { now })).toBe(true);
  });

  it("sorts by next upcoming occurrence across multiple sessions", () => {
    const now = new Date("2026-09-19T12:00:00.000Z");
    const sessions = [
      { sessionDate: "2026-09-27", startTime: "08:00", endTime: null },
      { sessionDate: "2026-09-23", startTime: "17:30", endTime: null },
      { sessionDate: "2026-09-26", startTime: "09:00", endTime: null },
    ];
    const next = nextUpcomingSessionStartIso(sessions, {
      timeZone: "Africa/Lagos",
      now,
    });
    const earlier = nextUpcomingSessionStartIso(
      [{ sessionDate: "2026-09-23", startTime: "17:30", endTime: null }],
      { timeZone: "Africa/Lagos", now },
    );
    expect(next).toBe(earlier);
  });

  it("fetcher rejects drafts by querying published only", () => {
    const fetcher = readSrc("src/lib/programs/upcoming-homepage.ts");
    expect(fetcher).toContain('.eq("status", "published")');
    expect(fetcher).toContain("isScheduledUpcomingForHomepage");
    expect(fetcher).toContain("`/programs/${row.slug}`");
  });
});
