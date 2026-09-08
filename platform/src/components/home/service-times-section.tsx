import type { ServiceTime } from "@/content/types";

type Props = {
  times: ServiceTime[];
  locationLabel: string;
};

export function ServiceTimesSection({ times, locationLabel }: Props) {
  return (
    <section
      id="worship"
      aria-labelledby="worship-heading"
      className="section-space bg-[var(--color-surface-elevated)]"
    >
      <div className="site-container grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p className="text-sm font-semibold tracking-wide text-[var(--color-action-primary)] uppercase">
            Worship with us
          </p>
          <h2
            id="worship-heading"
            className="font-display mt-3 text-3xl font-semibold text-balance sm:text-4xl"
          >
            Join us for service
          </h2>
          <p className="mt-4 max-w-xl text-readable text-[var(--color-text-muted)]">
            Headquarters service times at {locationLabel}. Additional branch
            schedules are listed under Locations.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {times.map((item) => (
            <li
              key={`${item.day}-${item.time}`}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-page)] px-5 py-5"
            >
              <p className="text-sm font-medium text-[var(--color-text-muted)]">
                {item.day}
              </p>
              <p className="mt-1 font-display text-2xl font-semibold text-[var(--color-action-primary)]">
                {item.time}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
