import Link from "next/link";
import type { GivingCta, PrayerCta } from "@/content/types";

type Props = {
  prayer: PrayerCta;
  giving: GivingCta;
};

export function PrayerGivingSection({ prayer, giving }: Props) {
  return (
    <section
      aria-labelledby="prayer-giving-heading"
      className="section-space"
    >
      <h2 id="prayer-giving-heading" className="sr-only">
        Prayer and giving
      </h2>
      <div className="site-container grid gap-4 lg:grid-cols-2">
        <article
          id="prayer"
          aria-labelledby="prayer-heading"
          className="motion-fade-up flex flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-6 py-10 sm:px-8"
        >
          <p className="text-sm font-semibold tracking-[0.16em] text-[var(--color-action-primary)] uppercase">
            Care
          </p>
          <h3
            id="prayer-heading"
            className="font-display mt-3 text-3xl font-semibold"
          >
            {prayer.heading}
          </h3>
          <blockquote className="mt-5 border-l-4 border-[var(--kcmi-lavender)] pl-4 text-[var(--color-text-muted)]">
            <p className="italic">&ldquo;{prayer.verse}&rdquo;</p>
            <cite className="mt-2 block text-sm not-italic font-semibold text-[var(--color-action-primary)]">
              {prayer.verseReference}
            </cite>
          </blockquote>
          {prayer.body.map((paragraph) => (
            <p
              key={paragraph.slice(0, 24)}
              className="mt-4 text-[var(--color-text-muted)]"
            >
              {paragraph}
            </p>
          ))}
          <div className="mt-auto pt-8">
            <a
              href={prayer.ctaHref}
              className="ui-cta inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-sm font-semibold text-[var(--color-action-primary-fg)]"
              rel="noopener noreferrer"
              target="_blank"
            >
              {prayer.ctaLabel}
            </a>
          </div>
        </article>

        <article
          id="giving"
          aria-labelledby="giving-heading"
          className="motion-fade-up flex flex-col rounded-[var(--radius-lg)] bg-[var(--color-surface-brand)] px-6 py-10 text-[var(--color-text-on-brand)] sm:px-8"
        >
          <p className="text-sm font-semibold tracking-[0.16em] text-[color-mix(in_srgb,white_75%,var(--kcmi-lavender))] uppercase">
            Partnership
          </p>
          <h3
            id="giving-heading"
            className="font-display mt-3 text-3xl font-semibold"
          >
            {giving.heading}
          </h3>
          <blockquote className="mt-5 max-w-xl text-white/90">
            <p className="italic">&ldquo;{giving.verse}&rdquo;</p>
            <cite className="mt-2 block text-sm not-italic font-semibold text-[color-mix(in_srgb,white_80%,var(--kcmi-lavender))]">
              {giving.verseReference}
            </cite>
          </blockquote>
          <div className="mt-auto pt-8">
            <Link
              href={giving.ctaHref}
              className="ui-cta inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-secondary)] px-6 text-sm font-semibold text-[var(--color-action-secondary-fg)]"
            >
              {giving.ctaLabel}
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
