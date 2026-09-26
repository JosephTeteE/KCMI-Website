"use server";

import { requireStaffAction } from "@/lib/cms/require-staff";
import { writeAuditEvent } from "@/lib/cms/audit";
import { revalidatePublishedProgram } from "@/lib/cms/revalidate-public";
import { saveRevision } from "@/lib/cms/revisions";
import { slugifyTitle } from "@/lib/cms/slugify";
import {
  redirectWithError,
  redirectWithMessage,
  redirectWithParams,
} from "@/lib/cms/hub-flash";
import { loadAssignableAsset } from "@/lib/cms/stage-marketing-asset";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Permission } from "@/lib/authorization/rbac";
import {
  DEFAULT_PROGRAM_TIMEZONE,
  legacyIntervalFromSessions,
  parseProgramTimezone,
  type ParsedProgramSession,
} from "@/lib/programs/sessions";
import { timezoneForCountry } from "@/lib/programs/schedule";
import { PROGRAM_POSTER_STAGED_FIELD } from "@/lib/hub/staged-photo";
import {
  parseProgramFields,
  type ParsedProgramFields,
} from "@/lib/programs/parse-fields";

type PublicationStatus = Database["public"]["Enums"]["publication_status"];
type ProgramPlacement = Database["public"]["Enums"]["program_placement"];

const NEW_PROGRAM_PATH = "/admin/programs/new";

type ProgramSessionInsert = Database["public"]["Tables"]["program_sessions"]["Insert"];

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

function programSnapshot(row: {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  body_text: string;
  starts_at: string | null;
  ends_at: string | null;
  featured_media_id: string | null;
  cta_label: string | null;
  cta_url: string | null;
  placement: ProgramPlacement;
  status: PublicationStatus;
  published_at: string | null;
  archived_at: string | null;
}) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    short_description: row.short_description,
    body_text: row.body_text,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    featured_media_id: row.featured_media_id,
    cta_label: row.cta_label,
    cta_url: row.cta_url,
    placement: row.placement,
    status: row.status,
    published_at: row.published_at,
    archived_at: row.archived_at,
  };
}

async function requireAnyPermission(permissions: Permission[]) {
  let lastMessage = "Your account is not allowed to do this. Ask a Super Admin for help.";
  for (const permission of permissions) {
    const gate = await requireStaffAction(permission);
    if (gate.ok) return gate;
    lastMessage = gate.message;
  }
  return { ok: false as const, message: lastMessage };
}

async function uniqueProgramSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
  excludeId?: string,
): Promise<string> {
  const base = slugifyTitle(title);
  let candidate = base;
  for (let i = 0; i < 50; i += 1) {
    let query = supabase.from("programs").select("id").eq("slug", candidate);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${i + 2}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

async function resolveTimezoneForFields(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fields: ParsedProgramFields,
): Promise<string> {
  if (fields.location_kind === "branch" && fields.location_branch_id) {
    const { data: branch } = await supabase
      .from("church_branches")
      .select("country, name, status")
      .eq("id", fields.location_branch_id)
      .maybeSingle();
    if (!branch || branch.status !== "published") {
      return fields.timezone || DEFAULT_PROGRAM_TIMEZONE;
    }
    return timezoneForCountry(branch.country);
  }
  return fields.timezone || DEFAULT_PROGRAM_TIMEZONE;
}

async function ingestPosterFromForm(
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
      error: assetError?.message ?? "Could not save the program photo.",
    };
  }

  return { ok: true, mediaId: asset.id };
}

async function insertProgramSessions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programId: string,
  sessions: ParsedProgramSession[],
): Promise<{ error: string | null }> {
  if (sessions.length === 0) return { error: null };

  const rows: ProgramSessionInsert[] = sessions.map((session, index) => ({
    program_id: programId,
    session_date: session.session_date,
    start_time: session.start_time,
    end_time: session.end_time,
    label: session.label,
    sort_order: session.sort_order ?? index,
  }));

  const { error } = await supabase.from("program_sessions").insert(rows);
  return { error: error?.message ?? null };
}

/**
 * Replace all sessions for a program. An empty list clears the schedule
 * (poster-only programs are valid — do not invent dates).
 */
async function replaceProgramSessions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programId: string,
  sessions: ParsedProgramSession[],
): Promise<{ error: string | null }> {
  const { error: deleteError } = await supabase
    .from("program_sessions")
    .delete()
    .eq("program_id", programId);
  if (deleteError) {
    return { error: deleteError.message };
  }
  if (sessions.length === 0) return { error: null };
  return insertProgramSessions(supabase, programId, sessions);
}

export async function createProgram(formData: FormData) {
  const intentRaw = emptyToNull(formData.get("save_intent")) ?? "draft";
  const intent = intentRaw === "publish" ? "publish" : "draft";

  const createGate = await requireAnyPermission([
    "programs.create",
    "programs.update",
  ]);
  if (!createGate.ok) {
    redirectWithError(NEW_PROGRAM_PATH, createGate.message);
  }
  if (intent === "publish") {
    const publishGate = await requireStaffAction("programs.publish");
    if (!publishGate.ok) {
      redirectWithError(NEW_PROGRAM_PATH, publishGate.message);
    }
  }

  const parsed = parseProgramFields(formData, { forcePlacementNone: true });
  if (!parsed.ok) {
    redirectWithError(NEW_PROGRAM_PATH, parsed.error);
  }

  const actorId = createGate.session.user.id;
  const supabase = await createClient();

  if (
    parsed.fields.location_kind === "branch" &&
    parsed.fields.location_branch_id
  ) {
    const { data: branch } = await supabase
      .from("church_branches")
      .select("id, name, status")
      .eq("id", parsed.fields.location_branch_id)
      .maybeSingle();
    if (!branch || branch.status !== "published") {
      redirectWithError(
        NEW_PROGRAM_PATH,
        "That branch is not available. Choose a published branch.",
      );
    }
  }

  const timezone = await resolveTimezoneForFields(supabase, parsed.fields);
  const legacy = parsed.fields.hasSessionPayload
    ? legacyIntervalFromSessions(parsed.fields.sessions, timezone)
    : { startsAt: parsed.fields.starts_at, endsAt: parsed.fields.ends_at };

  const poster = await ingestPosterFromForm(formData, actorId);
  if (!poster.ok) {
    // Return (do not redirect) so the client form can keep entered fields
    // and offer replace / library / no-poster options.
    return { ok: false as const, error: poster.error };
  }

  const featuredMediaId = poster.mediaId ?? parsed.fields.featured_media_id;
  const slug = await uniqueProgramSlug(supabase, parsed.fields.title);
  const now = new Date().toISOString();
  const status = intent === "publish" ? "published" : "draft";

  const { data, error } = await supabase
    .from("programs")
    .insert({
      title: parsed.fields.title,
      short_description: parsed.fields.short_description,
      body_text: parsed.fields.body_text,
      starts_at: legacy.startsAt,
      ends_at: legacy.endsAt,
      featured_media_id: featuredMediaId,
      cta_label: parsed.fields.cta_label,
      cta_url: parsed.fields.cta_url,
      placement: "none",
      action_kind: parsed.fields.action_kind,
      location_kind: parsed.fields.location_kind,
      location_branch_id: parsed.fields.location_branch_id,
      location_label: parsed.fields.location_label,
      timezone,
      slug,
      status,
      created_by: actorId,
      updated_by: actorId,
      ...(intent === "publish"
        ? { published_by: actorId, published_at: now }
        : {}),
    })
    .select("id")
    .single();

  if (error || !data) {
    redirectWithError(
      NEW_PROGRAM_PATH,
      error?.message ?? "Could not create program.",
    );
  }

  if (parsed.fields.hasSessionPayload) {
    const sessionsResult = await insertProgramSessions(
      supabase,
      data.id,
      parsed.fields.sessions,
    );
    if (sessionsResult.error) {
      redirectWithError(
        `/admin/programs/${data.id}`,
        `Your program was saved, but the schedule could not be saved: ${sessionsResult.error}`,
      );
    }
  }

  await writeAuditEvent({
    actorId,
    action: intent === "publish" ? "program.publish" : "program.create",
    entityType: "program",
    entityId: data.id,
    metadata: {
      intent,
      title: parsed.fields.title,
      sessionCount: parsed.fields.sessions.length,
      status,
    },
  });

  if (intent === "publish") {
    revalidatePublishedProgram(slug);
    redirectWithParams(`/admin/programs/${data.id}`, {
      message: "Program published.",
      view: `/programs/${slug}`,
    });
  }

  redirectWithMessage(
    `/admin/programs/${data.id}`,
    "Your program draft is saved. It is not on the public website yet.",
  );
}

export async function updateProgram(formData: FormData) {
  const id = emptyToNull(formData.get("id"));
  if (!id) {
    redirectWithError("/admin/programs", "Missing program id.");
  }

  const gate = await requireAnyPermission([
    "programs.update",
    "programs.create",
  ]);
  if (!gate.ok) {
    redirectWithError(`/admin/programs/${id}`, gate.message);
  }

  const parsed = parseProgramFields(formData);
  if (!parsed.ok) {
    redirectWithError(`/admin/programs/${id}`, parsed.error);
  }

  const actorId = gate.session.user.id;
  const supabase = await createClient();
  const slug = await uniqueProgramSlug(supabase, parsed.fields.title, id);

  const timezone = parsed.fields.hasLocationPayload
    ? await resolveTimezoneForFields(supabase, parsed.fields)
    : parseProgramTimezone(formData.get("timezone"));

  let starts_at = parsed.fields.starts_at;
  let ends_at = parsed.fields.ends_at;
  if (parsed.fields.hasSessionPayload) {
    const legacy = legacyIntervalFromSessions(parsed.fields.sessions, timezone);
    starts_at = legacy.startsAt;
    ends_at = legacy.endsAt;
  }

  const patch: Database["public"]["Tables"]["programs"]["Update"] = {
    title: parsed.fields.title,
    short_description: parsed.fields.short_description,
    body_text: parsed.fields.body_text,
    starts_at,
    ends_at,
    featured_media_id: parsed.fields.featured_media_id,
    cta_label: parsed.fields.cta_label,
    cta_url: parsed.fields.cta_url,
    placement: parsed.fields.placement,
    slug,
    updated_by: actorId,
  };

  if (parsed.fields.hasActionKindPayload) {
    patch.action_kind = parsed.fields.action_kind;
  }
  if (parsed.fields.hasLocationPayload) {
    patch.location_kind = parsed.fields.location_kind;
    patch.location_branch_id = parsed.fields.location_branch_id;
    patch.location_label = parsed.fields.location_label;
    patch.timezone = timezone;
  } else if (parsed.fields.hasSessionPayload) {
    patch.timezone = timezone;
  }

  const { error } = await supabase.from("programs").update(patch).eq("id", id);

  if (error) {
    redirectWithError(`/admin/programs/${id}`, error.message);
  }

  if (parsed.fields.hasSessionPayload) {
    const sessionsResult = await replaceProgramSessions(
      supabase,
      id,
      parsed.fields.sessions,
    );
    if (sessionsResult.error) {
      redirectWithError(`/admin/programs/${id}`, sessionsResult.error);
    }
  }

  const { data: savedProgram } = await supabase
    .from("programs")
    .select("slug, status")
    .eq("id", id)
    .maybeSingle();
  if (savedProgram?.status === "published") {
    revalidatePublishedProgram(savedProgram.slug);
  }

  redirectWithMessage(`/admin/programs/${id}`, "Your program details are saved.");
}

/**
 * Wizard / simple-form edit save.
 * save_intent=draft — keep or stay draft
 * save_intent=publish — save fields and publish a draft (or preview)
 * save_intent=live — update an already-published program (Make changes live)
 */
export async function saveProgramWizardEdit(formData: FormData) {
  const id = emptyToNull(formData.get("id"));
  if (!id) {
    redirectWithError("/admin/programs", "Missing program id.");
  }

  const intentRaw = emptyToNull(formData.get("save_intent")) ?? "draft";
  const intent =
    intentRaw === "live"
      ? "live"
      : intentRaw === "publish"
        ? "publish"
        : "draft";

  const gate =
    intent === "live" || intent === "publish"
      ? await requireStaffAction("programs.publish")
      : await requireAnyPermission(["programs.update", "programs.create"]);
  if (!gate.ok) {
    redirectWithError(`/admin/programs/${id}`, gate.message);
  }

  const parsed = parseProgramFields(formData, { forcePlacementNone: false });
  if (!parsed.ok) {
    redirectWithError(`/admin/programs/${id}`, parsed.error);
  }

  const actorId = gate.session.user.id;
  const supabase = await createClient();

  const { data: existing, error: loadError } = await supabase
    .from("programs")
    .select(
      "id, title, slug, short_description, body_text, starts_at, ends_at, featured_media_id, cta_label, cta_url, placement, status, published_at, archived_at, action_kind, location_kind, location_branch_id, location_label, timezone",
    )
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    redirectWithError(`/admin/programs/${id}`, "That program could not be found.");
  }

  if (intent === "draft" && existing.status === "published") {
    redirectWithError(
      `/admin/programs/${id}`,
      "This program is already live. Use Make these changes live after preview.",
    );
  }
  if (intent === "live" && existing.status !== "published") {
    redirectWithError(
      `/admin/programs/${id}`,
      "Only live programs use Make these changes live. Save as a draft first, then publish.",
    );
  }
  if (
    intent === "publish" &&
    existing.status !== "draft" &&
    existing.status !== "preview"
  ) {
    redirectWithError(
      `/admin/programs/${id}`,
      "Only draft programs can use Publish Program. Live programs use Make these changes live.",
    );
  }

  if (
    parsed.fields.location_kind === "branch" &&
    parsed.fields.location_branch_id
  ) {
    const { data: branch } = await supabase
      .from("church_branches")
      .select("id, status")
      .eq("id", parsed.fields.location_branch_id)
      .maybeSingle();
    if (!branch || branch.status !== "published") {
      redirectWithError(
        `/admin/programs/${id}`,
        "That branch is not available. Choose a published branch.",
      );
    }
  }

  const timezone = parsed.fields.hasLocationPayload
    ? await resolveTimezoneForFields(supabase, parsed.fields)
    : existing.timezone || DEFAULT_PROGRAM_TIMEZONE;

  const legacy = parsed.fields.hasSessionPayload
    ? legacyIntervalFromSessions(parsed.fields.sessions, timezone)
    : {
        startsAt: existing.starts_at,
        endsAt: existing.ends_at,
      };

  const poster = await ingestPosterFromForm(formData, actorId);
  if (!poster.ok) {
    return { ok: false as const, error: poster.error };
  }

  const featuredMediaId = poster.mediaId
    ? poster.mediaId
    : formData.has("featured_media_id")
      ? parsed.fields.featured_media_id
      : existing.featured_media_id;

  const placement =
    parsed.fields.placement === "featured" || parsed.fields.placement === "none"
      ? parsed.fields.placement
      : existing.placement;

  const slug = await uniqueProgramSlug(supabase, parsed.fields.title, id);
  const now = new Date().toISOString();

  const patch: Database["public"]["Tables"]["programs"]["Update"] = {
    title: parsed.fields.title,
    short_description: parsed.fields.short_description,
    body_text: parsed.fields.body_text,
    starts_at: legacy.startsAt,
    ends_at: legacy.endsAt,
    featured_media_id: featuredMediaId,
    cta_label: parsed.fields.hasActionKindPayload
      ? parsed.fields.cta_label
      : existing.cta_label,
    cta_url: parsed.fields.hasActionKindPayload
      ? parsed.fields.cta_url
      : existing.cta_url,
    placement,
    slug,
    updated_by: actorId,
  };

  if (parsed.fields.hasActionKindPayload) {
    patch.action_kind = parsed.fields.action_kind;
  }
  if (parsed.fields.hasLocationPayload) {
    patch.location_kind = parsed.fields.location_kind;
    patch.location_branch_id = parsed.fields.location_branch_id;
    patch.location_label = parsed.fields.location_label;
    patch.timezone = timezone;
  } else if (parsed.fields.hasSessionPayload) {
    patch.timezone = timezone;
  }

  if (intent === "publish") {
    patch.status = "published";
    patch.published_by = actorId;
    patch.published_at = now;
    patch.archived_at = null;
  }

  const { error } = await supabase.from("programs").update(patch).eq("id", id);
  if (error) {
    redirectWithError(`/admin/programs/${id}`, error.message);
  }

  if (parsed.fields.hasSessionPayload) {
    const sessionsResult = await replaceProgramSessions(
      supabase,
      id,
      parsed.fields.sessions,
    );
    if (sessionsResult.error) {
      redirectWithError(
        `/admin/programs/${id}`,
        `Program details were saved, but the schedule could not be updated: ${sessionsResult.error}`,
      );
    }
  }

  const { data: after } = await supabase
    .from("programs")
    .select(
      "id, title, slug, short_description, body_text, starts_at, ends_at, featured_media_id, cta_label, cta_url, placement, status, published_at, archived_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (after && (intent === "publish" || intent === "live")) {
    await saveRevision({
      entityType: "program",
      entityId: id,
      snapshot: programSnapshot(after),
      changedBy: actorId,
      changeSummary:
        intent === "publish"
          ? "Program published"
          : "Live program details updated",
    });
  }

  await writeAuditEvent({
    actorId,
    action:
      intent === "publish"
        ? "program.publish"
        : intent === "live"
          ? "program.update_live"
          : "program.update_draft",
    entityType: "program",
    entityId: id,
    metadata: {
      intent,
      title: parsed.fields.title,
      sessionCount: parsed.fields.hasSessionPayload
        ? parsed.fields.sessions.length
        : null,
      status: after?.status ?? existing.status,
    },
  });

  if (intent === "publish" || intent === "live") {
    revalidatePublishedProgram(slug);
    redirectWithParams(`/admin/programs/${id}`, {
      message:
        intent === "publish" ? "Program published." : "Program updated.",
      view: `/programs/${slug}`,
    });
  }

  redirectWithMessage(
    `/admin/programs/${id}`,
    "Your draft changes are saved. This program is still not on the website.",
  );
}

export async function setProgramStatus(formData: FormData) {
  const id = emptyToNull(formData.get("id"));
  const statusRaw = emptyToNull(formData.get("status"));
  if (!id || !statusRaw) {
    redirectWithError("/admin/programs", "Missing program or status.");
  }

  const allowed: PublicationStatus[] = [
    "draft",
    "preview",
    "published",
    "archived",
  ];
  if (!allowed.includes(statusRaw as PublicationStatus)) {
    redirectWithError(`/admin/programs/${id}`, "Invalid status.");
  }
  const status = statusRaw as PublicationStatus;

  const needsPublish = status === "published" || status === "archived";
  const gate = needsPublish
    ? await requireStaffAction("programs.publish")
    : await requireAnyPermission(["programs.update", "programs.create"]);

  if (!gate.ok) {
    redirectWithError(`/admin/programs/${id}`, gate.message);
  }

  const actorId = gate.session.user.id;
  const supabase = await createClient();

  const { data: existing, error: loadError } = await supabase
    .from("programs")
    .select(
      "id, title, slug, short_description, body_text, starts_at, ends_at, featured_media_id, cta_label, cta_url, placement, status, published_at, archived_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    redirectWithError(
      `/admin/programs/${id}`,
      loadError?.message ?? "Program not found.",
    );
  }

  const now = new Date().toISOString();
  const isRestore = existing.status === "archived" && status === "draft";
  const patch: Database["public"]["Tables"]["programs"]["Update"] = {
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
    .from("programs")
    .update(patch)
    .eq("id", id)
    .select(
      "id, title, slug, short_description, body_text, starts_at, ends_at, featured_media_id, cta_label, cta_url, placement, status, published_at, archived_at",
    )
    .single();

  if (error || !updated) {
    redirectWithError(
      `/admin/programs/${id}`,
      error?.message ?? "Could not update status.",
    );
  }

  const shouldAudit =
    status === "published" || status === "archived" || isRestore;

  if (shouldAudit) {
    const action =
      status === "published"
        ? "program.publish"
        : status === "archived"
          ? "program.archive"
          : "program.restore";
    await writeAuditEvent({
      action,
      entityType: "program",
      entityId: id,
      actorId,
      metadata: { from: existing.status, to: status },
    });
    await saveRevision({
      entityType: "program",
      entityId: id,
      snapshot: programSnapshot(updated),
      changedBy: actorId,
      changeSummary: `Status set to ${status}`,
    });
  }

  if (status === "published" || status === "archived") {
    revalidatePublishedProgram(updated.slug);
  }

  if (status === "published") {
    redirectWithParams(`/admin/programs/${id}`, {
      message: "Program published.",
      view: `/programs/${updated.slug}`,
    });
  }

  const message =
    status === "archived"
      ? "This program is no longer on the public website."
      : status === "preview"
        ? "This program is ready to preview. It is not public yet."
        : isRestore
          ? "This program is a draft again. It is not on the public website."
          : "Your program draft is saved. It is not on the public website yet.";

  redirectWithMessage(`/admin/programs/${id}`, message);
}

/**
 * Upload a poster into the photo library only.
 * The program record keeps its current poster until the operator makes the new one live.
 */
export async function stageProgramCover(formData: FormData) {
  const id = emptyToNull(formData.get("program_id"));
  if (!id) {
    redirectWithError("/admin/programs", "Missing program.");
  }

  const gate = await requireAnyPermission([
    "programs.update",
    "programs.create",
    "media.manage",
  ]);
  if (!gate.ok) {
    redirectWithError(`/admin/programs/${id}`, gate.message);
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirectWithError(`/admin/programs/${id}`, "Please choose a cover image.");
  }

  const poster = await ingestPosterFromForm(formData, gate.session.user.id);
  if (!poster.ok || !poster.mediaId) {
    redirectWithError(
      `/admin/programs/${id}`,
      poster.ok ? "Please choose a cover image." : poster.error,
    );
  }

  redirectWithParams(`/admin/programs/${id}`, {
    stagedField: PROGRAM_POSTER_STAGED_FIELD,
    stagedMediaId: poster.mediaId,
    message:
      "This poster photo is ready. Preview it, then make it live when it looks right.",
  });
}

/** Put a library photo on the program. Reached only from the explicit Make live step. */
export async function assignProgramCover(formData: FormData) {
  const id = emptyToNull(formData.get("program_id"));
  if (!id) {
    redirectWithError("/admin/programs", "Missing program.");
  }

  const gate = await requireAnyPermission([
    "programs.update",
    "programs.create",
  ]);
  if (!gate.ok) {
    redirectWithError(`/admin/programs/${id}`, gate.message);
  }

  const mediaAssetId = emptyToNull(formData.get("media_asset_id"));
  if (!mediaAssetId) {
    redirectWithError(`/admin/programs/${id}`, "Please choose a photo first.");
  }

  const loaded = await loadAssignableAsset(mediaAssetId);
  if (!loaded.ok) {
    redirectWithError(`/admin/programs/${id}`, loaded.error);
  }

  const supabase = await createClient();
  const { data: covered, error: updateError } = await supabase
    .from("programs")
    .update({
      featured_media_id: loaded.asset.id,
      updated_by: gate.session.user.id,
    })
    .eq("id", id)
    .select("slug, status")
    .single();

  if (updateError || !covered) {
    redirectWithError(
      `/admin/programs/${id}`,
      updateError?.message ?? "The poster could not be saved.",
    );
  }

  if (covered.status === "published") {
    revalidatePublishedProgram(covered.slug);
  }

  await writeAuditEvent({
    action: "program.cover_replace",
    entityType: "program",
    entityId: id,
    actorId: gate.session.user.id,
    metadata: { media_asset_id: loaded.asset.id },
  });

  redirectWithMessage(`/admin/programs/${id}`, "The program poster is now updated.");
}
