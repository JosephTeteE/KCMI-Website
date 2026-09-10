import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { GlobalWebsiteEditor } from "@/components/hub/global-website-editor";
import { createClient } from "@/lib/supabase/server";
import { WEBSITE_DOCUMENT_IDS } from "@/content/website/keys";
import { resolveGlobalDocument } from "@/content/website/resolve";

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function HubGlobalContentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const flash = await searchParams;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("website_documents")
    .select("payload")
    .eq("id", WEBSITE_DOCUMENT_IDS.global)
    .maybeSingle();
  const global = resolveGlobalDocument(row?.payload ?? {});

  return (
    <div>
      <HubPageHeader
        title="Information shown across the website"
        description="Contact details, the bottom of every page, Daily Faith Recharge, and livestream visitor messages."
        backHref="/admin/website"
        backLabel="Website pages"
      />
      <HubFlash message={flash.message} error={flash.error} />
      <GlobalWebsiteEditor global={global} />
    </div>
  );
}
