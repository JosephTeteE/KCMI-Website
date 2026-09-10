import Link from "next/link";
import type { SermonHighlight } from "@/content/types";

type Props = {
  sermon: SermonHighlight;
};

export function SermonHighlightSection({ sermon }: Props) {
  return (
    <section
      id="sermons"
      aria-labelledby="sermons-heading"
      className="section-space-lg bg-[var(--color-surface-elevated)]"
    >
      <div className="site-container grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-semibold tracking-wide text-[var(--color-text-support)] uppercase">
            Media
          </p>
          <h2
            id="sermons-heading"
            className="font-display text-break-safe mt-3 text-3xl font-semibold sm:text-4xl"
          >
            {sermon.title}
          </h2>
          <p className="mt-4 max-w-2xl text-readable text-[var(--color-text-muted)]">
            {sermon.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={sermon.ctaHref}
            className="inline-flex min-h-12 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-sm font-semibold text-[var(--color-action-primary-fg)]"
          >
            {sermon.ctaLabel}
          </Link>
          <a
            href={sermon.youtubeChannelUrl}
            className="inline-flex min-h-12 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-5 text-sm font-semibold text-[var(--color-text-body)]"
            rel="noopener noreferrer"
            target="_blank"
          >
            {sermon.youtubeChannelLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
