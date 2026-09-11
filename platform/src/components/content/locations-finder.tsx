"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BRANCH_COUNTRY_ORDER, publicPlaceLabel } from "@/content/branch-groups";
import type { Branch } from "@/content/types";

export type BranchHeroMedia = {
  src: string;
  alt: string;
};

type Props = {
  branches: Branch[];
  branchHeroes?: Record<string, BranchHeroMedia>;
};

const COUNTRY_FILTERS = ["All", ...BRANCH_COUNTRY_ORDER] as const;

function mapsHrefForBranch(branch: Branch): string {
  if (branch.mapsUrl) return branch.mapsUrl;
  const q = branch.mapsQuery ?? branch.addressLines.join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function serviceTimeSummary(branch: Branch): string | null {
  const times = branch.serviceTimes.filter(
    (item) => item.day.trim() && item.time.trim(),
  );
  if (times.length === 0) return null;
  if (times.length === 1) {
    const only = times[0]!;
    return `${only.day} ${only.time}`;
  }
  return times
    .slice(0, 2)
    .map((item) => `${item.day} ${item.time}`)
    .join(" · ");
}

function matchesQuery(branch: Branch, query: string): boolean {
  if (!query) return true;
  const haystack = [
    branch.name,
    branch.cityLabel,
    branch.country ?? "",
    ...branch.addressLines,
  ]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

export function LocationsFinder({ branches, branchHeroes }: Props) {
  const [query, setQuery] = useState("");
  const [country, setCountry] =
    useState<(typeof COUNTRY_FILTERS)[number]>("All");

  const availableCountries = useMemo(() => {
    const present = new Set(
      branches
        .map((branch) => branch.country?.trim())
        .filter((value): value is string => Boolean(value)),
    );
    return COUNTRY_FILTERS.filter(
      (item) => item === "All" || present.has(item),
    );
  }, [branches]);

  const filtered = useMemo(() => {
    return branches.filter((branch) => {
      if (country !== "All" && branch.country?.trim() !== country) {
        return false;
      }
      return matchesQuery(branch, query.trim());
    });
  }, [branches, country, query]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <label className="block min-w-0 flex-1">
          <span className="text-sm font-semibold text-[var(--color-text-body)]">
            Search locations
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, city, or country"
            className="mt-2 w-full min-h-12 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-page)] px-4 text-[var(--color-text-body)]"
            autoComplete="off"
          />
        </label>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by country"
        >
          {availableCountries.map((item) => {
            const selected = country === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setCountry(item)}
                aria-pressed={selected}
                className={`inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-3 text-sm font-semibold ${
                  selected
                    ? "bg-[var(--color-action-primary)] text-[var(--color-action-primary-fg)]"
                    : "border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-body)]"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-readable text-[var(--color-text-muted)]">
          No locations match that search.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((branch) => {
            const detailHref = `/locations/${branch.slug}`;
            const mapsHref = mapsHrefForBranch(branch);
            const times = serviceTimeSummary(branch);
            const hero = branchHeroes?.[branch.slug];

            return (
              <li key={branch.id} className="min-w-0">
                <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
                  {hero ? (
                    <div className="relative aspect-[16/9] bg-[var(--color-surface-tint)]">
                      <Image
                        src={hero.src}
                        alt={hero.alt || ""}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-display text-break-safe text-xl font-semibold text-[var(--color-text-body)]">
                      <Link
                        href={detailHref}
                        className="hover:text-[var(--color-action-primary)]"
                      >
                        {branch.name}
                      </Link>
                    </h2>
                    <p className="mt-1 text-readable-sm text-[var(--color-text-muted)]">
                      {publicPlaceLabel(branch.cityLabel, branch.country)}
                    </p>
                    {times ? (
                      <p className="mt-4 text-readable-sm text-[var(--color-text-body)]">
                        {times}
                      </p>
                    ) : null}
                    <div className="mt-auto flex flex-wrap items-center gap-x-4 pt-5">
                      <Link
                        href={detailHref}
                        className="inline-flex min-h-11 items-center text-readable-sm font-semibold text-[var(--color-action-primary)]"
                      >
                        View location
                      </Link>
                      <a
                        href={mapsHref}
                        className="inline-flex min-h-11 items-center text-readable-sm font-semibold text-[var(--color-action-primary)]"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Open in Maps
                      </a>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
