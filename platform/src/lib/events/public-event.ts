import { ContentSourceError } from "@/content/errors";
import { publicPlaceLabel } from "@/content/branch-groups";
import {
  eventKindLabel,
  formatEventDateLabel,
  isPastEvent,
} from "@/lib/events/format";
import {
  reviewEventBySlug,
  reviewPublishedEvents,
  shouldUseEventsReviewFixtures,
} from "@/lib/events/review-fixtures";
import type {
  PublicEventCard,
  PublicEventDetail,
  PublicEventKind,
} from "@/lib/events/types";
import { createClient } from "@/lib/supabase/server";
import { shouldUseSeedContent } from "@/lib/env";

export type {
  PublicEventCard,
  PublicEventDetail,
  PublicEventKind,
} from "@/lib/events/types";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  theme: string | null;
  summary: string;
  body_text: string;
  event_kind: PublicEventKind;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  venue_label: string | null;
  venue_city: string | null;
  venue_country: string | null;
  contact_email: string | null;
  contact_phone_display: string | null;
  registration_enabled: boolean | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  capacity: number | null;
  featured_media:
    | { public_url: string; alt_text: string }
    | { public_url: string; alt_text: string }[]
    | null;
  location_branch:
    | {
        slug: string;
        name: string;
        city_label: string;
        country: string | null;
        is_public: boolean;
        status: string;
      }
    | {
        slug: string;
        name: string;
        city_label: string;
        country: string | null;
        is_public: boolean;
        status: string;
      }[]
    | null;
};

function fail(operation: string, cause: unknown): never {
  const detail =
    cause && typeof cause === "object" && "message" in cause
      ? String((cause as { message: unknown }).message)
      : cause instanceof Error
        ? cause.message
        : String(cause ?? "unknown error");
  throw new ContentSourceError(`Content source failed (${operation}): ${detail}`, {
    source: "supabase",
    cause,
  });
}

function mediaOf(row: EventRow) {
  return Array.isArray(row.featured_media)
    ? row.featured_media[0]
    : row.featured_media;
}

function branchOf(row: EventRow) {
  const raw = Array.isArray(row.location_branch)
    ? row.location_branch[0]
    : row.location_branch;
  if (!raw) return null;
  if (raw.is_public !== true || raw.status !== "published") return null;
  return raw;
}

function placeFrom(row: EventRow): string | null {
  const branch = branchOf(row);
  if (branch) {
    return publicPlaceLabel(branch.city_label, branch.country) || null;
  }
  return publicPlaceLabel(row.venue_city, row.venue_country) || null;
}

function mapCard(row: EventRow, now = new Date()): PublicEventCard {
  const media = mediaOf(row);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    theme: row.theme?.trim() ? row.theme.trim() : null,
    summary: row.summary,
    kind: row.event_kind,
    kindLabel: eventKindLabel(row.event_kind),
    datesLabel: formatEventDateLabel({
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      timezone: row.timezone,
    }),
    venueLabel: row.venue_label?.trim() ? row.venue_label.trim() : null,
    placeLabel: placeFrom(row),
    imageSrc: media?.public_url ?? null,
    imageAlt: media?.alt_text ?? "",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isPast: isPastEvent(
      { startsAt: row.starts_at, endsAt: row.ends_at },
      now,
    ),
  };
}

function mapDetail(
  row: EventRow,
  registeredPeople = 0,
  now = new Date(),
): PublicEventDetail {
  const card = mapCard(row, now);
  const branch = branchOf(row);
  return {
    ...card,
    bodyText: row.body_text,
    timezone: row.timezone,
    contactEmail: row.contact_email?.trim() ? row.contact_email.trim() : null,
    contactPhoneDisplay: row.contact_phone_display?.trim()
      ? row.contact_phone_display.trim()
      : null,
    branchName: branch?.name ?? null,
    branchSlug: branch?.slug ?? null,
    registration: {
      enabled: row.registration_enabled === true,
      opensAt: row.registration_opens_at,
      closesAt: row.registration_closes_at,
      capacity: row.capacity,
      registeredPeople,
    },
  };
}

const EVENT_SELECT = `
  id,
  slug,
  title,
  theme,
  summary,
  body_text,
  event_kind,
  starts_at,
  ends_at,
  timezone,
  venue_label,
  venue_city,
  venue_country,
  contact_email,
  contact_phone_display,
  registration_enabled,
  registration_opens_at,
  registration_closes_at,
  capacity,
  featured_media:media_assets!events_featured_media_id_fkey (
    public_url,
    alt_text
  ),
  location_branch:church_branches!events_location_branch_id_fkey (
    slug,
    name,
    city_label,
    country,
    is_public,
    status
  )
`;

async function fetchRegisteredPeople(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("public_event_registered_people", {
    p_event_id: eventId,
  });
  if (error || typeof data !== "number") return 0;
  return data;
}

/**
 * Published events only. Seed mode returns empty (no invented Camp content).
 * Review fixtures are opt-in via EVENTS_E1_REVIEW_FIXTURES=1 (non-production).
 */
export async function fetchPublishedEvents(): Promise<{
  upcoming: PublicEventCard[];
  past: PublicEventCard[];
}> {
  if (shouldUseEventsReviewFixtures()) {
    return reviewPublishedEvents();
  }
  if (shouldUseSeedContent()) {
    return { upcoming: [], past: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("status", "published")
    .order("starts_at", { ascending: true });

  if (error) fail("fetchPublishedEvents", error);

  const now = new Date();
  const upcoming: PublicEventCard[] = [];
  const past: PublicEventCard[] = [];
  for (const row of (data ?? []) as EventRow[]) {
    const card = mapCard(row, now);
    if (card.isPast) past.push(card);
    else upcoming.push(card);
  }
  past.sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  return { upcoming, past };
}

export async function fetchPublishedEventBySlug(
  slug: string,
): Promise<PublicEventDetail | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  if (shouldUseEventsReviewFixtures()) {
    return reviewEventBySlug(normalized);
  }
  if (shouldUseSeedContent()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("slug", normalized)
    .eq("status", "published")
    .maybeSingle();

  if (error) fail("fetchPublishedEventBySlug", error);
  if (!data) return null;
  const row = data as EventRow;
  const registeredPeople =
    row.registration_enabled === true
      ? await fetchRegisteredPeople(supabase, row.id)
      : 0;
  return mapDetail(row, registeredPeople);
}

/**
 * Sync scaffold guard used by coverage tests.
 * Public pages must use `fetchPublishedEventBySlug` (published-only).
 * Always returns null — never invents Camp or draft content.
 */
export function resolvePublicEventSlug(_slug: string): null {
  void _slug;
  return null;
}

/** Test/helpers: partition without DB. */
export function partitionEventsByTime(
  events: PublicEventCard[],
  now = new Date(),
): { upcoming: PublicEventCard[]; past: PublicEventCard[] } {
  const upcoming: PublicEventCard[] = [];
  const past: PublicEventCard[] = [];
  for (const event of events) {
    const pastFlag = isPastEvent(
      { startsAt: event.startsAt, endsAt: event.endsAt },
      now,
    );
    if (pastFlag) past.push({ ...event, isPast: true });
    else upcoming.push({ ...event, isPast: false });
  }
  upcoming.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  past.sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  return { upcoming, past };
}
