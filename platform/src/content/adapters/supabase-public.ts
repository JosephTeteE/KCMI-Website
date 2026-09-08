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

function formatProgramDates(
  startsAt: string | null,
  endsAt: string | null,
): string | null {
  if (!startsAt && !endsAt) return null;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  if (startsAt && endsAt) return `${fmt(startsAt)} – ${fmt(endsAt)}`;
  if (startsAt) return fmt(startsAt);
  return endsAt ? fmt(endsAt) : null;
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

export async function fetchFeaturedProgram(): Promise<FeaturedProgram | null> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("programs")
    .select(
      `
      id,
      title,
      short_description,
      starts_at,
      ends_at,
      cta_label,
      cta_url,
      placement,
      status,
      featured_media:media_assets!programs_featured_media_id_fkey (
        public_url,
        alt_text
      )
    `,
    )
    .eq("status", "published")
    .eq("placement", "featured")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) fail("fetchFeaturedProgram", error);
  if (!row) return null;

  const media = Array.isArray(row.featured_media)
    ? row.featured_media[0]
    : row.featured_media;

  return {
    id: row.id,
    title: row.title,
    shortDescription: row.short_description,
    datesLabel: formatProgramDates(row.starts_at, row.ends_at),
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
    .select("facebook_url, is_live")
    .eq("singleton_key", "default")
    .maybeSingle();

  if (error) fail("fetchLivestreamPublic", error);

  return {
    facebookPageUrl:
      row?.facebook_url ?? livestreamCopy.facebookPageUrl,
    isLive: row?.is_live ?? false,
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

/** Future `/locations/[branch-slug]` — published branch row or null. */
export async function fetchPublishedBranchBySlug(
  slug: string,
): Promise<Branch | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  const all = await fetchPublishedBranches();
  return all.find((branch) => branch.slug === normalized) ?? null;
}
