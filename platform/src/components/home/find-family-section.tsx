import Link from "next/link";
import type { Branch } from "@/content/types";
import { sortCountriesForPresentation } from "@/content/branch-groups";

type Props = {
  branches: Branch[];
  heading?: string;
  subheading?: string;
  /** Hub preview only — show heading copy even with zero branches */
  allowEmpty?: boolean;
};

function uniqueCountries(branches: Branch[]): string[] {
  const seen = new Set<string>();
  const unordered: string[] = [];
  for (const branch of branches) {
    const country = branch.country?.trim();
    if (!country || seen.has(country)) continue;
    seen.add(country);
    unordered.push(country);
  }
  return sortCountriesForPresentation(unordered);
}

export function FindFamilySection({
  branches,
  heading = "One church · Multiple locations",
  subheading,
  allowEmpty = false,
}: Props) {
  const count = branches.length;
  if (count === 0 && !allowEmpty) return null;

  const countries = uniqueCountries(branches);
  const summary =
    subheading ??
    (count === 0
      ? "Find a KCMI family near you."
      : countries.length > 0
        ? `${count} location${count === 1 ? "" : "s"} across ${countries.join(" · ")}`
        : `${count} location${count === 1 ? "" : "s"}`);

  return (
    <section
      id="locations"
      aria-labelledby="find-family-heading"
      className="section-space-lg"
    >
      <div className="site-container-editorial">
        <div className="find-family-panel motion-fade-up overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-tint)] px-6 py-10 sm:px-10 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end lg:gap-10 lg:px-14 lg:py-14">
          <div>
            <p className="text-sm font-semibold tracking-[0.16em] text-[var(--color-action-primary)] uppercase">
              Our family of churches
            </p>
            <h2
              id="find-family-heading"
              className="font-display mt-3 max-w-2xl text-3xl font-semibold text-balance uppercase sm:text-4xl"
            >
              {heading}
            </h2>
            <p className="mt-4 max-w-prose text-readable text-[var(--color-text-muted)]">
              {summary}
            </p>

            {countries.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="Countries">
                {countries.map((country) => (
                  <li
                    key={country}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-page)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-body)]"
                  >
                    {country}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="mt-8 lg:mt-0 lg:justify-self-end">
            <Link
              href="/locations"
              className="ui-cta inline-flex min-h-12 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-sm font-semibold text-[var(--color-action-primary-fg)]"
            >
              Find a KCMI Location
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
