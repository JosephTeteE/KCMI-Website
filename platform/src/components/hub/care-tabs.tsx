"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CareServiceType } from "@/lib/care/types";
import { CARE_SERVICE_LABELS, CARE_TAB_HREFS } from "@/lib/care/types";

export function CareTabs({ available }: { available: CareServiceType[] }) {
  const pathname = usePathname();
  if (available.length === 0) return null;

  const homeCurrent = pathname === "/admin/care";

  return (
    <nav aria-label="Care domains" className="mb-8">
      <ul className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3">
        <li>
          <Link
            href="/admin/care"
            className={`inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-3 text-base ${
              homeCurrent
                ? "bg-[var(--kcmi-off-white)] font-semibold text-[var(--color-action-primary)]"
                : "text-[var(--color-text-body)] hover:bg-[var(--kcmi-off-white)]"
            }`}
            aria-current={homeCurrent ? "page" : undefined}
          >
            Overview
          </Link>
        </li>
        {available.map((service) => {
          const href = CARE_TAB_HREFS[service];
          const current = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={service}>
              <Link
                href={href}
                className={`inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-3 text-base ${
                  current
                    ? "bg-[var(--kcmi-off-white)] font-semibold text-[var(--color-action-primary)]"
                    : "text-[var(--color-text-body)] hover:bg-[var(--kcmi-off-white)]"
                }`}
                aria-current={current ? "page" : undefined}
              >
                {CARE_SERVICE_LABELS[service]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
