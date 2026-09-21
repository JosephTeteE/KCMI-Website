import Link from "next/link";
import { SermonCard } from "@/components/content/sermon-card";
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
    "Watch KCMI sermons on YouTube and other verified media destinations.",
  path: "/sermons",
});

export default async function SermonsPage() {
  const header = await getSermonsPageHeader();
  const platforms = await getSermonPlatforms();
  const sermons = await getPublishedSermons();

  return (
    <PageShell
      eyebrow="Media"
      title="KCMI Sermons"
      description={header.sub}
      contentWidth="full"
    >
      <p className="text-readable mb-8 max-w-3xl font-medium text-[var(--color-text-body)]">
        {header.headline}
      </p>

      {sermons.length > 0 ? (
        <section aria-labelledby="recent-sermons-heading" className="mb-8">
          <h2
            id="recent-sermons-heading"
            className="font-display text-2xl font-semibold"
          >
            Recent messages
          </h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {sermons.map((sermon) => (
              <li key={sermon.id}>
                <SermonCard sermon={sermon} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section
          aria-labelledby="sermons-empty-heading"
          className="card-pad mb-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
        >
          <h2
            id="sermons-empty-heading"
            className="font-display text-2xl font-semibold"
          >
            Messages
          </h2>
          <p className="text-readable mt-3 max-w-3xl text-[var(--color-text-muted)]">
            {"emptyState" in header ? header.emptyState : ""}
          </p>
        </section>
      )}

      <h2 className="font-display text-2xl font-semibold">
        {header.sectionTitle}
      </h2>
      <p className="text-readable-sm mt-2 text-[var(--color-text-muted)]">
        Find KCMI on these platforms to watch or listen.
      </p>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2">
        {platforms.map((platform) => (
          <li
            key={platform.id}
            className="card-pad min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
          >
            <h3 className="font-display text-xl font-semibold">{platform.name}</h3>
            <p className="text-readable mt-3 text-[var(--color-text-muted)]">
              {platform.description}
            </p>
            {platform.href ? (
              platform.external ? (
                <a
                  href={platform.href}
                  className="mt-5 inline-flex min-h-11 items-center text-readable-sm font-semibold text-[var(--color-action-primary)]"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Open {platform.name}
                </a>
              ) : (
                <Link
                  href={platform.href}
                  className="mt-5 inline-flex min-h-11 items-center text-readable-sm font-semibold text-[var(--color-action-primary)]"
                >
                  {platform.id === "locations" ? "View locations" : `Open ${platform.name}`}
                </Link>
              )
            ) : null}
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
