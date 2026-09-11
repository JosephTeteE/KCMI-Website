import type { Branch } from "@/content/types";

/** Preferred public heading order. Only used when a branch actually has that country. */
export const BRANCH_COUNTRY_ORDER = ["Nigeria", "Ghana", "Togo"] as const;

export type BranchCountryGroup = {
  country: string | null;
  heading: string;
  branches: Branch[];
};

/**
 * Public place line. If cityDisplay already includes the country, do not
 * append the country again. Does not change stored branch data.
 */
export function publicPlaceLabel(
  cityLabel: string | null | undefined,
  country: string | null | undefined,
): string {
  const city = cityLabel?.trim() ?? "";
  const nation = country?.trim() ?? "";
  if (!city) return nation;
  if (!nation) return city;
  const cityLower = city.toLowerCase();
  const nationLower = nation.toLowerCase();
  if (cityLower === nationLower) return city;
  if (
    cityLower.endsWith(`, ${nationLower}`) ||
    cityLower.endsWith(` ${nationLower}`)
  ) {
    return city;
  }
  return `${city} · ${nation}`;
}

/**
 * Deterministic public country presentation order.
 * Known countries follow BRANCH_COUNTRY_ORDER; any others sort after.
 */
export function sortCountriesForPresentation(
  countries: readonly string[],
): string[] {
  const unique = [...new Set(countries.map((c) => c.trim()).filter(Boolean))];
  const rank = new Map<string, number>(
    BRANCH_COUNTRY_ORDER.map((name, index) => [name, index]),
  );
  return unique.sort((a, b) => {
    const aRank = rank.get(a) ?? BRANCH_COUNTRY_ORDER.length;
    const bRank = rank.get(b) ?? BRANCH_COUNTRY_ORDER.length;
    if (aRank !== bRank) return aRank - bRank;
    return a.localeCompare(b);
  });
}

/**
 * Group published branches by verified country.
 * Branches without a country are not reclassified — they appear last unlabeled as additional locations.
 */
export function groupBranchesByCountry(
  branches: readonly Branch[],
): BranchCountryGroup[] {
  const byCountry = new Map<string, Branch[]>();
  const unlabeled: Branch[] = [];

  for (const branch of branches) {
    const country = branch.country?.trim() || null;
    if (!country) {
      unlabeled.push(branch);
      continue;
    }
    const list = byCountry.get(country) ?? [];
    list.push(branch);
    byCountry.set(country, list);
  }

  const groups: BranchCountryGroup[] = [];
  const seen = new Set<string>();

  for (const country of BRANCH_COUNTRY_ORDER) {
    const list = byCountry.get(country);
    if (!list?.length) continue;
    groups.push({ country, heading: country, branches: list });
    seen.add(country);
  }

  const extras = [...byCountry.keys()].filter((name) => !seen.has(name)).sort();
  for (const country of extras) {
    groups.push({
      country,
      heading: country,
      branches: byCountry.get(country) ?? [],
    });
  }

  if (unlabeled.length > 0) {
    groups.push({
      country: null,
      heading: "Additional locations",
      branches: unlabeled,
    });
  }

  return groups;
}
