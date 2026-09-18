/**
 * Allowlisted public social / media profile URLs.
 * Rejects javascript:, data:, and unknown hosts. Does not guess new profiles.
 */

export const SOCIAL_ALLOWED_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "fb.watch",
  "www.fb.watch",
  "instagram.com",
  "www.instagram.com",
  "twitter.com",
  "www.twitter.com",
  "x.com",
  "www.x.com",
  "tiktok.com",
  "www.tiktok.com",
  "vm.tiktok.com",
  "open.spotify.com",
  "spotify.com",
  "www.spotify.com",
  "silverbirdtv.com",
  "www.silverbirdtv.com",
  "www.google.com",
  "maps.google.com",
  "goo.gl",
] as const;

export type SocialUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (SOCIAL_ALLOWED_HOSTS as readonly string[]).includes(host);
}

/**
 * Validate an outbound http(s) URL against the social/media allowlist.
 */
export function validateSocialUrl(
  input: string | null | undefined,
): SocialUrlResult {
  const trimmed = (input ?? "").trim();
  if (!trimmed) {
    return { ok: false, error: "A URL is required." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "Enter a full https:// URL." };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "URL must use http or https." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Social URLs must use https." };
  }

  if (!isAllowedHost(parsed.hostname)) {
    return {
      ok: false,
      error: `Host ${parsed.hostname} is not on the allowed social/media list.`,
    };
  }

  return { ok: true, url: parsed.toString() };
}

export function validateOptionalSocialUrl(
  input: string | null | undefined,
): { ok: true; url: string | null } | { ok: false; error: string } {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return { ok: true, url: null };
  const result = validateSocialUrl(trimmed);
  if (!result.ok) return result;
  return { ok: true, url: result.url };
}
