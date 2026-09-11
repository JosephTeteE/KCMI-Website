import type { MediaChooserItem } from "@/components/hub/media-chooser";
import {
  mediaAssetPrimaryLabel,
  mediaAssetSecondaryLabel,
} from "@/lib/hub/media-label";
import { createClient } from "@/lib/supabase/server";

type MediaRow = {
  id: string;
  public_url: string | null;
  alt_text: string | null;
  caption: string | null;
  original_filename: string | null;
};

/** Library items for Hub choose-existing flows — volunteer labels only. */
export async function loadHubPhotoLibrary(): Promise<MediaChooserItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("media_assets")
    .select("id, public_url, alt_text, caption, original_filename")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(120);

  return ((data ?? []) as MediaRow[])
    .filter((row) => Boolean(row.public_url))
    .map((row) => ({
      id: row.id,
      previewUrl: row.public_url as string,
      alt: mediaAssetPrimaryLabel({
        altText: row.alt_text,
        caption: row.caption,
        originalFilename: row.original_filename,
        id: row.id,
      }),
      caption: mediaAssetSecondaryLabel({
        altText: row.alt_text,
        caption: row.caption,
        originalFilename: row.original_filename,
        id: row.id,
      }),
    }));
}

export async function loadHubPhotoAsset(
  id: string | null | undefined,
): Promise<MediaChooserItem | null> {
  if (!id) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("media_assets")
    .select("id, public_url, alt_text, caption, original_filename")
    .eq("id", id)
    .maybeSingle();
  if (!data?.public_url) return null;
  const row = data as MediaRow;
  return {
    id: row.id,
    previewUrl: row.public_url as string,
    alt: mediaAssetPrimaryLabel({
      altText: row.alt_text,
      caption: row.caption,
      originalFilename: row.original_filename,
      id: row.id,
    }),
    caption: mediaAssetSecondaryLabel({
      altText: row.alt_text,
      caption: row.caption,
      originalFilename: row.original_filename,
      id: row.id,
    }),
  };
}
