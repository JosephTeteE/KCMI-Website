import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import {
  HubSubmitButton,
  HubTextAreaField,
  HubTextField,
} from "@/components/hub/hub-form-fields";
import { MarketingImageUploader } from "@/components/hub/marketing-image-uploader";
import { updateBranchPublicFields } from "@/app/admin/branches/actions";
import {
  removeBranchPhoto,
  uploadBranchPhoto,
} from "@/app/admin/branches/media-actions";

export const maxDuration = 60;

type SearchParams = Promise<{ message?: string; error?: string }>;
type Params = Promise<{ id: string }>;

type ServiceTimeRow = {
  day_label: string;
  time_label: string;
  note: string | null;
};

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
      "id, name, city_label, address_lines, phone_display, phone_tel, email, maps_query, maps_url, phone_evidence_note",
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

  const rows: ServiceTimeRow[] = [...(times ?? [])];
  while (rows.length < Math.max(4, (times?.length ?? 0) + 2)) {
    rows.push({ day_label: "", time_label: "", note: null });
  }

  return (
    <div>
      <HubPageHeader
        title={branch.name}
        description="Edit public details. Leave phone fields empty if unknown — do not invent numbers."
        backHref="/admin/branches"
        backLabel="All branches"
      />
      <HubFlash message={flash.message} error={flash.error} />

      <form action={updateBranchPublicFields} className="max-w-2xl space-y-6">
        <input type="hidden" name="id" value={branch.id} />
        <HubTextField
          id="name"
          label="Branch name"
          required
          defaultValue={branch.name}
        />
        <HubTextField
          id="city_label"
          label="City / area label"
          defaultValue={branch.city_label}
        />
        <HubTextAreaField
          id="address_lines"
          label="Address (one line per row)"
          rows={4}
          defaultValue={(branch.address_lines ?? []).join("\n")}
        />
        <HubTextField
          id="phone_display"
          label="Phone (display)"
          defaultValue={branch.phone_display ?? ""}
          hint="Leave blank if unknown."
        />
        <HubTextField
          id="phone_tel"
          label="Phone (dial link)"
          defaultValue={branch.phone_tel ?? ""}
          hint="Digits for tel: links, e.g. +233…"
        />
        <HubTextField
          id="email"
          label="Email"
          type="email"
          defaultValue={branch.email ?? ""}
        />
        <HubTextField
          id="maps_query"
          label="Maps search query"
          defaultValue={branch.maps_query ?? ""}
        />
        <HubTextField
          id="maps_url"
          label="Maps URL (optional)"
          defaultValue={branch.maps_url ?? ""}
        />
        <HubTextAreaField
          id="phone_evidence_note"
          label="Phone evidence note (staff)"
          rows={2}
          defaultValue={branch.phone_evidence_note ?? ""}
          hint="Internal note about phone source conflicts — not for inventing numbers."
        />

        <fieldset className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
          <legend className="px-1 text-sm font-semibold">Service times</legend>
          <p className="text-sm text-[var(--color-text-muted)]">
            Leave unused rows blank. Saving replaces the full list.
          </p>
          {rows.map((row, index) => (
            <div
              key={`service-row-${index}`}
              className="grid gap-3 sm:grid-cols-3"
            >
              <div>
                <label
                  htmlFor={`service_day_${index}`}
                  className="block text-sm font-medium"
                >
                  Day
                </label>
                <input
                  id={`service_day_${index}`}
                  name="service_day"
                  defaultValue={row.day_label}
                  className="mt-2 w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-base"
                />
              </div>
              <div>
                <label
                  htmlFor={`service_time_${index}`}
                  className="block text-sm font-medium"
                >
                  Time
                </label>
                <input
                  id={`service_time_${index}`}
                  name="service_time"
                  defaultValue={row.time_label}
                  className="mt-2 w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-base"
                />
              </div>
              <div>
                <label
                  htmlFor={`service_note_${index}`}
                  className="block text-sm font-medium"
                >
                  Note
                </label>
                <input
                  id={`service_note_${index}`}
                  name="service_note"
                  defaultValue={row.note ?? ""}
                  className="mt-2 w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-base"
                />
              </div>
            </div>
          ))}
        </fieldset>

        <HubSubmitButton>Save branch</HubSubmitButton>
      </form>

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
                    <p className="mt-1 text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                      {item.status}
                      {!item.is_active ? " · inactive" : ""}
                    </p>
                  </div>
                  <form action={removeBranchPhoto}>
                    <input type="hidden" name="branch_id" value={branch.id} />
                    <input type="hidden" name="branch_media_id" value={item.id} />
                    <HubSubmitButton variant="secondary">
                      Remove from Branch
                    </HubSubmitButton>
                  </form>
                </li>
              );
            })
          )}
        </ul>

        <div className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
          <h3 className="text-lg font-semibold">Add Image</h3>
          <MarketingImageUploader
            action={uploadBranchPhoto}
            submitLabel="Add image"
            defaultCropAspect="original"
            extraFields={
              <>
                <input type="hidden" name="branch_id" value={branch.id} />
                <div>
                  <label htmlFor="placement" className="block text-sm font-medium">
                    Where should this photo appear?
                  </label>
                  <select
                    id="placement"
                    name="placement"
                    className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-page)] px-3 py-2"
                    defaultValue="gallery"
                  >
                    <option value="hero">Hero Image</option>
                    <option value="gallery">Gallery</option>
                    <option value="featured">Featured</option>
                    <option value="announcement">Announcement</option>
                    <option value="general">General</option>
                  </select>
                  <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
                    Pair with a matching crop: hero 16:9, card 4:3, square 1:1, or original for gallery.
                  </p>
                </div>
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
      return "Hero Image";
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
