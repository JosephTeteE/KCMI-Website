import type { Metadata } from "next";
import { DiscoverKcmiSection } from "@/components/home/discover-kcmi-section";
import { FeaturedProgramSection } from "@/components/home/featured-program-section";
import { FindFamilySection } from "@/components/home/find-family-section";
import { HomeHero } from "@/components/home/home-hero";
import { PrayerGivingSection } from "@/components/home/prayer-giving-section";
import { ProgramSpotlightTakeover } from "@/components/home/program-spotlight-takeover";
import { UpcomingProgramsSection } from "@/components/home/upcoming-programs-section";
import { WatchListenSection } from "@/components/home/watch-listen-section";
import {
  getChurchIdentity,
  getBranches,
  getFeaturedProgram,
  getFeaturedSermons,
  getHeadquartersLocationLabel,
  getHomeContent,
  getHomeFeaturedSermon,
  getLivestreamPublic,
  getServiceOfferings,
  getServiceTimes,
  getSocialLinks,
} from "@/content";
import { fetchUpcomingProgramsForHomepage } from "@/lib/programs/upcoming-homepage";
import { shouldUseSeedContent } from "@/lib/env";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Kingdom Covenant Ministries International (Rehoboth Christian Center) — worship, locations, sermons, prayer, and giving.",
  alternates: { canonical: "/" },
};

async function OrganizationJsonLd() {
  const identity = getChurchIdentity();
  const social = await getSocialLinks();
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: identity.legalName,
    alternateName: [identity.shortName, identity.alternateName],
    url: identity.siteUrl,
    logo: `${identity.siteUrl}/brand/kcmi-logo.png`,
    sameAs: social.map((s) => s.href),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function HomePage() {
  const home = await getHomeContent();
  const times = await getServiceTimes();
  const locationLabel = await getHeadquartersLocationLabel();
  const program = await getFeaturedProgram();
  const sermonFallback = await getFeaturedSermons();
  const sermon = await getHomeFeaturedSermon();
  const branches = await getBranches();
  const livestream = await getLivestreamPublic();
  const offerings = await getServiceOfferings();
  const upcomingPrograms = shouldUseSeedContent()
    ? []
    : await fetchUpcomingProgramsForHomepage(3);

  return (
    <main id="main-content">
      <OrganizationJsonLd />
      <ProgramSpotlightTakeover
        program={program}
        enabled={home.spotlight.takeoverEnabled}
        frequency={home.spotlight.takeoverMode}
        promoVideoUrl={home.spotlight.promoVideoUrl}
        windowStart={home.spotlight.windowStart}
        windowEnd={home.spotlight.windowEnd}
      />
      <HomeHero
        home={home}
        times={times}
        locationLabel={locationLabel}
        isLive={livestream.isLive}
      />
      <FeaturedProgramSection program={program} />
      <DiscoverKcmiSection home={home} offerings={offerings} aboutHref="/about" />
      <WatchListenSection
        livestream={livestream}
        sermon={sermon}
        fallback={sermonFallback}
      />
      <FindFamilySection
        branches={branches}
        heading={home.locationsHeading}
        subheading={home.locationsSupporting}
      />
      <UpcomingProgramsSection programs={upcomingPrograms} />
      <PrayerGivingSection prayer={home.prayer} giving={home.giving} />
    </main>
  );
}
