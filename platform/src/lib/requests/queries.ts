import { getStaffSession, staffHasPermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  isWebsiteRequestStatus,
  isWebsiteRequestTopic,
  previewMessage,
  type WebsiteRequestDetail,
  type WebsiteRequestEmailStatus,
  type WebsiteRequestListItem,
  type WebsiteRequestStatus,
  type WebsiteRequestTopic,
} from "@/lib/requests/types";

export async function requireRequestsSession(
  permission:
    | "requests.read"
    | "requests.update"
    | "requests.assign" = "requests.read",
) {
  const session = await getStaffSession();
  if (!session) {
    return { ok: false as const, reason: "unauthenticated" as const };
  }
  if (!staffHasPermission(session.profile, permission)) {
    return { ok: false as const, reason: "forbidden" as const, session };
  }
  return { ok: true as const, session };
}

function mapEmailStatus(
  value: string | null | undefined,
): WebsiteRequestEmailStatus {
  if (
    value === "pending" ||
    value === "sent" ||
    value === "failed" ||
    value === "skipped"
  ) {
    return value;
  }
  return "pending";
}

async function resolveAssigneeLabels(
  ids: string[],
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .in("id", unique);

  for (const row of data ?? []) {
    map.set(row.id, row.display_name?.trim() || row.email || row.id);
  }
  return map;
}

export async function listWebsiteRequests(input?: {
  status?: WebsiteRequestStatus | "all";
}): Promise<
  | {
      ok: true;
      items: WebsiteRequestListItem[];
      counts: Record<WebsiteRequestStatus, number>;
    }
  | { ok: false; reason: "unauthenticated" | "forbidden" }
> {
  const gate = await requireRequestsSession("requests.read");
  if (!gate.ok) return { ok: false, reason: gate.reason };

  const supabase = await createClient();
  let query = supabase
    .from("website_requests")
    .select(
      "id, reference_code, topic, full_name, message, status, assigned_to, created_at, email_notification_status",
    )
    .order("created_at", { ascending: false });

  if (
    input?.status &&
    input.status !== "all" &&
    isWebsiteRequestStatus(input.status)
  ) {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;
  if (error) {
    return {
      ok: true,
      items: [],
      counts: { new: 0, in_progress: 0, closed: 0 },
    };
  }

  const { data: countRows } = await supabase
    .from("website_requests")
    .select("status");

  const counts: Record<WebsiteRequestStatus, number> = {
    new: 0,
    in_progress: 0,
    closed: 0,
  };
  for (const row of countRows ?? []) {
    if (isWebsiteRequestStatus(row.status)) {
      counts[row.status] += 1;
    }
  }

  const assigneeIds = (data ?? [])
    .map((row) => row.assigned_to)
    .filter((id): id is string => Boolean(id));
  const labels = await resolveAssigneeLabels(assigneeIds);

  const items: WebsiteRequestListItem[] = (data ?? []).flatMap((row) => {
    if (
      !isWebsiteRequestTopic(row.topic) ||
      !isWebsiteRequestStatus(row.status)
    ) {
      return [];
    }
    return [
      {
        id: row.id,
        referenceCode: row.reference_code,
        topic: row.topic as WebsiteRequestTopic,
        fullName: row.full_name,
        messagePreview: previewMessage(row.message),
        status: row.status as WebsiteRequestStatus,
        assignedTo: row.assigned_to,
        assigneeLabel: row.assigned_to
          ? labels.get(row.assigned_to) ?? null
          : null,
        createdAt: row.created_at,
        emailNotificationStatus: mapEmailStatus(row.email_notification_status),
      },
    ];
  });

  return { ok: true, items, counts };
}

export async function openWebsiteRequest(
  requestId: string,
): Promise<
  | { ok: true; request: WebsiteRequestDetail }
  | { ok: false; reason: "unauthenticated" | "forbidden" | "not_found" }
> {
  const gate = await requireRequestsSession("requests.read");
  if (!gate.ok) return { ok: false, reason: gate.reason };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("website_requests")
    .select(
      "id, reference_code, topic, full_name, email, phone, message, source, status, assigned_to, created_at, updated_at, closed_at, email_notified_at, email_notification_status",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "not_found" };
  }
  if (
    !isWebsiteRequestTopic(data.topic) ||
    !isWebsiteRequestStatus(data.status)
  ) {
    return { ok: false, reason: "not_found" };
  }

  const labels = data.assigned_to
    ? await resolveAssigneeLabels([data.assigned_to])
    : new Map<string, string>();

  return {
    ok: true,
    request: {
      id: data.id,
      referenceCode: data.reference_code,
      topic: data.topic as WebsiteRequestTopic,
      fullName: data.full_name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      source: data.source,
      status: data.status as WebsiteRequestStatus,
      assignedTo: data.assigned_to,
      assigneeLabel: data.assigned_to
        ? labels.get(data.assigned_to) ?? null
        : null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      closedAt: data.closed_at,
      emailNotifiedAt: data.email_notified_at,
      emailNotificationStatus: mapEmailStatus(data.email_notification_status),
    },
  };
}

export async function listAssignableRequestStaff(): Promise<
  { id: string; label: string }[]
> {
  const gate = await requireRequestsSession("requests.assign");
  if (!gate.ok) return [];

  const supabase = await createClient();
  const { data } = await supabase.rpc("website_request_assignable_staff");
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const out: { id: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push({
      id: row.id,
      label: row.display_name?.trim() || row.email || row.id,
    });
  }
  return out;
}
