/**
 * Permanent redirects from legacy static HTML paths to planned clean routes.
 * Destination pages beyond `/` arrive in later phases; mappings are configured now
 * so cutover does not invent alternate URL schemes.
 */
export const legacyHtmlRedirects = [
  { source: "/index.html", destination: "/" },
  { source: "/location.html", destination: "/locations" },
  { source: "/services.html", destination: "/services" },
  { source: "/contact-us.html", destination: "/contact" },
  { source: "/giving-kcmi.html", destination: "/giving" },
  { source: "/livestream.html", destination: "/livestream" },
  { source: "/sermons.html", destination: "/sermons" },
  { source: "/mission-kcmi.html", destination: "/about#mission" },
  { source: "/about-apostle-aikins.html", destination: "/about/apostle-frank-aikins" },
  { source: "/faqs.html", destination: "/faqs" },
  { source: "/privacy-policy.html", destination: "/privacy" },
  { source: "/terms-of-service.html", destination: "/terms" },
] as const;

export type LegacyRedirect = (typeof legacyHtmlRedirects)[number];

/**
 * Apex-path bookmarks that still point at the live legacy Camp microsite.
 *
 * Why this exists: historical main-site links (`/youth-camp.html`, `/youth-camp`)
 * previously redirected via root `vercel.json` to `camp.kcmi-rcc.org`. The V2
 * platform app did not inherit those rules. Camp remains a separate legacy host
 * (no V2 Camp app). These permanent redirects preserve bookmarks without
 * changing Camp DNS, rebuilding Camp, or pointing `camp.kcmi-rcc.org` at Events.
 *
 * See docs/LEGACY_CAMP_MIGRATION.md and ADR-0002.
 */
export const CAMP_LEGACY_HOST = "https://camp.kcmi-rcc.org";

export const campBookmarkRedirects = [
  { source: "/youth-camp.html", destination: CAMP_LEGACY_HOST },
  { source: "/youth-camp", destination: CAMP_LEGACY_HOST },
] as const;

export type CampBookmarkRedirect = (typeof campBookmarkRedirects)[number];
