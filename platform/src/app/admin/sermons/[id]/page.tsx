import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { HubStatusBadge } from "@/components/hub/hub-form-fields";
import { SermonEditor } from "@/components/hub/sermon-editor";

type SearchParams = Promise<{ message?: string; error?: string }>;
type Params = Promise<{ id: string }>;

export default async function EditSermonPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const supabase = await createClient();

  const { data: sermon } = await supabase
    .from("sermons")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!sermon) notFound();

  const { data: media } = await supabase
    .from("media_assets")
    .select("id, alt_text, original_filename, public_url")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <div>
      <HubPageHeader
        title={sermon.title}
        description="See the current listing, then propose a change. Preview first. Making it live shows it on the Sermons page."
        backHref="/admin/sermons"
        backLabel="All sermons"
        actions={<HubStatusBadge status={sermon.status} />}
      />
      <HubFlash message={flash.message} error={flash.error} />
      <SermonEditor
        sermon={{
          id: sermon.id,
          title: sermon.title,
          speaker: sermon.speaker,
          sermon_date: sermon.sermon_date,
          scripture_reference: sermon.scripture_reference,
          summary: sermon.summary,
          youtube_url: sermon.youtube_url,
          thumbnail_media_id: sermon.thumbnail_media_id,
          home_featured: sermon.home_featured === true,
          status: sermon.status,
        }}
        media={(media ?? []).map((item) => ({
          id: item.id,
          label: item.alt_text || item.original_filename || item.id.slice(0, 8),
          publicUrl: item.public_url,
        }))}
      />
    </div>
  );
}
