import { ContentSourceError } from "@/content/errors";
import {
  formatProgramScheduleLabel,
  type ProgramSessionInput,
} from "@/lib/programs/schedule";
import {
  isScheduledUpcomingForHomepage,
  mapScheduleSessionsForExpiry,
  nextUpcomingSessionStartIso,
  normalizeSessionCalendarDate,
} from "@/lib/programs/expiry";
import { DEFAULT_PROGRAM_TIMEZONE } from "@/lib/programs/sessions";
import { createPublicContentClient } from "@/lib/supabase/server";

export type UpcomingProgramCard = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  nextDatesLabel: string | null;
  locationLabel: string | null;
  imageSrc: string | null;
  imageAlt: string;
  href: string;
  nextStartIso: string;
};

function locationLabelFor(row: {
  location_kind: string | null;
  location_label: string | null;
  location_branch?:
    | { name: string }
    | { name: string }[]
    | null;
}): string | null {
  if (row.location_kind === "branch") {
    const branch = Array.isArray(row.location_branch)
      ? row.location_branch[0]
      : row.location_branch;
    return branch?.name?.trim() || null;
  }
  if (
    row.location_kind === "venue" ||
    row.location_kind === "online" ||
    row.location_kind === "hybrid"
  ) {
    return row.location_label?.trim() || null;
  }
  return null;
}

const PUBLISHED_PROGRAM_SELECT = `
      id,
      slug,
      title,
      short_description,
      timezone,
      location_kind,
      location_label,
      status,
      archived_at,
      featured_media:media_assets!programs_featured_media_id_fkey (
        public_url,
        alt_text
      ),
      location_branch:church_branches!programs_location_branch_id_fkey (
        name
      ),
      program_sessions (
        session_date,
        start_time,
        end_time,
        label,
        sort_order
      )
    `;

type PublishedProgramRow = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  timezone: string | null;
  location_kind: string | null;
  location_label: string | null;
  featured_media:
    | { public_url: string | null; alt_text: string | null }
    | { public_url: string | null; alt_text: string | null }[]
    | null;
  location_branch: { name: string } | { name: string }[] | null;
  program_sessions:
    | {
        session_date: string;
        start_time: string | null;
        end_time: string | null;
        label: string | null;
        sort_order: number | null;
      }[]
    | null;
};

async function loadPublishedPrograms(): Promise<PublishedProgramRow[]> {
  const supabase = await createPublicContentClient();
  const { data: rows, error } = await supabase
    .from("programs")
    .select(PUBLISHED_PROGRAM_SELECT)
    .eq("status", "published")
    .is("archived_at", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (error) {
    throw new ContentSourceError(
      `Content source failed (loadPublishedPrograms): ${error.message}`,
      { source: "supabase", cause: error },
    );
  }

  return (rows ?? []) as unknown as PublishedProgramRow[];
}

/**
 * Apply the caller's limit. Homepage passes 3. /programs passes a larger
 * number. This must not reintroduce a homepage-only cap of 3.
 */
export function limitProgramCards<T>(cards: readonly T[], requested: number): T[] {
  const cap = Math.max(1, Math.min(requested, 48));
  return cards.slice(0, cap);
}

function cardFromRow(
  row: PublishedProgramRow,
  sessions: ProgramSessionInput[],
  nextStartIso: string,
): UpcomingProgramCard {
  const media = Array.isArray(row.featured_media)
    ? row.featured_media[0]
    : row.featured_media;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.short_description ?? "",
    nextDatesLabel: formatProgramScheduleLabel(sessions),
    locationLabel: locationLabelFor(row),
    imageSrc: media?.public_url ?? null,
    imageAlt: media?.alt_text ?? "",
    href: `/programs/${row.slug}`,
    nextStartIso,
  };
}

/**
 * Published, scheduled Programs still upcoming — for homepage discovery.
 * Unscheduled flyer programs are excluded (they stay on /programs).
 */
export async function fetchUpcomingProgramsForHomepage(
  limit = 3,
): Promise<UpcomingProgramCard[]> {
  const rows = await loadPublishedPrograms();

  const scored: UpcomingProgramCard[] = [];
  for (const row of rows) {
    const sessions: ProgramSessionInput[] = Array.isArray(row.program_sessions)
      ? row.program_sessions.map((s) => ({
          sessionDate: s.session_date,
          startTime: s.start_time,
          endTime: s.end_time,
          label: s.label,
          sortOrder: s.sort_order ?? 0,
        }))
      : [];
    const timeZone = row.timezone?.trim() || DEFAULT_PROGRAM_TIMEZONE;
    if (
      !isScheduledUpcomingForHomepage(mapScheduleSessionsForExpiry(sessions), {
        timeZone,
      })
    ) {
      continue;
    }
    const nextStartIso = nextUpcomingSessionStartIso(
      mapScheduleSessionsForExpiry(sessions),
      { timeZone },
    );
    if (!nextStartIso) continue;

    scored.push(cardFromRow(row, sessions, nextStartIso));
  }

  scored.sort((a, b) => a.nextStartIso.localeCompare(b.nextStartIso));
  return limitProgramCards(scored, limit);
}

/**
 * Published programs with no schedule. They are not "upcoming", but they must
 * remain discoverable on /programs. Expired scheduled programs are excluded.
 */
export async function fetchUnscheduledPublishedPrograms(
  limit = 24,
): Promise<UpcomingProgramCard[]> {
  const rows = await loadPublishedPrograms();
  const cards: UpcomingProgramCard[] = [];
  for (const row of rows) {
    const sessions: ProgramSessionInput[] = Array.isArray(row.program_sessions)
      ? row.program_sessions.map((s) => ({
          sessionDate: s.session_date,
          startTime: s.start_time,
          endTime: s.end_time,
          label: s.label,
          sortOrder: s.sort_order ?? 0,
        }))
      : [];
    if (
      sessions.some((session) => normalizeSessionCalendarDate(session.sessionDate))
    ) {
      continue;
    }
    cards.push(cardFromRow(row, [], ""));
  }
  return limitProgramCards(cards, limit);
}
