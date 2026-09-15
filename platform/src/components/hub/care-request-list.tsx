import Link from "next/link";
import type { CareRequestListItem } from "@/lib/care/types";
import {
  CARE_STATUS_LABELS,
  WELFARE_REQUEST_CATEGORY_LABELS,
} from "@/lib/care/types";

function formatSubmitted(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CareRequestList({
  items,
  emptyLabel,
}: {
  items: CareRequestListItem[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-6 text-base text-[var(--color-text-muted)]">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/admin/care/${item.id}`}
            className="flex min-h-14 flex-col gap-1 px-4 py-4 hover:bg-[var(--kcmi-off-white)] sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold text-[var(--color-text-body)]">
                {item.referenceCode}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Submitted {formatSubmitted(item.submittedAt)}
                {item.requestCategory
                  ? ` · ${WELFARE_REQUEST_CATEGORY_LABELS[item.requestCategory]}`
                  : ""}
                {item.displayName ? ` · ${item.displayName}` : ""}
              </p>
            </div>
            <p className="shrink-0 text-sm font-medium text-[var(--color-text-body)]">
              {CARE_STATUS_LABELS[item.status]}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
