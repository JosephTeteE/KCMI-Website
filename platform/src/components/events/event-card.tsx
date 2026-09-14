import Image from "next/image";
import Link from "next/link";
import type { PublicEventCard } from "@/lib/events/types";

export function EventCard({ event }: { event: PublicEventCard }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <Link
        href={`/events/${event.slug}`}
        className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action-primary)]"
      >
        {event.imageSrc ? (
          <div className="relative aspect-[16/9] bg-[var(--color-surface-tint)]">
            <Image
              src={event.imageSrc}
              alt={event.imageAlt || ""}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div
            className="flex aspect-[16/9] items-end bg-[var(--color-surface-tint)] p-6"
            aria-hidden="true"
          >
            <p className="font-display text-2xl font-semibold text-[var(--color-text-body)]">
              {event.title}
            </p>
          </div>
        )}
        <div className="p-6">
          <p className="text-readable-sm font-semibold tracking-wide text-[var(--color-action-primary)] uppercase">
            {event.kindLabel}
          </p>
          <h3 className="mt-2 font-display text-xl font-semibold text-balance group-hover:text-[var(--color-action-primary)]">
            {event.title}
          </h3>
          {event.theme ? (
            <p className="mt-1 text-readable-sm text-[var(--color-text-muted)]">
              {event.theme}
            </p>
          ) : null}
          <p className="mt-3 text-readable-sm text-[var(--color-text-body)]">
            {event.datesLabel}
          </p>
          {event.venueLabel || event.placeLabel ? (
            <p className="mt-1 text-readable-sm text-[var(--color-text-muted)]">
              {[event.venueLabel, event.placeLabel].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {event.summary ? (
            <p className="text-readable mt-3 line-clamp-3 text-[var(--color-text-muted)]">
              {event.summary}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
