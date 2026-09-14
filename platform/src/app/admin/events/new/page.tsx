import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { EventCreateWizard } from "@/components/hub/event-create-wizard";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession, staffHasPermission } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const maxDuration = 60;

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const session = await getStaffSession();
  if (!session || !staffHasPermission(session.profile, "events.manage")) {
    redirect(
      "/admin/events?error=You%20do%20not%20have%20permission%20to%20create%20events.",
    );
  }

  const supabase = await createClient();
  const [{ data: media }, { data: branches }] = await Promise.all([
    supabase
      .from("media_assets")
      .select("id, alt_text, original_filename, public_url, caption")
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("church_branches")
      .select("id, name, country, city_label, slug")
      .eq("status", "published")
      .order("name", { ascending: true }),
  ]);

  return (
    <div>
      <HubPageHeader
        title="Create Event"
        description="Answer a few short questions. This saves as a draft and will not appear on the website until you make it live."
        backHref="/admin/events"
        backLabel="Events"
      />
      <HubFlash message={params.message} error={params.error} />
      <EventCreateWizard
        branches={(branches ?? []).map((branch) => ({
          id: branch.id,
          name: branch.name,
          country: branch.country,
          cityLabel: branch.city_label,
          slug: branch.slug,
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
