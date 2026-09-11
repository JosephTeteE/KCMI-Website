import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession, staffHasPermission } from "@/lib/auth/session";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { HubStatusBadge } from "@/components/hub/hub-form-fields";
import { ProgramEditor } from "@/components/hub/program-editor";
import type { FeaturedProgram } from "@/content/types";
import { loadHubPhotoAsset, loadHubPhotoLibrary } from "@/lib/hub/photo-library";
import { PROGRAM_POSTER_STAGED_FIELD } from "@/lib/hub/staged-photo";

export const maxDuration = 60;

type SearchParams = Promise<{
  message?: string;
  error?: string;
  stagedField?: string;
  stagedMediaId?: string;
}>;
type Params = Promise<{ id: string }>;

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!program) notFound();

  const [photoLibrary, stagedAsset] = await Promise.all([
    loadHubPhotoLibrary(),
    loadHubPhotoAsset(
      flash.stagedField === PROGRAM_POSTER_STAGED_FIELD
        ? flash.stagedMediaId
        : null,
    ),
  ]);

  const cover = program.featured_media_id
    ? photoLibrary.find((item) => item.id === program.featured_media_id)
    : null;

  const coverPreview: FeaturedProgram | null = {
    id: program.id,
    title: program.title,
    shortDescription: program.short_description ?? "",
    datesLabel: program.starts_at
      ? new Date(program.starts_at).toLocaleDateString("en-GB")
      : null,
    imageSrc: cover?.previewUrl ?? null,
    imageAlt: cover?.alt ?? "",
    ctaLabel: program.cta_label ?? "Learn more",
    ctaHref: program.cta_url ?? "#",
    placement: program.placement === "featured" ? "featured" : "none",
    status: "published",
  };

  return (
    <div>
      <HubPageHeader
        title={program.title}
        description="See what is currently live, then propose a change. Preview first. Making it live shows it to visitors."
        backHref="/admin/programs"
        backLabel="All programs"
        actions={<HubStatusBadge status={program.status} />}
      />
      <HubFlash message={flash.message} error={flash.error} />
      <ProgramEditor
        program={{
          id: program.id,
          title: program.title,
          short_description: program.short_description ?? "",
          body_text: program.body_text ?? "",
          starts_at: toDatetimeLocal(program.starts_at),
          ends_at: toDatetimeLocal(program.ends_at),
          cta_label: program.cta_label ?? "",
          cta_url: program.cta_url ?? "",
          placement: program.placement,
          featured_media_id: program.featured_media_id ?? "",
          status: program.status,
        }}
        media={photoLibrary}
        canPublish={canPublish}
        coverPreview={coverPreview}
        stagedPoster={stagedAsset}
      />
    </div>
  );
}
