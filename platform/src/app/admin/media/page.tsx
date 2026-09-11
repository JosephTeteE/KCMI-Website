import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { HubSubmitButton } from "@/components/hub/hub-form-fields";
import { MarketingImageUploader } from "@/components/hub/marketing-image-uploader";
import {
  archiveMedia,
  uploadMarketingImage,
} from "@/app/admin/media/actions";

export const maxDuration = 60;

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: assets } = await supabase
    .from("media_assets")
    .select(
      "id, public_url, alt_text, caption, original_filename, content_type, byte_size, width_px, height_px, created_at",
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <div>
      <HubPageHeader
        title="Photos"
        description="Saved photos you can reuse later. Adding a photo here does not put it on the website — go to the page where it should appear (Homepage, About, Programs, Branches), choose or upload it there, then make it live. JPEG, PNG, or WebP up to 15MB. No video files."
      />
      <HubFlash message={params.message} error={params.error} />

      <section className="mb-12 max-w-xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <h2 className="mb-6 text-lg font-semibold">Add a photo</h2>
        <MarketingImageUploader
          action={uploadMarketingImage}
          submitLabel="Add this photo to the library"
          showCaption
          placementTitle="Photo library"
        />
      </section>

      <h2 className="text-lg font-semibold">Gallery</h2>
      {(assets?.length ?? 0) === 0 ? (
        <p className="mt-3 text-[var(--color-text-muted)]">
          No images uploaded yet.
        </p>
      ) : (
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {assets!.map((asset) => (
            <li
              key={asset.id}
              className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
            >
              <div className="relative aspect-[4/3] bg-[var(--color-surface-tint)]">
                <Image
                  src={asset.public_url}
                  alt={asset.alt_text || ""}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
              </div>
              <div className="space-y-3 p-4">
                <p className="text-sm font-medium text-[var(--color-text-body)]">
                  {asset.alt_text || asset.original_filename || "Untitled"}
                </p>
                {asset.caption ? (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {asset.caption}
                  </p>
                ) : null}
                <p className="text-sm text-[var(--color-text-muted)]">
                  {asset.width_px && asset.height_px
                    ? `${asset.width_px}×${asset.height_px} · `
                    : null}
                  {Math.round(asset.byte_size / 1024)} KB · {asset.content_type}
                </p>
                <form action={archiveMedia}>
                  <input type="hidden" name="id" value={asset.id} />
                  <HubSubmitButton variant="danger">Remove from library</HubSubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
