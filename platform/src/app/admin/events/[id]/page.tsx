import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession, staffHasPermission } from "@/lib/auth/session";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { HubStatusBadge } from "@/components/hub/hub-form-fields";
import {
  EventWizard,
  type EventWizardInitial,
} from "@/components/hub/event-create-wizard";
import { EventLifecycleActions } from "@/components/hub/event-lifecycle-actions";
import { loadHubPhotoLibrary } from "@/lib/hub/photo-library";
import { utcIsoToLocalParts } from "@/lib/events/datetime";
import type { EventKind } from "@/lib/events/parse-fields";

export const maxDuration = 60;

type SearchParams = Promise<{
  message?: string;
  error?: string;
}>;
type Params = Promise<{ id: string }>;

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const session = await getStaffSession();
  const canManage =
    !!session && staffHasPermission(session.profile, "events.manage");

  if (!session) {
    redirect("/auth/sign-in");
  }

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select(
      "id, slug, title, theme, summary, body_text, event_kind, status, featured_media_id, starts_at, ends_at, timezone, venue_label, venue_city, venue_country, location_branch_id, contact_email, contact_phone_display",
    )
    .eq("id", id)
    .maybeSingle();

  if (!event) notFound();

  const [{ data: branches }, photoLibrary] = await Promise.all([
    supabase
      .from("church_branches")
      .select("id, name, country, city_label, slug")
      .eq("status", "published")
      .order("name", { ascending: true }),
    loadHubPhotoLibrary(),
  ]);

  const cover = event.featured_media_id
    ? photoLibrary.find((item) => item.id === event.featured_media_id)
    : null;

  const startParts = utcIsoToLocalParts(event.starts_at, event.timezone);
  const endParts = event.ends_at
    ? utcIsoToLocalParts(event.ends_at, event.timezone)
    : { date: "", time: "" };

  const initial: EventWizardInitial = {
    id: event.id,
    title: event.title,
    theme: event.theme ?? "",
    summary: event.summary ?? "",
    bodyText: event.body_text ?? "",
    eventKind: event.event_kind as EventKind,
    startDate: startParts.date,
    startTime: startParts.time === "00:00" ? "" : startParts.time,
    endDate: endParts.date,
    endTime: endParts.time === "00:00" ? "" : endParts.time,
    timezone: event.timezone,
    venueLabel: event.venue_label ?? "",
    venueCity: event.venue_city ?? "",
    venueCountry: event.venue_country ?? "",
    locationBranchId: event.location_branch_id ?? "",
    contactEmail: event.contact_email ?? "",
    contactPhoneDisplay: event.contact_phone_display ?? "",
    featuredMediaId: event.featured_media_id,
    posterPreviewUrl: cover?.previewUrl ?? null,
    posterAlt: cover?.alt ?? null,
    status: event.status,
    slug: event.slug,
  };

  const isDraft = event.status === "draft" || event.status === "preview";

  return (
    <div>
      <HubPageHeader
        title={event.title}
        description={
          isDraft
            ? "DRAFT — NOT ON THE WEBSITE. Change details, preview, and save draft changes."
            : event.status === "published"
              ? "Currently on the website. Change, preview, then make updates live when ready."
              : "This event is removed from the public website."
        }
        backHref="/admin/events"
        backLabel="Events"
        actions={<HubStatusBadge status={event.status} />}
      />
      <HubFlash message={flash.message} error={flash.error} />
      <EventWizard
        mode="edit"
        branches={(branches ?? []).map((branch) => ({
          id: branch.id,
          name: branch.name,
          country: branch.country,
          cityLabel: branch.city_label,
          slug: branch.slug,
        }))}
        media={photoLibrary}
        initial={initial}
        canManage={canManage}
      />
      {canManage ? (
        <EventLifecycleActions eventId={event.id} status={event.status} />
      ) : null}
    </div>
  );
}
