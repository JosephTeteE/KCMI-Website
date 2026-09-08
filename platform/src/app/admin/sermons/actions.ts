"use server";

import { requireStaffAction } from "@/lib/cms/require-staff";
import { writeAuditEvent } from "@/lib/cms/audit";
import { saveRevision } from "@/lib/cms/revisions";
import { validateYoutubeUrl } from "@/lib/cms/youtube-url";
import { redirectWithError, redirectWithMessage } from "@/lib/cms/hub-flash";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type PublicationStatus = Database["public"]["Enums"]["publication_status"];

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

function sermonSnapshot(row: {
  id: string;
  title: string;
  speaker: string | null;
  sermon_date: string | null;
  scripture_reference: string | null;
  summary: string | null;
  youtube_url: string | null;
  thumbnail_media_id: string | null;
  status: PublicationStatus;
  published_at: string | null;
  archived_at: string | null;
}) {
  return {
    id: row.id,
    title: row.title,
    speaker: row.speaker,
    sermon_date: row.sermon_date,
    scripture_reference: row.scripture_reference,
    summary: row.summary,
    youtube_url: row.youtube_url,
    thumbnail_media_id: row.thumbnail_media_id,
    status: row.status,
    published_at: row.published_at,
    archived_at: row.archived_at,
  };
}

function parseSermonFields(formData: FormData) {
  const title = emptyToNull(formData.get("title"));
  if (!title) {
    return { ok: false as const, error: "Title is required." };
  }

  const youtubeRaw = emptyToNull(formData.get("youtube_url"));
  let youtubeUrl: string | null = null;
  if (youtubeRaw) {
    const yt = validateYoutubeUrl(youtubeRaw);
    if (!yt.ok) {
      return { ok: false as const, error: yt.error };
    }
    youtubeUrl = yt.url;
  }

  const sermonDate = emptyToNull(formData.get("sermon_date"));

  return {
    ok: true as const,
    fields: {
      title,
      speaker: emptyToNull(formData.get("speaker")),
      sermon_date: sermonDate,
      scripture_reference: emptyToNull(formData.get("scripture_reference")),
      summary: emptyToNull(formData.get("summary")),
      youtube_url: youtubeUrl,
      thumbnail_media_id: emptyToNull(formData.get("thumbnail_media_id")),
    },
  };
}

export async function createSermon(formData: FormData) {
  const gate = await requireStaffAction("sermons.manage");
  if (!gate.ok) {
    redirectWithError("/admin/sermons/new", gate.message);
  }

  const parsed = parseSermonFields(formData);
  if (!parsed.ok) {
    redirectWithError("/admin/sermons/new", parsed.error);
  }

  const actorId = gate.session.user.id;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sermons")
    .insert({
      ...parsed.fields,
      status: "draft",
      created_by: actorId,
      updated_by: actorId,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirectWithError(
      "/admin/sermons/new",
      error?.message ?? "Could not create sermon.",
    );
  }

  redirectWithMessage(`/admin/sermons/${data.id}`, "Draft sermon created.");
}

export async function updateSermon(formData: FormData) {
  const id = emptyToNull(formData.get("id"));
  if (!id) {
    redirectWithError("/admin/sermons", "Missing sermon id.");
  }

  const gate = await requireStaffAction("sermons.manage");
  if (!gate.ok) {
    redirectWithError(`/admin/sermons/${id}`, gate.message);
  }

  const parsed = parseSermonFields(formData);
  if (!parsed.ok) {
    redirectWithError(`/admin/sermons/${id}`, parsed.error);
  }

  const actorId = gate.session.user.id;
  const supabase = await createClient();

  const { error } = await supabase
    .from("sermons")
    .update({
      ...parsed.fields,
      updated_by: actorId,
    })
    .eq("id", id);

  if (error) {
    redirectWithError(`/admin/sermons/${id}`, error.message);
  }

  redirectWithMessage(`/admin/sermons/${id}`, "Sermon saved.");
}

export async function setSermonStatus(formData: FormData) {
  const id = emptyToNull(formData.get("id"));
  const statusRaw = emptyToNull(formData.get("status"));
  if (!id || !statusRaw) {
    redirectWithError("/admin/sermons", "Missing sermon or status.");
  }

  const allowed: PublicationStatus[] = [
    "draft",
    "preview",
    "published",
    "archived",
  ];
  if (!allowed.includes(statusRaw as PublicationStatus)) {
    redirectWithError(`/admin/sermons/${id}`, "Invalid status.");
  }
  const status = statusRaw as PublicationStatus;

  const gate = await requireStaffAction("sermons.manage");
  if (!gate.ok) {
    redirectWithError(`/admin/sermons/${id}`, gate.message);
  }

  const actorId = gate.session.user.id;
  const supabase = await createClient();

  const { data: existing, error: loadError } = await supabase
    .from("sermons")
    .select(
      "id, title, speaker, sermon_date, scripture_reference, summary, youtube_url, thumbnail_media_id, status, published_at, archived_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    redirectWithError(
      `/admin/sermons/${id}`,
      loadError?.message ?? "Sermon not found.",
    );
  }

  const now = new Date().toISOString();
  const patch: Database["public"]["Tables"]["sermons"]["Update"] = {
    status,
    updated_by: actorId,
  };

  if (status === "published") {
    patch.published_by = actorId;
    patch.published_at = now;
    patch.archived_at = null;
  } else if (status === "archived") {
    patch.archived_at = now;
  } else {
    patch.archived_at = null;
  }

  const { data: updated, error } = await supabase
    .from("sermons")
    .update(patch)
    .eq("id", id)
    .select(
      "id, title, speaker, sermon_date, scripture_reference, summary, youtube_url, thumbnail_media_id, status, published_at, archived_at",
    )
    .single();

  if (error || !updated) {
    redirectWithError(
      `/admin/sermons/${id}`,
      error?.message ?? "Could not update status.",
    );
  }

  if (status === "published" || status === "archived") {
    await writeAuditEvent({
      action: status === "published" ? "sermon.publish" : "sermon.archive",
      entityType: "sermon",
      entityId: id,
      actorId,
      metadata: { from: existing.status, to: status },
    });
    await saveRevision({
      entityType: "sermon",
      entityId: id,
      snapshot: sermonSnapshot(updated),
      changedBy: actorId,
      changeSummary: `Status set to ${status}`,
    });
  }

  redirectWithMessage(
    `/admin/sermons/${id}`,
    status === "published"
      ? "Sermon published."
      : status === "archived"
        ? "Sermon archived."
        : status === "preview"
          ? "Marked ready for preview."
          : "Saved as draft.",
  );
}
