import { EventCard } from "@/components/events/event-card";
import { PageShell } from "@/components/layout/page-shell";
import { fetchPublishedEvents } from "@/lib/events/public-event";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Events",
  description:
    "Camps, conferences, and gatherings from Kingdom Covenant Ministries International.",
  path: "/events",
});

export default async function EventsIndexPage() {
  const { upcoming, past } = await fetchPublishedEvents();
  const hasAny = upcoming.length > 0 || past.length > 0;

  return (
    <PageShell
      eyebrow="Gatherings"
      title="Events"
      description="Camps, conferences, and other gatherings across Kingdom Covenant Ministries International."
    >
      {!hasAny ? (
        <div className="max-w-2xl">
          <p className="text-readable text-[var(--color-text-muted)]">
            There are no published events to share right now. When a gathering
            is announced, you will find the details here.
          </p>
        </div>
      ) : (
        <div className="space-y-14">
          <section aria-labelledby="upcoming-events-heading">
            <h2
              id="upcoming-events-heading"
              className="font-display text-2xl font-semibold"
            >
              Upcoming Events
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-readable mt-4 text-[var(--color-text-muted)]">
                No upcoming events are published at the moment.
              </p>
            ) : (
              <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((event) => (
                  <li key={event.id}>
                    <EventCard event={event} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="past-events-heading">
            <h2
              id="past-events-heading"
              className="font-display text-2xl font-semibold"
            >
              Past Events
            </h2>
            {past.length === 0 ? (
              <p className="text-readable mt-4 text-[var(--color-text-muted)]">
                Past gatherings will appear here after they conclude.
              </p>
            ) : (
              <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((event) => (
                  <li key={event.id}>
                    <EventCard event={event} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </PageShell>
  );
}
