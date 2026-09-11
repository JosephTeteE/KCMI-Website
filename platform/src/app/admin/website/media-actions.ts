"use server";

import { requireStaffAction } from "@/lib/cms/require-staff";
import { writeAuditEvent } from "@/lib/cms/audit";
import { saveRevision } from "@/lib/cms/revisions";
import { emptyToNull } from "@/lib/cms/ingest-marketing-image";
import {
  loadAssignableAsset,
  stageMarketingAsset,
} from "@/lib/cms/stage-marketing-asset";
import {
  redirectWithError,
  redirectWithMessage,
  redirectWithParams,
} from "@/lib/cms/hub-flash";
import { createClient } from "@/lib/supabase/server";
import {
  WEBSITE_DOCUMENT_IDS,
  type WebsiteDocumentKey,
} from "@/content/website/keys";
import { resolveAboutDocument, resolveHomeDocument } from "@/content/website/resolve";
import type { Json } from "@/lib/supabase/database.types";

const CONTEXT_MEDIA_FIELDS: Record<string, Extract<WebsiteDocumentKey, "home" | "about">> = {
  heroMediaId: "home",
  welcomeMediaId: "home",
  portraitMediaId: "about",
};

type ContextTarget = {
  key: Extract<WebsiteDocumentKey, "home" | "about">;
  field: string;
  hubPath: string;
};

function contextTarget(formData: FormData): ContextTarget | null {
  const key = emptyToNull(formData.get("document_key"));
  const field = emptyToNull(formData.get("media_field"));
  if (!key || !field) return null;
  const expectedKey = CONTEXT_MEDIA_FIELDS[field];
  if (!expectedKey || expectedKey !== key) return null;
  return {
    key: expectedKey,
    field,
    hubPath:
      expectedKey === "home" ? "/admin/website/home" : "/admin/website/about",
  };
}

/**
 * Upload a website photo into the photo library only.
 * The public page is untouched until the operator previews and makes the photo live.
 */
export async function stageWebsiteContextImage(formData: FormData) {
  const target = contextTarget(formData);
  if (!target) {
    redirectWithError("/admin/website", "Missing image context.");
  }

  const gate = await requireStaffAction("website.manage");
  if (!gate.ok) {
    redirectWithError(target.hubPath, gate.message);
  }
  const mediaGate = await requireStaffAction("media.manage");
  if (!mediaGate.ok) {
    redirectWithError(target.hubPath, mediaGate.message);
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirectWithError(target.hubPath, "Please choose an image to upload.");
  }

  const altText = emptyToNull(formData.get("alt_text"));
  if (!altText) {
    redirectWithError(
      target.hubPath,
      "Please describe what is important in this photo for someone who cannot see it.",
    );
  }

  const staged = await stageMarketingAsset({
    file,
    formData,
    altText,
    actorId: gate.session.user.id,
    auditMetadata: { document_key: target.key, media_field: target.field },
  });
  if (!staged.ok) {
    redirectWithError(target.hubPath, staged.error);
  }

  redirectWithParams(target.hubPath, {
    stagedField: target.field,
    stagedMediaId: staged.id,
    message:
      "This photo is ready. Preview it, then make it live when it looks right.",
  });
}

/**
 * Publish a library photo into a website document field.
 * Only reached from the explicit Make live step in the contextual photo editor.
 */
export async function assignWebsiteContextImage(formData: FormData) {
  const target = contextTarget(formData);
  if (!target) {
    redirectWithError("/admin/website", "Missing image context.");
  }

  const gate = await requireStaffAction("website.manage");
  if (!gate.ok) {
    redirectWithError(target.hubPath, gate.message);
  }

  const mediaAssetId = emptyToNull(formData.get("media_asset_id"));
  if (!mediaAssetId) {
    redirectWithError(target.hubPath, "Please choose a photo first.");
  }

  const loaded = await loadAssignableAsset(mediaAssetId);
  if (!loaded.ok) {
    redirectWithError(target.hubPath, loaded.error);
  }

  const supabase = await createClient();
  const id = WEBSITE_DOCUMENT_IDS[target.key];
  const { data: current } = await supabase
    .from("website_documents")
    .select("payload")
    .eq("id", id)
    .maybeSingle();

  const payload =
    target.key === "home"
      ? {
          ...resolveHomeDocument(current?.payload ?? {}),
          [target.field]: loaded.asset.id,
        }
      : (() => {
          const about = resolveAboutDocument(current?.payload ?? {});
          return {
            ...about,
            portraitMediaId: loaded.asset.id,
            portraitAlt: loaded.asset.altText ?? about.portraitAlt,
          };
        })();

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
    redirectWithError(target.hubPath, updateError.message);
  }

  await writeAuditEvent({
    action: "website_document.replace_image",
    entityType: "website_document",
    entityId: id,
    actorId: gate.session.user.id,
    metadata: {
      document_key: target.key,
      media_field: target.field,
      media_asset_id: loaded.asset.id,
    },
  });

  await saveRevision({
    entityType: "website_document",
    entityId: id,
    snapshot: payload as Record<string, unknown>,
    changedBy: gate.session.user.id,
    changeSummary: `Replaced ${target.field}`,
  });

  redirectWithMessage(target.hubPath, "The new photo is now on the website.");
}
