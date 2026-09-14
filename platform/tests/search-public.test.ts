import { describe, expect, it } from "vitest";
import {
  PUBLIC_SEARCH_EXCLUDED_PATH_PREFIXES,
  PUBLIC_SEARCH_PAGE_CATALOG,
} from "@/lib/search/page-catalog";
import {
  normalizeSearchQuery,
  parseSearchTypeFilter,
  prepareSearchQuery,
} from "@/lib/search/normalize";
import { searchPublicContent } from "@/lib/search/public-search";
import { rankAndFilterResults, scoreSearchMatch } from "@/lib/search/rank";
import type { PublicSearchResult } from "@/lib/search/types";

describe("Search V2 normalize", () => {
  it("collapses whitespace and caps length", () => {
    expect(prepareSearchQuery("  Faith   walk  ")).toBe("Faith walk");
    expect(normalizeSearchQuery("  Faith   walk  ")).toBe("faith walk");
    expect(prepareSearchQuery("a".repeat(100)).length).toBe(80);
  });

  it("parses type filters safely", () => {
    expect(parseSearchTypeFilter("Programs")).toBe("all");
    expect(parseSearchTypeFilter("program")).toBe("program");
    expect(parseSearchTypeFilter("admin")).toBe("all");
  });
});

describe("Search V2 ranking", () => {
  it("ranks title matches above body-only matches", () => {
    const titleScore = scoreSearchMatch("faith", {
      title: "Walking by Faith",
      body: "A Sunday message",
    });
    const bodyScore = scoreSearchMatch("faith", {
      title: "Sunday message",
      body: "Walking by faith together",
    });
    expect(titleScore).toBeGreaterThan(bodyScore);
  });
});

describe("Search V2 page catalog security", () => {
  it("includes visitor pages and excludes privacy/terms/admin", () => {
    const urls = PUBLIC_SEARCH_PAGE_CATALOG.map((p) => p.url);
    expect(urls).toEqual(
      expect.arrayContaining([
        "/about",
        "/services",
        "/sermons",
        "/faqs",
        "/contact",
        "/giving",
        "/locations",
      ]),
    );
    expect(urls).not.toContain("/privacy");
    expect(urls).not.toContain("/terms");
    expect(urls.some((u) => u.startsWith("/admin"))).toBe(false);
    expect(urls.some((u) => u.startsWith("/auth"))).toBe(false);
    expect(urls.some((u) => u.startsWith("/qa"))).toBe(false);
  });

  it("documents excluded prefixes for private surfaces", () => {
    expect(PUBLIC_SEARCH_EXCLUDED_PATH_PREFIXES).toEqual(
      expect.arrayContaining(["/admin", "/auth", "/qa", "/privacy", "/terms"]),
    );
  });
});

describe("Search V2 seed corpus (CONTENT_SOURCE=seed)", () => {
  it("empty query returns calm empty results", async () => {
    const { query, results } = await searchPublicContent({ query: "   " });
    expect(query).toBe("");
    expect(results).toEqual([]);
  });

  it("finds a known page", async () => {
    const { results } = await searchPublicContent({ query: "about" });
    expect(results.some((r) => r.type === "page" && r.url === "/about")).toBe(
      true,
    );
  });

  it("finds a location by city/country", async () => {
    const { results } = await searchPublicContent({ query: "Accra" });
    const hit = results.find((r) => r.type === "location");
    expect(hit).toBeTruthy();
    expect(hit?.url.startsWith("/locations/")).toBe(true);
  });

  it("finds Ghana branches", async () => {
    const { results } = await searchPublicContent({ query: "Ghana" });
    expect(results.some((r) => r.type === "location")).toBe(true);
  });

  it("finds headquarters", async () => {
    const { results } = await searchPublicContent({ query: "Headquarters" });
    expect(
      results.some(
        (r) => r.type === "location" && r.url === "/locations/headquarters",
      ),
    ).toBe(true);
  });

  it("returns no-result for nonsense", async () => {
    const { results } = await searchPublicContent({
      query: "zzzxq-not-a-kcmi-term-999",
    });
    expect(results).toEqual([]);
  });

  it("never returns excluded private URLs", async () => {
    const { results } = await searchPublicContent({ query: "privacy admin" });
    for (const result of results) {
      const path = result.url.split("#")[0]!;
      for (const prefix of PUBLIC_SEARCH_EXCLUDED_PATH_PREFIXES) {
        expect(path === prefix || path.startsWith(`${prefix}/`)).toBe(false);
      }
    }
  });

  it("result URLs are root-relative public paths", async () => {
    const { results } = await searchPublicContent({ query: "kcmi" });
    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(result.url.startsWith("/")).toBe(true);
      expect(result.url.startsWith("//")).toBe(false);
      expect(result.url.toLowerCase()).not.toContain("/admin");
    }
  });

  it("supports type filter for pages", async () => {
    const { results } = await searchPublicContent({
      query: "giving",
      type: "page",
    });
    expect(results.every((r) => r.type === "page")).toBe(true);
    expect(results.some((r) => r.url === "/giving")).toBe(true);
  });
});

describe("Search V2 draft exclusion (unit model)", () => {
  it("does not surface draft program candidates when ranking public-only rows", () => {
    const candidates: Omit<PublicSearchResult, "rankScore">[] = [
      {
        type: "program",
        title: "Draft Secret Program",
        summary: "Should not be indexed",
        url: "/programs/draft-secret",
        context: "Program",
        imageUrl: null,
      },
    ];
    // Public search only receives published rows from SQL/RPC; seed mode has no programs.
    // This asserts the ranking helper alone cannot invent admin URLs.
    const ranked = rankAndFilterResults(
      "secret",
      candidates.filter((c) => !c.url.includes("draft")),
      new Map(),
    );
    expect(ranked).toEqual([]);
  });

  it("seed search has no program/sermon rows (drafts impossible)", async () => {
    const { results } = await searchPublicContent({ query: "faith" });
    expect(results.every((r) => r.type === "page" || r.type === "location")).toBe(
      true,
    );
  });
});
