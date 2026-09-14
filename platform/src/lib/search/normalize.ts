import { SEARCH_QUERY_MAX_LENGTH } from "@/lib/search/types";

/** Trim, collapse whitespace, and cap length — preserves visitor casing for display. */
export function prepareSearchQuery(raw: string | null | undefined): string {
  if (!raw) return "";
  const collapsed = raw.trim().replace(/\s+/g, " ");
  if (!collapsed) return "";
  return collapsed.length > SEARCH_QUERY_MAX_LENGTH
    ? collapsed.slice(0, SEARCH_QUERY_MAX_LENGTH)
    : collapsed;
}

/** Normalize visitor query for matching: lowercase after prepare. */
export function normalizeSearchQuery(raw: string | null | undefined): string {
  const prepared = prepareSearchQuery(raw);
  return prepared ? prepared.toLowerCase() : "";
}

export function searchTokens(normalizedQuery: string): string[] {
  if (!normalizedQuery) return [];
  return normalizedQuery.split(" ").filter(Boolean);
}

export function parseSearchTypeFilter(
  raw: string | null | undefined,
): "all" | "page" | "program" | "sermon" | "location" {
  const value = (raw ?? "all").trim().toLowerCase();
  if (
    value === "page" ||
    value === "program" ||
    value === "sermon" ||
    value === "location"
  ) {
    return value;
  }
  return "all";
}
