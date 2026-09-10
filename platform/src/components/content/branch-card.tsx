import Link from "next/link";
import { publicPlaceLabel } from "@/content/branch-groups";
import type { Branch } from "@/content/types";
import { mapsHrefForBranch } from "@/content";

type Props = {
  branch: Branch;
};

export function BranchCard({ branch }: Props) {
  const mapsHref = mapsHrefForBranch(branch);
  const detailHref = `/locations/${branch.slug}`;

  return (
    <article className="card-pad flex h-full min-w-0 flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)]">
      <h2 className="font-display text-break-safe text-2xl font-semibold text-[var(--color-text-body)]">
        <Link href={detailHref} className="hover:text-[var(--color-action-primary)]">
          {branch.name}
        </Link>
      </h2>
      <p className="mt-1 text-readable-sm text-[var(--color-text-muted)]">
        {publicPlaceLabel(branch.cityLabel, branch.country)}
      </p>

      <address className="text-readable mt-5 not-italic text-[var(--color-text-muted)]">
        {branch.addressLines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </address>

      {branch.serviceTimes.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {branch.serviceTimes.map((time) => (
            <li key={`${time.day}-${time.time}`} className="text-readable-sm">
              <span className="text-[var(--color-text-muted)]">{time.day}: </span>
              <span className="font-semibold text-[var(--color-action-primary)]">
                {time.time}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-readable-sm text-[var(--color-text-muted)]">
          Service times for this location will be published here when they are
          available.
        </p>
      )}

      <ul className="mt-5 space-y-2">
        {branch.phones.map((phone) => (
          <li key={phone.tel} className="min-w-0">
            <a
              href={`tel:${phone.tel}`}
              className="text-break-safe text-readable-sm font-medium text-[var(--color-text-body)] hover:text-[var(--color-action-primary)]"
            >
              {phone.display}
            </a>
          </li>
        ))}
        {branch.emails?.map((email) => (
          <li key={email} className="min-w-0">
            <a
              href={`mailto:${email}`}
              className="text-break-safe text-readable-sm text-[var(--color-text-muted)] hover:text-[var(--color-action-primary)]"
            >
              {email}
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 pt-6">
        <Link
          href={detailHref}
          className="inline-flex min-h-11 items-center text-readable-sm font-semibold text-[var(--color-action-primary)]"
        >
          Location page
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
