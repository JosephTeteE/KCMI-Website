import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SkipLink } from "@/components/layout/skip-link";
import { BranchCard } from "@/components/content/branch-card";
import { FeaturedProgramSection } from "@/components/home/featured-program-section";
import { SermonHighlightSection } from "@/components/home/sermon-highlight-section";
import { getChurchIdentity } from "@/content";
import type { Branch } from "@/content/types";

const STRESS_EMAIL =
  "very.long.ministry.contact.address.for.layout.stress.testing@kingdomcovenantministriesinternational.example.invalid";
const STRESS_PHONE =
  "+233 555 582 826 / +228 94 43 38 85 / +234 9134 44 8322 (stress)";
const STRESS_BRANCH =
  "Kingdom Covenant Ministries International — Cape Coast Campus Fellowship Conference Room Branch";
const STRESS_PROGRAM =
  "Annual Covenant Convention and Family Discipleship Gathering of the Nations";
const STRESS_SERMON =
  "Raising Kings To Build The Kingdom: A Message of Hope, Humor, and Compassion for Families";
const STRESS_CTA =
  "Plan a visit to our Port Harcourt headquarters this Sunday morning";
const STRESS_ADDRESS = [
  "Okuruola Wonodi Close",
  "Off Stadium Road, Port Harcourt",
  "Rivers State, Federal Republic of Nigeria",
  "P.O Box 2595, Diobu — additional line for wrapping stress",
];
const STRESS_PROSE =
  "Using every creative biblical means, we disciple individuals, strengthen families, and transform communities—until a nation is won for Christ! ".repeat(
    3,
  );

/**
 * TEST-ONLY layout-stress page. Enabled when ALLOW_QA_STRESS=1.
 * Not in sitemap. Robots disallow /qa.
 * Route is /qa (not /__qa__) because Next.js treats underscore folders as private.
 */
export default function LayoutStressPage() {
  if (process.env.ALLOW_QA_STRESS !== "1") {
    return (
      <main id="main-content" className="site-container py-16">
        <h1 className="font-display text-3xl">Not available</h1>
        <p className="mt-3 text-readable text-[var(--color-text-muted)]">
          This page is only enabled during automated layout-stress runs.
        </p>
      </main>
    );
  }

  const identity = getChurchIdentity();
  const longBranch: Branch = {
    id: "stress-branch",
    slug: "stress-branch",
    name: STRESS_BRANCH,
    cityLabel: "Cape Coast, Ghana",
    country: "Ghana",
    addressLines: STRESS_ADDRESS,
    phones: [{ display: STRESS_PHONE, tel: "+233555582826" }],
    emails: [STRESS_EMAIL],
    serviceTimes: [
      { day: "Sunday", time: "08:30 am" },
      { day: "Thursday", time: "05:30 pm" },
    ],
    mapsQuery: "University of Cape Coast School of Business Guest House",
  };

  const missingOptional: Branch = {
    id: "stress-empty",
    slug: "stress-empty",
    name: "Kasoa (stress empty optionals)",
    cityLabel: "Kasoa, Ghana",
    country: "Ghana",
    addressLines: ["Behind Bennet Clinic"],
    phones: [],
    serviceTimes: [],
  };

  return (
    <>
      <SkipLink />
      <SiteHeader
        brandName={identity.legalName}
        shortName={identity.shortName}
        items={[
          { label: "Home", href: "/" },
          { label: "About", href: "/about" },
        ]}
        cta={{
          label: STRESS_CTA,
          href: "/locations",
        }}
      />
      <main id="main-content" className="site-container section-space space-y-10">
        <h1 className="font-display text-4xl font-semibold">
          Layout stress (test only)
        </h1>
        <p className="text-break-safe text-readable">{STRESS_EMAIL}</p>
        <p className="text-readable">{STRESS_PROSE}</p>
        <ul className="grid gap-6 md:grid-cols-2">
          <li>
            <BranchCard branch={longBranch} />
          </li>
          <li>
            <BranchCard branch={missingOptional} />
          </li>
        </ul>
        <FeaturedProgramSection
          program={{
            id: "stress-program",
            title: STRESS_PROGRAM,
            shortDescription:
              "A longer program description used only for layout-stress verification.",
            datesLabel: "1–7 Sep 2026",
            imageSrc: null,
            imageAlt: "",
            ctaLabel: STRESS_CTA,
            ctaHref: "/events",
            placement: "featured",
            status: "published",
          }}
        />
        <SermonHighlightSection
          sermon={{
            title: STRESS_SERMON,
            description: "Stress-only sermon highlight.",
            ctaLabel: "Watch now",
            ctaHref: "/sermons",
            youtubeChannelUrl: "https://www.youtube.com/@rehoboth-tv",
            youtubeChannelLabel: "YouTube · @rehoboth-tv",
          }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
