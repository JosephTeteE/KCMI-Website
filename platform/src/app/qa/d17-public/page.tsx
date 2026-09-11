/**
 * TEST-ONLY D1.7 public visual fixtures.
 * Enabled only when ALLOW_QA_STRESS=1. Deterministic synthetic content —
 * does not read or mutate hosted CMS.
 */
import { DiscoverKcmiSection } from "@/components/home/discover-kcmi-section";
import { FeaturedProgramSection } from "@/components/home/featured-program-section";
import { FindFamilySection } from "@/components/home/find-family-section";
import { HomeHero } from "@/components/home/home-hero";
import { PrayerGivingSection } from "@/components/home/prayer-giving-section";
import { ProgramSpotlightTakeover } from "@/components/home/program-spotlight-takeover";
import { WatchListenSection } from "@/components/home/watch-listen-section";
import { defaultHomeDocument, defaultServicesDocument } from "@/content/website/defaults";
import {
  FALLBACK_HERO_IMAGE,
  FALLBACK_WELCOME_IMAGE,
  mapHomePublic,
  mapServicesOfferings,
} from "@/content/website/public-map";
import type { Branch, FeaturedProgram, SermonPublic } from "@/content/types";

type Variant =
  | "no-spotlight"
  | "spotlight"
  | "takeover"
  | "takeover-off"
  | "watch-sermon"
  | "watch-fallback";

const VARIANTS: Variant[] = [
  "no-spotlight",
  "spotlight",
  "takeover",
  "takeover-off",
  "watch-sermon",
  "watch-fallback",
];

function syntheticProgram(): FeaturedProgram {
  return {
    id: "a1000000-0000-4000-8000-00000000d17a",
    title: "D1.7 Review Spotlight Program",
    shortDescription:
      "Synthetic review fixture for KCMI Spotlight visual QA. Not a live announcement.",
    datesLabel: "12–14 September 2026 · Port Harcourt",
    imageSrc: FALLBACK_WELCOME_IMAGE.src,
    imageAlt: FALLBACK_WELCOME_IMAGE.alt,
    ctaLabel: "Learn more",
    ctaHref: "/about",
    placement: "featured",
    status: "published",
  };
}

function syntheticSermon(): SermonPublic {
  return {
    id: "a1000000-0000-4000-8000-00000000d17b",
    title: "D1.7 Review Message",
    speaker: "Apostle Philemon Frank Aikins",
    sermonDate: "2026-09-01",
    scriptureReference: null,
    summary: "Synthetic sermon fixture for Watch & Listen visual QA.",
    youtubeUrl: "https://www.youtube.com/@rehoboth-tv",
    thumbnailSrc: FALLBACK_WELCOME_IMAGE.src,
    thumbnailAlt: "Synthetic sermon thumbnail",
  };
}

function offerings() {
  return mapServicesOfferings(defaultServicesDocument);
}

const seedBranches: Branch[] = [
  {
    id: "1",
    slug: "headquarters",
    name: "Headquarters",
    cityLabel: "Port Harcourt",
    country: "Nigeria",
    addressLines: ["Port Harcourt"],
    phones: [],
    serviceTimes: [{ day: "Sunday", time: "8:00 AM" }],
  },
  {
    id: "2",
    slug: "accra",
    name: "Accra",
    cityLabel: "Accra",
    country: "Ghana",
    addressLines: ["Accra"],
    phones: [],
    serviceTimes: [],
  },
  {
    id: "3",
    slug: "lome",
    name: "Lomé",
    cityLabel: "Lomé",
    country: "Togo",
    addressLines: ["Lomé"],
    phones: [],
    serviceTimes: [{ day: "Sunday", time: "9:00 AM" }],
  },
];

export default async function QaD17PublicPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  if (process.env.ALLOW_QA_STRESS !== "1") {
    return (
      <main id="main-content" className="site-container py-16">
        <h1 className="font-display text-3xl">Not available</h1>
        <p className="mt-3 text-readable text-[var(--color-text-muted)]">
          Enable ALLOW_QA_STRESS=1 for D1.7 public visual fixtures.
        </p>
      </main>
    );
  }

  const params = await searchParams;
  const variant = (VARIANTS.includes(params.variant as Variant)
    ? params.variant
    : "no-spotlight") as Variant;

  const home = mapHomePublic(
    {
      ...defaultHomeDocument,
      spotlightTakeoverEnabled: variant === "takeover",
      spotlightTakeoverMode: "once_per_browser",
    },
    FALLBACK_HERO_IMAGE,
    FALLBACK_WELCOME_IMAGE,
  );

  const program =
    variant === "no-spotlight" || variant === "watch-sermon" || variant === "watch-fallback"
      ? null
      : syntheticProgram();

  const sermon = variant === "watch-sermon" ? syntheticSermon() : null;
  const showTakeover = variant === "takeover";

  return (
    <main id="main-content" data-qa-d17-variant={variant}>
      <p className="sr-only">D1.7 QA public fixture variant {variant}</p>
      {showTakeover ? (
        <ProgramSpotlightTakeover
          program={program}
          enabled
          frequency="once_per_browser"
          promoVideoUrl={null}
        />
      ) : null}
      <HomeHero
        home={home}
        times={[{ day: "Sunday", time: "8:00 AM" }]}
        locationLabel="Port Harcourt, Nigeria"
        isLive={false}
      />
      <FeaturedProgramSection program={program} />
      <DiscoverKcmiSection
        home={home}
        offerings={offerings()}
        aboutHref="/about"
      />
      <WatchListenSection
        livestream={{
          heading: "KCMI Live Stream",
          isLive: false,
          notLiveMessage: "We are not live right now.",
          liveMessage: "A service is live now.",
          facebookPageUrl: "https://www.facebook.com/",
        }}
        sermon={sermon}
        fallback={home.sermonFallback}
      />
      <FindFamilySection
        branches={seedBranches}
        heading={home.locationsHeading}
        subheading={home.locationsSupporting}
      />
      <PrayerGivingSection prayer={home.prayer} giving={home.giving} />
    </main>
  );
}
