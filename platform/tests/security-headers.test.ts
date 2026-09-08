import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "@/lib/security/headers";

describe("security headers foundation", () => {
  it("includes HSTS without preload", () => {
    const hsts = securityHeaders.find((h) => h.key === "Strict-Transport-Security");
    expect(hsts?.value).toContain("max-age=");
    expect(hsts?.value.toLowerCase()).not.toContain("preload");
  });

  it("does not use script-src unsafe-inline in baseline CSP string", () => {
    const csp = contentSecurityPolicy();
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });
});
