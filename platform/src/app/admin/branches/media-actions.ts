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
import type { Database } from "@/lib/supabase/database.types";

type BranchMediaPlacement =
  Database["public"]["Enums"]["branch_media_placement"];

const BUCKET = "marketing-public";
const PLACEMENTS = new Set<BranchMediaPlacement>([
  "hero",
  "gallery",
  "featured",
  "announcement",
  "general",
]);

function parsePlacement(value: FormDataEntryValue | null): BranchMediaPlacement {
  const raw = typeof value === "string" ? value : "general";
  return PLACEMENTS.has(raw as BranchMediaPlacement)
    ? (raw as BranchMediaPlacement)
    : "general";
}

async function assertCanManageBranch(branchId: string): Promise<
  | { ok: true; actorId: string }
  | { ok: false; message: string }
> {
  const asBranch = await requireStaffAction("branches.manage");
  const asMedia = await requireStaffAction("media.manage");
  if (!asBranch.ok && !asMedia.ok) {
    return {
      ok: false,
      message: asBranch.message || asMedia.message,
    };
  }
  const session = asBranch.ok
    ? asBranch.session
    : asMedia.ok
      ? asMedia.session
      : null;
  if (!session) {
    return { ok: false, message: "You must be signed in with an active Hub account." };
  }
  const supabase = await createClient();

  if (asMedia.ok) {
    return { ok: true, actorId: session.user.id };
  }

  const { data, error } = await supabase.rpc("can_manage_branch", {
    p_branch_id: branchId,
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  if (!data) {
    return {
      ok: false,
      message: "You can only manage photos for your assigned branch.",
    };
  }
  return { ok: true, actorId: session.user.id };
}

export async function uploadBranchPhoto(formData: FormData) {
  const branchId = emptyToNull(formData.get("branch_id"));
  if (!branchId) {
    redirectWithError("/admin/branches", "Missing branch.");
  }

  const gate = await assertCanManageBranch(branchId);
  if (!gate.ok) {
    redirectWithError(`/admin/branches/${branchId}`, gate.message);
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirectWithError(
      `/admin/branches/${branchId}`,
      "Please choose an image to add.",
    );
  }

  const ingested = await ingestMarketingImageFile(file, formData);
  if (!ingested.ok) {
    redirectWithError(`/admin/branches/${branchId}`, ingested.error);
  }

  const altText = emptyToNull(formData.get("alt_text"));
  if (!altText) {
    redirectWithError(
      `/admin/branches/${branchId}`,
      "Please describe the photo (alt text) so visitors understand the image.",
    );
  }

  const placement = parsePlacement(formData.get("placement"));
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
    redirectWithError(`/admin/branches/${branchId}`, uploadError.message);
  }

  const { data: publicData } = storage.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const { data: asset, error: assetError } = await supabase
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
      uploaded_by: gate.actorId,
    })
    .select("id")
    .single();

  if (assetError || !asset) {
    await storage.storage.from(BUCKET).remove([storagePath]);
    redirectWithError(
      `/admin/branches/${branchId}`,
      assetError?.message ?? "Could not save the photo.",
    );
  }

  const { data: link, error: linkError } = await supabase
    .from("branch_media")
    .insert({
      branch_id: branchId,
      media_asset_id: asset.id,
      placement,
      status: "published",
      is_active: true,
      created_by: gate.actorId,
      updated_by: gate.actorId,
      alt_text_override: null,
    })
    .select("id")
    .single();

  if (linkError || !link) {
    redirectWithError(
      `/admin/branches/${branchId}`,
      linkError?.message ?? "Photo uploaded but could not attach to this branch.",
    );
  }

  await writeAuditEvent({
    action: "branch_media.attach",
    entityType: "branch_media",
    entityId: link.id,
    actorId: gate.actorId,
    metadata: {
      branch_id: branchId,
      placement,
      media_asset_id: asset.id,
      crop_aspect: ingested.image.cropAspect,
      width_px: ingested.image.width,
      height_px: ingested.image.height,
    },
  });

  redirectWithMessage(
    `/admin/branches/${branchId}`,
    "Photo added to this branch.",
  );
}

export async function removeBranchPhoto(formData: FormData) {
  const branchId = emptyToNull(formData.get("branch_id"));
  const linkId = emptyToNull(formData.get("branch_media_id"));
  if (!branchId || !linkId) {
    redirectWithError("/admin/branches", "Missing branch photo.");
  }

  const gate = await assertCanManageBranch(branchId);
  if (!gate.ok) {
    redirectWithError(`/admin/branches/${branchId}`, gate.message);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("branch_media")
    .delete()
    .eq("id", linkId)
    .eq("branch_id", branchId);

  if (error) {
    redirectWithError(`/admin/branches/${branchId}`, error.message);
  }

  await writeAuditEvent({
    action: "branch_media.unlink",
    entityType: "branch_media",
    entityId: linkId,
    actorId: gate.actorId,
    metadata: { branch_id: branchId },
  });

  redirectWithMessage(
    `/admin/branches/${branchId}`,
    "Photo removed from this branch. The shared library file was not deleted.",
  );
}
