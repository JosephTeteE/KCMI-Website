export type CtaUrlResult =
  | { ok: true; url: string | null }
  | { ok: false; error: string };

/**
 * CTA may be empty, an absolute http(s) URL, or a site-relative path starting with /.
 */
export function validateCtaUrl(input: string | null | undefined): CtaUrlResult {
  const trimmed = (input ?? "").trim();
  if (!trimmed) {
    return { ok: true, url: null };
  }

  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//") || trimmed.includes("://")) {
    return { ok: false, error: "Use a website path starting with / or a full https link." };
    }
    return { ok: true, url: trimmed };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      ok: false,
      error: "Use a website path starting with / or a full https link.",
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "The button destination must be an https link or a path starting with /." };
  }

  return { ok: true, url: parsed.toString() };
}
