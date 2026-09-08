import Link from "next/link";
import type { FeaturedProgram } from "@/content/types";

type Props = {
  program: FeaturedProgram | null;
};

export function FeaturedProgramSection({ program }: Props) {
  if (!program || program.status === "draft_placeholder") {
    return (
      <section
        id="programs"
        aria-labelledby="programs-heading"
        className="section-space"
      >
        <div className="site-container rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-6 py-10 sm:px-10">
          <p className="text-sm font-semibold tracking-wide text-[var(--color-support)] uppercase">
            Programs &amp; events
          </p>
          <h2
            id="programs-heading"
            className="font-display mt-3 text-3xl font-semibold"
          >
            Upcoming KCMI programs
          </h2>
          <p className="mt-4 max-w-2xl text-readable text-[var(--color-text-muted)]">
            Stay tuned for updates on upcoming programs and gatherings. We will
            share details here when they are published.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="programs"
      aria-labelledby="programs-heading"
      className="section-space"
    >
      <div className="site-container">
        <article className="overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-brand)] text-[var(--color-text-on-brand)] shadow-[var(--shadow-soft)]">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4 px-6 py-10 sm:px-10">
              <p className="text-sm font-semibold tracking-wide text-[color-mix(in_srgb,white_75%,var(--kcmi-lavender))] uppercase">
                Featured program
              </p>
              <h2
                id="programs-heading"
                className="font-display text-break-safe text-3xl font-semibold sm:text-4xl"
              >
                {program.title}
              </h2>
              {program.datesLabel ? (
                <p className="text-sm text-white/80">{program.datesLabel}</p>
              ) : null}
              <p className="max-w-xl text-white/90">{program.shortDescription}</p>
              <Link
                href={program.ctaHref}
                className="inline-flex min-h-12 max-w-full items-center rounded-[var(--radius-md)] bg-[var(--color-action-secondary)] px-5 text-sm font-semibold text-wrap text-[var(--color-action-secondary-fg)]"
              >
                {program.ctaLabel}
              </Link>
            </div>
            <div
              className="min-h-48 bg-[color-mix(in_srgb,var(--kcmi-lavender)_35%,var(--kcmi-violet))] lg:min-h-full"
              aria-hidden={program.imageSrc ? undefined : true}
            />
          </div>
        </article>
      </div>
    </section>
  );
}
