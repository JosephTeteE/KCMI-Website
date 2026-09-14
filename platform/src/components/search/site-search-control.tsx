"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type Props = {
  /** Compact icon control for desktop header */
  variant?: "icon" | "menu";
  onNavigate?: () => void;
};

export function SiteSearchControl({ variant = "icon", onNavigate }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dialogId = useId();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = openerRef.current;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  if (variant === "menu") {
    return (
      <Link
        href="/search"
        className="text-nav min-h-11 rounded-[var(--radius-md)] px-3 py-3 font-medium text-[var(--color-text-body)]"
        onClick={onNavigate}
      >
        Search
      </Link>
    );
  }

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-body)]"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={() => setOpen(true)}
      >
        <span className="sr-only">Search</span>
        <svg
          aria-hidden
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-label="Search KCMI"
            aria-labelledby={titleId}
            className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 shadow-lg"
          >
            <h2
              id={titleId}
              className="font-display text-xl font-semibold text-[var(--color-text-body)]"
            >
              Search KCMI
            </h2>
            <p className="mt-1 text-readable-sm text-[var(--color-text-muted)]">
              Find pages, programs, sermons, and locations.
            </p>
            <form
              action="/search"
              method="get"
              className="mt-4"
              onSubmit={(e) => {
                // Closing the dialog unmounts this form. Prevent native submit
                // and navigate explicitly so the query is not dropped.
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                const q = String(data.get("q") ?? "").trim();
                const params = new URLSearchParams();
                if (q) params.set("q", q);
                const href = params.size > 0 ? `/search?${params}` : "/search";
                setOpen(false);
                onNavigate?.();
                router.push(href);
              }}
            >
              <label htmlFor={`${dialogId}-q`} className="sr-only">
                Search KCMI
              </label>
              <input
                ref={inputRef}
                id={`${dialogId}-q`}
                name="q"
                type="search"
                maxLength={80}
                autoComplete="off"
                placeholder="What are you looking for?"
                className="min-h-12 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-readable text-[var(--color-text-body)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-primary)]"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 font-semibold text-[var(--color-action-primary-fg)]"
                >
                  Search
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 font-medium text-[var(--color-text-body)]"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
