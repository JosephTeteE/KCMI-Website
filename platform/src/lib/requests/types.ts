export const WEBSITE_REQUEST_TOPICS = [
  "general",
  "cell_fellowship",
  "service_volunteer",
  "testimony_thanksgiving",
  "other",
] as const;

export type WebsiteRequestTopic = (typeof WEBSITE_REQUEST_TOPICS)[number];

export const WEBSITE_REQUEST_TOPIC_LABELS: Record<WebsiteRequestTopic, string> =
  {
    general: "General enquiry",
    cell_fellowship: "Cell Fellowship",
    service_volunteer: "Service / Volunteer interest",
    testimony_thanksgiving: "Testimony / Thanksgiving",
    other: "Other",
  };

/** URL query values → topic (safe allowlist). */
export const WEBSITE_REQUEST_TOPIC_QUERY: Record<string, WebsiteRequestTopic> = {
  general: "general",
  "cell-fellowship": "cell_fellowship",
  cell: "cell_fellowship",
  "service-team": "service_volunteer",
  service: "service_volunteer",
  volunteer: "service_volunteer",
  testimony: "testimony_thanksgiving",
  thanksgiving: "testimony_thanksgiving",
  other: "other",
};

export const WEBSITE_REQUEST_STATUSES = [
  "new",
  "in_progress",
  "closed",
] as const;

export type WebsiteRequestStatus = (typeof WEBSITE_REQUEST_STATUSES)[number];

export const WEBSITE_REQUEST_STATUS_LABELS: Record<
  WebsiteRequestStatus,
  string
> = {
  new: "New",
  in_progress: "In progress",
  closed: "Closed",
};

export type WebsiteRequestEmailStatus =
  | "pending"
  | "sent"
  | "failed"
  | "skipped";

export const REQUEST_AUDIT_ACTIONS = {
  assigned: "request.assigned",
  statusChanged: "request.status_changed",
} as const;

export type WebsiteRequestListItem = {
  id: string;
  referenceCode: string;
  topic: WebsiteRequestTopic;
  fullName: string;
  messagePreview: string;
  status: WebsiteRequestStatus;
  assignedTo: string | null;
  assigneeLabel: string | null;
  createdAt: string;
  emailNotificationStatus: WebsiteRequestEmailStatus;
};

export type WebsiteRequestDetail = {
  id: string;
  referenceCode: string;
  topic: WebsiteRequestTopic;
  fullName: string;
  email: string;
  phone: string | null;
  message: string;
  source: string;
  status: WebsiteRequestStatus;
  assignedTo: string | null;
  assigneeLabel: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  emailNotifiedAt: string | null;
  emailNotificationStatus: WebsiteRequestEmailStatus;
};

export function isWebsiteRequestTopic(
  value: string,
): value is WebsiteRequestTopic {
  return (WEBSITE_REQUEST_TOPICS as readonly string[]).includes(value);
}

export function isWebsiteRequestStatus(
  value: string,
): value is WebsiteRequestStatus {
  return (WEBSITE_REQUEST_STATUSES as readonly string[]).includes(value);
}

export function parseTopicQuery(
  raw: string | null | undefined,
): WebsiteRequestTopic | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return WEBSITE_REQUEST_TOPIC_QUERY[key] ?? null;
}

export function previewMessage(message: string, max = 120): string {
  const trimmed = message.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
