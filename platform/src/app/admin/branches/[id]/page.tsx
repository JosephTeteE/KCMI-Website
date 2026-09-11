import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { BranchDetailsEditor } from "@/components/hub/branch-details-editor";
import { ContextualPhotoEditor } from "@/components/hub/contextual-photo-editor";
import { HubSubmitButton } from "@/components/hub/hub-form-fields";
import {
  assignBranchPhoto,
  removeBranchPhoto,
  stageBranchPhoto,
} from "@/app/admin/branches/media-actions";
import {
  loadHubPhotoAsset,
  loadHubPhotoLibrary,
} from "@/lib/hub/photo-library";
import { HUB_MEDIA_PLACEMENTS } from "@/lib/hub/placement-copy";
import {
  BRANCH_GALLERY_STAGED_FIELD,
  BRANCH_HERO_STAGED_FIELD,
} from "@/lib/hub/staged-photo";

export const maxDuration = 60;

type SearchParams = Promise<{
  message?: string;
  error?: string;
  stagedField?: string;
  stagedMediaId?: string;
}>;
type Params = Promise<{ id: string }>;

export default async function EditBranchPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const supabase = await createClient();

  const { data: branch } = await supabase
    .from("church_branches")
    .select(
      "id, name, city_label, country, address_lines, phone_display, phone_tel, email, maps_query, maps_url, phone_evidence_note",
    )
    .eq("id", id)
    .maybeSingle();

  if (!branch) notFound();

  const { data: times } = await supabase
    .from("branch_service_times")
    .select("day_label, time_label, note, sort_order")
    .eq("branch_id", id)
    .order("sort_order", { ascending: true });

  const { data: branchMedia } = await supabase
    .from("branch_media")
    .select(
      `
      id,
      placement,
      sort_order,
      status,
      is_active,
      alt_text_override,
      media:media_assets!branch_media_media_asset_id_fkey (
        public_url,
        alt_text,
        caption
      )
    `,
    )
    .eq("branch_id", id)
    .order("sort_order", { ascending: true });

  const [photoLibrary, stagedAsset] = await Promise.all([
    loadHubPhotoLibrary(),
    loadHubPhotoAsset(flash.stagedMediaId),
  ]);

  const stagedHero =
    flash.stagedField === BRANCH_HERO_STAGED_FIELD && stagedAsset
      ? stagedAsset
      : null;
  const stagedGallery =
    flash.stagedField === BRANCH_GALLERY_STAGED_FIELD && stagedAsset
      ? stagedAsset
      : null;

  const hero = (branchMedia ?? []).find(
    (item) => item.placement === "hero" && item.is_active,
  );
  const heroMedia = hero
    ? Array.isArray(hero.media)
      ? hero.media[0]
      : hero.media
    : null;

  const topCopy = HUB_MEDIA_PLACEMENTS.branchTopPhoto;
  const galleryCopy = HUB_MEDIA_PLACEMENTS.branchGallery;

  return (
    <div>
      <HubPageHeader
        title={branch.name}
        description="See the current branch page details, then propose a change. Preview first. Making details live updates the branch page."
        backHref="/admin/branches"
        backLabel="All branches"
      />
      <HubFlash message={flash.message} error={flash.error} />

      <BranchDetailsEditor
        id={branch.id}
        current={{
          name: branch.name,
          city_label: branch.city_label,
          country: branch.country ?? "",
          address_lines: (branch.address_lines ?? []).join("\n"),
          phone_display: branch.phone_display ?? "",
          phone_tel: branch.phone_tel ?? "",
          email: branch.email ?? "",
          maps_query: branch.maps_query ?? "",
          maps_url: branch.maps_url ?? "",
          phone_evidence_note: branch.phone_evidence_note ?? "",
        }}
        currentTimes={(times ?? []).map((row) => ({
          day: row.day_label,
          time: row.time_label,
          note: row.note ?? "",
        }))}
      />

      <section className="mt-10 space-y-8">
        <div>
          <h2 className="text-xl font-semibold">Photos for this branch</h2>
          <p className="hub-help mt-2 text-[var(--color-text-muted)]">
            Change photos here. Uploading saves to the photo library. The branch
            page only changes after you preview and make a photo live.
          </p>
        </div>

        <ul className="space-y-4">
          {(branchMedia ?? []).length === 0 ? (
            <li className="hub-help text-[var(--color-text-muted)]">
              No photos are attached to this branch yet.
            </li>
          ) : (
            (branchMedia ?? []).map((item) => {
              const media = Array.isArray(item.media)
                ? item.media[0]
                : item.media;
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    {media?.public_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={media.public_url}
                        alt=""
                        className="size-16 rounded-[var(--radius-md)] object-cover"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="text-base font-semibold">
                        {placementLabel(item.placement)}
                        {!item.is_active ? " (not shown)" : ""}
                      </p>
                      <p className="hub-help mt-1 text-[var(--color-text-muted)]">
                        {item.alt_text_override ||
                          media?.alt_text ||
                          media?.caption ||
                          "Photo without a description"}
                      </p>
                    </div>
                  </div>
                  <form action={removeBranchPhoto}>
                    <input type="hidden" name="branch_id" value={branch.id} />
                    <input type="hidden" name="branch_media_id" value={item.id} />
                    <HubSubmitButton variant="danger">
                      Remove from this branch page
                    </HubSubmitButton>
                  </form>
                </li>
              );
            })
          )}
        </ul>

        <ContextualPhotoEditor
          title={topCopy.title}
          where={topCopy.where}
          recommended={topCopy.recommended}
          cropAspect="hero"
          current={
            heroMedia?.public_url
              ? {
                  src: heroMedia.public_url,
                  alt:
                    hero?.alt_text_override ||
                    heroMedia.alt_text ||
                    `${branch.name} top photo`,
                }
              : null
          }
          library={photoLibrary}
          staged={stagedHero}
          uploadAction={stageBranchPhoto}
          assignAction={assignBranchPhoto}
          hiddenFields={{
            branch_id: branch.id,
            placement: "hero",
          }}
          emptyCurrentLabel="No top photo yet."
        />

        <ContextualPhotoEditor
          title={galleryCopy.title}
          where={galleryCopy.where}
          recommended={galleryCopy.recommended}
          cropAspect="original"
          current={null}
          library={photoLibrary}
          staged={stagedGallery}
          uploadAction={stageBranchPhoto}
          assignAction={assignBranchPhoto}
          hiddenFields={{
            branch_id: branch.id,
            placement: "gallery",
          }}
          currentHeading="Adding another photo"
          currentNote="Gallery photos appear under the top photo. Choose or upload one, preview, then make it live."
          emptyCurrentLabel="Use Replace Photo to add another gallery photo."
          changeLabel="Add a gallery photo"
        />
      </section>
    </div>
  );
}

function placementLabel(placement: string): string {
  switch (placement) {
    case "hero":
      return "Top Photo";
    case "gallery":
      return "Gallery";
    case "featured":
      return "Featured";
    case "announcement":
      return "Announcement";
    default:
      return "General";
  }
}
