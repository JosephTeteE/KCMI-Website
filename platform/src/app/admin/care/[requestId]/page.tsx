import { CareRequestDetailView } from "@/components/hub/care-request-detail";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import {
  canAssignCareDomain,
  careDomainsForPermissions,
} from "@/lib/care/access";
import { openCareRequest } from "@/lib/care/queries";
import { CARE_SERVICE_LABELS, CARE_TAB_HREFS } from "@/lib/care/types";
import { createClient } from "@/lib/supabase/server";
import { humanAal2Required } from "@/lib/hub/humanize";
import { assertAal2 } from "@/lib/auth/session";

type SearchParams = Promise<{ message?: string; error?: string }>;
type Params = Promise<{ requestId: string }>;

export default async function CareRequestDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { requestId } = await params;
  const flash = await searchParams;
  const result = await openCareRequest(requestId);

  if (!result.ok) {
    return (
      <div>
        <HubPageHeader title="Care request" backHref="/admin/care" backLabel="Care" />
        <p className="text-base text-[var(--color-text-muted)]">
          {result.reason === "aal2_required"
            ? humanAal2Required()
            : result.reason === "not_found"
              ? "That Care request was not found, or you do not have access."
              : "Your account cannot open this Care request."}
        </p>
      </div>
    );
  }

  const session = await assertAal2();
  if (!session.ok) {
    return (
      <div>
        <HubPageHeader title="Care request" backHref="/admin/care" backLabel="Care" />
        <p className="text-base text-[var(--color-text-muted)]">{humanAal2Required()}</p>
      </div>
    );
  }

  const canAssign = canAssignCareDomain(
    session.session.profile.permissions,
    result.request.serviceType,
  );
  const canReopen = canAssign;

  const supabase = await createClient();
  const { data: staffRows } = await supabase.rpc("care_assignable_staff");
  const staffList = Array.isArray(staffRows)
    ? staffRows
    : staffRows
      ? [staffRows]
      : [];

  const assigneeOptions: { id: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const row of staffList) {
    if (!row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    assigneeOptions.push({
      id: row.id,
      label: row.display_name?.trim() || row.email || row.id,
    });
  }
  if (result.request.assignedTo && !seen.has(result.request.assignedTo)) {
    assigneeOptions.push({
      id: result.request.assignedTo,
      label: "Currently assigned staff",
    });
  }

  const backHref =
    CARE_TAB_HREFS[result.request.serviceType] ??
    (careDomainsForPermissions(session.session.profile.permissions)[0]
      ? CARE_TAB_HREFS[
          careDomainsForPermissions(session.session.profile.permissions)[0]!
        ]
      : "/admin/care");

  return (
    <div>
      <HubPageHeader
        title={result.request.referenceCode}
        backHref={backHref}
        backLabel={CARE_SERVICE_LABELS[result.request.serviceType]}
        description="Highly sensitive Care request. Opening is audited."
      />
      <HubFlash message={flash.message} error={flash.error} />
      <CareRequestDetailView
        request={result.request}
        notes={result.notes}
        canAssign={canAssign}
        canReopen={canReopen}
        assigneeOptions={assigneeOptions}
      />
    </div>
  );
}
