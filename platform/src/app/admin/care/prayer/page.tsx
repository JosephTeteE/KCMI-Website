import { CareRequestList } from "@/components/hub/care-request-list";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { listCareRequests } from "@/lib/care/queries";
import { CARE_SERVICE_LABELS, type CareServiceType } from "@/lib/care/types";
import { humanAal2Required } from "@/lib/hub/humanize";

type SearchParams = Promise<{ message?: string; error?: string }>;

async function CareQueuePage({
  service,
  searchParams,
}: {
  service: CareServiceType;
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const result = await listCareRequests(service);
  const title = CARE_SERVICE_LABELS[service];

  if (!result.ok) {
    return (
      <div>
        <HubPageHeader title={title} backHref="/admin/care" backLabel="Care" />
        <p className="text-base text-[var(--color-text-muted)]">
          {result.reason === "aal2_required"
            ? humanAal2Required()
            : `Your account cannot open ${title} requests.`}
        </p>
      </div>
    );
  }

  return (
    <div>
      <HubPageHeader
        title={title}
        backHref="/admin/care"
        backLabel="Care"
        description={
          service === "prayer"
            ? "Prayer team list. Open a request to read the full message."
            : service === "pastoral"
              ? "Pastoral Care list. Pastors normally see requests assigned to them."
              : "Welfare team list. Open a request to read the full message."
        }
      />
      <HubFlash message={params.message} error={params.error} />
      <CareRequestList
        items={result.items}
        emptyLabel={
          service === "prayer"
            ? "No prayer requests to review."
            : service === "pastoral"
              ? "No Pastoral Care requests to review."
              : "No Welfare requests to review."
        }
      />
    </div>
  );
}

export default async function CarePrayerPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return <CareQueuePage service="prayer" searchParams={searchParams} />;
}
