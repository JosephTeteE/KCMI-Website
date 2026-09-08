"use server";

import { requireStaffAction } from "@/lib/cms/require-staff";
import { writeAuditEvent } from "@/lib/cms/audit";
import { saveRevision } from "@/lib/cms/revisions";
import { redirectWithError, redirectWithMessage } from "@/lib/cms/hub-flash";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

function parseAddressLines(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

type ServiceTimeInput = {
  day_label: string;
  time_label: string;
  note: string | null;
  sort_order: number;
};

function parseServiceTimes(formData: FormData): ServiceTimeInput[] {
  const days = formData.getAll("service_day").map((v) => String(v));
  const times = formData.getAll("service_time").map((v) => String(v));
  const notes = formData.getAll("service_note").map((v) => String(v));
  const rows: ServiceTimeInput[] = [];

  const count = Math.max(days.length, times.length, notes.length);
  for (let i = 0; i < count; i += 1) {
    const day = (days[i] ?? "").trim();
    const time = (times[i] ?? "").trim();
    const note = (notes[i] ?? "").trim();
    if (!day && !time && !note) continue;
    if (!day || !time) continue;
    rows.push({
      day_label: day,
      time_label: time,
      note: note || null,
      sort_order: rows.length,
    });
  }
  return rows;
}

export async function updateBranchPublicFields(formData: FormData) {
  const id = emptyToNull(formData.get("id"));
  if (!id) {
    redirectWithError("/admin/branches", "Missing branch id.");
  }

  const gate = await requireStaffAction("branches.manage");
  if (!gate.ok) {
    redirectWithError(`/admin/branches/${id}`, gate.message);
  }

  const name = emptyToNull(formData.get("name"));
  if (!name) {
    redirectWithError(`/admin/branches/${id}`, "Branch name is required.");
  }

  // Do not invent phones for gaps — empty means null / empty array.
  const phoneDisplay = emptyToNull(formData.get("phone_display"));
  const phoneTel = emptyToNull(formData.get("phone_tel"));
  const phonesJson: Json =
    phoneDisplay && phoneTel
      ? [{ display: phoneDisplay, tel: phoneTel }]
      : [];

  const serviceTimes = parseServiceTimes(formData);
  const actorId = gate.session.user.id;
  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from("church_branches")
    .update({
      name,
      city_label: emptyToNull(formData.get("city_label")) ?? "",
      address_lines: parseAddressLines(
        emptyToNull(formData.get("address_lines")),
      ),
      phone_display: phoneDisplay,
      phone_tel: phoneTel,
      phones: phonesJson,
      email: emptyToNull(formData.get("email")),
      maps_query: emptyToNull(formData.get("maps_query")),
      maps_url: emptyToNull(formData.get("maps_url")),
      phone_evidence_note: emptyToNull(formData.get("phone_evidence_note")),
      updated_by: actorId,
    })
    .eq("id", id)
    .select(
      "id, slug, name, city_label, address_lines, phone_display, phone_tel, phones, email, maps_query, maps_url, phone_evidence_note, is_public, status, sort_order",
    )
    .single();

  if (error || !updated) {
    redirectWithError(
      `/admin/branches/${id}`,
      error?.message ??
        "Could not update branch. You may not be assigned to this location.",
    );
  }

  const { error: deleteError } = await supabase
    .from("branch_service_times")
    .delete()
    .eq("branch_id", id);

  if (deleteError) {
    redirectWithError(`/admin/branches/${id}`, deleteError.message);
  }

  if (serviceTimes.length > 0) {
    const { error: insertError } = await supabase
      .from("branch_service_times")
      .insert(
        serviceTimes.map((row) => ({
          branch_id: id,
          day_label: row.day_label,
          time_label: row.time_label,
          note: row.note,
          sort_order: row.sort_order,
        })),
      );

    if (insertError) {
      redirectWithError(`/admin/branches/${id}`, insertError.message);
    }
  }

  await writeAuditEvent({
    action: "branch.update",
    entityType: "church_branch",
    entityId: id,
    actorId,
    metadata: { name: updated.name },
  });

  await saveRevision({
    entityType: "church_branch",
    entityId: id,
    snapshot: {
      ...updated,
      service_times: serviceTimes,
    },
    changedBy: actorId,
    changeSummary: "Updated public branch fields and service times",
  });

  redirectWithMessage(`/admin/branches/${id}`, "Branch details saved.");
}
