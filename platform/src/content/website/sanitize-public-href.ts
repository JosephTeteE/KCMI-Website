/**
 * Strip retired Google Form destinations from public CMS overlays.
 * Fail closed to an internal route so forms.gle cannot resurface from stored JSON.
 */

const GOOGLE_FORM_RE = /forms\.gle|docs\.google\.com\/forms/i;

export function isGoogleFormHref(href: string | null | undefined): boolean {
  if (!href) return false;
  return GOOGLE_FORM_RE.test(href);
}

export function sanitizePublicHref(
  href: string,
  fallback: string,
): string {
  if (isGoogleFormHref(href)) return fallback;
  return href;
}
