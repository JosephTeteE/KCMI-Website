import type {
  AboutChurchContent,
  DailyFaithRecharge,
  FaqItem,
  HomePublicContent,
  LivestreamPublic,
  PublicContact,
  PublicMediaRef,
  SermonHighlight,
  SermonPlatform,
  ServiceOffering,
  SocialLink,
} from "@/content/types";
import type {
  AboutDocument,
  FaqsDocument,
  GlobalDocument,
  HomeDocument,
  SermonsPageDocument,
  ServicesDocument,
} from "@/content/website/schemas";
import { livestreamPublic as livestreamCopy } from "@/content/seed/pages";

export const FALLBACK_HERO_IMAGE: PublicMediaRef = {
  src: "/media/hero/welcome-1920.webp",
  alt: "",
  width: 1920,
  height: 1037,
};

export const FALLBACK_WELCOME_IMAGE: PublicMediaRef = {
  src: "/media/home/church-view.webp",
  alt: "Congregation gathered for worship at Kingdom Covenant Ministries International",
  width: 1200,
  height: 797,
};

export const FALLBACK_PORTRAIT: PublicMediaRef = {
  src: "/media/about/apostle-aikins.webp",
  alt: "Apostle Philemon Frank Aikins",
  width: 900,
  height: 1350,
};

export function mapHomePublic(
  doc: HomeDocument,
  heroImage: PublicMediaRef | null,
  welcomeImage: PublicMediaRef | null,
): HomePublicContent {
  return {
    heroKicker: doc.heroKicker,
    heroHeadline: doc.heroHeadline,
    heroSupporting: doc.heroSupporting,
    heroPrimaryCtaLabel: doc.heroPrimaryCtaLabel,
    heroPrimaryCtaHref: doc.heroPrimaryCtaHref,
    heroSecondaryCtaLabel: doc.heroSecondaryCtaLabel,
    heroSecondaryCtaHref: doc.heroSecondaryCtaHref,
    heroImage: heroImage ?? FALLBACK_HERO_IMAGE,
    welcomeEyebrow: doc.welcomeEyebrow,
    welcomeHeading: doc.welcomeHeading,
    welcomeBody: doc.welcomeBody,
    welcomeImage: welcomeImage ?? FALLBACK_WELCOME_IMAGE,
    prayer: {
      heading: doc.prayerHeading,
      verse: doc.prayerVerse,
      verseReference: doc.prayerVerseReference,
      body: doc.prayerBody,
      ctaLabel: doc.prayerCtaLabel,
      ctaHref: doc.prayerCtaHref,
    },
    giving: {
      heading: doc.givingHeading,
      verse: doc.givingVerse,
      verseReference: doc.givingVerseReference,
      ctaLabel: doc.givingCtaLabel,
      ctaHref: doc.givingCtaHref,
    },
    sermonFallback: {
      title: doc.sermonFallbackTitle,
      description: doc.sermonFallbackDescription,
      ctaLabel: doc.sermonFallbackCtaLabel,
      ctaHref: doc.sermonFallbackCtaHref,
      youtubeChannelUrl: doc.sermonFallbackYoutubeUrl,
      youtubeChannelLabel: doc.sermonFallbackYoutubeLabel,
    },
    locationsHeading: doc.locationsHeading,
    locationsSupporting: doc.locationsSupporting,
    spotlight: {
      takeoverEnabled: doc.spotlightTakeoverEnabled,
      takeoverMode: doc.spotlightTakeoverMode,
      promoVideoUrl: doc.spotlightPromoVideoUrl,
      windowStart: doc.spotlightWindowStart,
      windowEnd: doc.spotlightWindowEnd,
    },
  };
}

export function mapAboutChurch(
  doc: AboutDocument,
  portrait: PublicMediaRef | null,
): AboutChurchContent {
  return {
    whoWeAre: doc.whoWeAre,
    vision: doc.vision,
    missionParagraphs: doc.missionParagraphs,
    leadershipName: doc.leadershipName,
    leadershipRole: doc.leadershipRole,
    leadershipOrgLine: doc.leadershipOrgLine,
    leadershipHeadquarters: doc.leadershipHeadquarters,
    leadershipPreview: doc.leadershipPreview,
    portrait: portrait
      ? { ...portrait, alt: doc.portraitAlt || portrait.alt }
      : { ...FALLBACK_PORTRAIT, alt: doc.portraitAlt },
    bioParagraphs: doc.bioParagraphs,
  };
}

export function mapGlobalContact(doc: GlobalDocument): PublicContact {
  return {
    primaryEmail: doc.contactEmail,
    primaryEmailLabel: doc.contactEmailLabel,
    primaryPhoneDisplay: doc.contactPhoneDisplay,
    primaryPhoneTel: doc.contactPhoneTel,
    intro: doc.contactIntro,
  };
}

export function mapGlobalSocial(doc: GlobalDocument): SocialLink[] {
  return doc.socialLinks.map((item) => ({
    label: item.label,
    href: item.href,
    personal: /tiktok/i.test(item.label) && /frank/i.test(item.label),
  }));
}

export function mapGlobalDfr(doc: GlobalDocument): DailyFaithRecharge {
  return {
    heading: doc.dfrHeading,
    body: doc.dfrBody,
    spotify: { label: doc.dfrSpotifyLabel, href: doc.dfrSpotifyHref },
  };
}

export function mapLivestreamCopy(
  doc: GlobalDocument,
  live: { facebookPageUrl: string; isLive: boolean },
): LivestreamPublic {
  return {
    facebookPageUrl: live.facebookPageUrl || livestreamCopy.facebookPageUrl,
    isLive: live.isLive,
    heading: doc.livestreamHeading,
    notLiveMessage: doc.livestreamNotLiveMessage,
    liveMessage: doc.livestreamLiveMessage,
  };
}

export function mapServicesOfferings(doc: ServicesDocument): ServiceOffering[] {
  return [
    {
      id: "cell-fellowships",
      title: doc.cellTitle,
      body: doc.cellBody,
      kind: "ministry",
      cta: {
        label: doc.cellCta.label,
        href: doc.cellCta.href,
        external: doc.cellCta.href.startsWith("http"),
      },
    },
    {
      id: "service-teams",
      title: doc.teamsTitle,
      body: doc.teamsBody,
      kind: "ministry",
      cta: {
        label: doc.teamsCta.label,
        href: doc.teamsCta.href,
        external: doc.teamsCta.href.startsWith("http"),
      },
    },
    {
      id: "media",
      title: doc.mediaTitle,
      body: doc.mediaBody,
      kind: "media",
      links: [{ label: "Sermons", href: "/sermons" }],
    },
    {
      id: "care",
      title: doc.careTitle,
      body: doc.careBody,
      kind: "care",
      links: doc.careLinks.map((link) => ({
        label: link.label,
        href: link.href,
        external: link.external ?? link.href.startsWith("http"),
      })),
    },
  ];
}

export function mapFaqs(doc: FaqsDocument): FaqItem[] {
  return doc.items;
}

export function mapSermonPlatforms(doc: SermonsPageDocument): SermonPlatform[] {
  return doc.platforms;
}

export function sermonHighlightFromFallback(
  fallback: SermonHighlight,
): SermonHighlight {
  return fallback;
}
