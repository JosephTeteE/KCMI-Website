import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { AboutWebsiteEditor } from "@/components/hub/about-website-editor";
import { createClient } from "@/lib/supabase/server";
import { WEBSITE_DOCUMENT_IDS } from "@/content/website/keys";
import { resolveAboutDocument } from "@/content/website/resolve";
import { FALLBACK_PORTRAIT } from "@/content/website/public-map";
import type { PublicMediaRef } from "@/content/types";

export const maxDuration = 60;

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function HubAboutContentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const flash = await searchParams;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("website_documents")
    .select("payload")
    .eq("id", WEBSITE_DOCUMENT_IDS.about)
    .maybeSingle();
  const about = resolveAboutDocument(row?.payload ?? {});

  let portrait: PublicMediaRef = FALLBACK_PORTRAIT;
  if (about.portraitMediaId) {
    const { data } = await supabase
      .from("media_assets")
      .select("public_url, alt_text, width_px, height_px")
      .eq("id", about.portraitMediaId)
      .maybeSingle();
    if (data?.public_url) {
      portrait = {
        src: data.public_url,
        alt: data.alt_text ?? FALLBACK_PORTRAIT.alt,
        width: data.width_px ?? FALLBACK_PORTRAIT.width,
        height: data.height_px ?? FALLBACK_PORTRAIT.height,
      };
    }
  }

  return (
    <div>
      <HubPageHeader
        title="About KCMI"
        description="The About page visitors read. Keep vision and mission faithful. Preview first, then make it live."
        backHref="/admin/website"
        backLabel="Website pages"
      />
      <HubFlash message={flash.message} error={flash.error} />
      <AboutWebsiteEditor about={about} portrait={portrait} />
    </div>
  );
}
