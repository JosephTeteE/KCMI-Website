import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { LivestreamEditor } from "@/components/hub/livestream-editor";
import { WEBSITE_DOCUMENT_IDS } from "@/content/website/keys";
import { resolveGlobalDocument } from "@/content/website/resolve";

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function AdminLivestreamPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const [{ data: settings }, { data: globalRow }] = await Promise.all([
    supabase
      .from("livestream_settings")
      .select("facebook_url, is_live")
      .eq("singleton_key", "default")
      .maybeSingle(),
    supabase
      .from("website_documents")
      .select("payload")
      .eq("id", WEBSITE_DOCUMENT_IDS.global)
      .maybeSingle(),
  ]);
  const global = resolveGlobalDocument(globalRow?.payload ?? {});

  return (
    <div>
      <HubPageHeader
        title="Livestream"
        description="When KCMI goes live, paste the Facebook embed code here. Preview first. The public page does not change until you make it live."
      />
      <HubFlash message={params.message} error={params.error} />
      <LivestreamEditor
        currentUrl={settings?.facebook_url ?? null}
        isLive={settings?.is_live ?? false}
        heading={global.livestreamHeading}
        liveMessage={global.livestreamLiveMessage}
        notLiveMessage={global.livestreamNotLiveMessage}
      />
    </div>
  );
}
