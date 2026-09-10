import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import {
  HubSelectField,
  HubSubmitButton,
  HubTextAreaField,
  HubTextField,
} from "@/components/hub/hub-form-fields";
import { createSermon } from "@/app/admin/sermons/actions";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function NewSermonPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: media } = await supabase
    .from("media_assets")
    .select("id, alt_text, original_filename")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <div>
      <HubPageHeader
        title="New sermon"
        description="Add the title, speaker, and a YouTube watch link. This starts as a draft and is not on the website yet."
        backHref="/admin/sermons"
        backLabel="All sermons"
      />
      <HubFlash message={params.message} error={params.error} />

      <form action={createSermon} className="max-w-2xl space-y-6">
        <HubTextField id="title" label="Title" required />
        <HubTextField id="speaker" label="Speaker" />
        <HubTextField id="sermon_date" label="Date" type="date" />
        <HubTextField id="scripture_reference" label="Scripture reference" />
        <HubTextAreaField id="summary" label="Summary" rows={4} />
        <HubTextField
          id="youtube_url"
          label="YouTube link"
          hint="Paste a youtube.com or youtu.be watch link. Do not paste embed code or upload a video file."
        />
        <HubSelectField id="thumbnail_media_id" label="Thumbnail (optional)">
          <option value="">No thumbnail</option>
          {(media ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.alt_text || item.original_filename || item.id.slice(0, 8)}
            </option>
          ))}
        </HubSelectField>
        <HubSubmitButton>Save as a draft (not public yet)</HubSubmitButton>
      </form>
    </div>
  );
}
