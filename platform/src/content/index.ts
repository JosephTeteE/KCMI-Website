import { churchIdentity } from "@/content/seed/identity";
import { branches, headquartersServiceTimes } from "@/content/seed/branches";
import { seedBranchMediaForSlug } from "@/content/seed/branch-media";
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
  fetchHomeFeaturedSermon,
  fetchLivestreamPublic,
  fetchMediaAssetPublic,
  fetchPublishedBranchBySlug,
  fetchPublishedBranches,
  fetchPublishedGivingAccounts,
  fetchPublishedSermons,
  fetchWebsiteDocumentPayload,
} from "@/content/adapters/supabase-public";
import { defaultHomeDocument } from "@/content/website/defaults";
import {
  resolveAboutDocument,
  resolveFaqsDocument,
  resolveGlobalDocument,
  resolveHomeDocument,
  resolveSermonsPageDocument,
  resolveServicesDocument,
} from "@/content/website/resolve";
import {
  FALLBACK_PORTRAIT,
  mapAboutChurch,
  mapFaqs,
  mapGlobalContact,
  mapGlobalDfr,
  mapGlobalSocial,
  mapHomePublic,
  mapLivestreamCopy,
  mapSermonPlatforms,
  mapServicesOfferings,
} from "@/content/website/public-map";
import { resolvePublicSiteUrl, shouldUseSeedContent } from "@/lib/env";
import type {
  AboutChurchContent,
  Branch,
  BranchMediaItem,
  DailyFaithRecharge,
  FaqItem,
  FeaturedProgram,
  HomePublicContent,
  LivestreamPublic,
  PublicContact,
  SermonHighlight,
  SermonPlatform,
  SermonPublic,
  ServiceOffering,
  ServiceTime,
  SocialLink,
} from "@/content/types";

export function getChurchIdentity() {
  return {
    ...churchIdentity,
    siteUrl: resolvePublicSiteUrl(churchIdentity.siteUrl),
  };
}

export async function getServiceTimes(): Promise<ServiceTime[]> {
  if (shouldUseSeedContent()) {
    return headquartersServiceTimes;
  }
  return fetchHeadquartersServiceTimes();
}

export async function getHeadquartersLocationLabel(): Promise<string> {
  const all = await getBranches();
  const hq = all.find((branch) => branch.slug === "headquarters");
  return hq?.cityLabel?.trim() || "Port Harcourt, Nigeria";
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

export async function getHomeContent(): Promise<HomePublicContent> {
  if (shouldUseSeedContent()) {
    return mapHomePublic(defaultHomeDocument, null, null);
  }
  const row = await fetchWebsiteDocumentPayload("home");
  if (!row) {
    return mapHomePublic(defaultHomeDocument, null, null);
  }
  const doc = resolveHomeDocument(row.payload);
  const [heroImage, welcomeImage] = await Promise.all([
    fetchMediaAssetPublic(doc.heroMediaId),
    fetchMediaAssetPublic(doc.welcomeMediaId),
  ]);
  return mapHomePublic(doc, heroImage, welcomeImage);
}

export async function getFeaturedProgram(): Promise<FeaturedProgram | null> {
  if (shouldUseSeedContent()) {
    return null;
  }
  const row = await fetchWebsiteDocumentPayload("home");
  const doc = resolveHomeDocument(row?.payload ?? {});
  return fetchFeaturedProgram(doc.featuredProgramId);
}

function highlightFromSermon(sermon: SermonPublic): SermonHighlight {
  return {
    title: sermon.title,
    description:
      sermon.summary?.trim() ||
      [sermon.speaker, sermon.scriptureReference].filter(Boolean).join(" · ") ||
      "Watch the latest message from KCMI.",
    ctaLabel: "Watch now",
    ctaHref: sermon.youtubeUrl ?? "/sermons",
    youtubeChannelUrl: sermon.youtubeUrl ?? sermonHighlight.youtubeChannelUrl,
    youtubeChannelLabel: sermon.speaker
      ? `${sermon.speaker}`
      : sermonHighlight.youtubeChannelLabel,
  };
}

export async function getFeaturedSermons(): Promise<SermonHighlight> {
  const home = await getHomeContent();
  if (shouldUseSeedContent()) {
    return home.sermonFallback;
  }
  const featured = await fetchHomeFeaturedSermon();
  if (featured) return highlightFromSermon(featured);
  const published = await fetchPublishedSermons(1);
  if (published.length > 0) {
    return highlightFromSermon(published[0]!);
  }
  return home.sermonFallback;
}

/**
 * Published sermon for home Watch & Listen. Null when none exist —
 * callers should use sermon fallback highlight, not invent content.
 */
export async function getHomeFeaturedSermon(): Promise<SermonPublic | null> {
  if (shouldUseSeedContent()) {
    return null;
  }
  const featured = await fetchHomeFeaturedSermon();
  if (featured) return featured;
  const published = await fetchPublishedSermons(1);
  return published[0] ?? null;
}

export async function getPublishedSermons(
  limit = 12,
): Promise<SermonPublic[]> {
  if (shouldUseSeedContent()) {
    return [];
  }
  return fetchPublishedSermons(limit);
}

async function getResolvedGlobal() {
  if (shouldUseSeedContent()) {
    return resolveGlobalDocument({});
  }
  const row = await fetchWebsiteDocumentPayload("global");
  return resolveGlobalDocument(row?.payload ?? {});
}

export async function getLivestreamPublic(): Promise<LivestreamPublic> {
  const global = await getResolvedGlobal();
  if (shouldUseSeedContent()) {
    return mapLivestreamCopy(global, {
      facebookPageUrl: livestreamPublic.facebookPageUrl,
      isLive: livestreamPublic.isLive,
    });
  }
  const live = await fetchLivestreamPublic();
  return mapLivestreamCopy(global, live);
}

export async function getBranchMedia(
  branchSlug: string,
): Promise<BranchMediaItem[]> {
  if (shouldUseSeedContent()) {
    return seedBranchMediaForSlug(branchSlug);
  }
  return fetchBranchMediaBySlug(branchSlug);
}

export async function getPublicContactDetails(): Promise<PublicContact> {
  if (shouldUseSeedContent()) {
    return publicContact;
  }
  return mapGlobalContact(await getResolvedGlobal());
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

export async function getSocialLinks(): Promise<SocialLink[]> {
  if (shouldUseSeedContent()) {
    return socialLinks;
  }
  return mapGlobalSocial(await getResolvedGlobal());
}

export async function getDailyFaithRecharge(): Promise<DailyFaithRecharge> {
  if (shouldUseSeedContent()) {
    return dailyFaithRecharge;
  }
  return mapGlobalDfr(await getResolvedGlobal());
}

export async function getPrayerCta() {
  const home = await getHomeContent();
  return home.prayer;
}

export async function getGivingCta() {
  const home = await getHomeContent();
  return home.giving;
}

export async function getGivingAccounts() {
  if (shouldUseSeedContent()) {
    return givingAccounts;
  }
  return fetchPublishedGivingAccounts();
}

/** Seed reference retained for bootstrap provenance / local CONTENT_SOURCE=seed. */
export function getGivingAccountsSeed() {
  return givingAccounts;
}

export function getGivingPageIntro() {
  return givingPageIntro;
}

export async function getAboutChurch(): Promise<AboutChurchContent> {
  if (shouldUseSeedContent()) {
    return mapAboutChurch(resolveAboutDocument({}), null);
  }
  const row = await fetchWebsiteDocumentPayload("about");
  const doc = resolveAboutDocument(row?.payload ?? {});
  const portrait = await fetchMediaAssetPublic(doc.portraitMediaId);
  return mapAboutChurch(doc, portrait);
}

export async function getMissionContent() {
  const about = await getAboutChurch();
  return {
    vision: about.vision,
    missionParagraphs: about.missionParagraphs,
  };
}

export async function getAboutLeadPastor() {
  const about = await getAboutChurch();
  return {
    name: about.leadershipName,
    role: about.leadershipRole,
    orgLine: about.leadershipOrgLine,
    headquarters: about.leadershipHeadquarters,
    portraitSrc: about.portrait.src,
    portraitAlt: about.portrait.alt,
    portraitWidth: about.portrait.width,
    portraitHeight: about.portrait.height,
    bioParagraphs: about.bioParagraphs,
  };
}

export async function getServiceOfferings(): Promise<ServiceOffering[]> {
  if (shouldUseSeedContent()) {
    return serviceOfferings;
  }
  const row = await fetchWebsiteDocumentPayload("services");
  return mapServicesOfferings(resolveServicesDocument(row?.payload ?? {}));
}

export async function getServicesPageIntro(): Promise<string> {
  if (shouldUseSeedContent()) {
    return servicesPageIntro;
  }
  const row = await fetchWebsiteDocumentPayload("services");
  return resolveServicesDocument(row?.payload ?? {}).intro;
}

export async function getSermonPlatforms(): Promise<SermonPlatform[]> {
  if (shouldUseSeedContent()) {
    return sermonPlatforms;
  }
  const row = await fetchWebsiteDocumentPayload("sermons_page");
  return mapSermonPlatforms(resolveSermonsPageDocument(row?.payload ?? {}));
}

export async function getSermonsPageHeader() {
  if (shouldUseSeedContent()) {
    return sermonsPageHeader;
  }
  const row = await fetchWebsiteDocumentPayload("sermons_page");
  const doc = resolveSermonsPageDocument(row?.payload ?? {});
  return {
    headline: doc.headline,
    sub: doc.sub,
    sectionTitle: doc.sectionTitle,
    emptyState: doc.emptyState,
  };
}

export async function getFaqs(): Promise<FaqItem[]> {
  if (shouldUseSeedContent()) {
    return faqs;
  }
  const row = await fetchWebsiteDocumentPayload("faqs");
  return mapFaqs(resolveFaqsDocument(row?.payload ?? {}));
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

export { FALLBACK_PORTRAIT, prayerCta, givingCta, missionContent, aboutLeadPastor };
