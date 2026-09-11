import Link from "next/link";
import { BranchCountryGroups } from "@/components/content/branch-country-groups";
import type { Branch } from "@/content/types";

type Props = {
  branches: Branch[];
};

export function LocationsPreviewSection({ branches }: Props) {
  return (
    <section
      id="locations"
      aria-labelledby="locations-heading"
      className="section-space-lg"
    >
      <div className="site-container">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-[var(--color-action-primary)] uppercase">
              Our family of churches
            </p>
            <h2
              id="locations-heading"
              className="font-display mt-3 text-3xl font-semibold sm:text-4xl"
            >
              Locations
            </h2>
          </div>
          <Link
            href="/locations"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-action-primary)]"
          >
            View all locations
          </Link>
        </div>

        <div className="mt-10">
          <BranchCountryGroups branches={branches} headingLevel="h3">
            {(branch) => (
              <Link
                href={`/locations/${branch.slug}`}
                className="block h-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 hover:border-[var(--color-action-primary)]"
              >
                <h4 className="font-display text-xl font-semibold text-[var(--color-text-body)]">
                  {branch.name}
                </h4>
                <p className="mt-1 text-readable-sm text-[var(--color-text-muted)]">
                  {branch.cityLabel}
                </p>
                {branch.serviceTimes[0] ? (
                  <p className="mt-4 text-readable-sm text-[var(--color-text-body)]">
                    {branch.serviceTimes[0].day}{" "}
                    <span className="font-semibold text-[var(--color-action-primary)]">
                      {branch.serviceTimes[0].time}
                    </span>
                  </p>
                ) : null}
              </Link>
            )}
          </BranchCountryGroups>
        </div>
      </div>
    </section>
  );
}
