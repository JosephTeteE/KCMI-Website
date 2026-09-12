/**
 * Host safety + mutation classification for KCMI QA1.
 * Production hostnames refuse DRAFT_WRITE / PUBLIC_WRITE / DESTRUCTIVE.
 */

import type { MutationClass } from "./types";

export const PRODUCTION_HOSTS = new Set([
  "kcmi-rcc.org",
  "www.kcmi-rcc.org",
]);

export const DEFAULT_HOSTED_PREVIEW = "https://kcmi-preview.josephtete.com";

export const STAGING_QA_PROGRAM_ID =
  "4798d76c-6112-4870-9f52-7d1ab38d06bd";

export const STAGING_QA_TITLE_PREFIX = "STAGING QA —";

const MUTATING: MutationClass[] = [
  "DRAFT_WRITE",
  "PUBLIC_WRITE",
  "DESTRUCTIVE",
];

export function hostnameFromBaseUrl(baseUrl: string): string {
  try {
    return new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function isProductionHost(hostname: string): boolean {
  return PRODUCTION_HOSTS.has(hostname.toLowerCase());
}

/**
 * Hard refuse production mutations. No ordinary override.
 */
export function assertMutationAllowed(
  baseUrl: string,
  mutation: MutationClass,
  context: { recordTitle?: string | null; explicitHumanPublicWrite?: boolean } = {},
): void {
  const host = hostnameFromBaseUrl(baseUrl);
  if (isProductionHost(host) && MUTATING.includes(mutation)) {
    throw new Error(
      `HOST SAFETY: refusing ${mutation} against production host ${host}. ` +
        `No override in ordinary QA commands.`,
    );
  }

  if (mutation === "DRAFT_WRITE" && isHostedPreview(host)) {
    const title = context.recordTitle ?? "";
    if (!title.startsWith(STAGING_QA_TITLE_PREFIX) && title !== "") {
      throw new Error(
        `HOSTED STAGING POLICY: DRAFT_WRITE only against "${STAGING_QA_TITLE_PREFIX}…" records. Got: ${title}`,
      );
    }
  }

  if (mutation === "PUBLIC_WRITE" && isHostedPreview(host)) {
    if (!context.explicitHumanPublicWrite) {
      throw new Error(
        `HOSTED STAGING POLICY: PUBLIC_WRITE is not executed by the generic suite on ${host}.`,
      );
    }
  }

  if (mutation === "DESTRUCTIVE" && isHostedPreview(host)) {
    throw new Error(
      `HOSTED STAGING POLICY: DESTRUCTIVE is not executed by generic hosted QA on ${host}.`,
    );
  }
}

export function isHostedPreview(hostname: string): boolean {
  return (
    hostname === "kcmi-preview.josephtete.com" ||
    hostname.endsWith(".josephtete.com")
  );
}

export function classifyHref(
  href: string | null | undefined,
  appHostname?: string,
): MutationClass {
  if (!href || href === "#" || href.startsWith("javascript:")) return "LOCAL_STATE";
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return "EXTERNAL";
  if (href.startsWith("/")) return "NAVIGATION";
  if (href.startsWith("#")) return "LOCAL_STATE";
  if (/^https?:\/\//i.test(href)) {
    try {
      const host = new URL(href).hostname.toLowerCase();
      const app = (appHostname || "").toLowerCase();
      if (app && (host === app || host.endsWith(`.${app}`))) {
        return "NAVIGATION";
      }
      if (PRODUCTION_HOSTS.has(host) || host.includes("josephtete.com") || host.includes("kcmi-rcc.org")) {
        return "NAVIGATION";
      }
      // Absolute URL with a different hostname is always EXTERNAL
      return "EXTERNAL";
    } catch {
      return "EXTERNAL";
    }
  }
  return "NAVIGATION";
}

/** Heuristic name-based classification for discovered controls. */
export function classifyControlByName(
  name: string,
  role: string,
  href?: string | null,
  appHostname?: string,
): MutationClass {
  // Prefer shared classifier (mutation semantics win over href).
  // Inline equivalent kept to avoid circular ESM/CJS issues in scripts.
  const n = name.toLowerCase();
  if (
    /make (this |these )?(live|changes live)|make livestream live|update the live video|turn off the livestream|make this photo live|make this program live|make these sermon details live|make these branch details live|\bpublish\b/i.test(
      n,
    )
  ) {
    return "PUBLIC_WRITE";
  }
  if (
    /remove from (public )?website|remove from this branch|delete|archive|destroy/i.test(
      n,
    )
  ) {
    return "DESTRUCTIVE";
  }
  if (
    /save (as a )?draft|save draft|save my draft|save draft changes|save my sermon draft|upload this photo|add this photo to the library|add this photo to the branch/i.test(
      n,
    )
  ) {
    return "DRAFT_WRITE";
  }
  if (/sign out/i.test(n)) return "LOCAL_STATE";
  if (role === "link" || href) return classifyHref(href, appHostname);
  if (
    /menu|close|next step|previous step|skip|cancel|preview|change |open|replay/i.test(
      n,
    )
  ) {
    return "LOCAL_STATE";
  }
  if (/sign in/i.test(n)) return "NAVIGATION";
  return "SAFE";
}

export const APPROVED_EXTERNAL_HOSTS = [
  "www.youtube.com",
  "youtube.com",
  "youtu.be",
  "www.facebook.com",
  "facebook.com",
  "open.spotify.com",
  "maps.google.com",
  "www.google.com",
  "forms.gle",
  "www.instagram.com",
  "instagram.com",
  "twitter.com",
  "www.twitter.com",
  "x.com",
  "www.tiktok.com",
  "tiktok.com",
] as const;

/** Present in content but requires human content verification before approval. */
export const HUMAN_REVIEW_EXTERNAL_HOSTS = ["silverbirdtv.com", "www.silverbirdtv.com"] as const;
