"use server";

import { requireStaffAction } from "@/lib/cms/require-staff";
import { writeAuditEvent } from "@/lib/cms/audit";
import { saveRevision } from "@/lib/cms/revisions";
import { parseFacebookLivestreamInput } from "@/lib/cms/facebook-url";
import { redirectWithError, redirectWithMessage } from "@/lib/cms/hub-flash";
import { zonedLocalToUtcIso } from "@/lib/events/datetime";
import { LIVESTREAM_AUTO_END_TIMEZONE } from "@/lib/livestream/effective-live";
import { createClient } from "@/lib/supabase/server";

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

/**
 * Parse optional auto-end from Hub form.
 * Date + 12-hour-converted HH:MM are Nigeria-local (Africa/Lagos) → UTC timestamptz.
 * Incomplete pairs stay null (never invent midnight).
 */
function parseAutoEndAt(formData: FormData): {
  ok: true;
  value: string | null;
} | { ok: false; error: string } {
  const date = emptyToNull(formData.get("auto_end_date"));
  const time = emptyToNull(formData.get("auto_end_time"));
  if (!date && !time) return { ok: true, value: null };
  if (!date || !time) {
    return {
      ok: false,
      error:
        "To auto-end the livestream, choose both a date and a time, or clear both.",
    };
  }
  const iso = zonedLocalToUtcIso(date, time, LIVESTREAM_AUTO_END_TIMEZONE);
  if (!iso) {
    return {
      ok: false,
      error: "That automatic end date or time could not be read. Please check it.",
    };
  }
  return { ok: true, value: iso };
}

export async function updateLivestreamSettings(formData: FormData) {
  const gate = await requireStaffAction("livestream.manage");
  if (!gate.ok) {
    redirectWithError("/admin/livestream", gate.message);
  }

  const wantLive =
    formData.get("is_live") === "on" || formData.get("is_live") === "true";
  const pasted =
    emptyToNull(formData.get("facebook_input")) ??
    emptyToNull(formData.get("facebook_embed")) ??
    emptyToNull(formData.get("facebook_url"));
  const existing = emptyToNull(formData.get("existing_facebook_url"));

  let facebookUrl: string | null = existing;

  if (pasted) {
    const extracted = parseFacebookLivestreamInput(pasted);
    if (!extracted.ok) {
      redirectWithError("/admin/livestream", extracted.error);
    }
    facebookUrl = extracted.url;
  }

  if (wantLive && !facebookUrl) {
    redirectWithError(
      "/admin/livestream",
      "Paste the Facebook embed code first, then click Check and Preview.",
    );
  }

  let autoEndAt: string | null = null;
  if (wantLive) {
    const parsedEnd = parseAutoEndAt(formData);
    if (!parsedEnd.ok) {
      redirectWithError("/admin/livestream", parsedEnd.error);
    }
    autoEndAt = parsedEnd.value;
  }

  const actorId = gate.session.user.id;
  const supabase = await createClient();

  const { data: existingRow } = await supabase
    .from("livestream_settings")
    .select("id, facebook_url, is_live, auto_end_at")
    .eq("singleton_key", "default")
    .maybeSingle();

  let rowId: string;
  let saved: {
    id: string;
    facebook_url: string | null;
    is_live: boolean;
    auto_end_at: string | null;
  };

  const patch = {
    facebook_url: facebookUrl,
    is_live: wantLive,
    auto_end_at: wantLive ? autoEndAt : null,
    updated_by: actorId,
  };

  if (existingRow) {
    const { data, error } = await supabase
      .from("livestream_settings")
      .update(patch)
      .eq("id", existingRow.id)
      .select("id, facebook_url, is_live, auto_end_at")
      .single();

    if (error || !data) {
      redirectWithError(
        "/admin/livestream",
        "We couldn't save the livestream. Please try again.",
      );
    }
    rowId = data.id;
    saved = data;
  } else {
    const { data, error } = await supabase
      .from("livestream_settings")
      .insert({
        singleton_key: "default",
        ...patch,
      })
      .select("id, facebook_url, is_live, auto_end_at")
      .single();

    if (error || !data) {
      redirectWithError(
        "/admin/livestream",
        "We couldn't save the livestream. Please try again.",
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
      auto_end_at: saved.auto_end_at,
      facebook_url: saved.facebook_url,
      previous_is_live: existingRow?.is_live ?? null,
    },
  });

  await saveRevision({
    entityType: "livestream_settings",
    entityId: rowId,
    snapshot: {
      facebook_url: saved.facebook_url,
      is_live: saved.is_live,
      auto_end_at: saved.auto_end_at,
      singleton_key: "default",
    },
    changedBy: actorId,
    changeSummary: wantLive ? "Livestream made live" : "Livestream turned off",
  });

  redirectWithMessage(
    "/admin/livestream",
    saved.is_live
      ? saved.auto_end_at
        ? "The website is now showing the livestream. It will show offline automatically after the end time you set."
        : "The website is now showing the livestream."
      : "The livestream is off. Visitors will see the not-live message.",
  );
}
