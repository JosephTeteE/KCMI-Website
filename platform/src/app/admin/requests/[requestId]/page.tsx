import { HubFlash } from "@/components/hub/hub-flash";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { WebsiteRequestDetailView } from "@/components/hub/website-request-detail";
import {
  canAssignRequests,
  canUpdateRequests,
} from "@/lib/requests/access";
import {
  listAssignableRequestStaff,
  openWebsiteRequest,
} from "@/lib/requests/queries";
import { getStaffSession } from "@/lib/auth/session";

type Params = Promise<{ requestId: string }>;
type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { requestId } = await params;
  const flash = await searchParams;
  const result = await openWebsiteRequest(requestId);

  if (!result.ok) {
    return (
      <div>
        <HubPageHeader
          title="Message"
          backHref="/admin/requests"
          backLabel="Messages & Requests"
        />
        <p className="text-base text-[var(--color-text-muted)]">
          {result.reason === "not_found"
            ? "That request was not found, or you do not have access."
            : result.reason === "unauthenticated"
              ? "Please sign in to the Hub first."
              : "Your account cannot open Messages & Requests."}
        </p>
      </div>
    );
  }

  const session = await getStaffSession();
  const permissions = session?.profile.permissions ?? [];
  const canUpdate = canUpdateRequests(permissions);
  const canAssign = canAssignRequests(permissions);
  const assigneeOptions = canAssign ? await listAssignableRequestStaff() : [];

  if (
    result.request.assignedTo &&
    !assigneeOptions.some((o) => o.id === result.request.assignedTo)
  ) {
    assigneeOptions.push({
      id: result.request.assignedTo,
      label: result.request.assigneeLabel ?? "Currently assigned staff",
    });
  }

  return (
    <div>
      <HubPageHeader
        title={result.request.referenceCode}
        backHref="/admin/requests"
        backLabel="Messages & Requests"
        description={result.request.fullName}
      />
      <HubFlash message={flash.message} error={flash.error} />
      <WebsiteRequestDetailView
        request={result.request}
        canUpdate={canUpdate}
        canAssign={canAssign}
        assigneeOptions={assigneeOptions}
      />
    </div>
  );
}
