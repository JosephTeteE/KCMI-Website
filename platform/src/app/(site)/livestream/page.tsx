import { PageShell } from "@/components/layout/page-shell";
import { FacebookVideoEmbed } from "@/components/content/facebook-embed";
import { getLivestreamPublic } from "@/content";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Livestream",
  description:
    "Watch Kingdom Covenant Ministries International live services on Facebook when a broadcast is active.",
  path: "/livestream",
});

export default async function LivestreamPage() {
  const live = await getLivestreamPublic();

  return (
    <PageShell eyebrow="Watch" title={live.heading}>
      <div className="card-pad mx-auto max-w-3xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-center">
        <p
          className={`inline-flex rounded-full px-3 py-1 text-readable-sm font-semibold ${
            live.isLive
              ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
              : "bg-[var(--color-surface-page)] text-[var(--color-text-muted)]"
          }`}
        >
          {live.isLive ? "Live now" : "Not currently live"}
        </p>
        <p className="text-readable mt-6 text-[var(--color-text-muted)]">
          {live.isLive ? live.liveMessage : live.notLiveMessage}
        </p>
        {live.isLive && live.facebookPageUrl ? (
          <div className="mt-8 text-left">
            <FacebookVideoEmbed
              url={live.facebookPageUrl}
              title="KCMI livestream"
            />
          </div>
        ) : null}
        <a
          href={live.facebookPageUrl}
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-6 text-readable-sm font-semibold text-[var(--color-action-primary-fg)]"
          rel="noopener noreferrer"
          target="_blank"
        >
          Open Facebook
        </a>
      </div>
    </PageShell>
  );
}
