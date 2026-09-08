import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import {
  HubSelectField,
  HubStatusBadge,
  HubSubmitButton,
  HubTextAreaField,
  HubTextField,
} from "@/components/hub/hub-form-fields";
import {
  setSermonStatus,
  updateSermon,
} from "@/app/admin/sermons/actions";

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
    .select("id, alt_text, original_filename")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <div>
      <HubPageHeader
        title={sermon.title}
        description="Edit sermon details and change publication status."
        backHref="/admin/sermons"
        backLabel="All sermons"
        actions={<HubStatusBadge status={sermon.status} />}
      />
      <HubFlash message={flash.message} error={flash.error} />

      <form action={updateSermon} className="max-w-2xl space-y-6">
        <input type="hidden" name="id" value={sermon.id} />
        <HubTextField
          id="title"
          label="Title"
          required
          defaultValue={sermon.title}
        />
        <HubTextField
          id="speaker"
          label="Speaker"
          defaultValue={sermon.speaker ?? ""}
        />
        <HubTextField
          id="sermon_date"
          label="Date"
          type="date"
          defaultValue={sermon.sermon_date ?? ""}
        />
        <HubTextField
          id="scripture_reference"
          label="Scripture reference"
          defaultValue={sermon.scripture_reference ?? ""}
        />
        <HubTextAreaField
          id="summary"
          label="Summary"
          rows={4}
          defaultValue={sermon.summary ?? ""}
        />
        <HubTextField
          id="youtube_url"
          label="YouTube link"
          defaultValue={sermon.youtube_url ?? ""}
          hint="Videos stay on YouTube. Paste a youtube.com or youtu.be watch link — not a file upload or embed HTML."
        />
        <HubSelectField
          id="thumbnail_media_id"
          label="Thumbnail (optional)"
          defaultValue={sermon.thumbnail_media_id ?? ""}
        >
          <option value="">No thumbnail</option>
          {(media ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.alt_text || item.original_filename || item.id.slice(0, 8)}
            </option>
          ))}
        </HubSelectField>
        <HubSubmitButton>Save</HubSubmitButton>
      </form>

      <div className="mt-10 max-w-2xl space-y-3 border-t border-[var(--color-border)] pt-8">
        <h2 className="text-lg font-semibold">Status actions</h2>
        <div className="flex flex-wrap gap-3">
          <form action={setSermonStatus}>
            <input type="hidden" name="id" value={sermon.id} />
            <input type="hidden" name="status" value="draft" />
            <HubSubmitButton variant="quiet">Save as draft</HubSubmitButton>
          </form>
          <form action={setSermonStatus}>
            <input type="hidden" name="id" value={sermon.id} />
            <input type="hidden" name="status" value="preview" />
            <HubSubmitButton variant="quiet">
              Mark ready for preview
            </HubSubmitButton>
          </form>
          <form action={setSermonStatus}>
            <input type="hidden" name="id" value={sermon.id} />
            <input type="hidden" name="status" value="published" />
            <HubSubmitButton variant="secondary">Publish</HubSubmitButton>
          </form>
          {sermon.status !== "archived" ? (
            <form action={setSermonStatus}>
              <input type="hidden" name="id" value={sermon.id} />
              <input type="hidden" name="status" value="archived" />
              <HubSubmitButton variant="danger">Archive</HubSubmitButton>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
