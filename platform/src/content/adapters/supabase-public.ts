import { ContentSourceError } from "@/content/errors";
import { livestreamPublic as livestreamCopy } from "@/content/seed/pages";
import type {
  Branch,
  BranchMediaItem,
  FeaturedProgram,
  LivestreamPublic,
  SermonPublic,
  ServiceTime,
} from "@/content/types";
import {
  formatProgramScheduleLabel,
  type ProgramSessionInput,
} from "@/lib/programs/schedule";
import {
  isProgramVisibleOnUpcomingSurfaces,
  mapScheduleSessionsForExpiry,
} from "@/lib/programs/expiry";
import { DEFAULT_PROGRAM_TIMEZONE } from "@/lib/programs/sessions";
import { effectiveLivestreamIsLive } from "@/lib/livestream/effective-live";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

type PhoneEntry = { display: string; tel: string };

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

function parsePhones(
  phonesJson: Json,
  phoneDisplay: string | null,
  phoneTel: string | null,
): PhoneEntry[] {
  if (Array.isArray(phonesJson) && phonesJson.length > 0) {
    const parsed: PhoneEntry[] = [];
    for (const item of phonesJson) {
      if (
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        typeof item.display === "string" &&
        typeof item.tel === "string"
      ) {
        parsed.push({ display: item.display, tel: item.tel });
      }
    }
    if (parsed.length > 0) return parsed;
  }
  if (phoneDisplay && phoneTel) {
    return [{ display: phoneDisplay, tel: phoneTel }];
  }
  return [];
}

export async function fetchPublishedBranches(): Promise<Branch[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("church_branches")
    .select(
      `
      id,
      slug,
      name,
      city_label,
      country,
      address_lines,
      phone_display,
      phone_tel,
      phones,
      email,
      maps_query,
      maps_url,
      phone_evidence_note,
      branch_service_times (
        day_label,
        time_label,
        note,
        sort_order
      )
    `,
    )
    .eq("is_public", true)
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  if (error) fail("fetchPublishedBranches", error);

  return (rows ?? []).map((row) => {
    const timesRaw = Array.isArray(row.branch_service_times)
      ? [...row.branch_service_times].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
        )
      : [];
    const serviceTimes: ServiceTime[] = timesRaw.map((t) => ({
      day: t.day_label,
      time: t.time_label,
      ...(t.note ? { note: t.note } : {}),
    }));
    const phones = parsePhones(row.phones, row.phone_display, row.phone_tel);
    const emails = row.email ? [row.email] : undefined;

    return {
      id: row.slug,
      slug: row.slug,
      name: row.name,
      cityLabel: row.city_label,
      country: row.country?.trim() ? row.country.trim() : null,
      addressLines: row.address_lines ?? [],
      phones,
      ...(emails ? { emails } : {}),
      serviceTimes,
      ...(row.phone_evidence_note
        ? { phoneEvidenceNote: row.phone_evidence_note }
        : {}),
      ...(row.maps_query ? { mapsQuery: row.maps_query } : {}),
      ...(row.maps_url ? { mapsUrl: row.maps_url } : {}),
    } satisfies Branch;
  });
}

export async function fetchFeaturedProgram(
  preferredId?: string | null,
): Promise<FeaturedProgram | null> {
  const supabase = await createClient();

  if (preferredId) {
    const { data: preferred, error: preferredError } = await supabase
      .from("programs")
      .select(
        `
        id,
        title,
        short_description,
        starts_at,
        ends_at,
        timezone,
        cta_label,
        cta_url,
        placement,
        status,
        featured_media:media_assets!programs_featured_media_id_fkey (
          public_url,
          alt_text
        ),
        program_sessions (
          session_date,
          start_time,
          end_time,
          label,
          sort_order
        )
      `,
      )
      .eq("id", preferredId)
      .eq("status", "published")
      .maybeSingle();

    if (preferredError) fail("fetchFeaturedProgram.preferred", preferredError);
    if (preferred) {
      const mapped = mapProgramRow(preferred as ProgramRow);
      if (mapped) return mapped;
    }
  }

  const { data: rows, error } = await supabase
    .from("programs")
    .select(
      `
      id,
      title,
      short_description,
      starts_at,
      ends_at,
      timezone,
      cta_label,
      cta_url,
      placement,
      status,
      featured_media:media_assets!programs_featured_media_id_fkey (
        public_url,
        alt_text
      ),
      program_sessions (
        session_date,
        start_time,
        end_time,
        label,
        sort_order
      )
    `,
    )
    .eq("status", "published")
    .eq("placement", "featured")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(8);

  if (error) fail("fetchFeaturedProgram", error);
  for (const row of rows ?? []) {
    const mapped = mapProgramRow(row as ProgramRow);
    if (mapped) return mapped;
  }
  return null;
}

type ProgramSessionRow = {
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  label: string | null;
  sort_order: number | null;
};

type ProgramRow = {
  id: string;
  title: string;
  short_description: string;
  starts_at: string | null;
  ends_at: string | null;
  timezone?: string | null;
  cta_label: string | null;
  cta_url: string | null;
  placement: FeaturedProgram["placement"];
  status: FeaturedProgram["status"];
  featured_media:
    | { public_url: string; alt_text: string }
    | { public_url: string; alt_text: string }[]
    | null;
  program_sessions?: ProgramSessionRow[] | null;
};

function mapSessions(rows: ProgramSessionRow[] | null | undefined): ProgramSessionInput[] {
  if (!rows?.length) return [];
  return rows.map((s) => ({
    sessionDate: s.session_date,
    startTime: s.start_time,
    endTime: s.end_time,
    label: s.label,
    sortOrder: s.sort_order ?? 0,
  }));
}

/** Returns null when the published program has fully expired for upcoming surfaces. */
function mapProgramRow(row: ProgramRow): FeaturedProgram | null {
  const sessions = mapSessions(row.program_sessions);
  const timeZone = row.timezone?.trim() || DEFAULT_PROGRAM_TIMEZONE;
  if (
    !isProgramVisibleOnUpcomingSurfaces(mapScheduleSessionsForExpiry(sessions), {
      timeZone,
    })
  ) {
    return null;
  }

  const media = Array.isArray(row.featured_media)
    ? row.featured_media[0]
    : row.featured_media;

  const datesLabel = formatProgramScheduleLabel(sessions, {
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  });

  return {
    id: row.id,
    title: row.title,
    shortDescription: row.short_description,
    datesLabel,
    imageSrc: media?.public_url ?? null,
    imageAlt: media?.alt_text ?? "",
    ctaLabel: row.cta_label ?? "Learn more",
    ctaHref: row.cta_url ?? "/events",
    placement: row.placement,
    status: row.status,
  };
}

export async function fetchPublishedSermons(
  limit = 12,
): Promise<SermonPublic[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("sermons")
    .select(
      `
      id,
      title,
      speaker,
      sermon_date,
      scripture_reference,
      summary,
      youtube_url,
      thumbnail:media_assets!sermons_thumbnail_media_id_fkey (
        public_url,
        alt_text
      )
    `,
    )
    .eq("status", "published")
    .order("sermon_date", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) fail("fetchPublishedSermons", error);

  return (rows ?? []).map((row) => {
    const thumb = Array.isArray(row.thumbnail)
      ? row.thumbnail[0]
      : row.thumbnail;
    return {
      id: row.id,
      title: row.title,
      speaker: row.speaker,
      sermonDate: row.sermon_date,
      scriptureReference: row.scripture_reference,
      summary: row.summary,
      youtubeUrl: row.youtube_url,
      thumbnailSrc: thumb?.public_url ?? null,
      thumbnailAlt: thumb?.alt_text ?? "",
    } satisfies SermonPublic;
  });
}

export async function fetchLivestreamPublic(): Promise<LivestreamPublic> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("livestream_settings")
    .select("facebook_url, is_live, auto_end_at")
    .eq("singleton_key", "default")
    .maybeSingle();

  if (error) fail("fetchLivestreamPublic", error);

  return {
    facebookPageUrl:
      row?.facebook_url ?? livestreamCopy.facebookPageUrl,
    isLive: effectiveLivestreamIsLive({
      isLive: row?.is_live ?? false,
      autoEndAt: row?.auto_end_at ?? null,
    }),
    heading: livestreamCopy.heading,
    notLiveMessage: livestreamCopy.notLiveMessage,
    liveMessage: livestreamCopy.liveMessage,
  };
}

export async function fetchBranchMediaBySlug(
  slug: string,
): Promise<BranchMediaItem[]> {
  const supabase = await createClient();
  const { data: branch, error: branchError } = await supabase
    .from("church_branches")
    .select("id, slug")
    .eq("slug", slug)
    .eq("is_public", true)
    .eq("status", "published")
    .maybeSingle();

  if (branchError) fail("fetchBranchMediaBySlug.branch", branchError);
  if (!branch) return [];

  const { data: rows, error } = await supabase
    .from("branch_media")
    .select(
      `
      id,
      placement,
      sort_order,
      alt_text_override,
      media:media_assets!branch_media_media_asset_id_fkey (
        public_url,
        alt_text,
        caption,
        archived_at
      )
    `,
    )
    .eq("branch_id", branch.id)
    .eq("is_active", true)
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  if (error) fail("fetchBranchMediaBySlug.media", error);

  const items: BranchMediaItem[] = [];
  for (const row of rows ?? []) {
    const media = Array.isArray(row.media) ? row.media[0] : row.media;
    if (!media || media.archived_at) continue;
    items.push({
      id: row.id,
      branchSlug: branch.slug,
      placement: row.placement,
      sortOrder: row.sort_order,
      imageSrc: media.public_url,
      altText: row.alt_text_override?.trim() || media.alt_text || "",
      caption: media.caption,
    });
  }
  return items;
}

/** Headquarters service times from published branch rows. */
export async function fetchHeadquartersServiceTimes(): Promise<ServiceTime[]> {
  const branches = await fetchPublishedBranches();
  const hq = branches.find((b) => b.id === "headquarters");
  if (!hq) {
    throw new ContentSourceError(
      "Content source failed (fetchHeadquartersServiceTimes): headquarters branch not found",
      { source: "supabase" },
    );
  }
  return hq.serviceTimes;
}

/** Published branch row or null. */
export async function fetchPublishedBranchBySlug(
  slug: string,
): Promise<Branch | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  const all = await fetchPublishedBranches();
  return all.find((branch) => branch.slug === normalized) ?? null;
}

export async function fetchWebsiteDocumentPayload(
  key: string,
): Promise<{ id: string; payload: Json; status: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("website_documents")
    .select("id, payload, status")
    .eq("document_key", key)
    .eq("status", "published")
    .maybeSingle();

  if (error) fail(`fetchWebsiteDocumentPayload.${key}`, error);
  return data;
}

export async function fetchMediaAssetPublic(id: string | null): Promise<{
  src: string;
  alt: string;
  width: number;
  height: number;
} | null> {
  if (!id) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media_assets")
    .select("public_url, alt_text, width_px, height_px, archived_at")
    .eq("id", id)
    .maybeSingle();

  if (error) fail("fetchMediaAssetPublic", error);
  if (!data || data.archived_at) return null;
  return {
    src: data.public_url,
    alt: data.alt_text,
    width: data.width_px ?? 1600,
    height: data.height_px ?? 900,
  };
}

export async function fetchHomeFeaturedSermon(): Promise<SermonPublic | null> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("sermons")
    .select(
      `
      id,
      title,
      speaker,
      sermon_date,
      scripture_reference,
      summary,
      youtube_url,
      thumbnail:media_assets!sermons_thumbnail_media_id_fkey (
        public_url,
        alt_text
      )
    `,
    )
    .eq("status", "published")
    .eq("home_featured", true)
    .maybeSingle();

  if (error) fail("fetchHomeFeaturedSermon", error);
  if (!row) return null;

  const thumb = Array.isArray(row.thumbnail) ? row.thumbnail[0] : row.thumbnail;
  return {
    id: row.id,
    title: row.title,
    speaker: row.speaker,
    sermonDate: row.sermon_date,
    scriptureReference: row.scripture_reference,
    summary: row.summary,
    youtubeUrl: row.youtube_url,
    thumbnailSrc: thumb?.public_url ?? null,
    thumbnailAlt: thumb?.alt_text ?? "",
  };
}

export async function fetchPublishedGivingAccounts(): Promise<
  import("@/content/types").GivingAccount[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("giving_accounts")
    .select(
      `
      stable_key,
      label,
      description,
      bank_name,
      account_name,
      swift_bic,
      visitor_note,
      display_order,
      giving_account_numbers (
        currency,
        account_number,
        display_order
      )
    `,
    )
    .eq("status", "published")
    .not("stable_key", "like", "staging-qa-%")
    .order("display_order", { ascending: true });

  if (error) fail("fetchPublishedGivingAccounts", error);

  const { mapGivingDestinationToPublic } = await import(
    "@/lib/giving/public-map"
  );
  const { accountRowToSnapshot } = await import("@/lib/giving/snapshot");

  return (data ?? []).map((row) =>
    mapGivingDestinationToPublic(
      accountRowToSnapshot({
        ...row,
        country: null,
        external_url: null,
        status: "published",
      }),
    ),
  );
}
