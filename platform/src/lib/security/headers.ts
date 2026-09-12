/**
 * Foundation security headers for Next.js (Phase B).
 * CSP: avoid broad unsafe-inline. See docs/CSP_SPIKE.md for nonce/Proxy tradeoffs.
 */

export const securityHeaders: { key: string; value: string }[] = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Production HTTPS assumption — no preload (ADR-0001)
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

/**
 * Baseline CSP without broad unsafe-inline.
 * Facebook plugin frames are allowlisted for the controlled livestream preview.
 * Script policy uses 'self' only — refine with nonces when needed (see CSP_SPIKE).
 *
 * `upgrade-insecure-requests` belongs only on an *enforced* CSP. Browsers ignore it
 * in Content-Security-Policy-Report-Only and emit console noise; omit it from report-only.
 */
export function contentSecurityPolicy(
  options: { reportOnly?: boolean } = {},
): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'", // Tailwind/Next often inject styles; spike before removing
    "script-src 'self'",
    "frame-src 'self' https://www.facebook.com https://web.facebook.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
    "form-action 'self'",
  ];
  if (!options.reportOnly) {
    directives.push("upgrade-insecure-requests");
  }
  return directives.join("; ");
}

/** Report-only policy for staging observation — never includes upgrade-insecure-requests. */
export function contentSecurityPolicyReportOnly(): string {
  return contentSecurityPolicy({ reportOnly: true });
}

/** Staging-only search exclusion. Not applied when KCMI_ENVIRONMENT is production. */
export function stagingRobotsHeaders(): { key: string; value: string }[] {
  if (process.env.KCMI_ENVIRONMENT !== "staging") {
    return [];
  }
  return [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
}
