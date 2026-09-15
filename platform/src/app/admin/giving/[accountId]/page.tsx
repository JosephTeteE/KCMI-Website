import Link from "next/link";
import { notFound } from "next/navigation";
import { getStaffSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { GivingSnapshotView } from "@/components/hub/giving-snapshot-diff";
import {
  canProposeGiving,
  canViewGivingAdmin,
} from "@/lib/giving/access";
import { accountRowToSnapshot } from "@/lib/giving/snapshot";

export default async function AdminGivingAccountPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const session = await getStaffSession();
  if (!session || !canViewGivingAdmin(session.profile.permissions)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: account } = await supabase
    .from("giving_accounts")
    .select(
      "id, stable_key, label, description, country, bank_name, account_name, swift_bic, external_url, visitor_note, display_order, status, version, giving_account_numbers(currency, account_number, display_order)",
    )
    .eq("id", accountId)
    .maybeSingle();

  if (!account) notFound();

  const snapshot = accountRowToSnapshot(account);
  const canPropose = canProposeGiving(session.profile.permissions);

  return (
    <div>
      <HubPageHeader
        title={account.label}
        description={`Database destination · version ${account.version}. Not automatically shown on the public website yet.`}
        backHref="/admin/giving"
        backLabel="Back to Giving"
        actions={
          canPropose ? (
            <Link
              href={`/admin/giving/${account.id}/propose`}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 text-base font-semibold text-white"
            >
              Propose a change
            </Link>
          ) : null
        }
      />
      <GivingSnapshotView title="Current database details" snapshot={snapshot} />
    </div>
  );
}
