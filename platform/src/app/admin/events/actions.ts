"use server";

import { requireStaffAction } from "@/lib/cms/require-staff";
import { writeAuditEvent } from "@/lib/cms/audit";
import { saveRevision } from "@/lib/cms/revisions";
import {
  redirectWithError,
  redirectWithMessage,
} from "@/lib/cms/hub-flash";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { parseEventFields } from "@/lib/events/parse-fields";
import {
  shouldRegenerateEventSlug,
  uniqueEventSlug,
} from "@/lib/events/slug";

type PublicationStatus = Database["public"]["Enums"]["publication_status"];

const NEW_EVENT_PATH = "/admin/events/new";

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

function eventSnapshot(row: {
  id: string;
  slug: string;
  title: string;
  theme: string | null;
  summary: string;
  body_text: string;
  event_kind: string;
  status: PublicationStatus;
  featured_media_id: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  venue_label: string | null;
  venue_city: string | null;
  venue_country: string | null;
  location_branch_id: string | null;
  contact_email: string | null;
  contact_phone_display: string | null;
  published_at: string | null;
  registration_enabled?: boolean;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
  capacity?: number | null;
}) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    theme: row.theme,
    summary: row.summary,
    body_text: row.body_text,
    event_kind: row.event_kind,
    status: row.status,
    featured_media_id: row.featured_media_id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    timezone: row.timezone,
    venue_label: row.venue_label,
    venue_city: row.venue_city,
    venue_country: row.venue_country,
    location_branch_id: row.location_branch_id,
    contact_email: row.contact_email,
    contact_phone_display: row.contact_phone_display,
    published_at: row.published_at,
    registration_enabled: row.registration_enabled ?? false,
    registration_opens_at: row.registration_opens_at ?? null,
    registration_closes_at: row.registration_closes_at ?? null,
    capacity: row.capacity ?? null,
  };
}

const EVENT_SELECT_FULL =
  "id, slug, title, theme, summary, body_text, event_kind, status, featured_media_id, starts_at, ends_at, timezone, venue_label, venue_city, venue_country, location_branch_id, contact_email, contact_phone_display, published_at, registration_enabled, registration_opens_at, registration_closes_at, capacity";

function registrationAuditDiff(
  before: {
    registration_enabled: boolean;
    registration_opens_at: string | null;
    registration_closes_at: string | null;
    capacity: number | null;
  },
  after: {
    registration_enabled: boolean;
    registration_opens_at: string | null;
    registration_closes_at: string | null;
    capacity: number | null;
  },
) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if (before.registration_enabled !== after.registration_enabled) {
    changes.registration_enabled = {
      from: before.registration_enabled,
      to: after.registration_enabled,
    };
  }
  if (before.registration_opens_at !== after.registration_opens_at) {
    changes.registration_opens_at = {
      from: before.registration_opens_at,
      to: after.registration_opens_at,
    };
  }
  if (before.registration_closes_at !== after.registration_closes_at) {
    changes.registration_closes_at = {
      from: before.registration_closes_at,
      to: after.registration_closes_at,
    };
  }
  if (before.capacity !== after.capacity) {
    changes.capacity = { from: before.capacity, to: after.capacity };
  }
  return Object.keys(changes).length ? changes : null;
}

async function ingestEventPhotoFromForm(
  formData: FormData,
  actorId: string,
): Promise<
  | { ok: true; mediaId: string | null }
  | { ok: false; error: string }
> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: true, mediaId: null };
  }

  const { ingestMarketingImageFile } = await import(
    "@/lib/cms/ingest-marketing-image"
  );
  const { createSecretKeyClient } = await import("@/lib/supabase/admin");

  const ingested = await ingestMarketingImageFile(file, formData);
  if (!ingested.ok) {
    return { ok: false, error: ingested.error };
  }

  const altText = emptyToNull(formData.get("alt_text"));
  if (!altText) {
    return {
      ok: false,
      error:
        "Please describe what is important in this photo for someone who cannot see it.",
    };
  }

  const storagePath = `${crypto.randomUUID()}.webp`;
  const supabase = await createClient();
  const storage = createSecretKeyClient();
  const { error: uploadError } = await storage.storage
    .from("marketing-public")
    .upload(storagePath, ingested.image.buffer, {
      contentType: ingested.image.contentType,
      upsert: false,
    });
  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { data: publicData } = storage.storage
    .from("marketing-public")
    .getPublicUrl(storagePath);

  const { data: asset, error: assetError } = await supabase
    .from("media_assets")
    .insert({
      storage_bucket: "marketing-public",
      storage_path: storagePath,
      public_url: publicData.publicUrl,
      original_filename: ingested.originalName,
      content_type: ingested.image.contentType,
      byte_size: ingested.image.byteSize,
      width_px: ingested.image.width,
      height_px: ingested.image.height,
      alt_text: altText,
      uploaded_by: actorId,
    })
    .select("id")
    .single();

  if (assetError || !asset) {
    await storage.storage.from("marketing-public").remove([storagePath]);
    return {
      ok: false,
      error: assetError?.message ?? "Could not save the event photo.",
    };
  }

  return { ok: true, mediaId: asset.id };
}

async function assertBranchOk(
  supabase: Awaited<ReturnType<typeof createClient>>,
  branchId: string | null,
  redirectPath: string,
) {
  if (!branchId) return;
  const { data: branch } = await supabase
    .from("church_branches")
    .select("id, status")
    .eq("id", branchId)
    .maybeSingle();
  if (!branch || branch.status !== "published") {
    redirectWithError(
      redirectPath,
      "That branch is not available. Choose a published branch, or leave it blank.",
    );
  }
}

export async function createEvent(formData: FormData) {
  const gate = await requireStaffAction("events.manage");
  if (!gate.ok) {
    redirectWithError(NEW_EVENT_PATH, gate.message);
  }

  const parsed = parseEventFields(formData);
  if (!parsed.ok) {
    redirectWithError(NEW_EVENT_PATH, parsed.error);
  }

  const actorId = gate.session.user.id;
  const supabase = await createClient();
  await assertBranchOk(
    supabase,
    parsed.fields.location_branch_id,
    NEW_EVENT_PATH,
  );

  const poster = await ingestEventPhotoFromForm(formData, actorId);
  if (!poster.ok) {
    redirectWithError(NEW_EVENT_PATH, poster.error);
  }

  const featuredMediaId = poster.mediaId ?? parsed.fields.featured_media_id;
  const slug = await uniqueEventSlug(parsed.fields.title);

  const { data, error } = await supabase
    .from("events")
    .insert({
      slug,
      title: parsed.fields.title,
      theme: parsed.fields.theme,
      summary: parsed.fields.summary,
      body_text: parsed.fields.body_text,
      event_kind: parsed.fields.event_kind,
      status: "draft",
      featured_media_id: featuredMediaId,
      starts_at: parsed.fields.starts_at,
      ends_at: parsed.fields.ends_at,
      timezone: parsed.fields.timezone,
      venue_label: parsed.fields.venue_label,
      venue_city: parsed.fields.venue_city,
      venue_country: parsed.fields.venue_country,
      location_branch_id: parsed.fields.location_branch_id,
      contact_email: parsed.fields.contact_email,
      contact_phone_display: parsed.fields.contact_phone_display,
      registration_enabled: parsed.fields.registration_enabled,
      registration_opens_at: parsed.fields.registration_opens_at,
      registration_closes_at: parsed.fields.registration_closes_at,
      capacity: parsed.fields.capacity,
      created_by: actorId,
      updated_by: actorId,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirectWithError(
      NEW_EVENT_PATH,
      error?.message ?? "Could not create this event draft.",
    );
  }

  await writeAuditEvent({
    actorId,
    action: "event.create_draft",
    entityType: "event",
    entityId: data.id,
    metadata: { title: parsed.fields.title, slug },
  });

  redirectWithMessage(
    `/admin/events/${data.id}`,
    "Your event draft is saved. It is not on the public website yet.",
  );
}

/**
 * save_intent=draft — draft/preview only
 * save_intent=live — update published content without changing status
 */
export async function saveEventWizardEdit(formData: FormData) {
  const id = emptyToNull(formData.get("id"));
  if (!id) {
    redirectWithError("/admin/events", "Missing event.");
  }

  const intentRaw = emptyToNull(formData.get("save_intent")) ?? "draft";
  const intent = intentRaw === "live" ? "live" : "draft";

  const gate = await requireStaffAction("events.manage");
  if (!gate.ok) {
    redirectWithError(`/admin/events/${id}`, gate.message);
  }

  const parsed = parseEventFields(formData);
  if (!parsed.ok) {
    redirectWithError(`/admin/events/${id}`, parsed.error);
  }

  const actorId = gate.session.user.id;
  const supabase = await createClient();

  const { data: existing, error: loadError } = await supabase
    .from("events")
    .select(EVENT_SELECT_FULL)
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    redirectWithError(`/admin/events/${id}`, "That event could not be found.");
  }

  if (intent === "draft" && existing.status === "published") {
    redirectWithError(
      `/admin/events/${id}`,
      "This event is already live. Preview first, then make your changes live.",
    );
  }
  if (intent === "live" && existing.status !== "published") {
    redirectWithError(
      `/admin/events/${id}`,
      "Only live events use Make these changes live. Save the draft, then make the event live separately.",
    );
  }

  await assertBranchOk(
    supabase,
    parsed.fields.location_branch_id,
    `/admin/events/${id}`,
  );

  const poster = await ingestEventPhotoFromForm(formData, actorId);
  if (!poster.ok) {
    redirectWithError(`/admin/events/${id}`, poster.error);
  }

  const featuredMediaId = poster.mediaId
    ? poster.mediaId
    : formData.has("featured_media_id")
      ? parsed.fields.featured_media_id
      : existing.featured_media_id;

  const slug = shouldRegenerateEventSlug(existing.status)
    ? await uniqueEventSlug(parsed.fields.title, id)
    : existing.slug;

  const patch: Database["public"]["Tables"]["events"]["Update"] = {
    title: parsed.fields.title,
    theme: parsed.fields.theme,
    summary: parsed.fields.summary,
    body_text: parsed.fields.body_text,
    event_kind: parsed.fields.event_kind,
    featured_media_id: featuredMediaId,
    starts_at: parsed.fields.starts_at,
    ends_at: parsed.fields.ends_at,
    timezone: parsed.fields.timezone,
    venue_label: parsed.fields.venue_label,
    venue_city: parsed.fields.venue_city,
    venue_country: parsed.fields.venue_country,
    location_branch_id: parsed.fields.location_branch_id,
    contact_email: parsed.fields.contact_email,
    contact_phone_display: parsed.fields.contact_phone_display,
    registration_enabled: parsed.fields.registration_enabled,
    registration_opens_at: parsed.fields.registration_opens_at,
    registration_closes_at: parsed.fields.registration_closes_at,
    capacity: parsed.fields.capacity,
    slug,
    updated_by: actorId,
  };

  const { data: updated, error } = await supabase
    .from("events")
    .update(patch)
    .eq("id", id)
    .select(EVENT_SELECT_FULL)
    .single();

  if (error || !updated) {
    redirectWithError(
      `/admin/events/${id}`,
      error?.message ?? "Could not save this event.",
    );
  }

  const regDiff = registrationAuditDiff(
    {
      registration_enabled: existing.registration_enabled,
      registration_opens_at: existing.registration_opens_at,
      registration_closes_at: existing.registration_closes_at,
      capacity: existing.capacity,
    },
    {
      registration_enabled: updated.registration_enabled,
      registration_opens_at: updated.registration_opens_at,
      registration_closes_at: updated.registration_closes_at,
      capacity: updated.capacity,
    },
  );

  await writeAuditEvent({
    actorId,
    action: intent === "live" ? "event.update_live" : "event.update_draft",
    entityType: "event",
    entityId: id,
    metadata: {
      intent,
      title: updated.title,
      slug: updated.slug,
      status: existing.status,
      ...(regDiff ? { registration_config: regDiff } : {}),
    },
  });

  if (intent === "live") {
    await saveRevision({
      entityType: "event",
      entityId: id,
      snapshot: eventSnapshot(updated),
      changedBy: actorId,
      changeSummary: "Live event content updated",
    });
  }

  redirectWithMessage(
    `/admin/events/${id}`,
    intent === "live"
      ? "Your changes are live on the website."
      : "Your draft changes are saved. This event is still not on the website.",
  );
}

export async function setEventStatus(formData: FormData) {
  const id = emptyToNull(formData.get("id"));
  const statusRaw = emptyToNull(formData.get("status"));
  if (!id || !statusRaw) {
    redirectWithError("/admin/events", "Missing event or status.");
  }

  const allowed: PublicationStatus[] = [
    "draft",
    "preview",
    "published",
    "archived",
  ];
  if (!allowed.includes(statusRaw as PublicationStatus)) {
    redirectWithError(`/admin/events/${id}`, "Invalid status.");
  }
  const status = statusRaw as PublicationStatus;

  const gate = await requireStaffAction("events.manage");
  if (!gate.ok) {
    redirectWithError(`/admin/events/${id}`, gate.message);
  }

  const actorId = gate.session.user.id;
  const supabase = await createClient();

  const { data: existing, error: loadError } = await supabase
    .from("events")
    .select(EVENT_SELECT_FULL)
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    redirectWithError(
      `/admin/events/${id}`,
      loadError?.message ?? "Event not found.",
    );
  }

  const now = new Date().toISOString();
  const isRestore = existing.status === "archived" && status === "draft";
  const patch: Database["public"]["Tables"]["events"]["Update"] = {
    status,
    updated_by: actorId,
  };

  if (status === "published") {
    patch.published_at = existing.published_at ?? now;
  }

  const { data: updated, error } = await supabase
    .from("events")
    .update(patch)
    .eq("id", id)
    .select(EVENT_SELECT_FULL)
    .single();

  if (error || !updated) {
    redirectWithError(
      `/admin/events/${id}`,
      error?.message ?? "Could not update status.",
    );
  }

  const shouldAudit =
    status === "published" || status === "archived" || isRestore;

  if (shouldAudit) {
    const action =
      status === "published"
        ? "event.publish"
        : status === "archived"
          ? "event.archive"
          : "event.restore";
    await writeAuditEvent({
      action,
      entityType: "event",
      entityId: id,
      actorId,
      metadata: { from: existing.status, to: status },
    });
    await saveRevision({
      entityType: "event",
      entityId: id,
      snapshot: eventSnapshot(updated),
      changedBy: actorId,
      changeSummary: `Status set to ${status}`,
    });
  }

  const message =
    status === "published"
      ? "This event is now live on the website."
      : status === "archived"
        ? "This event is no longer on the public website."
        : status === "preview"
          ? "This event is ready to preview. It is not public yet."
          : isRestore
            ? "This event is a draft again. It is not on the public website."
            : "Your event draft is saved. It is not on the public website yet.";

  redirectWithMessage(`/admin/events/${id}`, message);
}
