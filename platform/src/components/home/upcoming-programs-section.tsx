import Link from "next/link";
import { ProgramFlyerMedia } from "@/components/content/program-flyer-media";
import type { UpcomingProgramCard } from "@/lib/programs/upcoming-homepage";

type Props = {
  programs: UpcomingProgramCard[];
  /** Hub preview may force-render empty explanation */
  allowEmptyNote?: boolean;
  /** Limit cards (homepage uses 3; /programs may show more). */
  maxItems?: number;
};

/**
 * Public discovery for scheduled upcoming Programs.
 * Renders nothing when there are zero eligible programs (unless Hub note).
 */
export function UpcomingProgramsSection({
  programs,
  allowEmptyNote = false,
  maxItems,
}: Props) {
  const visible =
    typeof maxItems === "number" ? programs.slice(0, maxItems) : programs;

  if (visible.length === 0) {
    if (!allowEmptyNote) return null;
    return (
      <section
        aria-labelledby="upcoming-programs-heading"
        className="section-space"
        data-testid="upcoming-programs-empty-note"
      >
        <div className="site-container">
          <h2
            id="upcoming-programs-heading"
            className="font-display text-2xl font-semibold sm:text-3xl"
          >
            Upcoming Programs
          </h2>
          <p className="mt-3 max-w-2xl text-base text-[var(--color-text-muted)]">
            This section appears automatically on the public homepage when
            published Programs have upcoming dates. It is not edited here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="upcoming-programs-heading"
      className="section-space"
      data-testid="upcoming-programs-section"
    >
      <div className="site-container">
        <div className="max-w-2xl">
          <h2
            id="upcoming-programs-heading"
            className="font-display text-2xl font-semibold text-balance sm:text-3xl"
          >
            Upcoming Programs
          </h2>
          <p className="mt-3 text-base text-[var(--color-text-muted)]">
            Join us for what is coming up next at KCMI.
          </p>
        </div>

        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:items-stretch">
          {visible.map((program) => (
            <li key={program.id} className="min-w-0">
              <Link
                href={program.href}
                className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)] transition-[border-color,box-shadow,transform] hover:border-[color-mix(in_srgb,var(--color-action-primary)_35%,var(--color-border))] hover:shadow-[var(--shadow-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                data-testid="upcoming-program-card"
              >
                <ProgramFlyerMedia
                  src={program.imageSrc}
                  alt={program.imageAlt || program.title}
                  variant="card"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="font-display text-xl font-semibold text-balance text-[var(--color-text-body)] group-hover:text-[var(--color-action-primary)]">
                    {program.title}
                  </h3>
                  {program.nextDatesLabel ? (
                    <p className="text-sm font-semibold text-[var(--color-text-body)]">
                      {program.nextDatesLabel}
                    </p>
                  ) : null}
                  {program.locationLabel ? (
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {program.locationLabel}
                    </p>
                  ) : null}
                  {program.shortDescription.trim() ? (
                    <p className="text-readable-sm line-clamp-3 text-[var(--color-text-muted)]">
                      {program.shortDescription}
                    </p>
                  ) : null}
                  <span className="mt-auto inline-flex min-h-11 w-fit items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 text-sm font-semibold text-[var(--color-action-primary-fg)]">
                    View Program
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
