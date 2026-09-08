const ALLOWED_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "fb.watch",
]);

export type FacebookUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

function looksLikeHtml(input: string): boolean {
  const trimmed = input.trim();
  return (
    trimmed.includes("<") &&
    (trimmed.toLowerCase().includes("<iframe") ||
      trimmed.toLowerCase().includes("<a ") ||
      trimmed.toLowerCase().includes("href=") ||
      trimmed.toLowerCase().includes("src="))
  );
}

/**
 * Normalize and allowlist Facebook HTTPS URLs only.
 * Never accepts or returns embed HTML.
 */
export function normalizeFacebookUrl(input: string): FacebookUrlResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Facebook URL is required." };
  }
  if (looksLikeHtml(trimmed) || /<\/?[a-z][\s\S]*>/i.test(trimmed)) {
    return {
      ok: false,
      error: "Embed HTML is not allowed. Provide a Facebook page or video URL.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "Invalid Facebook URL." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Facebook URL must use HTTPS." };
  }

  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    return {
      ok: false,
      error:
        "Only facebook.com, www.facebook.com, m.facebook.com, or fb.watch URLs are allowed.",
    };
  }

  parsed.hash = "";
  return { ok: true, url: parsed.toString() };
}

/**
 * If the input looks like HTML, extract iframe src or anchor href, then normalize.
 * Always returns a URL result — never raw HTML.
 */
export function extractFacebookUrlFromEmbed(
  htmlOrUrl: string,
): FacebookUrlResult {
  const trimmed = htmlOrUrl.trim();
  if (!trimmed) {
    return { ok: false, error: "Facebook URL is required." };
  }

  if (!looksLikeHtml(trimmed)) {
    return normalizeFacebookUrl(trimmed);
  }

  const iframeSrc =
    trimmed.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1] ??
    trimmed.match(/\bsrc=["'](https:\/\/[^"']+)["']/i)?.[1];
  const href =
    trimmed.match(/<a[^>]+href=["']([^"']+)["']/i)?.[1] ??
    trimmed.match(/\bhref=["'](https:\/\/[^"']+)["']/i)?.[1];

  const candidate = iframeSrc ?? href;
  if (!candidate) {
    return {
      ok: false,
      error: "Could not extract a Facebook URL from the provided embed markup.",
    };
  }

  return normalizeFacebookUrl(candidate);
}
