import type { PublicSearchResult } from "@/lib/search/types";
import { searchTokens } from "@/lib/search/normalize";

type Rankable = {
  title: string;
  body: string;
};

export function scoreSearchMatch(query: string, item: Rankable): number {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return 0;

  const title = item.title.toLowerCase();
  const body = item.body.toLowerCase();
  const haystack = `${title} ${body}`;

  if (!tokens.every((tok) => haystack.includes(tok))) return 0;

  let score = 0;
  if (tokens.every((tok) => title.includes(tok))) score += 3;
  if (tokens.every((tok) => body.includes(tok))) score += 1;
  if (title.includes(query)) score += 0.5;
  return score;
}

export function rankAndFilterResults(
  query: string,
  candidates: Omit<PublicSearchResult, "rankScore">[],
  bodies: Map<string, string>,
): PublicSearchResult[] {
  const scored: PublicSearchResult[] = [];
  for (const candidate of candidates) {
    const body = bodies.get(`${candidate.type}:${candidate.url}`) ?? "";
    const rankScore = scoreSearchMatch(query, {
      title: candidate.title,
      body: `${candidate.summary ?? ""} ${candidate.context ?? ""} ${body}`,
    });
    if (rankScore <= 0) continue;
    scored.push({ ...candidate, rankScore });
  }
  return scored.sort((a, b) => {
    if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
    return a.title.localeCompare(b.title);
  });
}
