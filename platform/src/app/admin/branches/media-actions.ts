"use server";

import { requireStaffAction } from "@/lib/cms/require-staff";
import { writeAuditEvent } from "@/lib/cms/audit";
import { revalidatePublishedLocation } from "@/lib/cms/revalidate-public";
import { emptyToNull } from "@/lib/cms/ingest-marketing-image";
import {
  redirectWithError,
  redirectWithMessage,
  redirectWithParams,
} from "@/lib/cms/hub-flash";
import {
  loadAssignableAsset,
  stageMarketingAsset,
} from "@/lib/cms/stage-marketing-asset";
import { createClient } from "@/lib/supabase/server";
import { branchStagedFieldForPlacement } from "@/lib/hub/staged-photo";
import type { Database } from "@/lib/supabase/database.types";

type BranchMediaPlacement =
  Database["public"]["Enums"]["branch_media_placement"];

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

/**
 * Upload a branch photo into the photo library only.
 * The branch page keeps its current photos until the operator makes this one live.
 */
export async function stageBranchPhoto(formData: FormData) {
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

  const altText = emptyToNull(formData.get("alt_text"));
  if (!altText) {
    redirectWithError(
      `/admin/branches/${branchId}`,
      "Please describe the photo (alt text) so visitors understand the image.",
    );
  }

  const placement = parsePlacement(formData.get("placement"));
  const staged = await stageMarketingAsset({
    file,
    formData,
    altText,
    actorId: gate.actorId,
    auditMetadata: { branch_id: branchId, placement },
  });
  if (!staged.ok) {
    redirectWithError(`/admin/branches/${branchId}`, staged.error);
  }

  redirectWithParams(`/admin/branches/${branchId}`, {
    stagedField: branchStagedFieldForPlacement(placement),
    stagedMediaId: staged.id,
    message:
      "This photo is ready. Preview it, then make it live on the branch page.",
  });
}

/** Put a library photo on the branch page. Reached only from the explicit Make live step. */
export async function assignBranchPhoto(formData: FormData) {
  const branchId = emptyToNull(formData.get("branch_id"));
  if (!branchId) {
    redirectWithError("/admin/branches", "Missing branch.");
  }

  const gate = await assertCanManageBranch(branchId);
  if (!gate.ok) {
    redirectWithError(`/admin/branches/${branchId}`, gate.message);
  }

  const mediaAssetId = emptyToNull(formData.get("media_asset_id"));
  if (!mediaAssetId) {
    redirectWithError(`/admin/branches/${branchId}`, "Please choose a photo first.");
  }

  const loaded = await loadAssignableAsset(mediaAssetId);
  if (!loaded.ok) {
    redirectWithError(`/admin/branches/${branchId}`, loaded.error);
  }

  const placement = parsePlacement(formData.get("placement"));
  const supabase = await createClient();

  if (placement === "hero") {
    await supabase
      .from("branch_media")
      .update({ is_active: false, updated_by: gate.actorId })
      .eq("branch_id", branchId)
      .eq("placement", "hero")
      .eq("is_active", true);
  }

  const { data: link, error: linkError } = await supabase
    .from("branch_media")
    .insert({
      branch_id: branchId,
      media_asset_id: loaded.asset.id,
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
      linkError?.message ?? "Could not add this photo to the branch page.",
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
      media_asset_id: loaded.asset.id,
    },
  });

  const { data: branchRow } = await supabase
    .from("church_branches")
    .select("slug")
    .eq("id", branchId)
    .maybeSingle();
  revalidatePublishedLocation(branchRow?.slug);

  redirectWithMessage(
    `/admin/branches/${branchId}`,
    placement === "hero"
      ? "This photo is now the top photo on the branch page."
      : "This photo was added to the branch page.",
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
    "This photo was removed from the branch page. It is still in the photo library.",
  );
}
