"use server";

import { requireStaffAction } from "@/lib/cms/require-staff";
import { writeAuditEvent } from "@/lib/cms/audit";
import { saveRevision } from "@/lib/cms/revisions";
import { validateCtaUrl } from "@/lib/cms/cta-url";
import { slugifyTitle } from "@/lib/cms/slugify";
import { redirectWithError, redirectWithMessage } from "@/lib/cms/hub-flash";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Permission } from "@/lib/authorization/rbac";

type PublicationStatus = Database["public"]["Enums"]["publication_status"];
type ProgramPlacement = Database["public"]["Enums"]["program_placement"];

const PLACEMENTS = new Set<ProgramPlacement>([
  "none",
  "featured",
  "banner",
  "card",
]);

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

function parseOptionalIso(value: FormDataEntryValue | null): string | null {
  const raw = emptyToNull(value);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parsePlacement(value: FormDataEntryValue | null): ProgramPlacement {
  const raw = typeof value === "string" ? value : "none";
  return PLACEMENTS.has(raw as ProgramPlacement)
    ? (raw as ProgramPlacement)
    : "none";
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
  let lastMessage = "Missing required permission.";
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

function parseProgramFields(formData: FormData) {
  const title = emptyToNull(formData.get("title"));
  if (!title) {
    return { ok: false as const, error: "Title is required." };
  }

  const cta = validateCtaUrl(emptyToNull(formData.get("cta_url")));
  if (!cta.ok) {
    return { ok: false as const, error: cta.error };
  }

  return {
    ok: true as const,
    fields: {
      title,
      short_description: emptyToNull(formData.get("short_description")) ?? "",
      body_text: emptyToNull(formData.get("body_text")) ?? "",
      starts_at: parseOptionalIso(formData.get("starts_at")),
      ends_at: parseOptionalIso(formData.get("ends_at")),
      featured_media_id: emptyToNull(formData.get("featured_media_id")),
      cta_label: emptyToNull(formData.get("cta_label")),
      cta_url: cta.url,
      placement: parsePlacement(formData.get("placement")),
    },
  };
}

export async function createProgram(formData: FormData) {
  const gate = await requireAnyPermission([
    "programs.create",
    "programs.update",
  ]);
  if (!gate.ok) {
    redirectWithError("/admin/programs/new", gate.message);
  }

  const parsed = parseProgramFields(formData);
  if (!parsed.ok) {
    redirectWithError("/admin/programs/new", parsed.error);
  }

  const actorId = gate.session.user.id;
  const supabase = await createClient();
  const slug = await uniqueProgramSlug(supabase, parsed.fields.title);

  const { data, error } = await supabase
    .from("programs")
    .insert({
      ...parsed.fields,
      slug,
      status: "draft",
      created_by: actorId,
      updated_by: actorId,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirectWithError(
      "/admin/programs/new",
      error?.message ?? "Could not create program.",
    );
  }

  redirectWithMessage(`/admin/programs/${data.id}`, "Draft program created.");
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

  const { error } = await supabase
    .from("programs")
    .update({
      ...parsed.fields,
      slug,
      updated_by: actorId,
    })
    .eq("id", id);

  if (error) {
    redirectWithError(`/admin/programs/${id}`, error.message);
  }

  redirectWithMessage(`/admin/programs/${id}`, "Program saved.");
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

  const message =
    status === "published"
      ? "Program published."
      : status === "archived"
        ? "Program archived."
        : status === "preview"
          ? "Marked ready for preview."
          : isRestore
            ? "Program restored to draft."
            : "Saved as draft.";

  redirectWithMessage(`/admin/programs/${id}`, message);
}
