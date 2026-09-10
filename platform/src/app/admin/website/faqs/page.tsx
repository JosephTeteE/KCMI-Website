import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { FaqsWebsiteEditor } from "@/components/hub/faqs-website-editor";
import { createClient } from "@/lib/supabase/server";
import { WEBSITE_DOCUMENT_IDS } from "@/content/website/keys";
import { resolveFaqsDocument } from "@/content/website/resolve";

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function HubFaqsContentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const flash = await searchParams;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("website_documents")
    .select("payload")
    .eq("id", WEBSITE_DOCUMENT_IDS.faqs)
    .maybeSingle();
  const faqs = resolveFaqsDocument(row?.payload ?? {});

  return (
    <div>
      <HubPageHeader
        title="Questions people ask"
        description="The FAQs page. Preview first. Nothing goes public until you make it live."
        backHref="/admin/website"
        backLabel="Website pages"
      />
      <HubFlash message={flash.message} error={flash.error} />
      <FaqsWebsiteEditor faqs={faqs} />
    </div>
  );
}
