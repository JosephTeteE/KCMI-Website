"use server";

import { requireStaffAction } from "@/lib/cms/require-staff";
import { writeAuditEvent } from "@/lib/cms/audit";
import { saveRevision } from "@/lib/cms/revisions";
import {
  emptyToNull,
  ingestMarketingImageFile,
} from "@/lib/cms/ingest-marketing-image";
import { redirectWithError, redirectWithMessage } from "@/lib/cms/hub-flash";
import { createClient } from "@/lib/supabase/server";
import { createSecretKeyClient } from "@/lib/supabase/admin";
import {
  WEBSITE_DOCUMENT_IDS,
  type WebsiteDocumentKey,
} from "@/content/website/keys";
import { resolveAboutDocument, resolveHomeDocument } from "@/content/website/resolve";
import type { Json } from "@/lib/supabase/database.types";

const BUCKET = "marketing-public";

const MEDIA_FIELDS = new Set(["heroMediaId", "welcomeMediaId", "portraitMediaId"]);

export async function uploadWebsiteContextImage(formData: FormData) {
  const key = emptyToNull(formData.get("document_key")) as WebsiteDocumentKey | null;
  const field = emptyToNull(formData.get("media_field"));
  if (!key || !field || !MEDIA_FIELDS.has(field)) {
    redirectWithError("/admin/website", "Missing image context.");
  }

  const hubPath =
    key === "home" ? "/admin/website/home" : "/admin/website/about";

  const gate = await requireStaffAction("website.manage");
  if (!gate.ok) {
    redirectWithError(hubPath, gate.message);
  }
  const mediaGate = await requireStaffAction("media.manage");
  if (!mediaGate.ok) {
    redirectWithError(hubPath, mediaGate.message);
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirectWithError(hubPath, "Please choose an image to upload.");
  }

  const ingested = await ingestMarketingImageFile(file, formData);
  if (!ingested.ok) {
    redirectWithError(hubPath, ingested.error);
  }

  const altText = emptyToNull(formData.get("alt_text"));
  if (!altText) {
    redirectWithError(
      hubPath,
      "Please describe what is important in this photo for someone who cannot see it.",
    );
  }

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
    redirectWithError(hubPath, uploadError.message);
  }

  const { data: publicData } = storage.storage.from(BUCKET).getPublicUrl(storagePath);
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
      uploaded_by: gate.session.user.id,
    })
    .select("id")
    .single();

  if (assetError || !asset) {
    await storage.storage.from(BUCKET).remove([storagePath]);
    redirectWithError(hubPath, assetError?.message ?? "Could not save the image.");
  }

  const id = WEBSITE_DOCUMENT_IDS[key];
  const { data: current } = await supabase
    .from("website_documents")
    .select("payload")
    .eq("id", id)
    .maybeSingle();

  const payload =
    key === "home"
      ? { ...resolveHomeDocument(current?.payload ?? {}), [field]: asset.id }
      : {
          ...resolveAboutDocument(current?.payload ?? {}),
          portraitMediaId: asset.id,
          portraitAlt: altText,
        };

  const { error: updateError } = await supabase
    .from("website_documents")
    .update({
      payload: payload as unknown as Json,
      status: "published",
      updated_by: gate.session.user.id,
      published_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    redirectWithError(hubPath, updateError.message);
  }

  await writeAuditEvent({
    action: "website_document.replace_image",
    entityType: "website_document",
    entityId: id,
    actorId: gate.session.user.id,
    metadata: { document_key: key, media_field: field, media_asset_id: asset.id },
  });

  await saveRevision({
    entityType: "website_document",
    entityId: id,
    snapshot: payload as Record<string, unknown>,
    changedBy: gate.session.user.id,
    changeSummary: `Replaced ${field}`,
  });

  redirectWithMessage(hubPath, "The new photo is now on the website.");
}
