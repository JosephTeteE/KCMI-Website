"use server";

import { revalidatePath } from "next/cache";
import { requireStaffAction } from "@/lib/cms/require-staff";
import { writeAuditEvent } from "@/lib/cms/audit";
import { createClient } from "@/lib/supabase/server";
import {
  careAssignPermission,
  careReadPermission,
} from "@/lib/care/access";
import { careCanMutateStatus } from "@/lib/care/queries";
import {
  CARE_AUDIT_ACTIONS,
  type CareRequestStatus,
  type CareServiceType,
} from "@/lib/care/types";
import { getPublicEnv } from "@/lib/env/public";
import { redirectWithError, redirectWithMessage } from "@/lib/cms/hub-flash";

function parseServiceType(value: FormDataEntryValue | null): CareServiceType | null {
  if (value === "prayer" || value === "pastoral" || value === "welfare") {
    return value;
  }
  return null;
}

function parseStatus(value: FormDataEntryValue | null): CareRequestStatus | null {
  if (value === "new" || value === "in_progress" || value === "closed") {
    return value;
  }
  return null;
}

async function loadRequestMeta(requestId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pastoral_requests")
    .select("id, service_type, status, reference_code, assigned_to")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCareStatusAction(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const nextStatus = parseStatus(formData.get("status"));
  if (!requestId || !nextStatus) {
    redirectWithError("/admin/care", "That status update was incomplete.");
  }

  const meta = await loadRequestMeta(requestId);
  if (!meta || (meta.service_type !== "prayer" && meta.service_type !== "pastoral" && meta.service_type !== "welfare")) {
    redirectWithError("/admin/care", "That Care request was not found.");
  }

  const service = meta.service_type as CareServiceType;
  const gate = await requireStaffAction(careReadPermission(service));
  if (!gate.ok) {
    redirectWithError(`/admin/care/${requestId}`, gate.message);
  }

  if (
    !careCanMutateStatus(
      gate.session.profile.permissions,
      service,
      nextStatus,
      meta.status as CareRequestStatus,
    )
  ) {
    redirectWithError(
      `/admin/care/${requestId}`,
      "Your account cannot reopen closed Care requests. Ask a Care administrator.",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("pastoral_requests")
    .update({
      status: nextStatus,
      closed_at: nextStatus === "closed" ? new Date().toISOString() : null,
    })
    .eq("id", requestId);

  if (error) {
    redirectWithError(`/admin/care/${requestId}`, "Could not update status. Try again.");
  }

  const previous = meta.status as CareRequestStatus;
  const action =
    nextStatus === "closed"
      ? CARE_AUDIT_ACTIONS.closed
      : previous === "closed"
        ? CARE_AUDIT_ACTIONS.reopened
        : CARE_AUDIT_ACTIONS.statusChanged;

  await writeAuditEvent({
    action,
    entityType: "pastoral_request",
    entityId: requestId,
    actorId: gate.session.user.id,
    metadata: {
      service_type: service,
      reference_code: meta.reference_code,
      from_status: previous,
      to_status: nextStatus,
    },
  });

  revalidatePath("/admin/care");
  revalidatePath(`/admin/care/${requestId}`);
  redirectWithMessage(`/admin/care/${requestId}`, "Status updated.");
}

export async function assignCareRequestAction(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const assigneeRaw = String(formData.get("assignedTo") ?? "").trim();
  const assignedTo = assigneeRaw === "" ? null : assigneeRaw;

  if (!requestId) {
    redirectWithError("/admin/care", "That assignment was incomplete.");
  }

  const meta = await loadRequestMeta(requestId);
  if (!meta || (meta.service_type !== "prayer" && meta.service_type !== "pastoral" && meta.service_type !== "welfare")) {
    redirectWithError("/admin/care", "That Care request was not found.");
  }

  const service = meta.service_type as CareServiceType;
  const gate = await requireStaffAction(careAssignPermission(service));
  if (!gate.ok) {
    redirectWithError(`/admin/care/${requestId}`, gate.message);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("pastoral_requests")
    .update({ assigned_to: assignedTo })
    .eq("id", requestId);

  if (error) {
    redirectWithError(`/admin/care/${requestId}`, "Could not update assignment. Try again.");
  }

  await writeAuditEvent({
    action: CARE_AUDIT_ACTIONS.assigned,
    entityType: "pastoral_request",
    entityId: requestId,
    actorId: gate.session.user.id,
    metadata: {
      service_type: service,
      reference_code: meta.reference_code,
      assigned_to: assignedTo,
      previous_assigned_to: meta.assigned_to,
    },
  });

  revalidatePath("/admin/care");
  revalidatePath(`/admin/care/${requestId}`);
  redirectWithMessage(`/admin/care/${requestId}`, "Assignment updated.");
}

export async function addCareNoteAction(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!requestId || body.length < 1) {
    redirectWithError("/admin/care", "Please write a short note before saving.");
  }
  if (body.length > 4000) {
    redirectWithError(`/admin/care/${requestId}`, "That note is too long.");
  }

  const meta = await loadRequestMeta(requestId);
  if (!meta || (meta.service_type !== "prayer" && meta.service_type !== "pastoral" && meta.service_type !== "welfare")) {
    redirectWithError("/admin/care", "That Care request was not found.");
  }

  const service = meta.service_type as CareServiceType;
  const gate = await requireStaffAction(careReadPermission(service));
  if (!gate.ok) {
    redirectWithError(`/admin/care/${requestId}`, gate.message);
  }

  const supabase = await createClient();
  const { data: note, error } = await supabase
    .from("pastoral_case_notes")
    .insert({
      request_id: requestId,
      author_id: gate.session.user.id,
      body,
    })
    .select("id")
    .single();

  if (error || !note) {
    redirectWithError(`/admin/care/${requestId}`, "Could not save the note. Try again.");
  }

  await writeAuditEvent({
    action: CARE_AUDIT_ACTIONS.noteAdded,
    entityType: "pastoral_case_note",
    entityId: note.id,
    actorId: gate.session.user.id,
    metadata: {
      service_type: service,
      request_id: requestId,
      reference_code: meta.reference_code,
      // NEVER include note body
    },
  });

  revalidatePath(`/admin/care/${requestId}`);
  redirectWithMessage(`/admin/care/${requestId}`, "Note saved.");
}

/**
 * Non-production synthetic fixtures only. Uses authenticated staff JWT (RLS).
 * Requires domain assign. Never available when KCMI_ENVIRONMENT=production.
 */
export async function createCareFixtureAction(formData: FormData) {
  const env = getPublicEnv().KCMI_ENVIRONMENT;
  if (env === "production") {
    redirectWithError("/admin/care", "Synthetic Care fixtures are not available in production.");
  }

  const service = parseServiceType(formData.get("serviceType"));
  if (!service) {
    redirectWithError("/admin/care", "Choose a Care domain for the fixture.");
  }

  const gate = await requireStaffAction(careAssignPermission(service));
  if (!gate.ok) {
    redirectWithError("/admin/care", gate.message);
  }

  const narrative =
    service === "prayer"
      ? "SYNTHETIC FIXTURE — Please pray for wisdom for an upcoming decision. (Not a real request.)"
      : service === "pastoral"
        ? "SYNTHETIC FIXTURE — Requesting a pastoral conversation about family encouragement. (Not a real request.)"
        : "SYNTHETIC FIXTURE — Requesting practical support guidance for a temporary need. (Not a real request.)";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pastoral_requests")
    .insert({
      service_type: service,
      display_name: service === "prayer" ? null : "Synthetic Visitor",
      email: service === "prayer" ? null : "synthetic.care@example.invalid",
      phone: null,
      preferred_contact_method: service === "prayer" ? null : "email",
      contact_requested: service !== "prayer",
      narrative,
      status: "new",
      assigned_to:
        service === "pastoral" ? gate.session.user.id : null,
    })
    .select("id, reference_code")
    .single();

  if (error || !data) {
    redirectWithError(
      `/admin/care/${service === "pastoral" ? "pastoral" : service}`,
      "Could not create the synthetic fixture. Check database migration status.",
    );
  }

  await writeAuditEvent({
    action: CARE_AUDIT_ACTIONS.received,
    entityType: "pastoral_request",
    entityId: data.id,
    actorId: gate.session.user.id,
    metadata: {
      service_type: service,
      reference_code: data.reference_code,
      synthetic: true,
    },
  });

  revalidatePath("/admin/care");
  redirectWithMessage(`/admin/care/${data.id}`, "Synthetic Care fixture created.");
}
