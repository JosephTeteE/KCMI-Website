import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgramFlyerMedia } from "@/components/content/program-flyer-media";
import { PageShell } from "@/components/layout/page-shell";
import { shouldUseSeedContent } from "@/lib/env";
import { fetchPublishedProgramBySlug } from "@/lib/programs/public-program";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  if (shouldUseSeedContent()) {
    return { title: "Program" };
  }
  const program = await fetchPublishedProgramBySlug(slug);
  if (!program) return { title: "Program" };
  return publicPageMetadata({
    title: program.title,
    description:
      program.shortDescription ||
      `${program.title} — Kingdom Covenant Ministries International.`,
    path: `/programs/${program.slug}`,
  });
}

export default async function PublicProgramPage({ params }: Props) {
  const { slug } = await params;
  if (shouldUseSeedContent()) notFound();

  const program = await fetchPublishedProgramBySlug(slug);
  if (!program) notFound();

  return (
    <PageShell
      eyebrow="Program"
      title={program.title}
      description={program.datesLabel ?? undefined}
      contentWidth="readable"
    >
      <div className="mx-auto max-w-3xl">
        {program.imageSrc ? (
          <div className="mb-8 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-tint)] p-3 sm:p-4">
            <ProgramFlyerMedia
              src={program.imageSrc}
              alt={program.imageAlt || ""}
              variant="detail"
              sizes="(min-width: 768px) 36rem, 100vw"
              priority
            />
          </div>
        ) : null}

        {program.shortDescription ? (
          <p className="text-readable text-[var(--color-text-body)]">
            {program.shortDescription}
          </p>
        ) : null}

        {program.bodyText ? (
          <div className="mt-6 space-y-4">
            {program.bodyText
              .split(/\n+/)
              .map((para) => para.trim())
              .filter(Boolean)
              .map((para) => (
                <p
                  key={para.slice(0, 48)}
                  className="text-readable text-[var(--color-text-muted)]"
                >
                  {para}
                </p>
              ))}
          </div>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          {program.ctaLabel && program.ctaUrl ? (
            <a
              href={program.ctaUrl}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 font-semibold text-[var(--color-action-primary-fg)]"
              {...(program.ctaUrl.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {program.ctaLabel}
            </a>
          ) : null}
          <Link
            href="/programs"
            className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-5 font-semibold text-[var(--color-text-body)]"
          >
            All programs
          </Link>
          <Link
            href="/locations"
            className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-5 font-semibold text-[var(--color-text-body)]"
          >
            View locations
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
