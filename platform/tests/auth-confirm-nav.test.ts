import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_SET_PASSWORD_PATH,
  isSafeHubHistoryReferrer,
  safeAuthNextPath,
} from "@/lib/auth/confirm-redirect";

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("auth confirm redirect contract", () => {
  it("safeAuthNextPath only allows /auth/* relatives", () => {
    expect(safeAuthNextPath(null)).toBe(AUTH_SET_PASSWORD_PATH);
    expect(safeAuthNextPath("/auth/set-password")).toBe("/auth/set-password");
    expect(safeAuthNextPath("/auth/mfa")).toBe("/auth/mfa");
    expect(safeAuthNextPath("/admin")).toBe(AUTH_SET_PASSWORD_PATH);
    expect(safeAuthNextPath("//evil.example/auth/set-password")).toBe(
      AUTH_SET_PASSWORD_PATH,
    );
    expect(safeAuthNextPath("https://evil.example/")).toBe(
      AUTH_SET_PASSWORD_PATH,
    );
  });

  it("confirm route attaches cookies onto the redirect response", () => {
    const confirm = readSrc("src/app/auth/confirm/route.ts");
    expect(confirm).toContain("createServerClient");
    expect(confirm).toContain("verifyOtp");
    expect(confirm).toContain("token_hash");
    expect(confirm).toContain("exchangeCodeForSession");
    expect(confirm).toContain("redirectResponse.cookies.set");
    expect(confirm).toContain("NextResponse.redirect");
    expect(confirm).toContain("setAll");
    expect(confirm).not.toMatch(/from \"@\/lib\/supabase\/server\"/);
  });

  it("forgot-password redirectTo uses confirm + set-password on current origin", () => {
    const forgot = readSrc("src/components/auth/forgot-password-form.tsx");
    expect(forgot).toContain("resetPasswordForEmail");
    expect(forgot).toContain(
      "`${window.location.origin}/auth/confirm?next=/auth/set-password`",
    );
  });

  it("handover + tech bootstrap require www and reject vercel.app", () => {
    const handover = readSrc(
      "scripts/bootstrap-production-handover-staff.mjs",
    );
    const tech = readSrc("scripts/bootstrap-production-tech-admin.mjs");
    for (const source of [handover, tech]) {
      expect(source).toContain(
        'REQUIRED_PRODUCTION_SITE_URL = "https://www.kcmi-rcc.org"',
      );
      expect(source).toContain("resolveProductionSiteUrls");
      expect(source).toMatch(/\.vercel\.app/);
      expect(source).not.toContain(
        "kcmi-platform-production-ten.vercel.app",
      );
      expect(source).toContain(
        "inviteRedirect: `${confirm}?next=/auth/set-password`",
      );
    }
  });

  it("MFA page challenges existing factors after password reset", () => {
    const mfa = readSrc("src/app/auth/mfa/page.tsx");
    expect(mfa).toContain("listFactors");
    expect(mfa).toContain('setMode("challenge")');
    expect(mfa).toContain("mfa.enroll");
    expect(mfa).toContain('router.replace("/admin")');
  });
});

describe("hub history referrer safety", () => {
  it("allows same-origin /admin referrers only", () => {
    expect(
      isSafeHubHistoryReferrer(
        "https://www.kcmi-rcc.org/admin/programs",
        "https://www.kcmi-rcc.org",
      ),
    ).toBe(true);
    expect(
      isSafeHubHistoryReferrer(
        "https://www.kcmi-rcc.org/admin",
        "https://www.kcmi-rcc.org",
      ),
    ).toBe(true);
    expect(
      isSafeHubHistoryReferrer(
        "https://evil.example/admin",
        "https://www.kcmi-rcc.org",
      ),
    ).toBe(false);
    expect(
      isSafeHubHistoryReferrer(
        "https://www.kcmi-rcc.org/prayer",
        "https://www.kcmi-rcc.org",
      ),
    ).toBe(false);
    expect(isSafeHubHistoryReferrer("", "https://www.kcmi-rcc.org")).toBe(
      false,
    );
  });

  it("HubPageHeader uses HubBackLink with fallback parent", () => {
    const header = readSrc("src/components/hub/hub-page-header.tsx");
    const back = readSrc("src/components/hub/hub-back-link.tsx");
    expect(header).toContain("HubBackLink");
    expect(back).toContain("router.back()");
    expect(back).toContain("isSafeHubHistoryReferrer");
    expect(back).toContain("router.push(fallbackHref)");
  });
});
