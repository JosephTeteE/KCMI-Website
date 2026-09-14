import Image from "next/image";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import type { PublicEventDetail } from "@/lib/events/types";

export function EventDetail({ event }: { event: PublicEventDetail }) {
  const locationLine = [event.venueLabel, event.placeLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageShell
      eyebrow={event.kindLabel}
      title={event.title}
      description={event.datesLabel}
    >
      <div className="mx-auto max-w-3xl">
        {event.imageSrc ? (
          <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-tint)]">
            <Image
              src={event.imageSrc}
              alt={event.imageAlt || ""}
              fill
              className="object-cover"
              sizes="(min-width: 768px) 48rem, 100vw"
              priority
            />
          </div>
        ) : (
          <div className="mb-8 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-tint)] px-6 py-14 sm:px-10">
            <p className="text-readable-sm font-semibold tracking-wide text-[var(--color-action-primary)] uppercase">
              Kingdom Covenant Ministries International
            </p>
            <p className="mt-3 font-display text-3xl font-semibold text-balance sm:text-4xl">
              {event.title}
            </p>
            {event.theme ? (
              <p className="mt-3 text-readable text-[var(--color-text-muted)]">
                {event.theme}
              </p>
            ) : null}
          </div>
        )}

        <dl className="grid gap-4 sm:grid-cols-2">
          {event.theme ? (
            <div>
              <dt className="text-readable-sm font-semibold text-[var(--color-text-body)]">
                Theme
              </dt>
              <dd className="mt-1 text-readable text-[var(--color-text-muted)]">
                {event.theme}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-readable-sm font-semibold text-[var(--color-text-body)]">
              Dates
            </dt>
            <dd className="mt-1 text-readable text-[var(--color-text-muted)]">
              {event.datesLabel}
            </dd>
          </div>
          {locationLine ? (
            <div>
              <dt className="text-readable-sm font-semibold text-[var(--color-text-body)]">
                Location
              </dt>
              <dd className="mt-1 text-readable text-[var(--color-text-muted)]">
                {locationLine}
              </dd>
            </div>
          ) : null}
          {event.branchName && event.branchSlug ? (
            <div>
              <dt className="text-readable-sm font-semibold text-[var(--color-text-body)]">
                Hosted with
              </dt>
              <dd className="mt-1 text-readable text-[var(--color-text-muted)]">
                <Link
                  href={`/locations/${event.branchSlug}`}
                  className="font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
                >
                  {event.branchName}
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>

        {event.summary ? (
          <p className="text-readable mt-8 text-[var(--color-text-body)]">
            {event.summary}
          </p>
        ) : null}

        {event.bodyText ? (
          <div className="mt-6 space-y-4">
            {event.bodyText
              .split(/\n+/)
              .map((para) => para.trim())
              .filter(Boolean)
              .map((para) => (
                <p
                  key={para.slice(0, 48)}
                  className="text-readable text-[var(--color-text-muted)]"
                >
                  {para}
                </p>
              ))}
          </div>
        ) : null}

        {event.contactEmail || event.contactPhoneDisplay ? (
          <div className="mt-10 border-t border-[var(--color-border)] pt-8">
            <h2 className="font-display text-xl font-semibold">Contact</h2>
            <ul className="mt-3 space-y-2 text-readable text-[var(--color-text-muted)]">
              {event.contactEmail ? (
                <li>
                  <a
                    href={`mailto:${event.contactEmail}`}
                    className="font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
                  >
                    {event.contactEmail}
                  </a>
                </li>
              ) : null}
              {event.contactPhoneDisplay ? (
                <li>{event.contactPhoneDisplay}</li>
              ) : null}
            </ul>
          </div>
        ) : null}

        <div className="mt-10">
          <Link
            href="/events"
            className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-5 font-semibold text-[var(--color-text-body)]"
          >
            All events
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
