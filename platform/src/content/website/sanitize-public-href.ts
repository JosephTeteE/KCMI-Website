/**
 * Public href sanitizers for CMS overlays.
 * Fail closed so known-bad external destinations cannot resurface from stored JSON.
 */

const GOOGLE_FORM_RE = /forms\.gle|docs\.google\.com\/forms/i;

/** Any Silverbird-owned / Silverbird-branded web destination (KCMI does not own Silverbird). */
const SILVERBIRD_HREF_RE = /silverbird/i;

export function isGoogleFormHref(href: string | null | undefined): boolean {
  if (!href) return false;
  return GOOGLE_FORM_RE.test(href);
}

/**
 * True when an href points at a Silverbird-owned or Silverbird-branded site.
 * Venue/location *names* may still mention Silverbird as plain text.
 */
export function isSilverbirdOwnedHref(href: string | null | undefined): boolean {
  if (!href) return false;
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.includes(".")) {
    // Relative site paths are never Silverbird-owned destinations.
    return false;
  }
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    if (host.includes("silverbird")) return true;
  } catch {
    // Fall through to raw-string check for malformed URLs.
  }
  return SILVERBIRD_HREF_RE.test(trimmed);
}

export function sanitizePublicHref(
  href: string,
  fallback: string,
): string {
  if (isGoogleFormHref(href)) return fallback;
  if (isSilverbirdOwnedHref(href)) return fallback;
  return href;
}

/**
 * Clear Silverbird destinations from sermon/media platform cards.
 * Returns "" so callers can render plain text without an anchor.
 */
export function sanitizePlatformHref(href: string | null | undefined): string {
  if (!href) return "";
  if (isSilverbirdOwnedHref(href)) return "";
  return href;
}
