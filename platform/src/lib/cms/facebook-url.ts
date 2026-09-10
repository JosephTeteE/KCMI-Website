const ALLOWED_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "fb.watch",
]);

export const FACEBOOK_EMBED_EXAMPLE =
  '<iframe src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fwatch%2F%3Fv%3D123456789" width="500" height="280" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>';

export const FACEBOOK_EMBED_HUMAN_ERROR =
  "We couldn't recognize that Facebook embed code. Copy the Embed code directly from Facebook and try again.";

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

function isUnsafeMarkup(input: string): boolean {
  return /<script\b|on\w+\s*=|javascript:|data:text\/html|<object\b|<embed\b/i.test(
    input,
  );
}

function isFacebookHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (ALLOWED_HOSTS.has(host)) return true;
  return host.endsWith(".facebook.com");
}

function decodeMaybe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Normalize and allowlist Facebook HTTPS URLs only.
 * Never accepts or returns embed HTML.
 */
export function normalizeFacebookUrl(input: string): FacebookUrlResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: "Paste a Facebook link, or paste the Facebook embed code.",
    };
  }
  if (looksLikeHtml(trimmed) || /<\/?[a-z][\s\S]*>/i.test(trimmed)) {
    return {
      ok: false,
      error: FACEBOOK_EMBED_HUMAN_ERROR,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: FACEBOOK_EMBED_HUMAN_ERROR };
  }

  if (parsed.protocol !== "https:") {
    return {
      ok: false,
      error:
        "The Facebook link must start with https://. Copy it again from Facebook and try again.",
    };
  }

  if (!isFacebookHost(parsed.hostname)) {
    return { ok: false, error: FACEBOOK_EMBED_HUMAN_ERROR };
  }

  parsed.hash = "";
  return { ok: true, url: parsed.toString() };
}

function extractFromMarkup(html: string): FacebookUrlResult {
  if (isUnsafeMarkup(html)) {
    return { ok: false, error: FACEBOOK_EMBED_HUMAN_ERROR };
  }

  const iframeSrcs = [
    ...html.matchAll(/<iframe\b[^>]*\bsrc=["']([^"']+)["']/gi),
  ].map((match) => match[1]);
  const looseSrc = html.match(/\bsrc=["'](https:\/\/[^"']+)["']/i)?.[1];
  const href =
    html.match(/<a\b[^>]*\bhref=["']([^"']+)["']/i)?.[1] ??
    html.match(/\bhref=["'](https:\/\/[^"']+)["']/i)?.[1];

  const candidates = iframeSrcs.length > 0 ? iframeSrcs : looseSrc ? [looseSrc] : [];

  for (const raw of candidates) {
    let parsed: URL;
    try {
      parsed = new URL(decodeMaybe(raw));
    } catch {
      return { ok: false, error: FACEBOOK_EMBED_HUMAN_ERROR };
    }
    if (parsed.protocol !== "https:" || !isFacebookHost(parsed.hostname)) {
      return { ok: false, error: FACEBOOK_EMBED_HUMAN_ERROR };
    }
  }

  const iframeSrc = candidates[0];
  const candidate = iframeSrc ?? href;
  if (!candidate) {
    return { ok: false, error: FACEBOOK_EMBED_HUMAN_ERROR };
  }

  let parsed: URL;
  try {
    parsed = new URL(decodeMaybe(candidate));
  } catch {
    return { ok: false, error: FACEBOOK_EMBED_HUMAN_ERROR };
  }

  if (parsed.protocol !== "https:" || !isFacebookHost(parsed.hostname)) {
    return { ok: false, error: FACEBOOK_EMBED_HUMAN_ERROR };
  }

  const hrefParam = parsed.searchParams.get("href");
  if (
    hrefParam &&
    (parsed.pathname.includes("/plugins/video.php") ||
      parsed.pathname.includes("/plugins/page.php"))
  ) {
    return normalizeFacebookUrl(decodeMaybe(hrefParam));
  }

  return normalizeFacebookUrl(parsed.toString());
}

/**
 * If the input looks like HTML, extract iframe src or anchor href, then normalize.
 * Always returns a URL result — never raw HTML.
 */
export function extractFacebookUrlFromEmbed(
  htmlOrUrl: string,
): FacebookUrlResult {
  return parseFacebookLivestreamInput(htmlOrUrl);
}

/**
 * Volunteer livestream input: Facebook embed code (primary) or a Facebook URL.
 * Stores a normalized HTTPS Facebook URL only. Discards operator HTML.
 */
export function parseFacebookLivestreamInput(
  htmlOrUrl: string,
): FacebookUrlResult {
  const trimmed = htmlOrUrl.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: "Paste the Facebook embed code, or a Facebook video link.",
    };
  }
  if (isUnsafeMarkup(trimmed)) {
    return { ok: false, error: FACEBOOK_EMBED_HUMAN_ERROR };
  }
  if (looksLikeHtml(trimmed) || /<iframe/i.test(trimmed)) {
    return extractFromMarkup(trimmed);
  }
  return normalizeFacebookUrl(trimmed);
}

/** Controlled Facebook plugin iframe src from a stored, already-normalized URL. */
export function facebookControlledEmbedSrc(pageOrVideoUrl: string): string | null {
  const normalized = normalizeFacebookUrl(pageOrVideoUrl);
  if (!normalized.ok) return null;
  try {
    const parsed = new URL(normalized.url);
    if (
      parsed.pathname.includes("/plugins/video.php") ||
      parsed.pathname.includes("/plugins/page.php")
    ) {
      return parsed.toString();
    }
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(normalized.url)}&show_text=false&width=734`;
  } catch {
    return null;
  }
}
