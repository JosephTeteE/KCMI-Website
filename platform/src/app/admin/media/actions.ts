"use server";

import { requireStaffAction } from "@/lib/cms/require-staff";
import { writeAuditEvent } from "@/lib/cms/audit";
import {
  emptyToNull,
  ingestMarketingImageFile,
} from "@/lib/cms/ingest-marketing-image";
import { redirectWithError, redirectWithMessage } from "@/lib/cms/hub-flash";
import { createClient } from "@/lib/supabase/server";
import { createSecretKeyClient } from "@/lib/supabase/admin";

const BUCKET = "marketing-public";

export type MarketingImagePreview =
  | {
      ok: true;
      previewDataUrl: string;
      sourceWidth: number;
      sourceHeight: number;
      sourceBytes: number;
      width: number;
      height: number;
      byteSize: number;
      cropAspect: string;
    }
  | { ok: false; error: string };

export async function prepareMarketingImagePreview(
  formData: FormData,
): Promise<MarketingImagePreview> {
  const gate = await requireStaffAction("media.manage");
  if (!gate.ok) {
    const asBranch = await requireStaffAction("branches.manage");
    if (!asBranch.ok) {
      return { ok: false, error: gate.message };
    }
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose an image file to prepare." };
  }

  const ingested = await ingestMarketingImageFile(file, formData);
  if (!ingested.ok) {
    return { ok: false, error: ingested.error };
  }

  const previewDataUrl = `data:${ingested.image.contentType};base64,${ingested.image.buffer.toString("base64")}`;
  return {
    ok: true,
    previewDataUrl,
    sourceWidth: ingested.image.sourceWidth,
    sourceHeight: ingested.image.sourceHeight,
    sourceBytes: ingested.sourceBytes,
    width: ingested.image.width,
    height: ingested.image.height,
    byteSize: ingested.image.byteSize,
    cropAspect: ingested.image.cropAspect,
  };
}

export async function uploadMarketingImage(formData: FormData) {
  const gate = await requireStaffAction("media.manage");
  if (!gate.ok) {
    redirectWithError("/admin/media", gate.message);
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirectWithError("/admin/media", "Please choose an image file to upload.");
  }

  const ingested = await ingestMarketingImageFile(file, formData);
  if (!ingested.ok) {
    redirectWithError("/admin/media", ingested.error);
  }

  const altText = emptyToNull(formData.get("alt_text"));
  if (!altText) {
    redirectWithError(
      "/admin/media",
      "Please describe what is important in this photo for someone who cannot see it.",
    );
  }

  const caption = emptyToNull(formData.get("caption"));
  const actorId = gate.session.user.id;
  const storagePath = `${crypto.randomUUID()}.webp`;

  const supabase = await createClient();
  const storage = createSecretKeyClient();
  const { error: uploadError } = await storage.storage
    .from(BUCKET)
    .upload(storagePath, ingested.image.buffer, {
      contentType: ingested.image.contentType,
      upsert: false,
    });

  if (uploadError) {
    redirectWithError("/admin/media", uploadError.message);
  }

  const { data: publicData } = storage.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const { data: asset, error: insertError } = await supabase
    .from("media_assets")
    .insert({
      storage_bucket: BUCKET,
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
    .select("id")
    .single();

  if (insertError || !asset) {
    await storage.storage.from(BUCKET).remove([storagePath]);
    redirectWithError(
      "/admin/media",
      insertError?.message ?? "Could not save media record.",
    );
  }

  await writeAuditEvent({
    action: "media.upload",
    entityType: "media_asset",
    entityId: asset.id,
    actorId,
    metadata: {
      storage_path: storagePath,
      content_type: ingested.image.contentType,
      byte_size: ingested.image.byteSize,
      width_px: ingested.image.width,
      height_px: ingested.image.height,
      source_bytes: ingested.sourceBytes,
      crop_aspect: ingested.image.cropAspect,
    },
  });

  redirectWithMessage("/admin/media", "The photo is ready to use on the website.");
}

export async function archiveMedia(formData: FormData) {
  const id = emptyToNull(formData.get("id"));
  if (!id) {
    redirectWithError("/admin/media", "Missing media id.");
  }

  const gate = await requireStaffAction("media.manage");
  if (!gate.ok) {
    redirectWithError("/admin/media", gate.message);
  }

  const actorId = gate.session.user.id;
  const supabase = await createClient();

  const { data: publishedPrograms, error: programsError } = await supabase
    .from("programs")
    .select("id")
    .eq("featured_media_id", id)
    .eq("status", "published")
    .limit(1);

  if (programsError) {
    redirectWithError("/admin/media", programsError.message);
  }
  if (publishedPrograms && publishedPrograms.length > 0) {
    redirectWithError(
      "/admin/media",
      "This image is used by a published program and cannot be archived yet.",
    );
  }

  const { data: publishedSermons, error: sermonsError } = await supabase
    .from("sermons")
    .select("id")
    .eq("thumbnail_media_id", id)
    .eq("status", "published")
    .limit(1);

  if (sermonsError) {
    redirectWithError("/admin/media", sermonsError.message);
  }
  if (publishedSermons && publishedSermons.length > 0) {
    redirectWithError(
      "/admin/media",
      "This image is used by a published sermon and cannot be archived yet.",
    );
  }

  const { data: activeBranchMedia, error: branchMediaError } = await supabase
    .from("branch_media")
    .select("id")
    .eq("media_asset_id", id)
    .eq("is_active", true)
    .eq("status", "published")
    .limit(1);

  if (branchMediaError) {
    redirectWithError("/admin/media", branchMediaError.message);
  }
  if (activeBranchMedia && activeBranchMedia.length > 0) {
    redirectWithError(
      "/admin/media",
      "This image is used on a published branch page. Remove it from the branch first, then archive.",
    );
  }

  const { error } = await supabase
    .from("media_assets")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .is("archived_at", null);

  if (error) {
    redirectWithError("/admin/media", error.message);
  }

  await writeAuditEvent({
    action: "media.archive",
    entityType: "media_asset",
    entityId: id,
    actorId,
  });

  redirectWithMessage("/admin/media", "This photo was removed from the library.");
}
