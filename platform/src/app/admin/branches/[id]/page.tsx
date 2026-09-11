import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { BranchDetailsEditor } from "@/components/hub/branch-details-editor";
import { MarketingImageUploader } from "@/components/hub/marketing-image-uploader";
import { HubSubmitButton } from "@/components/hub/hub-form-fields";
import {
  removeBranchPhoto,
  uploadBranchPhoto,
} from "@/app/admin/branches/media-actions";

export const maxDuration = 60;

type SearchParams = Promise<{ message?: string; error?: string }>;
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

      <section className="mt-14 max-w-2xl space-y-6 border-t border-[var(--color-border)] pt-10">
        <div>
          <h2 className="font-display text-2xl font-semibold">Branch Photos</h2>
          <p className="mt-2 text-readable-sm text-[var(--color-text-muted)]">
            Photos for this branch only. Adding a photo here does not change other
            branches. Removing a photo from the branch keeps the file in the shared
            library.
          </p>
        </div>

        <ul className="space-y-4">
          {(branchMedia ?? []).length === 0 ? (
            <li className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-6 text-readable-sm text-[var(--color-text-muted)]">
              No photos attached to this branch yet.
            </li>
          ) : (
            (branchMedia ?? []).map((item) => {
              const media = Array.isArray(item.media)
                ? item.media[0]
                : item.media;
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:flex-row sm:items-center"
                >
                  {media?.public_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={media.public_url}
                      alt={
                        item.alt_text_override ||
                        media.alt_text ||
                        "Branch photo"
                      }
                      className="h-28 w-40 rounded-[var(--radius-md)] object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold capitalize">
                      {placementLabel(item.placement)}
                    </p>
                    <p className="text-readable-sm text-[var(--color-text-muted)]">
                      {item.alt_text_override || media?.alt_text || "No description"}
                    </p>
                    <p className="mt-1 text-sm uppercase tracking-wide text-[var(--color-text-muted)]">
                      {item.status}
                      {!item.is_active ? " · inactive" : ""}
                    </p>
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

        <div className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
          <h3 className="text-lg font-semibold">Top Photo</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            The large photo at the top of this branch’s page on the website. The
            website crops it to fit automatically.
          </p>
          {(() => {
            const hero = (branchMedia ?? []).find((item) => item.placement === "hero");
            const media = hero
              ? Array.isArray(hero.media)
                ? hero.media[0]
                : hero.media
              : null;
            return media?.public_url ? (
              <div data-hub-role="current" className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Current photo
                </p>
                <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-tint)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={media.public_url}
                    alt={hero?.alt_text_override || media.alt_text || `${branch.name} top photo`}
                    className="size-full object-cover"
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                No top photo yet.
              </p>
            );
          })()}
          <MarketingImageUploader
            action={uploadBranchPhoto}
            submitLabel="Replace Photo"
            defaultCropAspect="hero"
            lockCropAspect
            placementTitle="Branch Top Photo"
            extraFields={
              <>
                <input type="hidden" name="branch_id" value={branch.id} />
                <input type="hidden" name="placement" value="hero" />
              </>
            }
          />
        </div>

        <div className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
          <h3 className="text-lg font-semibold">More branch photos</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Extra photos under the top photo on this branch’s page.
          </p>
          <MarketingImageUploader
            action={uploadBranchPhoto}
            submitLabel="Add this photo to the branch"
            defaultCropAspect="original"
            lockCropAspect
            placementTitle="More branch photos"
            extraFields={
              <>
                <input type="hidden" name="branch_id" value={branch.id} />
                <input type="hidden" name="placement" value="gallery" />
              </>
            }
          />
        </div>
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
