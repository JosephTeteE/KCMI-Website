/**
 * TEST-ONLY branch state fixtures for QA scenario integrity (QA1.3.1).
 * Enabled only when ALLOW_QA_STRESS=1. Deterministic — does not read CMS.
 */
import Image from "next/image";
import { BranchPublicDetails } from "@/components/content/branch-public-details";
import { FALLBACK_WELCOME_IMAGE } from "@/content/website/public-map";
import type { Branch } from "@/content/types";

type Variant = "with-media" | "no-media" | "missing-time";

const VARIANTS: Variant[] = ["with-media", "no-media", "missing-time"];

function baseBranch(partial: Partial<Branch> & Pick<Branch, "slug" | "name">): Branch {
  return {
    id: partial.id || partial.slug,
    slug: partial.slug,
    name: partial.name,
    cityLabel: partial.cityLabel || "QA Fixture City",
    country: partial.country || "Nigeria",
    addressLines: partial.addressLines || ["QA fixture address line"],
    phones: partial.phones || [],
    serviceTimes: partial.serviceTimes || [],
    mapsQuery: partial.mapsQuery || "QA fixture",
  };
}

export default async function QaBranchStatesPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  if (process.env.ALLOW_QA_STRESS !== "1") {
    return (
      <main id="main-content" className="site-container py-16">
        <h1 className="font-display text-3xl">Not available</h1>
        <p className="mt-3 text-readable text-[var(--color-text-muted)]">
          Enable ALLOW_QA_STRESS=1 for QA branch-state fixtures.
        </p>
      </main>
    );
  }

  const params = await searchParams;
  const variant = (VARIANTS.includes(params.variant as Variant)
    ? params.variant
    : "with-media") as Variant;

  const withMedia = variant === "with-media";
  const missingTime = variant === "missing-time";

  const branch = baseBranch({
    slug: `qa-${variant}`,
    name:
      variant === "with-media"
        ? "QA Branch With Media"
        : variant === "no-media"
          ? "QA Branch Without Media"
          : "QA Branch Missing Service Times",
    serviceTimes: missingTime
      ? []
      : [{ day: "Sunday", time: "08:30 am" }],
  });

  return (
    <main id="main-content" className="site-container py-10" data-qa-branch-variant={variant}>
      <p className="sr-only">QA branch state fixture variant {variant}</p>
      <h1 className="font-display text-3xl font-semibold">{branch.name}</h1>
      <div
        className="mt-8"
        data-qa-branch-media={withMedia ? "with-media" : "without-media"}
      >
        {withMedia ? (
          <div
            data-branch-media="hero"
            data-qa-fixture="qa-branch-hero"
            className="relative mb-10 aspect-[21/9] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-tint)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <Image
              src={FALLBACK_WELCOME_IMAGE.src}
              alt={FALLBACK_WELCOME_IMAGE.alt || "QA branch photograph"}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          </div>
        ) : null}
        <BranchPublicDetails
          branch={branch}
          mapsHref="https://www.google.com/maps"
        />
      </div>
    </main>
  );
}
