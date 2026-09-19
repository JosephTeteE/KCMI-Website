"use client";

import { useId, useMemo, useState } from "react";

export type MediaChooserItem = {
  id: string;
  previewUrl: string;
  alt: string;
  caption?: string | null;
};

type Props = {
  items: MediaChooserItem[];
  selectedId?: string | null;
  onSelect: (item: MediaChooserItem) => void;
  searchThreshold?: number;
  heading?: string;
  help?: string;
};

/**
 * Inline library picker for contextual photo flows.
 * Labels come from alt / caption / humanized filename — never storage URLs or asset IDs.
 */
export function MediaChooser({
  items,
  selectedId,
  onSelect,
  searchThreshold = 8,
  heading = "Choose an existing photo",
  help = "Pick a photo already in the library. It will not go live until you preview and make it live.",
}: Props) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const showSearch = items.length >= searchThreshold;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = `${item.alt} ${item.caption ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-[var(--color-text-body)]">
          {heading}
        </h3>
        <p className="mt-1 hub-help text-[var(--color-text-muted)]">{help}</p>
      </div>

      {showSearch ? (
        <div>
          <label htmlFor={searchId} className="block text-base font-medium">
            Search photos
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search by description or name"
            className="mt-2 block w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-page)] px-3 py-2 text-base"
          />
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-base text-[var(--color-text-muted)]">
          {items.length === 0
            ? "No photos in the library yet. Upload a new photo instead."
            : "No photos match that search."}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const selected = selectedId === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  aria-pressed={selected}
                  className={`flex w-full min-h-11 cursor-pointer flex-col overflow-hidden rounded-[var(--radius-md)] border text-left transition ${
                    selected
                      ? "border-[var(--color-action-primary)] ring-2 ring-[var(--color-action-primary)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-action-primary)]"
                  }`}
                >
                  <span className="relative aspect-[4/3] bg-[var(--color-surface-tint)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  </span>
                  <span className="space-y-1 p-3">
                    <span className="block text-base font-medium text-[var(--color-text-body)]">
                      {item.alt || "Untitled photo"}
                    </span>
                    {item.caption ? (
                      <span className="block text-sm text-[var(--color-text-muted)]">
                        {item.caption}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
