import Image from "next/image";
import Link from "next/link";
import type { UpcomingProgramCard } from "@/lib/programs/upcoming-homepage";

type Props = {
  programs: UpcomingProgramCard[];
  /** Hub preview may force-render empty explanation */
  allowEmptyNote?: boolean;
};

/**
 * Public homepage discovery for scheduled upcoming Programs.
 * Renders nothing when there are zero eligible programs (unless Hub note).
 */
export function UpcomingProgramsSection({
  programs,
  allowEmptyNote = false,
}: Props) {
  if (programs.length === 0) {
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

        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <li key={program.id}>
              <article className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)]">
                <div className="relative aspect-[4/3] bg-[var(--color-surface-tint)]">
                  {program.imageSrc ? (
                    <Image
                      src={program.imageSrc}
                      alt={program.imageAlt || ""}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-[var(--kcmi-violet)] via-[color-mix(in_srgb,var(--kcmi-red)_40%,var(--kcmi-violet))] to-[var(--kcmi-lavender)]"
                      aria-hidden
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="font-display text-xl font-semibold text-balance">
                    {program.title}
                  </h3>
                  {program.nextDatesLabel ? (
                    <p className="text-sm font-medium text-[var(--color-text-body)]">
                      {program.nextDatesLabel}
                    </p>
                  ) : null}
                  {program.locationLabel ? (
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {program.locationLabel}
                    </p>
                  ) : null}
                  {program.shortDescription.trim() ? (
                    <p className="text-readable-sm text-[var(--color-text-muted)]">
                      {program.shortDescription}
                    </p>
                  ) : null}
                  <div className="mt-auto pt-2">
                    <Link
                      href={program.href}
                      className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 text-sm font-semibold text-[var(--color-action-primary-fg)]"
                    >
                      View Program
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
