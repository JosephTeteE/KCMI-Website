"use server";

import { revalidatePath } from "next/cache";
import { requireStaffAction } from "@/lib/cms/require-staff";
import { writeAuditEvent } from "@/lib/cms/audit";
import { redirectWithError, redirectWithMessage } from "@/lib/cms/hub-flash";
import { createClient } from "@/lib/supabase/server";
import {
  REQUEST_AUDIT_ACTIONS,
  isWebsiteRequestStatus,
  type WebsiteRequestStatus,
} from "@/lib/requests/types";

async function loadRequestMeta(requestId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("website_requests")
    .select("id, status, reference_code, assigned_to")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw new Error("load_failed");
  return data;
}

export async function updateWebsiteRequestStatusAction(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const nextRaw = String(formData.get("status") ?? "");
  if (!requestId || !isWebsiteRequestStatus(nextRaw)) {
    redirectWithError("/admin/requests", "That status update was incomplete.");
  }
  const nextStatus = nextRaw as WebsiteRequestStatus;

  const meta = await loadRequestMeta(requestId);
  if (!meta) {
    redirectWithError("/admin/requests", "That request was not found.");
  }

  const permission =
    meta.status === "closed" && nextStatus !== "closed"
      ? "requests.assign"
      : "requests.update";

  const gate = await requireStaffAction(permission);
  if (!gate.ok) {
    redirectWithError(`/admin/requests/${requestId}`, gate.message);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("website_requests")
    .update({
      status: nextStatus,
      closed_at: nextStatus === "closed" ? new Date().toISOString() : null,
    })
    .eq("id", requestId);

  if (error) {
    redirectWithError(
      `/admin/requests/${requestId}`,
      "Could not update status. Try again.",
    );
  }

  await writeAuditEvent({
    action: REQUEST_AUDIT_ACTIONS.statusChanged,
    entityType: "website_request",
    entityId: requestId,
    actorId: gate.session.user.id,
    metadata: {
      reference_code: meta.reference_code,
      from_status: meta.status,
      to_status: nextStatus,
    },
  });

  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);
  redirectWithMessage(`/admin/requests/${requestId}`, "Status updated.");
}

export async function assignWebsiteRequestAction(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const assigneeRaw = String(formData.get("assignedTo") ?? "").trim();
  const assignedTo = assigneeRaw === "" ? null : assigneeRaw;

  if (!requestId) {
    redirectWithError("/admin/requests", "That assignment was incomplete.");
  }

  const meta = await loadRequestMeta(requestId);
  if (!meta) {
    redirectWithError("/admin/requests", "That request was not found.");
  }

  const gate = await requireStaffAction("requests.assign");
  if (!gate.ok) {
    redirectWithError(`/admin/requests/${requestId}`, gate.message);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("website_requests")
    .update({ assigned_to: assignedTo })
    .eq("id", requestId);

  if (error) {
    redirectWithError(
      `/admin/requests/${requestId}`,
      "Could not update assignment. Try again.",
    );
  }

  await writeAuditEvent({
    action: REQUEST_AUDIT_ACTIONS.assigned,
    entityType: "website_request",
    entityId: requestId,
    actorId: gate.session.user.id,
    metadata: {
      reference_code: meta.reference_code,
      assigned_to: assignedTo,
      previous_assigned_to: meta.assigned_to,
    },
  });

  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);
  redirectWithMessage(`/admin/requests/${requestId}`, "Assignment updated.");
}

export async function assignWebsiteRequestToMeAction(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) {
    redirectWithError("/admin/requests", "That assignment was incomplete.");
  }

  const meta = await loadRequestMeta(requestId);
  if (!meta) {
    redirectWithError("/admin/requests", "That request was not found.");
  }

  const gate = await requireStaffAction("requests.assign");
  if (!gate.ok) {
    redirectWithError(`/admin/requests/${requestId}`, gate.message);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("website_requests")
    .update({ assigned_to: gate.session.user.id })
    .eq("id", requestId);

  if (error) {
    redirectWithError(
      `/admin/requests/${requestId}`,
      "Could not update assignment. Try again.",
    );
  }

  await writeAuditEvent({
    action: REQUEST_AUDIT_ACTIONS.assigned,
    entityType: "website_request",
    entityId: requestId,
    actorId: gate.session.user.id,
    metadata: {
      reference_code: meta.reference_code,
      assigned_to: gate.session.user.id,
      previous_assigned_to: meta.assigned_to,
    },
  });

  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);
  redirectWithMessage(`/admin/requests/${requestId}`, "Assigned to you.");
}
