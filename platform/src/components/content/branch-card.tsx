import Link from "next/link";
import { publicPlaceLabel } from "@/content/branch-groups";
import type { Branch } from "@/content/types";
import { mapsHrefForBranch } from "@/content";

type Props = {
  branch: Branch;
};

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

/** Compact branch summary for lists and QA stress pages. Prefer LocationsFinder on /locations. */
export function BranchCard({ branch }: Props) {
  const mapsHref = mapsHrefForBranch(branch);
  const detailHref = `/locations/${branch.slug}`;
  const times = serviceTimeSummary(branch);

  return (
    <article className="flex h-full min-w-0 flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
      <h2 className="font-display text-break-safe text-xl font-semibold text-[var(--color-text-body)]">
        <Link href={detailHref} className="hover:text-[var(--color-action-primary)]">
          {branch.name}
        </Link>
      </h2>
      <p className="mt-1 text-readable-sm text-[var(--color-text-muted)]">
        {publicPlaceLabel(branch.cityLabel, branch.country)}
      </p>
      {times ? (
        <p className="mt-4 text-readable-sm text-[var(--color-text-body)]">{times}</p>
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
    </article>
  );
}
