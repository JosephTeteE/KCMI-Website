/** Care domain types — HIGHLY_SENSITIVE narratives live only in pastoral_* tables. */

export const CARE_SERVICE_TYPES = ["prayer", "pastoral", "welfare"] as const;
export type CareServiceType = (typeof CARE_SERVICE_TYPES)[number];

export const CARE_STATUSES = ["new", "in_progress", "closed"] as const;
export type CareRequestStatus = (typeof CARE_STATUSES)[number];

export const CARE_CONTACT_METHODS = [
  "email",
  "phone",
  "either",
  "in_person",
] as const;
export type CareContactMethod = (typeof CARE_CONTACT_METHODS)[number];

export const CARE_CONTACT_METHOD_LABELS: Record<CareContactMethod, string> = {
  email: "Email",
  phone: "By phone",
  either: "Either",
  in_person: "In person",
};

/** Structured Welfare support categories (not medical intake). */
export const WELFARE_REQUEST_CATEGORIES = [
  "financial",
  "food",
  "clothing",
  "shelter",
  "medical",
  "other",
] as const;
export type WelfareRequestCategory = (typeof WELFARE_REQUEST_CATEGORIES)[number];

export const WELFARE_REQUEST_CATEGORY_LABELS: Record<
  WelfareRequestCategory,
  string
> = {
  financial: "Financial",
  food: "Food",
  clothing: "Clothing",
  shelter: "Shelter",
  medical: "Medical",
  other: "Other",
};

export const CARE_SERVICE_LABELS: Record<CareServiceType, string> = {
  prayer: "Prayer",
  pastoral: "Pastoral Care",
  welfare: "Welfare",
};

export const CARE_STATUS_LABELS: Record<CareRequestStatus, string> = {
  new: "New",
  in_progress: "In progress",
  closed: "Closed",
};

/** Hub routes for Care tabs (permission-filtered). */
export const CARE_TAB_HREFS: Record<CareServiceType, string> = {
  prayer: "/admin/care/prayer",
  pastoral: "/admin/care/pastoral",
  welfare: "/admin/care/welfare",
};

export type CareRequestListItem = {
  id: string;
  referenceCode: string;
  serviceType: CareServiceType;
  status: CareRequestStatus;
  submittedAt: string;
  branchId: string | null;
  assignedTo: string | null;
  displayName: string | null;
  contactRequested: boolean;
  /** Welfare only — safe structured category for list metadata. */
  requestCategory: WelfareRequestCategory | null;
};

export type CareRequestDetail = CareRequestListItem & {
  email: string | null;
  phone: string | null;
  preferredContactMethod: CareContactMethod | null;
  preferredContactTiming: string | null;
  narrative: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CareCaseNote = {
  id: string;
  requestId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

/** Provisional retention (documented; deletion jobs deferred). */
export const CARE_RETENTION = {
  prayerMonthsAfterClose: 6,
  pastoralMonthsAfterClose: 12,
  welfareMonthsAfterClose: 12,
  auditMetadataMonths: 24,
} as const;

export const CARE_AUDIT_ACTIONS = {
  received: "care.request.received",
  opened: "care.request.opened",
  assigned: "care.request.assigned",
  statusChanged: "care.request.status_changed",
  noteAdded: "care.note.added",
  closed: "care.request.closed",
  reopened: "care.request.reopened",
} as const;
