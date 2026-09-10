import Link from "next/link";
import type { GivingCta } from "@/content/types";

type Props = {
  giving: GivingCta;
};

export function GivingCtaSection({ giving }: Props) {
  return (
    <section
      id="giving"
      aria-labelledby="giving-heading"
      className="section-space-lg bg-[var(--color-surface-brand)] text-[var(--color-text-on-brand)]"
    >
      <div className="site-container grid gap-8 lg:grid-cols-[1.2fr_auto] lg:items-center">
        <div>
          <h2
            id="giving-heading"
            className="font-display text-3xl font-semibold sm:text-4xl"
          >
            {giving.heading}
          </h2>
          <blockquote className="mt-5 max-w-2xl text-white/90">
            <p className="italic">&ldquo;{giving.verse}&rdquo;</p>
            <cite className="mt-2 block text-sm not-italic font-semibold text-[color-mix(in_srgb,white_80%,var(--kcmi-lavender))]">
              {giving.verseReference}
            </cite>
          </blockquote>
        </div>
        <Link
          href={giving.ctaHref}
          className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-secondary)] px-6 text-sm font-semibold text-[var(--color-action-secondary-fg)]"
        >
          {giving.ctaLabel}
        </Link>
      </div>
    </section>
  );
}
