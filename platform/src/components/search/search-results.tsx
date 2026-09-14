import Link from "next/link";
import {
  SEARCH_TYPE_FILTERS,
  searchResultTypeLabel,
  type PublicSearchResult,
  type PublicSearchTypeFilter,
} from "@/lib/search/types";

type Props = {
  query: string;
  type: PublicSearchTypeFilter;
  results: PublicSearchResult[];
};

export function SearchForm({
  query,
  type,
}: {
  query: string;
  type: PublicSearchTypeFilter;
}) {
  return (
    <form action="/search" method="get" className="space-y-4" role="search">
      <div>
        <label
          htmlFor="search-q"
          className="text-readable-sm font-semibold text-[var(--color-text-body)]"
        >
          Search KCMI
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="search-q"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={80}
            autoComplete="off"
            placeholder="What are you looking for?"
            className="min-h-12 w-full flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 text-readable text-[var(--color-text-body)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-primary)]"
          />
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-6 font-semibold text-[var(--color-action-primary-fg)]"
          >
            Search
          </button>
        </div>
      </div>

      <fieldset>
        <legend className="sr-only">Filter by type</legend>
        <div className="flex flex-wrap gap-2">
          {SEARCH_TYPE_FILTERS.map((filter) => {
            const selected = type === filter.id;
            return (
              <label
                key={filter.id}
                className={`inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-md)] border px-3 text-readable-sm font-medium ${
                  selected
                    ? "border-[var(--color-action-primary)] bg-[var(--color-surface-tint)] text-[var(--color-action-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={filter.id}
                  defaultChecked={selected}
                  className="sr-only"
                />
                {filter.label}
              </label>
            );
          })}
        </div>
      </fieldset>
    </form>
  );
}

export function SearchResultsList({ query, type, results }: Props) {
  if (!query) {
    return (
      <p className="text-readable mt-10 max-w-2xl text-[var(--color-text-muted)]">
        What are you looking for?
      </p>
    );
  }

  if (results.length === 0) {
    return (
      <section className="mt-10 max-w-2xl" aria-live="polite">
        <h2 className="font-display text-2xl font-semibold">No matches</h2>
        <p className="text-readable mt-3 text-[var(--color-text-muted)]">
          We couldn&apos;t find anything matching that search.
        </p>
        <ul className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <li>
            <Link
              href="/locations"
              className="inline-flex min-h-11 items-center font-semibold text-[var(--color-action-primary)]"
            >
              View locations
            </Link>
          </li>
          <li>
            <Link
              href="/sermons"
              className="inline-flex min-h-11 items-center font-semibold text-[var(--color-action-primary)]"
            >
              Browse sermons
            </Link>
          </li>
          <li>
            <Link
              href="/#programs"
              className="inline-flex min-h-11 items-center font-semibold text-[var(--color-action-primary)]"
            >
              View upcoming programs
            </Link>
          </li>
        </ul>
      </section>
    );
  }

  const typeNote =
    type === "all" ? "" : ` in ${SEARCH_TYPE_FILTERS.find((f) => f.id === type)?.label ?? type}`;

  return (
    <section className="mt-10" aria-live="polite">
      <h2 className="font-display text-2xl font-semibold">
        {results.length === 1
          ? `1 result${typeNote}`
          : `${results.length} results${typeNote}`}
      </h2>
      <ul className="mt-8 space-y-5">
        {results.map((result) => (
          <li key={`${result.type}:${result.url}`}>
            <article className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
              <p className="text-readable-sm font-semibold tracking-wide text-[var(--color-action-primary)] uppercase">
                <span className="sr-only">Type: </span>
                {searchResultTypeLabel(result.type)}
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold sm:text-2xl">
                <Link
                  href={result.url}
                  className="text-[var(--color-text-body)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action-primary)]"
                >
                  {result.title}
                </Link>
              </h3>
              {result.context ? (
                <p className="mt-2 text-readable-sm text-[var(--color-text-muted)]">
                  {result.context}
                </p>
              ) : null}
              {result.summary ? (
                <p className="text-readable mt-3 max-w-3xl text-[var(--color-text-muted)]">
                  {result.summary}
                </p>
              ) : null}
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
