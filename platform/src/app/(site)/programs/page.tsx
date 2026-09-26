import Link from "next/link";
import { UpcomingProgramsSection } from "@/components/home/upcoming-programs-section";
import { PageShell } from "@/components/layout/page-shell";
import {
  fetchUnscheduledPublishedPrograms,
  fetchUpcomingProgramsForHomepage,
} from "@/lib/programs/upcoming-homepage";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Programs",
  description:
    "Upcoming KCMI programs and announcements visitors can join.",
  path: "/programs",
});

/**
 * Public Programs landing.
 * Upcoming = published programs with a session that has not ended (Africa/Lagos).
 * Also lists published programs that have no schedule, so publishing is never
 * a dead end. Expired scheduled programs stay off this page.
 */
export default async function ProgramsPage() {
  const [upcoming, unscheduled] = await Promise.all([
    fetchUpcomingProgramsForHomepage(24).catch(() => []),
    fetchUnscheduledPublishedPrograms(24).catch(() => []),
  ]);

  if (upcoming.length > 0 || unscheduled.length > 0) {
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
        <UpcomingProgramsSection programs={upcoming} />
        {unscheduled.length > 0 ? (
          <section className="section-space border-t border-[var(--color-border)]">
            <div className="site-container">
              <h2 className="font-display text-2xl font-semibold">
                More programs
              </h2>
              <p className="mt-3 max-w-2xl text-base text-[var(--color-text-muted)]">
                These programs are published and do not have upcoming dates
                listed yet.
              </p>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {unscheduled.map((program) => (
                  <li key={program.id}>
                    <Link
                      href={program.href}
                      className="block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 text-base font-semibold"
                    >
                      {program.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
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
