import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { getAboutLeadPastor, getMissionContent } from "@/content";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Mission",
  description:
    "The vision and mission of Kingdom Covenant Ministries International — Raising Kings To Build The Kingdom.",
  path: "/mission",
});

export default function MissionPage() {
  const mission = getMissionContent();
  const pastor = getAboutLeadPastor();

  return (
    <PageShell
      eyebrow="Our calling"
      title="Mission & Vision"
      description={mission.vision}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <section aria-labelledby="vision-heading">
          <h2 id="vision-heading" className="font-display text-2xl font-semibold">
            Vision
          </h2>
          <p className="text-readable mt-3 text-[var(--color-text-muted)]">
            {mission.vision}
          </p>
        </section>
        <section aria-labelledby="mission-heading">
          <h2 id="mission-heading" className="font-display text-2xl font-semibold">
            Mission
          </h2>
          <ol className="mt-4 list-decimal space-y-4 pl-5 text-readable text-[var(--color-text-muted)]">
            {mission.missionParagraphs.map((p) => (
              <li key={p.slice(0, 40)}>{p}</li>
            ))}
          </ol>
        </section>
        <p className="text-readable text-[var(--color-text-muted)]">
          Learn more about {pastor.name}, {pastor.role}.
        </p>
        <Link
          href="/about"
          className="inline-flex min-h-11 items-center text-readable-sm font-semibold text-[var(--color-action-primary)]"
        >
          About our Lead Pastor
        </Link>
      </div>
    </PageShell>
  );
}
