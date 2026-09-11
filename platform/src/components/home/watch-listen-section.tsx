import Image from "next/image";
import Link from "next/link";
import type {
  LivestreamPublic,
  SermonHighlight,
  SermonPublic,
} from "@/content/types";

type Props = {
  livestream: LivestreamPublic;
  sermon: SermonPublic | null;
  fallback: SermonHighlight;
};

export function WatchListenSection({ livestream, sermon, fallback }: Props) {
  if (livestream.isLive) {
    return (
      <section
        id="sermons"
        aria-labelledby="watch-listen-heading"
        className="section-space-lg bg-[var(--color-surface-brand)] text-[var(--color-text-on-brand)]"
      >
        <div className="site-container-editorial grid gap-8 lg:grid-cols-[1.2fr_auto] lg:items-center">
          <div className="motion-fade-up">
            <p className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.16em] text-[color-mix(in_srgb,white_80%,var(--kcmi-lavender))] uppercase">
              <span
                className="size-2 rounded-full bg-[var(--kcmi-red)]"
                aria-hidden
              />
              Live now
            </p>
            <h2
              id="watch-listen-heading"
              className="font-display mt-3 text-3xl font-semibold text-balance sm:text-4xl"
            >
              {livestream.heading}
            </h2>
            <p className="mt-4 max-w-2xl text-pretty text-white/90">
              {livestream.liveMessage}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/livestream"
              className="ui-cta inline-flex min-h-12 items-center rounded-[var(--radius-md)] bg-[var(--color-action-secondary)] px-5 text-sm font-semibold text-[var(--color-action-secondary-fg)]"
            >
              Watch Live
            </Link>
            {livestream.facebookPageUrl ? (
              <a
                href={livestream.facebookPageUrl}
                className="ui-cta inline-flex min-h-12 items-center rounded-[var(--radius-md)] border border-white/35 px-5 text-sm font-semibold text-white"
                rel="noopener noreferrer"
                target="_blank"
              >
                Open Facebook
              </a>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (sermon?.youtubeUrl) {
    const meta = [
      sermon.speaker,
      sermon.sermonDate,
      sermon.scriptureReference,
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <section
        id="sermons"
        aria-labelledby="watch-listen-heading"
        className="section-space-lg bg-[var(--color-surface-elevated)]"
      >
        <div className="site-container-editorial grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="motion-fade-up relative aspect-video overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-brand)]">
            {sermon.thumbnailSrc ? (
              <Image
                src={sermon.thumbnailSrc}
                alt={sermon.thumbnailAlt || ""}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            ) : (
              <div
                className="absolute inset-0 bg-gradient-to-br from-[var(--kcmi-violet)] to-[var(--kcmi-red)]"
                aria-hidden
              />
            )}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent"
              aria-hidden
            />
          </div>
          <div className="motion-fade-up">
            <p className="text-sm font-semibold tracking-[0.16em] text-[var(--color-text-support)] uppercase">
              Watch &amp; listen
            </p>
            <h2
              id="watch-listen-heading"
              className="font-display text-break-safe mt-3 text-3xl font-semibold text-balance sm:text-4xl"
            >
              {sermon.title}
            </h2>
            {meta ? (
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                {meta}
              </p>
            ) : null}
            {sermon.summary ? (
              <p className="mt-4 max-w-xl text-readable text-[var(--color-text-muted)]">
                {sermon.summary}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={sermon.youtubeUrl}
                className="ui-cta inline-flex min-h-12 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-sm font-semibold text-[var(--color-action-primary-fg)]"
                rel="noopener noreferrer"
                target="_blank"
              >
                Watch on YouTube
              </a>
              <Link
                href="/sermons"
                className="ui-cta inline-flex min-h-12 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-5 text-sm font-semibold text-[var(--color-text-body)]"
              >
                All sermons
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="sermons"
      aria-labelledby="watch-listen-heading"
      className="section-space-lg bg-[var(--color-surface-elevated)]"
    >
      <div className="site-container-editorial grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="motion-fade-up">
          <p className="text-sm font-semibold tracking-[0.16em] text-[var(--color-text-support)] uppercase">
            Watch &amp; listen
          </p>
          <h2
            id="watch-listen-heading"
            className="font-display text-break-safe mt-3 text-3xl font-semibold sm:text-4xl"
          >
            {fallback.title}
          </h2>
          <p className="mt-4 max-w-2xl text-readable text-[var(--color-text-muted)]">
            {fallback.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={fallback.ctaHref}
            className="ui-cta inline-flex min-h-12 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-sm font-semibold text-[var(--color-action-primary-fg)]"
          >
            {fallback.ctaLabel}
          </Link>
          <a
            href={fallback.youtubeChannelUrl}
            className="ui-cta inline-flex min-h-12 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-5 text-sm font-semibold text-[var(--color-text-body)]"
            rel="noopener noreferrer"
            target="_blank"
          >
            {fallback.youtubeChannelLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
