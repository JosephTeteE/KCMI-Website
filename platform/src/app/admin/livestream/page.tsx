import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import {
  HubCheckboxField,
  HubSubmitButton,
  HubTextAreaField,
  HubTextField,
} from "@/components/hub/hub-form-fields";
import { updateLivestreamSettings } from "@/app/admin/livestream/actions";

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function AdminLivestreamPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("livestream_settings")
    .select("facebook_url, is_live")
    .eq("singleton_key", "default")
    .maybeSingle();

  return (
    <div>
      <HubPageHeader
        title="Livestream"
        description="Facebook URLs only — do not upload video files. Paste a page or video URL, or embed HTML; only the cleaned URL is saved."
      />
      <HubFlash message={params.message} error={params.error} />

      <form
        action={updateLivestreamSettings}
        className="max-w-xl space-y-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6"
      >
        <HubTextField
          id="facebook_url"
          label="Facebook URL"
          defaultValue={settings?.facebook_url ?? ""}
          hint="https://www.facebook.com/… or fb.watch link"
        />
        <HubTextAreaField
          id="facebook_input"
          label="Or paste Facebook embed helper text"
          rows={4}
          hint="If you paste embed HTML, we extract the URL and discard the HTML."
        />
        <HubCheckboxField
          id="is_live"
          label="Show as live now"
          defaultChecked={settings?.is_live ?? false}
        />
        <HubSubmitButton>Save</HubSubmitButton>
      </form>
    </div>
  );
}
