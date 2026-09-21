import Image from "next/image";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { getAboutChurch } from "@/content";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "About KCMI",
  description:
    "Who we are, our vision and mission at Kingdom Covenant Ministries International (Rehoboth Christian Center).",
  path: "/about",
});

export default async function AboutPage() {
  const about = await getAboutChurch();

  return (
    <PageShell eyebrow="About KCMI" title="About KCMI" contentWidth="readable">
      <div className="space-y-10">
        <section aria-labelledby="who-we-are-heading" className="max-w-3xl space-y-4">
          <h2 id="who-we-are-heading" className="font-display text-2xl font-semibold">
            Who We Are
          </h2>
          {about.whoWeAre.map((paragraph) => (
            <p
              key={paragraph.slice(0, 48)}
              className="text-readable text-[var(--color-text-muted)]"
            >
              {paragraph}
            </p>
          ))}
        </section>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <section id="vision" aria-labelledby="vision-heading" className="space-y-4">
          <h2 id="vision-heading" className="font-display text-2xl font-semibold">
            Our Vision
          </h2>
          <p className="font-display text-2xl font-semibold text-[var(--color-action-primary)]">
            {about.vision}
          </p>
        </section>

        <section id="mission" aria-labelledby="mission-heading" className="space-y-4">
          <h2 id="mission-heading" className="font-display text-2xl font-semibold">
            Our Mission
          </h2>
          <ol className="list-decimal space-y-4 pl-5 text-readable text-[var(--color-text-muted)]">
            {about.missionParagraphs.map((paragraph) => (
              <li key={paragraph.slice(0, 40)}>{paragraph}</li>
            ))}
          </ol>
        </section>
        </div>

        <section
          aria-labelledby="leadership-preview-heading"
          className="card-pad grid items-start gap-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] lg:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)]"
        >
          <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-tint)]">
            <Image
              src={about.portrait.src}
              alt={about.portrait.alt}
              width={about.portrait.width}
              height={about.portrait.height}
              className="h-full w-full object-cover"
              sizes="(max-width: 1024px) 70vw, 20vw"
            />
          </div>
          <div>
            <p className="text-readable-sm font-semibold tracking-wide text-[var(--color-action-primary)] uppercase">
              Leadership
            </p>
            <h2
              id="leadership-preview-heading"
              className="font-display mt-2 text-2xl font-semibold"
            >
              {about.leadershipName}
            </h2>
            <p className="mt-1 text-readable-sm font-semibold text-[var(--color-text-body)]">
              {about.leadershipRole}
            </p>
            <p className="text-readable mt-4 text-[var(--color-text-muted)]">
              {about.leadershipPreview}
            </p>
            <Link
              href="/about/apostle-frank-aikins"
              className="mt-5 inline-flex min-h-11 items-center text-readable-sm font-semibold text-[var(--color-action-primary)]"
            >
              Meet Our Lead Pastor
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
