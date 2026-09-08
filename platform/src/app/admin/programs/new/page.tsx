import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import {
  HubSelectField,
  HubSubmitButton,
  HubTextAreaField,
  HubTextField,
} from "@/components/hub/hub-form-fields";
import { createProgram } from "@/app/admin/programs/actions";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function NewProgramPage({
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
        title="New program"
        description="Start as a draft. Publishing is a separate step."
        backHref="/admin/programs"
        backLabel="All programs"
      />
      <HubFlash message={params.message} error={params.error} />

      <form action={createProgram} className="max-w-2xl space-y-6">
        <HubTextField id="title" label="Title" required />
        <HubTextAreaField
          id="short_description"
          label="Short description"
          rows={3}
        />
        <HubTextAreaField id="body_text" label="Full details" rows={6} />
        <div className="grid gap-6 sm:grid-cols-2">
          <HubTextField
            id="starts_at"
            label="Starts"
            type="datetime-local"
          />
          <HubTextField id="ends_at" label="Ends" type="datetime-local" />
        </div>
        <HubTextField id="cta_label" label="Button label" />
        <HubTextField
          id="cta_url"
          label="Button link"
          hint="Use https://… or a site path like /events"
        />
        <HubSelectField id="placement" label="Home page placement" defaultValue="none">
          <option value="none">None</option>
          <option value="featured">Featured</option>
          <option value="banner">Banner</option>
          <option value="card">Card</option>
        </HubSelectField>
        <HubSelectField id="featured_media_id" label="Featured image (optional)">
          <option value="">No image</option>
          {(media ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.alt_text || item.original_filename || item.id.slice(0, 8)}
            </option>
          ))}
        </HubSelectField>
        <HubSubmitButton>Create draft</HubSubmitButton>
      </form>
    </div>
  );
}
