import Link from "next/link";
import type { WebsiteRequestListItem, WebsiteRequestStatus } from "@/lib/requests/types";
import {
  WEBSITE_REQUEST_STATUS_LABELS,
  WEBSITE_REQUEST_TOPIC_LABELS,
} from "@/lib/requests/types";

function formatReceived(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function WebsiteRequestList({
  items,
  emptyLabel,
}: {
  items: WebsiteRequestListItem[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <p
        className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-6 text-base text-[var(--color-text-muted)]"
        data-testid="requests-empty"
      >
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul
      className="divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
      data-testid="requests-list"
    >
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/admin/requests/${item.id}`}
            className="flex min-h-14 flex-col gap-2 px-4 py-4 hover:bg-[var(--kcmi-off-white)] sm:flex-row sm:items-start sm:justify-between"
            data-testid="requests-list-item"
          >
            <div className="min-w-0">
              <p className="text-base font-semibold text-[var(--color-text-body)]">
                {item.fullName}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {WEBSITE_REQUEST_TOPIC_LABELS[item.topic]}
                {item.assigneeLabel ? ` · ${item.assigneeLabel}` : ""}
              </p>
              <p className="mt-2 text-sm text-[var(--color-text-body)]">
                {item.messagePreview}
              </p>
              <p className="mt-2 font-mono text-xs text-[var(--color-text-muted)]">
                {item.referenceCode} · {formatReceived(item.createdAt)}
              </p>
              {item.emailNotificationStatus === "failed" ? (
                <p className="mt-1 text-xs font-medium text-[var(--color-warning)]">
                  Email notification failed — request is still saved
                </p>
              ) : null}
            </div>
            <p className="shrink-0 text-sm font-medium text-[var(--color-text-body)]">
              {WEBSITE_REQUEST_STATUS_LABELS[item.status as WebsiteRequestStatus]}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
