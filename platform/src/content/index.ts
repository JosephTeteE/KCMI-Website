import { churchIdentity } from "@/content/seed/identity";
import { branches, headquartersServiceTimes } from "@/content/seed/branches";
import {
  dailyFaithRecharge,
  footerLegalNav,
  footerNav,
  givingCta,
  headerCta,
  prayerCta,
  primaryNav,
  publicContact,
  sermonHighlight,
  socialLinks,
} from "@/content/seed/engagement";
import { givingAccounts, givingPageIntro } from "@/content/seed/giving";
import {
  aboutLeadPastor,
  faqs,
  livestreamPublic,
  missionContent,
  sermonPlatforms,
  sermonsPageHeader,
  serviceOfferings,
  servicesPageIntro,
} from "@/content/seed/pages";
import { privacyPolicy } from "@/content/seed/legal-privacy";
import { termsOfService } from "@/content/seed/legal-terms";
import {
  fetchBranchMediaBySlug,
  fetchFeaturedProgram,
  fetchHeadquartersServiceTimes,
  fetchLivestreamPublic,
  fetchPublishedBranchBySlug,
  fetchPublishedBranches,
  fetchPublishedSermons,
} from "@/content/adapters/supabase-public";
import { hasSupabasePublicConfig } from "@/lib/env";
import type {
  Branch,
  BranchMediaItem,
  FeaturedProgram,
  LivestreamPublic,
  SermonHighlight,
  SermonPublic,
  ServiceTime,
} from "@/content/types";

/**
 * Content source strategy:
 * - Use seed when CONTENT_SOURCE=seed (tests/CI) OR Supabase public config is absent.
 * - When Supabase IS configured, call the DB and throw on failure.
 *   Production must not silently fall back to seed when the DB is configured but failing.
 */
function shouldUseSeedContent(): boolean {
  return (
    process.env.CONTENT_SOURCE === "seed" || !hasSupabasePublicConfig()
  );
}

export function getChurchIdentity() {
  return churchIdentity;
}

export async function getServiceTimes(): Promise<ServiceTime[]> {
  if (shouldUseSeedContent()) {
    return headquartersServiceTimes;
  }
  return fetchHeadquartersServiceTimes();
}

export async function getBranches(): Promise<Branch[]> {
  if (shouldUseSeedContent()) {
    return branches;
  }
  return fetchPublishedBranches();
}

export async function getBranchBySlug(slug: string): Promise<Branch | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  if (shouldUseSeedContent()) {
    return branches.find((branch) => branch.slug === normalized) ?? null;
  }
  return fetchPublishedBranchBySlug(normalized);
}

/**
 * Adapter for a future `/locations/[branch-slug]` page.
 * Does not invent a public route in this phase.
 */
export async function getBranchPublicDetail(slug: string): Promise<{
  branch: Branch;
  media: BranchMediaItem[];
} | null> {
  const branch = await getBranchBySlug(slug);
  if (!branch) return null;
  const media = await getBranchMedia(branch.slug);
  return { branch, media };
}

export async function getFeaturedBranches(limit = 4): Promise<Branch[]> {
  const all = await getBranches();
  return all.slice(0, limit);
}

export async function getFeaturedProgram(): Promise<FeaturedProgram | null> {
  if (shouldUseSeedContent()) {
    return null;
  }
  return fetchFeaturedProgram();
}

function highlightFromSermon(sermon: SermonPublic): SermonHighlight {
  return {
    title: sermon.title,
    description:
      sermon.summary?.trim() ||
      [
        sermon.speaker,
        sermon.scriptureReference,
      ]
        .filter(Boolean)
        .join(" · ") ||
      "Watch the latest message from KCMI.",
    ctaLabel: "Watch now",
    ctaHref: sermon.youtubeUrl ?? "/sermons",
    youtubeChannelUrl:
      sermon.youtubeUrl ?? sermonHighlight.youtubeChannelUrl,
    youtubeChannelLabel: sermon.speaker
      ? `${sermon.speaker}`
      : sermonHighlight.youtubeChannelLabel,
  };
}

export async function getFeaturedSermons(): Promise<SermonHighlight> {
  if (shouldUseSeedContent()) {
    return sermonHighlight;
  }
  const published = await fetchPublishedSermons(1);
  if (published.length > 0) {
    return highlightFromSermon(published[0]!);
  }
  // No published sermon rows yet — keep verified channel highlight copy.
  return sermonHighlight;
}

export async function getPublishedSermons(
  limit = 12,
): Promise<SermonPublic[]> {
  if (shouldUseSeedContent()) {
    return [];
  }
  return fetchPublishedSermons(limit);
}

export async function getLivestreamPublic(): Promise<LivestreamPublic> {
  if (shouldUseSeedContent()) {
    return livestreamPublic;
  }
  return fetchLivestreamPublic();
}

/**
 * Branch-scoped published media for future branch detail pages.
 * Locations listing unchanged — adapter ready without inventing page UI.
 */
export async function getBranchMedia(
  branchSlug: string,
): Promise<BranchMediaItem[]> {
  if (shouldUseSeedContent()) {
    return [];
  }
  return fetchBranchMediaBySlug(branchSlug);
}

export function getPublicContactDetails() {
  return publicContact;
}

export function getPrimaryNavigation() {
  return primaryNav;
}

export function getHeaderCta() {
  return headerCta;
}

export function getFooterNavigation() {
  return footerNav;
}

export function getFooterLegalNavigation() {
  return footerLegalNav;
}

export function getSocialLinks() {
  return socialLinks;
}

export function getDailyFaithRecharge() {
  return dailyFaithRecharge;
}

export function getPrayerCta() {
  return prayerCta;
}

export function getGivingCta() {
  return givingCta;
}

export function getGivingAccounts() {
  return givingAccounts;
}

export function getGivingPageIntro() {
  return givingPageIntro;
}

export function getMissionContent() {
  return missionContent;
}

export function getAboutLeadPastor() {
  return aboutLeadPastor;
}

export function getServiceOfferings() {
  return serviceOfferings;
}

export function getServicesPageIntro() {
  return servicesPageIntro;
}

export function getSermonPlatforms() {
  return sermonPlatforms;
}

export function getSermonsPageHeader() {
  return sermonsPageHeader;
}

export function getFaqs() {
  return faqs;
}

export function getPrivacyPolicy() {
  return privacyPolicy;
}

export function getTermsOfService() {
  return termsOfService;
}

export function mapsHrefForBranch(branch: Branch): string {
  if (branch.mapsUrl) return branch.mapsUrl;
  const q = branch.mapsQuery ?? branch.addressLines.join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
