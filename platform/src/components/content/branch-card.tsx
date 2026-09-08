import type { Branch } from "@/content/types";
import { mapsHrefForBranch } from "@/content";

type Props = {
  branch: Branch;
};

export function BranchCard({ branch }: Props) {
  const mapsHref = mapsHrefForBranch(branch);

  return (
    <article className="flex h-full min-w-0 flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-[var(--shadow-soft)]">
      <h2 className="font-display text-break-safe text-2xl font-semibold text-[var(--color-text-body)]">
        {branch.name}
      </h2>
      <p className="mt-1 text-readable-sm text-[var(--color-text-muted)]">
        {branch.cityLabel}
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
          {branch.serviceTimes.map((t) => (
            <li key={`${t.day}-${t.time}`} className="text-readable-sm">
              <span className="text-[var(--color-text-muted)]">{t.day}: </span>
              <span className="font-semibold text-[var(--color-action-primary)]">
                {t.time}
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
        {branch.phones.map((p) => (
          <li key={p.tel} className="min-w-0">
            <a
              href={`tel:${p.tel}`}
              className="text-break-safe text-readable-sm font-medium text-[var(--color-text-body)] hover:text-[var(--color-action-primary)]"
            >
              {p.display}
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

      <a
        href={mapsHref}
        className="mt-auto inline-flex min-h-11 items-center pt-6 text-readable-sm font-semibold text-[var(--color-action-primary)]"
        rel="noopener noreferrer"
        target="_blank"
      >
        Open in Maps
      </a>
    </article>
  );
}
