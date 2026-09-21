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
 * Apex-path bookmarks that used to reach the retired standalone Camp microsite.
 * V2 sends them to Programs discovery instead — never the old Camp hostname.
 *
 * Permanent redirects.
 */
export const CAMP_BOOKMARK_DESTINATION = "/programs";

export const campBookmarkRedirects = [
  { source: "/youth-camp.html", destination: CAMP_BOOKMARK_DESTINATION },
  { source: "/youth-camp", destination: CAMP_BOOKMARK_DESTINATION },
  { source: "/camp/youth-camp.html", destination: CAMP_BOOKMARK_DESTINATION },
] as const;

export type CampBookmarkRedirect = (typeof campBookmarkRedirects)[number];
