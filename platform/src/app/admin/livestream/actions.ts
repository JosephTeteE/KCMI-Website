"use server";

import { requireStaffAction } from "@/lib/cms/require-staff";
import { writeAuditEvent } from "@/lib/cms/audit";
import { saveRevision } from "@/lib/cms/revisions";
import { extractFacebookUrlFromEmbed } from "@/lib/cms/facebook-url";
import { redirectWithError, redirectWithMessage } from "@/lib/cms/hub-flash";
import { createClient } from "@/lib/supabase/server";

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

export async function updateLivestreamSettings(formData: FormData) {
  const gate = await requireStaffAction("livestream.manage");
  if (!gate.ok) {
    redirectWithError("/admin/livestream", gate.message);
  }

  const input =
    emptyToNull(formData.get("facebook_input")) ??
    emptyToNull(formData.get("facebook_url")) ??
    "";
  const isLive = formData.get("is_live") === "on" || formData.get("is_live") === "true";

  let facebookUrl: string | null = null;
  if (input) {
    const extracted = extractFacebookUrlFromEmbed(input);
    if (!extracted.ok) {
      redirectWithError("/admin/livestream", extracted.error);
    }
    facebookUrl = extracted.url;
  }

  const actorId = gate.session.user.id;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("livestream_settings")
    .select("id, facebook_url, is_live")
    .eq("singleton_key", "default")
    .maybeSingle();

  let rowId: string;
  let saved: { id: string; facebook_url: string | null; is_live: boolean };

  if (existing) {
    const { data, error } = await supabase
      .from("livestream_settings")
      .update({
        facebook_url: facebookUrl,
        is_live: isLive,
        updated_by: actorId,
      })
      .eq("id", existing.id)
      .select("id, facebook_url, is_live")
      .single();

    if (error || !data) {
      redirectWithError(
        "/admin/livestream",
        error?.message ?? "Could not update livestream settings.",
      );
    }
    rowId = data.id;
    saved = data;
  } else {
    const { data, error } = await supabase
      .from("livestream_settings")
      .insert({
        singleton_key: "default",
        facebook_url: facebookUrl,
        is_live: isLive,
        updated_by: actorId,
      })
      .select("id, facebook_url, is_live")
      .single();

    if (error || !data) {
      redirectWithError(
        "/admin/livestream",
        error?.message ?? "Could not create livestream settings.",
      );
    }
    rowId = data.id;
    saved = data;
  }

  await writeAuditEvent({
    action: "livestream.update",
    entityType: "livestream_settings",
    entityId: rowId,
    actorId,
    metadata: {
      is_live: saved.is_live,
      facebook_url: saved.facebook_url,
      previous_is_live: existing?.is_live ?? null,
    },
  });

  await saveRevision({
    entityType: "livestream_settings",
    entityId: rowId,
    snapshot: {
      facebook_url: saved.facebook_url,
      is_live: saved.is_live,
      singleton_key: "default",
    },
    changedBy: actorId,
    changeSummary: "Updated livestream settings",
  });

  redirectWithMessage("/admin/livestream", "Livestream settings saved.");
}
