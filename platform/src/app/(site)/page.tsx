import type { Metadata } from "next";
import { FeaturedProgramSection } from "@/components/home/featured-program-section";
import { GivingCtaSection } from "@/components/home/giving-cta-section";
import { HomeHero } from "@/components/home/home-hero";
import { LocationsPreviewSection } from "@/components/home/locations-preview-section";
import { PrayerCtaSection } from "@/components/home/prayer-cta-section";
import { SermonHighlightSection } from "@/components/home/sermon-highlight-section";
import { ServiceTimesSection } from "@/components/home/service-times-section";
import { WelcomeSection } from "@/components/home/welcome-section";
import {
  getChurchIdentity,
  getBranches,
  getFeaturedProgram,
  getFeaturedSermons,
  getGivingCta,
  getHeaderCta,
  getPrayerCta,
  getServiceTimes,
  getSocialLinks,
} from "@/content";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Kingdom Covenant Ministries International (Rehoboth Christian Center) — worship, locations, sermons, prayer, and giving.",
  alternates: { canonical: "/" },
};

function OrganizationJsonLd() {
  const identity = getChurchIdentity();
  const social = getSocialLinks();
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
      // Verified Organization fields only — no dangerouslySetInnerHTML of user content
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function HomePage() {
  const identity = getChurchIdentity();
  const times = await getServiceTimes();
  const program = await getFeaturedProgram();
  const sermon = await getFeaturedSermons();
  const branches = await getBranches();
  const prayer = getPrayerCta();
  const giving = getGivingCta();
  const live = getHeaderCta();

  return (
    <main id="main-content">
      <OrganizationJsonLd />
      <HomeHero identity={identity} liveHref={live.href} />
      <ServiceTimesSection
        times={times}
        locationLabel="Port Harcourt, Nigeria"
      />
      <FeaturedProgramSection program={program} />
      <WelcomeSection identity={identity} />
      <SermonHighlightSection sermon={sermon} />
      <LocationsPreviewSection branches={branches} />
      <PrayerCtaSection prayer={prayer} />
      <GivingCtaSection giving={giving} />
    </main>
  );
}
