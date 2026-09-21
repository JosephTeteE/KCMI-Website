import Link from "next/link";
import { HubFlash } from "@/components/hub/hub-flash";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { WebsiteRequestList } from "@/components/hub/website-request-list";
import { listWebsiteRequests } from "@/lib/requests/queries";
import {
  WEBSITE_REQUEST_STATUS_LABELS,
  isWebsiteRequestStatus,
  type WebsiteRequestStatus,
} from "@/lib/requests/types";

type SearchParams = Promise<{
  status?: string;
  message?: string;
  error?: string;
}>;

const TABS: { status: WebsiteRequestStatus | "all"; label: string }[] = [
  { status: "all", label: "All" },
  { status: "new", label: WEBSITE_REQUEST_STATUS_LABELS.new },
  { status: "in_progress", label: WEBSITE_REQUEST_STATUS_LABELS.in_progress },
  { status: "closed", label: WEBSITE_REQUEST_STATUS_LABELS.closed },
];

export default async function RequestsInboxPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const statusFilter =
    params.status && isWebsiteRequestStatus(params.status)
      ? params.status
      : "all";

  const result = await listWebsiteRequests({ status: statusFilter });

  if (!result.ok) {
    return (
      <div>
        <HubPageHeader title="Messages & Requests" />
        <p className="text-base text-[var(--color-text-muted)]">
          {result.reason === "unauthenticated"
            ? "Please sign in to the Hub first."
            : "Your account cannot open Messages & Requests."}
        </p>
      </div>
    );
  }

  const active = statusFilter === "all" ? "all" : statusFilter;

  return (
    <div>
      <HubPageHeader
        title="Messages & Requests"
        description="General website enquiries from the Contact page. Prayer, Pastoral Care, and Welfare stay in Care."
      />
      <HubFlash message={params.message} error={params.error} />

      <nav aria-label="Request status" className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const href =
            tab.status === "all"
              ? "/admin/requests"
              : `/admin/requests?status=${tab.status}`;
          const count =
            tab.status === "all"
              ? result.counts.new +
                result.counts.in_progress +
                result.counts.closed
              : result.counts[tab.status];
          const isActive = active === tab.status;
          return (
            <Link
              key={tab.status}
              href={href}
              className={`inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-4 text-sm font-semibold ${
                isActive
                  ? "bg-[var(--color-action-primary)] text-[var(--color-action-primary-fg)]"
                  : "border border-[var(--color-border)] text-[var(--color-text-body)]"
              }`}
            >
              {tab.label}
              <span className="ml-2 tabular-nums opacity-80">{count}</span>
            </Link>
          );
        })}
      </nav>

      <WebsiteRequestList
        items={result.items}
        emptyLabel={
          statusFilter === "all"
            ? "No website messages yet."
            : `No ${WEBSITE_REQUEST_STATUS_LABELS[statusFilter].toLowerCase()} messages.`
        }
      />
    </div>
  );
}
