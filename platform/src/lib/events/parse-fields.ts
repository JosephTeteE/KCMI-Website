import type { Database } from "@/lib/supabase/database.types";
import { zonedLocalToUtcIso } from "@/lib/events/datetime";

export type EventKind = Database["public"]["Enums"]["event_kind"];

export const EVENT_KIND_OPTIONS: { value: EventKind; label: string }[] = [
  { value: "camp", label: "Camp" },
  { value: "conference", label: "Conference" },
  { value: "convention", label: "Convention" },
  { value: "retreat", label: "Retreat" },
  { value: "special_service", label: "Special service" },
  { value: "other", label: "Other gathering" },
];

export type ParsedEventFields = {
  title: string;
  theme: string | null;
  summary: string;
  body_text: string;
  event_kind: EventKind;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  venue_label: string | null;
  venue_city: string | null;
  venue_country: string | null;
  location_branch_id: string | null;
  contact_email: string | null;
  contact_phone_display: string | null;
  featured_media_id: string | null;
};

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

const KINDS = new Set<EventKind>(
  EVENT_KIND_OPTIONS.map((o) => o.value),
);

export function parseEventFields(
  formData: FormData,
): { ok: true; fields: ParsedEventFields } | { ok: false; error: string } {
  const title = emptyToNull(formData.get("title"));
  if (!title) {
    return { ok: false, error: "Please enter an event name." };
  }

  const kindRaw = emptyToNull(formData.get("event_kind")) ?? "other";
  if (!KINDS.has(kindRaw as EventKind)) {
    return { ok: false, error: "Choose what kind of event this is." };
  }
  const event_kind = kindRaw as EventKind;

  const summary = emptyToNull(formData.get("summary")) ?? "";
  const body_text = emptyToNull(formData.get("body_text")) ?? "";
  const theme = emptyToNull(formData.get("theme"));

  const timezone = emptyToNull(formData.get("timezone")) ?? "Africa/Lagos";
  const startDate = emptyToNull(formData.get("start_date"));
  if (!startDate) {
    return { ok: false, error: "Choose when the event starts." };
  }
  const startTime = emptyToNull(formData.get("start_time"));
  const starts_at = zonedLocalToUtcIso(startDate, startTime, timezone);
  if (!starts_at) {
    return { ok: false, error: "That start date or time could not be understood." };
  }

  const endDate = emptyToNull(formData.get("end_date"));
  const endTime = emptyToNull(formData.get("end_time"));
  let ends_at: string | null = null;
  if (endDate) {
    ends_at = zonedLocalToUtcIso(endDate, endTime, timezone);
    if (!ends_at) {
      return { ok: false, error: "That end date or time could not be understood." };
    }
    if (new Date(ends_at).getTime() < new Date(starts_at).getTime()) {
      return {
        ok: false,
        error: "The end cannot be earlier than the start.",
      };
    }
  }

  const contact_email = emptyToNull(formData.get("contact_email"));
  if (contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
    return { ok: false, error: "Enter a valid contact email, or leave it blank." };
  }

  return {
    ok: true,
    fields: {
      title,
      theme,
      summary,
      body_text,
      event_kind,
      starts_at,
      ends_at,
      timezone,
      venue_label: emptyToNull(formData.get("venue_label")),
      venue_city: emptyToNull(formData.get("venue_city")),
      venue_country: emptyToNull(formData.get("venue_country")),
      location_branch_id: emptyToNull(formData.get("location_branch_id")),
      contact_email,
      contact_phone_display: emptyToNull(formData.get("contact_phone_display")),
      featured_media_id: emptyToNull(formData.get("featured_media_id")),
    },
  };
}
