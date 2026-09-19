import { branches as seedBranches } from "@/content/seed/branches";
import { publicPlaceLabel } from "@/content/branch-groups";
import { shouldUseSeedContent } from "@/lib/env";
import {
  PUBLIC_SEARCH_EXCLUDED_PATH_PREFIXES,
  PUBLIC_SEARCH_PAGE_CATALOG,
} from "@/lib/search/page-catalog";
import { normalizeSearchQuery, parseSearchTypeFilter, prepareSearchQuery } from "@/lib/search/normalize";
import { rankAndFilterResults } from "@/lib/search/rank";
import type {
  PublicSearchResult,
  PublicSearchResultType,
  PublicSearchTypeFilter,
} from "@/lib/search/types";
import { isProgramVisibleOnUpcomingSurfaces } from "@/lib/programs/expiry";
import { DEFAULT_PROGRAM_TIMEZONE } from "@/lib/programs/sessions";
import { createClient } from "@/lib/supabase/server";

export type SearchPublicInput = {
  query: string | null | undefined;
  type?: string | null | undefined;
  limit?: number;
};

function isExcludedUrl(url: string): boolean {
  return PUBLIC_SEARCH_EXCLUDED_PATH_PREFIXES.some(
    (prefix) => url === prefix || url.startsWith(`${prefix}/`),
  );
}

function sanitizeResult(row: PublicSearchResult): PublicSearchResult | null {
  if (!row.title?.trim() || !row.url?.trim()) return null;
  if (!row.url.startsWith("/")) return null;
  if (isExcludedUrl(row.url.split("#")[0]!)) return null;
  if (
    row.type !== "page" &&
    row.type !== "program" &&
    row.type !== "sermon" &&
    row.type !== "location"
  ) {
    return null;
  }
  return {
    type: row.type,
    title: row.title.trim(),
    summary: row.summary?.trim() ? row.summary.trim() : null,
    url: row.url.trim(),
    context: row.context?.trim() ? row.context.trim() : null,
    imageUrl: row.imageUrl?.trim() ? row.imageUrl.trim() : null,
    rankScore: row.rankScore,
  };
}

function searchSeedCorpus(
  query: string,
  type: PublicSearchTypeFilter,
  limit: number,
): PublicSearchResult[] {
  const pageCandidates = PUBLIC_SEARCH_PAGE_CATALOG.map((page) => ({
    type: page.type,
    title: page.title,
    summary: page.summary,
    url: page.url,
    context: page.context,
    imageUrl: page.imageUrl,
  }));
  const pageBodies = new Map(
    PUBLIC_SEARCH_PAGE_CATALOG.map((page) => [
      `${page.type}:${page.url}`,
      page.body,
    ]),
  );

  const locationCandidates = seedBranches.map((branch) => ({
    type: "location" as const,
    title: branch.name,
    summary: publicPlaceLabel(branch.cityLabel, branch.country) || null,
    url: `/locations/${branch.slug}`,
    context: "Location",
    imageUrl: null,
  }));
  const locationBodies = new Map(
    seedBranches.map((branch) => [
      `location:/locations/${branch.slug}`,
      [
        branch.name,
        branch.cityLabel,
        branch.country ?? "",
        ...(branch.addressLines ?? []),
        branch.slug,
      ].join(" "),
    ]),
  );

  const bodies = new Map([...pageBodies, ...locationBodies]);
  let results = rankAndFilterResults(
    query,
    [...pageCandidates, ...locationCandidates],
    bodies,
  );

  if (type !== "all") {
    results = results.filter((r) => r.type === type);
  }

  return results.slice(0, limit);
}

type RpcRow = {
  result_type: string;
  title: string;
  summary: string | null;
  url: string;
  context: string | null;
  image_url: string | null;
  rank_score: number;
};

async function searchViaRpc(
  query: string,
  type: PublicSearchTypeFilter,
  limit: number,
): Promise<PublicSearchResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_public_content", {
    p_query: query,
    p_type: type === "all" ? null : type,
    p_limit: limit,
  });

  if (error) {
    throw new Error(`Public search failed: ${error.message}`);
  }

  const rows = (data ?? []) as RpcRow[];
  const out: PublicSearchResult[] = [];
  for (const row of rows) {
    const sanitized = sanitizeResult({
      type: row.result_type as PublicSearchResultType,
      title: row.title,
      summary: row.summary,
      url: row.url,
      context: row.context,
      imageUrl: row.image_url,
      rankScore: Number(row.rank_score) || 0,
    });
    if (sanitized) out.push(sanitized);
  }
  return excludeExpiredProgramSearchHits(out);
}

/**
 * Read-time filter: expired scheduled programs must not appear as upcoming
 * search hits. Unscheduled (no sessions) programs remain searchable.
 */
async function excludeExpiredProgramSearchHits(
  results: PublicSearchResult[],
): Promise<PublicSearchResult[]> {
  const programHits = results.filter((row) => row.type === "program");
  if (programHits.length === 0) return results;

  const slugs = programHits
    .map((row) => row.url.replace(/^\/programs\//, "").split("?")[0]!)
    .filter(Boolean);
  if (slugs.length === 0) return results;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programs")
    .select(
      `
      slug,
      timezone,
      program_sessions (
        session_date,
        start_time,
        end_time
      )
    `,
    )
    .in("slug", slugs)
    .eq("status", "published");

  if (error) {
    throw new Error(`Public search program expiry check failed: ${error.message}`);
  }

  const keep = new Set<string>();
  for (const row of data ?? []) {
    const sessions = (row.program_sessions ?? []).map((s) => ({
      sessionDate: s.session_date,
      startTime: s.start_time,
      endTime: s.end_time,
    }));
    if (
      isProgramVisibleOnUpcomingSurfaces(sessions, {
        timeZone: row.timezone?.trim() || DEFAULT_PROGRAM_TIMEZONE,
      })
    ) {
      keep.add(row.slug);
    }
  }

  return results.filter((row) => {
    if (row.type !== "program") return true;
    const slug = row.url.replace(/^\/programs\//, "").split("?")[0]!;
    return keep.has(slug);
  });
}

/**
 * Server-side public search. Empty query → no results (caller shows prompt).
 * Seed mode searches curated pages + seed branches only (no draft CMS rows).
 */
export async function searchPublicContent(
  input: SearchPublicInput,
): Promise<{
  query: string;
  type: PublicSearchTypeFilter;
  results: PublicSearchResult[];
}> {
  const displayQuery = prepareSearchQuery(input.query);
  const query = normalizeSearchQuery(displayQuery);
  const type = parseSearchTypeFilter(input.type);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 50);

  if (!query) {
    return { query: "", type, results: [] };
  }

  if (shouldUseSeedContent()) {
    return {
      query: displayQuery,
      type,
      results: searchSeedCorpus(query, type, limit),
    };
  }

  const results = await searchViaRpc(query, type, limit);
  return { query: displayQuery, type, results };
}
