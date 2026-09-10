import { PageShell } from "@/components/layout/page-shell";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Events",
  description:
    "KCMI events will appear here when they are published. Camp registration remains on the existing camp site until the Events platform is ready.",
  path: "/events",
});

export default function EventsIndexPage() {
  return (
    <PageShell
      eyebrow="Gatherings"
      title="Events"
      description="Published camps, conferences, and other gatherings will be listed here."
    >
      <div className="card-pad max-w-2xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <p className="text-readable text-[var(--color-text-muted)]">
          There are no published events on this website yet. We will share
          details here when a gathering is ready to announce.
        </p>
      </div>
    </PageShell>
  );
}
