import Image from "next/image";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { getAboutLeadPastor, getMissionContent } from "@/content";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "About",
  description:
    "Meet the Senior Pastor and Founder of Kingdom Covenant Ministries International (Rehoboth Christian Center).",
  path: "/about",
});

export default function AboutPage() {
  const pastor = getAboutLeadPastor();
  const mission = getMissionContent();

  return (
    <PageShell
      eyebrow="About KCMI"
      title="Our Lead Pastor"
      description={`${pastor.name} — ${pastor.role}`}
    >
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="relative mx-auto aspect-[2/3] w-full max-w-md overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-tint)]">
          <Image
            src={pastor.portraitSrc}
            alt={pastor.portraitAlt}
            width={pastor.portraitWidth}
            height={pastor.portraitHeight}
            className="h-full w-full object-cover"
            sizes="(max-width: 1024px) 90vw, 40vw"
            priority
          />
        </div>
        <div className="min-w-0 space-y-5">
          <p className="text-readable-sm font-semibold text-[var(--color-action-primary)]">
            {pastor.role}
          </p>
          {pastor.bioParagraphs.map((p) => (
            <p key={p.slice(0, 40)} className="text-readable text-[var(--color-text-muted)]">
              {p}
            </p>
          ))}
          <p className="text-readable font-medium text-[var(--color-text-body)]">
            Vision: {mission.vision}
          </p>
          <Link
            href="/mission"
            className="inline-flex min-h-11 items-center text-readable-sm font-semibold text-[var(--color-action-primary)]"
          >
            Read our mission
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
