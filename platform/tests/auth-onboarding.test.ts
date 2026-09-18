import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROLE_PERMISSIONS,
  HUB_ROLES,
} from "@/lib/authorization/rbac";
import { requiresMfaEnrollment } from "@/lib/auth/session";
import {
  FORGOT_PASSWORD_GENERIC_CONFIRMATION,
  humanAuthNotice,
  humanPasswordUpdateError,
} from "@/lib/hub/humanize";

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("production auth onboarding + recovery UX", () => {
  const confirm = readSrc("src/app/auth/confirm/route.ts");
  const setPasswordForm = readSrc(
    "src/components/auth/set-password-form.tsx",
  );
  const setPasswordPage = readSrc("src/app/auth/set-password/page.tsx");
  const forgotForm = readSrc("src/components/auth/forgot-password-form.tsx");
  const forgotPage = readSrc("src/app/auth/forgot-password/page.tsx");
  const signInForm = readSrc("src/components/auth/sign-in-form.tsx");
  const signInPage = readSrc("src/app/auth/sign-in/page.tsx");
  const adminLayout = readSrc("src/app/admin/layout.tsx");
  const rbac = readSrc("src/lib/authorization/rbac.ts");

  it("sign-in offers Forgot password and password-manager-friendly fields", () => {
    expect(signInForm).toContain('href="/auth/forgot-password"');
    expect(signInForm).toContain("Forgot password?");
    expect(signInForm).toContain('autoComplete="email"');
    expect(signInForm).toContain('autoComplete="current-password"');
    expect(signInForm).not.toMatch(/onPaste|onDrop|autoComplete=["']off["']/);
    expect(signInPage).toContain("SignInForm");
  });

  it("set-password and forgot-password allow paste with new-password/email autocomplete", () => {
    expect(setPasswordForm).toContain('autoComplete="new-password"');
    expect(setPasswordForm).not.toMatch(/onPaste|onDrop|autoComplete=["']off["']/);
    expect(forgotForm).toContain('autoComplete="email"');
    expect(forgotForm).not.toMatch(/onPaste|onDrop|autoComplete=["']off["']/);
    expect(setPasswordPage).toContain("SetPasswordForm");
    expect(forgotPage).toContain("ForgotPasswordForm");
  });

  it("invite confirmation verifies OTP and routes to Set Password", () => {
    expect(confirm).toContain("verifyOtp");
    expect(confirm).toContain("token_hash");
    expect(confirm).toContain("exchangeCodeForSession");
    expect(confirm).toContain("createServerClient");
    expect(confirm).toContain("redirectResponse.cookies.set");
    expect(confirm).toContain("safeAuthNextPath");
    expect(confirm).not.toMatch(/console\.(log|info|debug).*token/i);
    // Must not dump users onto bare sign-in after successful confirm.
    expect(confirm).not.toMatch(
      /NextResponse\.redirect\([^)]*\/auth\/sign-in["']\s*\)/,
    );
  });

  it("recovery confirmation also targets Set Password", () => {
    expect(confirm).toContain('"recovery"');
    expect(confirm).toContain("AUTH_SET_PASSWORD_PATH");
    expect(forgotForm).toContain("resetPasswordForEmail");
    expect(forgotForm).toContain(
      "/auth/confirm?next=/auth/set-password",
    );
  });

  it("set password requires a valid session and handles mismatch", () => {
    expect(setPasswordForm).toContain("getUser");
    expect(setPasswordForm).toContain("sessionState");
    expect(setPasswordForm).toContain("missing");
    expect(setPasswordForm).toContain("updateUser");
    expect(setPasswordForm).toContain("Those passwords do not match");
    expect(setPasswordForm).toContain('"/auth/mfa"');
    expect(setPasswordForm).not.toContain("oldPassword");
    expect(setPasswordForm).not.toContain("current-password");
  });

  it("forgot-password uses a generic confirmation message", () => {
    expect(FORGOT_PASSWORD_GENERIC_CONFIRMATION).toBe(
      "If an account exists for that email, a recovery link has been sent.",
    );
    expect(forgotForm).toContain("FORGOT_PASSWORD_GENERIC_CONFIRMATION");
    expect(forgotForm).toContain("resetPasswordForEmail");
  });

  it("keeps MFA required for Hub and does not weaken enrollment", () => {
    expect(requiresMfaEnrollment("aal1")).toBe(true);
    expect(requiresMfaEnrollment(null)).toBe(true);
    expect(requiresMfaEnrollment("aal2")).toBe(false);
    expect(adminLayout).toContain("requiresMfaEnrollment");
    expect(adminLayout).toContain('redirect("/auth/mfa")');
    expect(setPasswordForm).toContain('router.replace("/auth/mfa")');
  });

  it("does not alter RBAC role matrix in this auth batch", () => {
    expect(HUB_ROLES).toContain("super_admin");
    expect(DEFAULT_ROLE_PERMISSIONS.super_admin).toContain("hub.access");
    expect(DEFAULT_ROLE_PERMISSIONS.super_admin).not.toContain("prayer.read");
    expect(rbac).toContain("super_admin");
    expect(confirm).not.toContain("user_roles");
    expect(setPasswordForm).not.toContain("user_roles");
  });

  it("maps auth notices without exposing raw tokens", () => {
    expect(humanAuthNotice("auth-link-invalid")).toMatch(/expired|invalid/i);
    expect(humanAuthNotice("auth-link-invalid")).not.toMatch(/token_hash|otp/i);
    expect(humanPasswordUpdateError("Auth session missing")).toMatch(/expired/i);
    expect(humanPasswordUpdateError("Password should be at least 8 characters")).toMatch(
      /short|guess/i,
    );
  });
});
