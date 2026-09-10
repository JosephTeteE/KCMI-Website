import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { HubStatusBadge } from "@/components/hub/hub-form-fields";

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function AdminBranchesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("church_branches")
    .select("id, name, city_label, status, is_public, sort_order")
    .order("sort_order", { ascending: true });

  return (
    <div>
      <HubPageHeader
        title="Branches"
        description="Change service times, addresses and branch photos."
      />
      <HubFlash message={params.message} error={params.error} />

      {(branches?.length ?? 0) === 0 ? (
        <p className="text-[var(--color-text-muted)]">No branches found.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
          {branches!.map((branch) => (
            <li key={branch.id}>
              <Link
                href={`/admin/branches/${branch.id}`}
                className="flex flex-col gap-2 px-4 py-4 hover:bg-[var(--kcmi-off-white)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-[var(--color-text-body)]">
                    {branch.name}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {branch.city_label || "No city label"}
                    {!branch.is_public ? " · Hidden from public site" : ""}
                  </p>
                </div>
                <HubStatusBadge status={branch.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
