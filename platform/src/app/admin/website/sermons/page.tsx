import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { SermonsPageWebsiteEditor } from "@/components/hub/sermons-page-website-editor";
import { createClient } from "@/lib/supabase/server";
import { WEBSITE_DOCUMENT_IDS } from "@/content/website/keys";
import { resolveSermonsPageDocument } from "@/content/website/resolve";

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function HubSermonsPageContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const flash = await searchParams;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("website_documents")
    .select("payload")
    .eq("id", WEBSITE_DOCUMENT_IDS.sermons_page)
    .maybeSingle();
  const page = resolveSermonsPageDocument(row?.payload ?? {});

  return (
    <div>
      <HubPageHeader
        title="Sermons page wording"
        description="The Sermons page headline and watch options. Individual sermons are edited under Sermons."
        backHref="/admin/website"
        backLabel="Website pages"
      />
      <HubFlash message={flash.message} error={flash.error} />
      <SermonsPageWebsiteEditor page={page} />
    </div>
  );
}
