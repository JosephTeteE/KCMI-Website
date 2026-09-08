const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

export type YoutubeUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Validate HTTPS YouTube watch or short URLs (youtube.com / youtu.be / m. / www.).
 */
export function normalizeYoutubeUrl(input: string): YoutubeUrlResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "YouTube URL is required." };
  }
  if (/<\/?[a-z][\s\S]*>/i.test(trimmed)) {
    return {
      ok: false,
      error: "Embed HTML is not allowed. Provide a YouTube watch or short URL.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "Invalid YouTube URL." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "YouTube URL must use HTTPS." };
  }

  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    return {
      ok: false,
      error:
        "Only youtube.com, www.youtube.com, m.youtube.com, or youtu.be URLs are allowed.",
    };
  }

  const path = parsed.pathname.replace(/\/+$/, "") || "/";

  if (host === "youtu.be") {
    const id = path.slice(1);
    if (!id || id.includes("/")) {
      return { ok: false, error: "youtu.be URL must include a video id." };
    }
    parsed.hash = "";
    return { ok: true, url: parsed.toString() };
  }

  // youtube.com / www / m — watch or shorts
  if (path === "/watch") {
    const v = parsed.searchParams.get("v");
    if (!v) {
      return { ok: false, error: "YouTube watch URL must include a v= video id." };
    }
    parsed.hash = "";
    return { ok: true, url: parsed.toString() };
  }

  if (path.startsWith("/shorts/")) {
    const id = path.slice("/shorts/".length);
    if (!id || id.includes("/")) {
      return { ok: false, error: "YouTube Shorts URL must include a video id." };
    }
    parsed.hash = "";
    return { ok: true, url: parsed.toString() };
  }

  return {
    ok: false,
    error: "Only YouTube watch or Shorts URLs are allowed.",
  };
}

/** Alias matching module naming in Phase D1. */
export function validateYoutubeUrl(input: string): YoutubeUrlResult {
  return normalizeYoutubeUrl(input);
}
