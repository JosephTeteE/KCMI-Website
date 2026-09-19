/**
 * Canonical invite / confirm URLs for Hub staff invitations.
 * Uses NEXT_PUBLIC_SITE_URL via resolvePublicSiteUrl — never .vercel.app.
 */

import { resolvePublicSiteUrl } from "@/lib/env/public";

export function staffInviteRedirectTo(fallbackOrigin = "http://127.0.0.1:3000"): string {
  const origin = resolvePublicSiteUrl(fallbackOrigin);
  if (origin.includes(".vercel.app")) {
    throw new Error(
      "Staff invitations cannot use a .vercel.app host. Set NEXT_PUBLIC_SITE_URL to the canonical site.",
    );
  }
  return `${origin}/auth/confirm?next=/auth/set-password`;
}
