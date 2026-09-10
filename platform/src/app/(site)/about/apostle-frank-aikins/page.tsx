import Image from "next/image";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { getAboutLeadPastor } from "@/content";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Apostle Philemon Frank Aikins",
  description:
    "Apostle Philemon Frank Aikins, Senior Pastor and Founder of Kingdom Covenant Ministries International (Rehoboth Christian Center).",
  path: "/about/apostle-frank-aikins",
});

export default async function ApostleFrankPage() {
  const pastor = await getAboutLeadPastor();

  return (
    <PageShell
      eyebrow="Leadership"
      title={pastor.name}
      description={`${pastor.role} — ${pastor.orgLine}`}
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
          {pastor.bioParagraphs.map((paragraph) => (
            <p
              key={paragraph.slice(0, 40)}
              className="text-readable text-[var(--color-text-muted)]"
            >
              {paragraph}
            </p>
          ))}
          <Link
            href="/about"
            className="inline-flex min-h-11 items-center text-readable-sm font-semibold text-[var(--color-action-primary)]"
          >
            Back to About KCMI
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
