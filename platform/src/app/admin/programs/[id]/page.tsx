import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession, staffHasPermission } from "@/lib/auth/session";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { HubStatusBadge } from "@/components/hub/hub-form-fields";
import {
  ProgramForm,
  type ProgramFormInitial,
} from "@/components/hub/program-form";
import { loadHubPhotoLibrary } from "@/lib/hub/photo-library";
import { parseProgramActionKind } from "@/lib/programs/action-url";
import { parseProgramLocationKind } from "@/lib/programs/location";
import { resolveWizardSchedule } from "@/lib/programs/wizard-state";
import { DEFAULT_PROGRAM_TIMEZONE } from "@/lib/programs/sessions";

export const maxDuration = 60;

type SearchParams = Promise<{
  message?: string;
  error?: string;
}>;
type Params = Promise<{ id: string }>;

export default async function EditProgramPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const session = await getStaffSession();
  const canPublish =
    !!session && staffHasPermission(session.profile, "programs.publish");

  const supabase = await createClient();
  const { data: program } = await supabase
    .from("programs")
    .select(
      "id, title, short_description, body_text, starts_at, ends_at, featured_media_id, cta_label, cta_url, placement, status, published_at, action_kind, location_kind, location_branch_id, location_label, timezone",
    )
    .eq("id", id)
    .maybeSingle();

  if (!program) notFound();

  const [{ data: sessionRows }, { data: branches }, photoLibrary] =
    await Promise.all([
      supabase
        .from("program_sessions")
        .select("session_date, start_time, end_time, label, sort_order")
        .eq("program_id", id)
        .order("session_date", { ascending: true })
        .order("sort_order", { ascending: true }),
      supabase
        .from("church_branches")
        .select("id, name, country")
        .eq("status", "published")
        .order("name", { ascending: true }),
      loadHubPhotoLibrary(),
    ]);

  const schedule = resolveWizardSchedule({
    sessions: sessionRows ?? [],
    startsAt: program.starts_at,
    endsAt: program.ends_at,
    timezone: program.timezone,
  });

  const cover = program.featured_media_id
    ? photoLibrary.find((item) => item.id === program.featured_media_id)
    : null;

  const locationKind = parseProgramLocationKind(program.location_kind);
  const actionKind = parseProgramActionKind(program.action_kind);

  const flatSessions =
    schedule.scheduleMode === "one_day"
      ? schedule.oneDay.sessionDate
        ? [
            {
              key: "legacy-0",
              sessionDate: schedule.oneDay.sessionDate,
              startTime: schedule.oneDay.startTime,
              endTime: schedule.oneDay.endTime,
            },
          ]
        : []
      : schedule.days.flatMap((day, dayIndex) =>
          day.sessions.map((slot, slotIndex) => ({
            key: `d${dayIndex}-s${slotIndex}`,
            sessionDate: day.sessionDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        );

  const initial: ProgramFormInitial = {
    id: program.id,
    title: program.title,
    shortDescription: program.short_description ?? "",
    status: program.status as ProgramFormInitial["status"],
    featuredMediaId: program.featured_media_id,
    coverPreviewUrl: cover?.previewUrl ?? null,
    coverAlt: cover?.alt ?? "",
    locationKind,
    locationBranchId: program.location_branch_id,
    locationLabel: program.location_label ?? "",
    actionKind,
    ctaUrl: program.cta_url ?? "",
    sessions: flatSessions,
    timezone: program.timezone ?? DEFAULT_PROGRAM_TIMEZONE,
  };

  const isDraft =
    program.status === "draft" || program.status === "preview";

  return (
    <div>
      <HubPageHeader
        title={program.title}
        description={
          isDraft
            ? "Edit this draft. Save changes or publish when ready. Schedule, location, and visitor links stay optional."
            : program.status === "published"
              ? "See what is live, then change, preview, and make updates live when ready."
              : "Edit this program."
        }
        backHref="/admin/programs"
        backLabel="Back to Programs"
        actions={<HubStatusBadge status={program.status} />}
      />
      <HubFlash message={flash.message} error={flash.error} />
      <ProgramForm
        mode="edit"
        canPublish={canPublish}
        branches={(branches ?? []).map((branch) => ({
          id: branch.id,
          name: branch.name,
          country: branch.country,
        }))}
        media={photoLibrary}
        initial={initial}
      />
    </div>
  );
}
