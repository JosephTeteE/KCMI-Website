import type { BranchMediaItem } from "@/content/types";
import { FALLBACK_WELCOME_IMAGE } from "@/content/website/public-map";

/**
 * Deterministic seed branch media for local/QA visual review.
 * Uses verified KCMI repository assets only — does not invent photos.
 * Headquarters has a hero; Accra (and other branches) intentionally have none.
 */
export const SEED_HQ_HERO_MEDIA_ID = "d17-seed-hq-hero";

const headquartersHero: BranchMediaItem = {
  id: SEED_HQ_HERO_MEDIA_ID,
  branchSlug: "headquarters",
  placement: "hero",
  sortOrder: 0,
  imageSrc: FALLBACK_WELCOME_IMAGE.src,
  altText: FALLBACK_WELCOME_IMAGE.alt || "KCMI Headquarters gathering",
  caption: null,
};

const bySlug: Record<string, BranchMediaItem[]> = {
  headquarters: [headquartersHero],
};

export function seedBranchMediaForSlug(slug: string): BranchMediaItem[] {
  return bySlug[slug.trim().toLowerCase()] ?? [];
}
