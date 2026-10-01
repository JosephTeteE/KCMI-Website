import { CareRequestList } from "@/components/hub/care-request-list";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { listCareRequests } from "@/lib/care/queries";
import { humanAal2Required } from "@/lib/hub/humanize";

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function CareWelfarePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const result = await listCareRequests("welfare");

  if (!result.ok) {
    return (
      <div>
        <HubPageHeader title="Welfare" backHref="/admin/care" backLabel="Care" />
        <p className="text-base text-[var(--color-text-muted)]">
          {result.reason === "aal2_required"
            ? humanAal2Required()
            : "Your account cannot open Welfare requests."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <HubPageHeader
        title="Welfare"
        backHref="/admin/care"
        backLabel="Care"
        description="Welfare team list. Open a request to read the full message."
      />
      <HubFlash message={params.message} error={params.error} />
      <CareRequestList
        items={result.items}
        emptyLabel="No Welfare requests to review."
      />
    </div>
  );
}
