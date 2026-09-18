import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { ProgramForm } from "@/components/hub/program-form";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession, staffHasPermission } from "@/lib/auth/session";

export const maxDuration = 60;

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function NewProgramPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const session = await getStaffSession();
  const canPublish =
    !!session && staffHasPermission(session.profile, "programs.publish");
  const supabase = await createClient();

  const [{ data: media }, { data: branches }] = await Promise.all([
    supabase
      .from("media_assets")
      .select("id, alt_text, original_filename, public_url, caption")
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("church_branches")
      .select("id, name, country")
      .eq("status", "published")
      .order("name", { ascending: true }),
  ]);

  return (
    <div>
      <HubPageHeader
        title="New program"
        description="Add a name, short description, and optional poster. Save a draft or publish when ready. Schedule, location, and visitor links are optional."
        backHref="/admin/programs"
        backLabel="Programs"
      />
      <HubFlash message={params.message} error={params.error} />
      <ProgramForm
        mode="create"
        canPublish={canPublish}
        branches={(branches ?? []).map((branch) => ({
          id: branch.id,
          name: branch.name,
          country: branch.country,
        }))}
        media={(media ?? []).map((item) => ({
          id: item.id,
          previewUrl: item.public_url,
          alt: item.alt_text || item.original_filename || "Saved photo",
          caption: item.caption,
        }))}
      />
    </div>
  );
}
