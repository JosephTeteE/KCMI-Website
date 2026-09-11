import Image from "next/image";
import { notFound } from "next/navigation";
import { BranchPublicDetails } from "@/components/content/branch-public-details";
import { PageShell } from "@/components/layout/page-shell";
import { getBranchPublicDetail, mapsHrefForBranch } from "@/content";
import { publicPlaceLabel } from "@/content/branch-groups";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const detail = await getBranchPublicDetail(slug);
  if (!detail) notFound();
  return publicPageMetadata({
    title: detail.branch.name,
    description: `${detail.branch.name} — ${detail.branch.cityLabel}. Addresses and service times for Kingdom Covenant Ministries International.`,
    path: `/locations/${detail.branch.slug}`,
  });
}

export default async function BranchDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const detail = await getBranchPublicDetail(slug);
  if (!detail) notFound();

  const { branch, media } = detail;
  const hero = media.find((item) => item.placement === "hero") ?? media[0];
  const gallery = media.filter(
    (item) => item.placement === "gallery" && item.id !== hero?.id,
  );
  const mapsHref = mapsHrefForBranch(branch);

  const place = publicPlaceLabel(branch.cityLabel, branch.country);

  return (
    <PageShell
      eyebrow={branch.country ?? "Locations"}
      title={branch.name}
      description={place || undefined}
    >
      <div data-qa-branch-media={hero ? "with-media" : "without-media"}>
        {hero ? (
          <div
            data-branch-media="hero"
            data-qa-fixture={hero.id}
            className="relative mb-10 aspect-[21/9] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-tint)]"
          >
            <Image
              src={hero.imageSrc}
              alt={hero.altText || `${branch.name} photograph`}
              fill
              className="object-cover"
              sizes="(min-width: 1920px) 90rem, 100vw"
              priority
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"
              aria-hidden
            />
          </div>
        ) : null}

        <BranchPublicDetails branch={branch} mapsHref={mapsHref} />

        {gallery.length > 0 ? (
          <section
            aria-labelledby="gallery-heading"
            className="mt-12"
            data-branch-media="gallery"
          >
            <h2 id="gallery-heading" className="font-display text-2xl font-semibold">
              Gallery
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {gallery.map((item) => (
                <li
                  key={item.id}
                  className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-tint)]"
                >
                  <Image
                    src={item.imageSrc}
                    alt={item.altText || ""}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}
