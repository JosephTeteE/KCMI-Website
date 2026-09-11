import { writeAuditEvent } from "@/lib/cms/audit";
import { ingestMarketingImageFile } from "@/lib/cms/ingest-marketing-image";
import { createClient } from "@/lib/supabase/server";
import { createSecretKeyClient } from "@/lib/supabase/admin";

export const MARKETING_BUCKET = "marketing-public";

export type StageMarketingAssetInput = {
  file: File;
  /** Carries crop_aspect / focal_x / focal_y from the uploader. */
  formData: FormData;
  altText: string;
  caption?: string | null;
  actorId: string;
  /** Non-sensitive context recorded with the media.upload audit event. */
  auditMetadata?: Record<string, unknown>;
};

export type StageMarketingAssetResult =
  | { ok: true; id: string; publicUrl: string; altText: string }
  | { ok: false; error: string };

/**
 * Normalize and store one marketing image in the photo library.
 * Never assigns the photo to a public surface — publishing is a separate, explicit step.
 */
export async function stageMarketingAsset({
  file,
  formData,
  altText,
  caption = null,
  actorId,
  auditMetadata,
}: StageMarketingAssetInput): Promise<StageMarketingAssetResult> {
  const ingested = await ingestMarketingImageFile(file, formData);
  if (!ingested.ok) {
    return { ok: false, error: ingested.error };
  }

  const storagePath = `${crypto.randomUUID()}.webp`;
  const supabase = await createClient();
  const storage = createSecretKeyClient();

  const { error: uploadError } = await storage.storage
    .from(MARKETING_BUCKET)
    .upload(storagePath, ingested.image.buffer, {
      contentType: ingested.image.contentType,
      upsert: false,
    });
  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { data: publicData } = storage.storage
    .from(MARKETING_BUCKET)
    .getPublicUrl(storagePath);

  const { data: asset, error: assetError } = await supabase
    .from("media_assets")
    .insert({
      storage_bucket: MARKETING_BUCKET,
      storage_path: storagePath,
      public_url: publicData.publicUrl,
      original_filename: ingested.originalName,
      content_type: ingested.image.contentType,
      byte_size: ingested.image.byteSize,
      width_px: ingested.image.width,
      height_px: ingested.image.height,
      alt_text: altText,
      caption,
      uploaded_by: actorId,
    })
    .select("id, public_url")
    .single();

  if (assetError || !asset) {
    await storage.storage.from(MARKETING_BUCKET).remove([storagePath]);
    return {
      ok: false,
      error: assetError?.message ?? "Could not save the photo.",
    };
  }

  await writeAuditEvent({
    action: "media.upload",
    entityType: "media_asset",
    entityId: asset.id,
    actorId,
    metadata: {
      ...auditMetadata,
      storage_path: storagePath,
      content_type: ingested.image.contentType,
      byte_size: ingested.image.byteSize,
      width_px: ingested.image.width,
      height_px: ingested.image.height,
      source_bytes: ingested.sourceBytes,
      crop_aspect: ingested.image.cropAspect,
    },
  });

  return {
    ok: true,
    id: asset.id,
    publicUrl: asset.public_url,
    altText,
  };
}

export type AssignableAsset = {
  id: string;
  publicUrl: string;
  altText: string | null;
  caption: string | null;
};

/**
 * Load a library photo that an operator asked to publish.
 * Archived photos are refused so removed images cannot return to the public site.
 */
export async function loadAssignableAsset(
  id: string,
): Promise<{ ok: true; asset: AssignableAsset } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media_assets")
    .select("id, public_url, alt_text, caption, archived_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data || data.archived_at) {
    return {
      ok: false,
      error: "That photo is no longer in the photo library. Choose another one.",
    };
  }

  return {
    ok: true,
    asset: {
      id: data.id,
      publicUrl: data.public_url,
      altText: data.alt_text,
      caption: data.caption,
    },
  };
}
