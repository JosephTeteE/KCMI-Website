/**
 * Public content types — Phase C1 seed boundary.
 * Phase D can swap seed implementations for Supabase without changing UI.
 */

export type ChurchIdentity = {
  legalName: string;
  shortName: string;
  alternateName: string;
  visionTagline: string;
  heroHeadline: string;
  heroSupporting: string;
  discoverBlurb: string;
  siteUrl: string;
  copyrightYear: number;
};

export type ServiceTime = {
  day: string;
  time: string;
  note?: string;
};

export type Branch = {
  id: string;
  slug: string;
  name: string;
  cityLabel: string;
  /** Verified country for grouping. Null means do not invent a country. */
  country: string | null;
  addressLines: string[];
  phones: { display: string; tel: string }[];
  emails?: string[];
  serviceTimes: ServiceTime[];
  /** Phone field conflicts in legacy source when true */
  phoneEvidenceNote?: string;
  /** Address query for “Open in Maps” (no embed) */
  mapsQuery?: string;
  /** Optional verified maps URL from legacy when present */
  mapsUrl?: string;
};

/** Branch-scoped public marketing media (adapter-ready; Locations page unchanged). */
export type BranchMediaItem = {
  id: string;
  branchSlug: string;
  placement: "hero" | "gallery" | "featured" | "announcement" | "general";
  sortOrder: number;
  imageSrc: string;
  altText: string;
  caption: string | null;
};

export type FeaturedProgram = {
  id: string;
  title: string;
  shortDescription: string;
  datesLabel: string | null;
  imageSrc: string | null;
  imageAlt: string;
  ctaLabel: string;
  ctaHref: string;
  placement: "none" | "featured" | "banner" | "card";
  /** draft_placeholder retained for local seed; DB uses publication_status values */
  status: "draft" | "preview" | "published" | "archived" | "draft_placeholder";
};

export type SermonPublic = {
  id: string;
  title: string;
  speaker: string | null;
  sermonDate: string | null;
  scriptureReference: string | null;
  summary: string | null;
  youtubeUrl: string | null;
  thumbnailSrc: string | null;
  thumbnailAlt: string;
};

export type SermonHighlight = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  youtubeChannelUrl: string;
  youtubeChannelLabel: string;
};

export type PublicContact = {
  primaryEmail: string;
  /** Optional shorter visible label; full address remains in mailto + accessible text */
  primaryEmailLabel?: string;
  primaryPhoneDisplay: string;
  primaryPhoneTel: string;
};

export type NavItem = {
  label: string;
  href: string;
  external?: boolean;
};

export type SocialLink = {
  label: string;
  href: string;
};

export type DailyFaithRecharge = {
  heading: string;
  body: string;
  spotify: { label: string; href: string };
  whatsappHint: string;
  whatsappPhoneDisplay: string;
};

export type PrayerCta = {
  heading: string;
  verse: string;
  verseReference: string;
  body: string[];
  ctaLabel: string;
  /** Verified Google Form URL from legacy */
  ctaHref: string;
};

export type GivingCta = {
  heading: string;
  verse: string;
  verseReference: string;
  ctaLabel: string;
  ctaHref: string;
};

export type GivingAccount = {
  id: string;
  purpose: string;
  description: string;
  accountName: string;
  bankName: string;
  accountNumber?: string;
  swiftCode?: string;
  accountsByCurrency?: { currency: string; accountNumber: string }[];
  note?: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answerParagraphs: string[];
  links?: { label: string; href: string; external?: boolean }[];
};

export type SermonPlatform = {
  id: string;
  name: string;
  description: string;
  href: string;
  external: boolean;
  scheduleLabel?: string;
};

export type LivestreamPublic = {
  facebookPageUrl: string;
  isLive: boolean;
  heading: string;
  notLiveMessage: string;
  liveMessage: string;
};

export type AboutLeadPastor = {
  name: string;
  role: string;
  orgLine: string;
  headquarters: string;
  portraitSrc: string;
  portraitAlt: string;
  portraitWidth: number;
  portraitHeight: number;
  bioParagraphs: string[];
};

export type MissionContent = {
  vision: string;
  missionParagraphs: string[];
};

export type ServiceOffering = {
  id: string;
  title: string;
  body: string;
  cta?: { label: string; href: string; external?: boolean };
  times?: string[];
  links?: { label: string; href: string; external?: boolean }[];
};

export type LegalDocument = {
  title: string;
  metaLine: string;
  /** Faithful migration of legacy legal prose; formatting cleaned only */
  sections: { heading?: string; paragraphs: string[]; bullets?: string[] }[];
  staleNotes?: string[];
};

export type PageSeo = {
  title: string;
  description: string;
  path: string;
};

