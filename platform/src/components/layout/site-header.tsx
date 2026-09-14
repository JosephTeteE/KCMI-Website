"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import type { NavItem } from "@/content/types";
import { SiteSearchControl } from "@/components/search/site-search-control";

type Props = {
  brandName: string;
  shortName: string;
  items: NavItem[];
  cta: NavItem;
};

export function SiteHeader({ brandName, shortName, items, cta }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-elevated)_92%,transparent)] backdrop-blur-md">
      <div className="site-container flex h-16 items-center justify-between gap-4 sm:h-[4.25rem]">
        <Link
          href="/"
          className="flex min-h-11 min-w-11 items-center gap-3 rounded-[var(--radius-sm)]"
          aria-label={`${brandName} home`}
        >
          <Image
            src="/brand/kcmi-logo.webp"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10"
            priority
          />
          <span className="font-display text-lg font-semibold tracking-tight text-[var(--color-action-primary)] sm:text-xl">
            {shortName}
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden min-w-0 flex-wrap items-center justify-end gap-1 lg:flex"
        >
          {items.map((item) => {
            const current =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`text-nav rounded-[var(--radius-sm)] px-3 py-2 font-medium transition-colors ${
                  current
                    ? "bg-[var(--color-surface-tint)] text-[var(--color-action-primary)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-body)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <SiteSearchControl variant="icon" />
          <Link
            href={cta.href}
            className="text-nav ml-2 inline-flex min-h-11 max-w-xs items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 text-center leading-snug font-semibold text-wrap text-[var(--color-action-primary-fg)] transition-opacity hover:opacity-95"
          >
            {cta.label}
          </Link>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <SiteSearchControl variant="icon" />
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-body)]"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <span aria-hidden className="flex w-5 flex-col gap-1.5">
              <span
                className={`h-0.5 w-full bg-current transition-transform ${open ? "translate-y-2 rotate-45" : ""}`}
              />
              <span
                className={`h-0.5 w-full bg-current transition-opacity ${open ? "opacity-0" : ""}`}
              />
              <span
                className={`h-0.5 w-full bg-current transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`}
              />
            </span>
          </button>
        </div>
      </div>

      <div
        id={panelId}
        hidden={!open}
        className="border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)] lg:hidden"
      >
        <nav aria-label="Mobile primary" className="site-container flex flex-col gap-1 py-3">
          {items.map((item) => {
            const current =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className="text-nav min-h-11 rounded-[var(--radius-md)] px-3 py-3 font-medium text-[var(--color-text-body)]"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
          <SiteSearchControl
            variant="menu"
            onNavigate={() => setOpen(false)}
          />
          <Link
            href={cta.href}
            className="text-nav mt-2 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-secondary)] px-4 text-center leading-snug font-semibold text-wrap text-[var(--color-action-secondary-fg)]"
            onClick={() => setOpen(false)}
          >
            {cta.label}
          </Link>
        </nav>
      </div>
    </header>
  );
}
