import Link from "next/link";
import type { Branch } from "@/content/types";

export function BranchPublicDetails({
  branch,
  mapsHref,
}: {
  branch: Branch;
  mapsHref: string;
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div>
        <h2 className="font-display text-2xl font-semibold">Visit</h2>
        <address className="text-readable mt-4 not-italic text-[var(--color-text-muted)]">
          {branch.addressLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </address>
        {branch.serviceTimes.length > 0 ? (
          <ul
            className="mt-6 space-y-2"
            data-qa-service-times="present"
            data-qa-service-time-count={branch.serviceTimes.length}
          >
            {branch.serviceTimes.map((time) => (
              <li key={`${time.day}-${time.time}`} className="text-readable">
                <span className="text-[var(--color-text-muted)]">{time.day}: </span>
                <span className="font-semibold text-[var(--color-action-primary)]">
                  {time.time}
                </span>
                {time.note ? (
                  <span className="text-[var(--color-text-muted)]"> — {time.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div
            className="mt-6"
            data-qa-service-times="absent"
            data-qa-service-time-count={0}
          />
        )}
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <h2 className="font-display text-2xl font-semibold">Contact</h2>
        <ul className="mt-4 space-y-2">
          {branch.phones.map((phone) => (
            <li key={phone.tel}>
              <a
                href={`tel:${phone.tel}`}
                className="text-readable font-medium text-[var(--color-action-primary)]"
              >
                {phone.display}
              </a>
            </li>
          ))}
          {branch.emails?.map((email) => (
            <li key={email}>
              <a
                href={`mailto:${email}`}
                className="text-break-safe text-readable text-[var(--color-action-primary)]"
              >
                {email}
              </a>
            </li>
          ))}
        </ul>
        <a
          href={mapsHref}
          className="mt-6 inline-flex min-h-11 items-center text-readable-sm font-semibold text-[var(--color-action-primary)]"
          rel="noopener noreferrer"
          target="_blank"
        >
          Open in Maps
        </a>
        <p className="mt-6">
          <Link
            href="/locations"
            className="text-readable-sm font-semibold text-[var(--color-action-primary)]"
          >
            All locations
          </Link>
        </p>
      </div>
    </div>
  );
}
