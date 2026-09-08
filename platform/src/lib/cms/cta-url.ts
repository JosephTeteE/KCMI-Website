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
      return { ok: false, error: "Relative CTA paths must start with a single /." };
    }
    return { ok: true, url: trimmed };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      ok: false,
      error: "CTA URL must be http(s) or a path starting with /.",
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "CTA URL must use http or https." };
  }

  return { ok: true, url: parsed.toString() };
}
