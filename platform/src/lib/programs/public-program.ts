import { ContentSourceError } from "@/content/errors";
import {
  formatProgramScheduleLabel,
  type ProgramSessionInput,
} from "@/lib/programs/schedule";
import { createClient } from "@/lib/supabase/server";

export type PublicProgramDetail = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  bodyText: string;
  datesLabel: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  imageSrc: string | null;
  imageAlt: string;
};

/**
 * Published program for the public `/programs/[slug]` destination.
 * Drafts and unpublished rows return null (anon RLS + explicit filter).
 */
export async function fetchPublishedProgramBySlug(
  slug: string,
): Promise<PublicProgramDetail | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("programs")
    .select(
      `
      id,
      slug,
      title,
      short_description,
      body_text,
      starts_at,
      ends_at,
      cta_label,
      cta_url,
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
    .eq("slug", normalized)
    .eq("status", "published")
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new ContentSourceError(
      `Content source failed (fetchPublishedProgramBySlug): ${error.message}`,
      { source: "supabase", cause: error },
    );
  }
  if (!row) return null;

  const media = Array.isArray(row.featured_media)
    ? row.featured_media[0]
    : row.featured_media;

  const sessions: ProgramSessionInput[] = Array.isArray(row.program_sessions)
    ? row.program_sessions.map((s) => ({
        sessionDate: s.session_date,
        startTime: s.start_time,
        endTime: s.end_time,
        label: s.label,
        sortOrder: s.sort_order ?? 0,
      }))
    : [];

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.short_description,
    bodyText: row.body_text,
    datesLabel: formatProgramScheduleLabel(sessions, {
      startsAt: row.starts_at,
      endsAt: row.ends_at,
    }),
    ctaLabel: row.cta_label,
    ctaUrl: row.cta_url,
    imageSrc: media?.public_url ?? null,
    imageAlt: media?.alt_text ?? "",
  };
}
