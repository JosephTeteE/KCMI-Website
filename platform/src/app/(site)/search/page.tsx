import type { Metadata } from "next";
import { PageShell } from "@/components/layout/page-shell";
import {
  SearchForm,
  SearchResultsList,
} from "@/components/search/search-results";
import { searchPublicContent } from "@/lib/search/public-search";

type SearchParams = Promise<{ q?: string; type?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  return {
    title: q ? `Search: ${q}` : "Search",
    description: "Search KCMI pages, programs, sermons, and locations.",
    robots: { index: false, follow: true },
    alternates: { canonical: "/search" },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { query, type, results } = await searchPublicContent({
    query: params.q,
    type: params.type,
  });

  return (
    <PageShell
      eyebrow="Find"
      title="Search KCMI"
      description="Look up pages, programs, sermons, and locations on our website."
    >
      <div className="mx-auto max-w-3xl">
        <SearchForm query={query} type={type} />
        <SearchResultsList query={query} type={type} results={results} />
      </div>
    </PageShell>
  );
}
