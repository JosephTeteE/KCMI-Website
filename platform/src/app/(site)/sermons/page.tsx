import Image from "next/image";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import {
  getPublishedSermons,
  getSermonPlatforms,
  getSermonsPageHeader,
} from "@/content";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Sermons",
  description:
    "Watch recent KCMI sermons and find our YouTube, Silverbird Rehoboth Wells, and TikTok platforms.",
  path: "/sermons",
});

export default async function SermonsPage() {
  const header = getSermonsPageHeader();
  const platforms = getSermonPlatforms();
  const sermons = await getPublishedSermons();

  return (
    <PageShell
      eyebrow="Media"
      title="KCMI Sermons"
      description={header.sub}
    >
      <p className="text-readable mb-8 max-w-3xl font-medium text-[var(--color-text-body)]">
        {header.headline}
      </p>

      {sermons.length > 0 ? (
        <section aria-labelledby="recent-sermons-heading" className="mb-12">
          <h2
            id="recent-sermons-heading"
            className="font-display text-2xl font-semibold"
          >
            Recent messages
          </h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {sermons.map((sermon) => (
              <li
                key={sermon.id}
                className="min-w-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
              >
                {sermon.thumbnailSrc ? (
                  <div className="relative aspect-video bg-[var(--color-surface-tint)]">
                    <Image
                      src={sermon.thumbnailSrc}
                      alt={sermon.thumbnailAlt || ""}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                  </div>
                ) : null}
                <div className="p-6">
                  <h3 className="font-display text-xl font-semibold">
                    {sermon.title}
                  </h3>
                  <p className="mt-2 text-readable-sm text-[var(--color-text-muted)]">
                    {[sermon.speaker, sermon.sermonDate]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {sermon.summary ? (
                    <p className="text-readable mt-3 text-[var(--color-text-muted)]">
                      {sermon.summary}
                    </p>
                  ) : null}
                  {sermon.youtubeUrl ? (
                    <a
                      href={sermon.youtubeUrl}
                      className="mt-5 inline-flex min-h-11 items-center text-readable-sm font-semibold text-[var(--color-action-primary)]"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Watch on YouTube
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <h2 className="font-display text-2xl font-semibold">
        {header.sectionTitle}
      </h2>
      <p className="text-readable-sm mt-2 text-[var(--color-text-muted)]">
        Find KCMI on these platforms to watch or listen.
      </p>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2">
        {platforms.map((p) => (
          <li
            key={p.id}
            className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6"
          >
            <h3 className="font-display text-xl font-semibold">{p.name}</h3>
            {p.scheduleLabel ? (
              <p className="mt-2 text-readable-sm font-semibold text-[var(--color-support)]">
                {p.scheduleLabel}
              </p>
            ) : null}
            <p className="text-readable mt-3 text-[var(--color-text-muted)]">
              {p.description}
            </p>
            {p.external ? (
              <a
                href={p.href}
                className="mt-5 inline-flex min-h-11 items-center text-readable-sm font-semibold text-[var(--color-action-primary)]"
                rel="noopener noreferrer"
                target="_blank"
              >
                Open {p.name}
              </a>
            ) : (
              <Link
                href={p.href}
                className="mt-5 inline-flex min-h-11 items-center text-readable-sm font-semibold text-[var(--color-action-primary)]"
              >
                View locations
              </Link>
            )}
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
