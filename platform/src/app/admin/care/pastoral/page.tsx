import { CareRequestList } from "@/components/hub/care-request-list";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { listCareRequests } from "@/lib/care/queries";
import { humanAal2Required } from "@/lib/hub/humanize";

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function CarePastoralPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const result = await listCareRequests("pastoral");

  if (!result.ok) {
    return (
      <div>
        <HubPageHeader
          title="Pastoral Care"
          backHref="/admin/care"
          backLabel="Care"
        />
        <p className="text-base text-[var(--color-text-muted)]">
          {result.reason === "aal2_required"
            ? humanAal2Required()
            : "Your account cannot open the Pastoral Care queue."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <HubPageHeader
        title="Pastoral Care"
        backHref="/admin/care"
        backLabel="Care"
        description="Pastors see assigned requests only unless they hold Pastoral assign authority."
      />
      <HubFlash message={params.message} error={params.error} />
      <CareRequestList
        items={result.items}
        emptyLabel="No requests yet. Visitor Care forms still use Google Forms until a later phase."
      />
    </div>
  );
}
