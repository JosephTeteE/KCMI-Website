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
 * Facebook/YouTube frame allowlists deferred until those embeds are built.
 * Script policy uses 'self' only for Phase B shell — refine with nonces when needed (see CSP_SPIKE).
 */
export function contentSecurityPolicy(): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'", // Tailwind/Next often inject styles; spike before removing
    "script-src 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];
  return directives.join("; ");
}
