import Link from "next/link";
import { UpcomingProgramsSection } from "@/components/home/upcoming-programs-section";
import { PageShell } from "@/components/layout/page-shell";
import { fetchUpcomingProgramsForHomepage } from "@/lib/programs/upcoming-homepage";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Programs",
  description:
    "Upcoming KCMI programs and announcements visitors can join.",
  path: "/programs",
});

/**
 * Public Programs landing — destination for retired Camp bookmarks and
 * homepage Program CTAs. Lists scheduled upcoming published Programs only.
 */
export default async function ProgramsPage() {
  const programs = await fetchUpcomingProgramsForHomepage(12).catch(() => []);

  if (programs.length > 0) {
    return (
      <main id="main-content">
        <header className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
          <div className="site-container page-masthead">
            <div className="stack-heading max-w-3xl">
              <p className="text-readable-sm font-semibold tracking-wide text-[var(--color-action-primary)] uppercase">
                Programs
              </p>
              <h1 className="font-display text-3xl font-semibold text-balance sm:text-4xl">
                Programs & announcements
              </h1>
              <p className="text-readable max-w-2xl text-[var(--color-text-muted)]">
                See what is coming up next at Kingdom Covenant Ministries
                International.
              </p>
            </div>
          </div>
        </header>
        <UpcomingProgramsSection programs={programs} />
      </main>
    );
  }

  return (
    <PageShell
      eyebrow="Programs"
      title="Programs & announcements"
      description="See what is coming up next at Kingdom Covenant Ministries International."
      contentWidth="readable"
    >
      <section
        aria-labelledby="programs-empty-heading"
        className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 sm:p-8"
      >
        <h2
          id="programs-empty-heading"
          className="font-display text-2xl font-semibold"
        >
          No upcoming programs listed yet
        </h2>
        <p className="mt-3 max-w-2xl text-base text-[var(--color-text-muted)]">
          When KCMI publishes a program with upcoming dates, it will appear
          here. You can also browse the homepage or search the site.
        </p>
        <p className="mt-6 flex flex-wrap gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-base font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
          >
            Back to homepage
          </Link>
          <Link
            href="/search"
            className="inline-flex min-h-11 items-center text-base font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
          >
            Search the site
          </Link>
          <Link
            href="/events"
            className="inline-flex min-h-11 items-center text-base font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
          >
            View events
          </Link>
        </p>
      </section>
    </PageShell>
  );
}
