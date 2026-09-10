import { BranchPublicDetails } from "@/components/content/branch-public-details";
import { HomeHero } from "@/components/home/home-hero";
import { HubPreviewFrame } from "@/components/hub/hub-preview-frame";
import {
  defaultHomeDocument,
} from "@/content/website/defaults";
import {
  FALLBACK_HERO_IMAGE,
  FALLBACK_WELCOME_IMAGE,
  mapHomePublic,
} from "@/content/website/public-map";
import type { Branch } from "@/content/types";

/**
 * TEST-ONLY Hub preview harness for D1.6 final visual verification.
 * Enabled only when ALLOW_QA_STRESS=1. Not in sitemap. Robots disallow /qa.
 * Renders the real HubPreviewFrame + public preview components with synthetic
 * content so screenshots do not require Auth when local GoTrue is unhealthy.
 */
export default function QaHubPreviewPage() {
  if (process.env.ALLOW_QA_STRESS !== "1") {
    return (
      <main id="main-content" className="site-container py-16">
        <h1 className="font-display text-3xl">Not available</h1>
        <p className="mt-3 text-readable text-[var(--color-text-muted)]">
          This page is only enabled during local QA preview runs
          (ALLOW_QA_STRESS=1).
        </p>
      </main>
    );
  }

  const home = mapHomePublic(
    defaultHomeDocument,
    FALLBACK_HERO_IMAGE,
    FALLBACK_WELCOME_IMAGE,
  );

  const branch: Branch = {
    id: "qa-accra",
    slug: "accra",
    name: "Accra",
    cityLabel: "Accra",
    country: "Ghana",
    addressLines: [
      "QA-only synthetic address",
      "Accra, Ghana",
    ],
    phones: [{ display: "+233 000 000 000", tel: "+233000000000" }],
    emails: ["qa-preview-only@example.invalid"],
    serviceTimes: [
      { day: "Sunday", time: "08:30 am" },
      { day: "Wednesday", time: "06:00 pm" },
    ],
    mapsQuery: "Accra Ghana",
  };
  const mapsHref =
    "https://www.google.com/maps/search/?api=1&query=Accra%20Ghana";

  return (
    <main
      id="main-content"
      className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6"
    >
      <header className="space-y-2 border-b border-[var(--color-border)] pb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-action-primary)]">
          Local QA only
        </p>
        <h1 className="font-display text-2xl font-semibold">
          Hub preview harness
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Synthetic Hub card width. Uses the real HubPreviewFrame and public
          Homepage / Branch components. Not a production Hub screen.
        </p>
      </header>

      <section data-qa="home-preview-card" className="w-full">
        <p className="mb-2 text-sm font-medium text-[var(--color-text-muted)]">
          Simulated Hub content width (follows viewport)
        </p>
        <HubPreviewFrame title="Homepage Top Banner" live>
          <HomeHero home={home} />
        </HubPreviewFrame>
      </section>

      <section data-qa="branch-preview-card" className="w-full max-w-xl">
        <p className="mb-2 text-sm font-medium text-[var(--color-text-muted)]">
          Simulated Hub column (~mobile)
        </p>
        <HubPreviewFrame title="Branch page" live>
          <div className="p-4">
            <BranchPublicDetails branch={branch} mapsHref={mapsHref} />
          </div>
        </HubPreviewFrame>
      </section>
    </main>
  );
}
