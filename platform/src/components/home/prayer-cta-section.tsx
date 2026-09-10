import type { PrayerCta } from "@/content/types";

type Props = {
  prayer: PrayerCta;
};

export function PrayerCtaSection({ prayer }: Props) {
  return (
    <section
      id="prayer"
      aria-labelledby="prayer-heading"
      className="section-space-lg bg-[var(--color-surface-elevated)]"
    >
      <div className="site-container grid gap-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-page)] px-6 py-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-center sm:px-10">
        <div>
          <h2
            id="prayer-heading"
            className="font-display text-3xl font-semibold sm:text-4xl"
          >
            {prayer.heading}
          </h2>
          <blockquote className="mt-5 border-l-4 border-[var(--kcmi-lavender)] pl-4 text-[var(--color-text-muted)]">
            <p className="italic">&ldquo;{prayer.verse}&rdquo;</p>
            <cite className="mt-2 block text-sm not-italic font-semibold text-[var(--color-action-primary)]">
              {prayer.verseReference}
            </cite>
          </blockquote>
          {prayer.body.map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className="mt-4 text-[var(--color-text-muted)]">
              {paragraph}
            </p>
          ))}
        </div>
        <div>
          <a
            href={prayer.ctaHref}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-sm font-semibold text-[var(--color-action-primary-fg)] sm:w-auto"
            rel="noopener noreferrer"
            target="_blank"
          >
            {prayer.ctaLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
