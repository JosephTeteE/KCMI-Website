import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { ServicesWebsiteEditor } from "@/components/hub/services-website-editor";
import { createClient } from "@/lib/supabase/server";
import { WEBSITE_DOCUMENT_IDS } from "@/content/website/keys";
import { resolveServicesDocument } from "@/content/website/resolve";

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function HubServicesContentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const flash = await searchParams;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("website_documents")
    .select("payload")
    .eq("id", WEBSITE_DOCUMENT_IDS.services)
    .maybeSingle();
  const services = resolveServicesDocument(row?.payload ?? {});

  return (
    <div>
      <HubPageHeader
        title="Ministries and care"
        description="Wording on the Services page. Preview first. Nothing goes public until you make it live."
        backHref="/admin/website"
        backLabel="Website pages"
      />
      <HubFlash message={flash.message} error={flash.error} />
      <ServicesWebsiteEditor services={services} />
    </div>
  );
}
