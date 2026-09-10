import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { HomeWebsiteEditor } from "@/components/hub/home-website-editor";
import { createClient } from "@/lib/supabase/server";
import { WEBSITE_DOCUMENT_IDS } from "@/content/website/keys";
import { resolveHomeDocument } from "@/content/website/resolve";
import {
  FALLBACK_HERO_IMAGE,
  FALLBACK_WELCOME_IMAGE,
} from "@/content/website/public-map";
import { getChurchIdentity } from "@/content";
import type { FeaturedProgram, PublicMediaRef } from "@/content/types";

export const maxDuration = 60;

type SearchParams = Promise<{ message?: string; error?: string }>;

async function mediaRef(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string | null,
  fallback: PublicMediaRef,
): Promise<PublicMediaRef> {
  if (!id) return fallback;
  const { data } = await supabase
    .from("media_assets")
    .select("public_url, alt_text, width_px, height_px")
    .eq("id", id)
    .maybeSingle();
  if (!data?.public_url) return fallback;
  return {
    src: data.public_url,
    alt: data.alt_text ?? fallback.alt,
    width: data.width_px ?? fallback.width,
    height: data.height_px ?? fallback.height,
  };
}

export default async function HubHomeContentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const flash = await searchParams;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("website_documents")
    .select("payload")
    .eq("id", WEBSITE_DOCUMENT_IDS.home)
    .maybeSingle();
  const home = resolveHomeDocument(row?.payload ?? {});
  const identity = getChurchIdentity();

  const { data: programs } = await supabase
    .from("programs")
    .select("id, title, status, placement, short_description, cta_label, cta_url, starts_at, ends_at, featured_media_id")
    .eq("status", "published")
    .order("title", { ascending: true });

  const programPreviews: FeaturedProgram[] = await Promise.all(
    (programs ?? []).map(async (row) => {
      const cover = row.featured_media_id
        ? await mediaRef(supabase, row.featured_media_id, {
            src: "",
            alt: "",
            width: 800,
            height: 600,
          })
        : null;
      return {
        id: row.id,
        title: row.title,
        shortDescription: row.short_description ?? "",
        datesLabel: row.starts_at
          ? new Date(row.starts_at).toLocaleDateString("en-GB")
          : null,
        imageSrc: cover?.src || null,
        imageAlt: cover?.alt ?? "",
        ctaLabel: row.cta_label ?? "Learn more",
        ctaHref: row.cta_url ?? "/programs",
        placement: "featured",
        status: "published" as const,
      };
    }),
  );
  const featuredProgram =
    programPreviews.find((item) =>
      programs?.some((row) => row.id === item.id && row.placement === "featured"),
    ) ?? null;

  const [heroImage, welcomeImage] = await Promise.all([
    mediaRef(supabase, home.heroMediaId, FALLBACK_HERO_IMAGE),
    mediaRef(supabase, home.welcomeMediaId, FALLBACK_WELCOME_IMAGE),
  ]);

  return (
    <div>
      <HubPageHeader
        title="Homepage"
        description="Change the first things visitors see. Preview first. Nothing goes public until you make it live."
        backHref="/admin/website"
        backLabel="Website pages"
      />
      <HubFlash message={flash.message} error={flash.error} />
      <HomeWebsiteEditor
        home={home}
        heroImage={heroImage}
        welcomeImage={welcomeImage}
        programs={programPreviews}
        featuredProgram={featuredProgram}
        legalName={identity.legalName}
        alternateName={identity.alternateName}
      />
    </div>
  );
}
