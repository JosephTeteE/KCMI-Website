/**
 * D1.8 program visitor-action validation.
 * The volunteer chooses an action kind; the button label is derived, never typed.
 */

import type { ProgramActionKind } from "@/lib/programs/schedule";

export const PROGRAM_ACTION_KINDS = [
  "none",
  "registration",
  "youtube",
  "facebook",
  "other",
] as const;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const FACEBOOK_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "fb.watch",
  "fb.me",
]);

export type ProgramActionUrlResult =
  | { ok: true; url: string | null }
  | { ok: false; error: string };

export function parseProgramActionKind(value: unknown): ProgramActionKind {
  return typeof value === "string" &&
    (PROGRAM_ACTION_KINDS as readonly string[]).includes(value)
    ? (value as ProgramActionKind)
    : "none";
}

function looksLikeMarkup(value: string): boolean {
  return value.includes("<") || value.includes(">");
}

function missingUrlError(kind: ProgramActionKind): string {
  switch (kind) {
    case "registration":
      return "Paste the link to the registration or sign-up form.";
    case "youtube":
      return "Paste the YouTube link.";
    case "facebook":
      return "Paste the Facebook link.";
    default:
      return "Paste the link visitors should open.";
  }
}

/**
 * Validate the single optional visitor link for a program.
 * Site-relative paths are allowed only for the generic "another website" choice.
 */
export function validateProgramActionUrl(
  kind: ProgramActionKind,
  rawInput: string | null | undefined,
): ProgramActionUrlResult {
  const raw = (rawInput ?? "").trim();
  if (kind === "none") {
    return { ok: true, url: null };
  }
  if (!raw) {
    return { ok: false, error: missingUrlError(kind) };
  }
  if (looksLikeMarkup(raw)) {
    return {
      ok: false,
      error: "Paste the link only, not embed code from the website.",
    };
  }

  if (raw.startsWith("/")) {
    if (kind !== "other") {
      return { ok: false, error: missingUrlError(kind) };
    }
    if (raw.startsWith("//") || raw.includes("://")) {
      return {
        ok: false,
        error: "Use a full https:// link or a page path like /giving.",
      };
    }
    return { ok: true, url: raw };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return {
      ok: false,
      error:
        kind === "other"
          ? "Use a full https:// link or a page path like /giving."
          : "That does not look like a link. It should start with https://.",
    };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "The link must start with https://." };
  }

  const host = parsed.hostname.toLowerCase();

  if (kind === "youtube" && !YOUTUBE_HOSTS.has(host)) {
    return {
      ok: false,
      error: "That is not a YouTube link. Copy it from YouTube and try again.",
    };
  }

  if (
    kind === "facebook" &&
    !(FACEBOOK_HOSTS.has(host) || host.endsWith(".facebook.com"))
  ) {
    return {
      ok: false,
      error:
        "That is not a Facebook link. Copy it from Facebook and try again.",
    };
  }

  if (kind === "youtube" || kind === "facebook") {
    parsed.hash = "";
  }

  return { ok: true, url: parsed.toString() };
}
