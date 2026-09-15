import { assertAal2, staffHasPermission } from "@/lib/auth/session";
import {
  canAssignCareDomain,
  canReadCareDomain,
  canViewCareHub,
  canViewCareRequestRow,
  careReadPermission,
} from "@/lib/care/access";
import type {
  CareCaseNote,
  CareContactMethod,
  CareRequestDetail,
  CareRequestListItem,
  CareRequestStatus,
  CareServiceType,
} from "@/lib/care/types";
import { CARE_AUDIT_ACTIONS } from "@/lib/care/types";
import { writeAuditEvent } from "@/lib/cms/audit";
import { createClient } from "@/lib/supabase/server";
import type { Permission } from "@/lib/authorization/rbac";

function isCareServiceType(value: string): value is CareServiceType {
  return value === "prayer" || value === "pastoral" || value === "welfare";
}

function isCareStatus(value: string): value is CareRequestStatus {
  return value === "new" || value === "in_progress" || value === "closed";
}

function isContactMethod(value: string | null): value is CareContactMethod {
  return value === "email" || value === "phone" || value === "either";
}

function mapListRow(row: {
  id: string;
  reference_code: string;
  service_type: string;
  status: string;
  submitted_at: string;
  branch_id: string | null;
  assigned_to: string | null;
  display_name: string | null;
  contact_requested: boolean;
}): CareRequestListItem | null {
  if (!isCareServiceType(row.service_type) || !isCareStatus(row.status)) {
    return null;
  }
  return {
    id: row.id,
    referenceCode: row.reference_code,
    serviceType: row.service_type,
    status: row.status,
    submittedAt: row.submitted_at,
    branchId: row.branch_id,
    assignedTo: row.assigned_to,
    displayName: row.display_name,
    contactRequested: row.contact_requested,
  };
}

/**
 * Care Hub gate: AAL2 + at least one Care read permission.
 * Does not use service-role — RLS applies to the staff JWT.
 */
export async function requireCareSession(permission?: Permission) {
  const aal = await assertAal2();
  if (!aal.ok) {
    return { ok: false as const, reason: aal.reason };
  }
  const perms = aal.session.profile.permissions;
  if (permission) {
    if (!staffHasPermission(aal.session.profile, permission)) {
      return { ok: false as const, reason: "permission" as const };
    }
  } else if (!canViewCareHub(perms)) {
    return { ok: false as const, reason: "permission" as const };
  }
  return { ok: true as const, session: aal.session };
}

export async function listCareRequests(
  service: CareServiceType,
): Promise<
  | { ok: true; items: CareRequestListItem[] }
  | { ok: false; reason: "aal2_required" | "unauthenticated" | "inactive_or_missing" | "permission" }
> {
  const gate = await requireCareSession(careReadPermission(service));
  if (!gate.ok) {
    return {
      ok: false,
      reason:
        gate.reason === "permission"
          ? "permission"
          : gate.reason === "aal2_required"
            ? "aal2_required"
            : gate.reason === "unauthenticated"
              ? "unauthenticated"
              : "inactive_or_missing",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pastoral_requests")
    .select(
      "id, reference_code, service_type, status, submitted_at, branch_id, assigned_to, display_name, contact_requested",
    )
    .eq("service_type", service)
    .order("submitted_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`Care list failed: ${error.message}`);
  }

  const items: CareRequestListItem[] = [];
  for (const row of data ?? []) {
    const mapped = mapListRow(row);
    if (!mapped) continue;
    if (
      !canViewCareRequestRow({
        permissions: gate.session.profile.permissions,
        service: mapped.serviceType,
        assignedTo: mapped.assignedTo,
        viewerId: gate.session.user.id,
      })
    ) {
      continue;
    }
    items.push(mapped);
  }

  return { ok: true, items };
}

export async function openCareRequest(requestId: string): Promise<
  | {
      ok: true;
      request: CareRequestDetail;
      notes: CareCaseNote[];
    }
  | {
      ok: false;
      reason:
        | "aal2_required"
        | "unauthenticated"
        | "inactive_or_missing"
        | "permission"
        | "not_found";
    }
> {
  const gate = await requireCareSession();
  if (!gate.ok) {
    return {
      ok: false,
      reason:
        gate.reason === "permission"
          ? "permission"
          : gate.reason === "aal2_required"
            ? "aal2_required"
            : gate.reason === "unauthenticated"
              ? "unauthenticated"
              : "inactive_or_missing",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pastoral_requests")
    .select(
      "id, reference_code, service_type, status, submitted_at, branch_id, assigned_to, display_name, contact_requested, email, phone, preferred_contact_method, preferred_contact_timing, narrative, closed_at, created_at, updated_at",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw new Error(`Care open failed: ${error.message}`);
  }
  if (!data || !isCareServiceType(data.service_type) || !isCareStatus(data.status)) {
    return { ok: false, reason: "not_found" };
  }

  if (
    !canViewCareRequestRow({
      permissions: gate.session.profile.permissions,
      service: data.service_type,
      assignedTo: data.assigned_to,
      viewerId: gate.session.user.id,
    })
  ) {
    return { ok: false, reason: "permission" };
  }

  if (!canReadCareDomain(gate.session.profile.permissions, data.service_type)) {
    return { ok: false, reason: "permission" };
  }

  const request: CareRequestDetail = {
    id: data.id,
    referenceCode: data.reference_code,
    serviceType: data.service_type,
    status: data.status,
    submittedAt: data.submitted_at,
    branchId: data.branch_id,
    assignedTo: data.assigned_to,
    displayName: data.display_name,
    contactRequested: data.contact_requested,
    email: data.email,
    phone: data.phone,
    preferredContactMethod: isContactMethod(data.preferred_contact_method)
      ? data.preferred_contact_method
      : null,
    preferredContactTiming: data.preferred_contact_timing,
    narrative: data.narrative,
    closedAt: data.closed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  const { data: noteRows, error: noteError } = await supabase
    .from("pastoral_case_notes")
    .select("id, request_id, author_id, body, created_at, updated_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (noteError) {
    throw new Error(`Care notes failed: ${noteError.message}`);
  }

  const notes: CareCaseNote[] = (noteRows ?? []).map((n) => ({
    id: n.id,
    requestId: n.request_id,
    authorId: n.author_id,
    body: n.body,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  }));

  // Sensitive READ audit — never include narrative or note bodies
  await writeAuditEvent({
    action: CARE_AUDIT_ACTIONS.opened,
    entityType: "pastoral_request",
    entityId: request.id,
    actorId: gate.session.user.id,
    metadata: {
      service_type: request.serviceType,
      reference_code: request.referenceCode,
      status: request.status,
    },
  });

  return { ok: true, request, notes };
}

export function careCanMutateStatus(
  permissions: readonly Permission[],
  service: CareServiceType,
  next: CareRequestStatus,
  current: CareRequestStatus,
): boolean {
  if (!canReadCareDomain(permissions, service)) return false;
  if (current === "closed" && next !== "closed") {
    return canAssignCareDomain(permissions, service);
  }
  return true;
}
