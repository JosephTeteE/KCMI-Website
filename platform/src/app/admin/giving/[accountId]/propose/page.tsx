import { notFound, redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { GivingDestinationForm } from "@/components/hub/giving-destination-form";
import { canProposeGiving } from "@/lib/giving/access";
import { accountRowToSnapshot } from "@/lib/giving/snapshot";
import { createGivingProposal } from "@/app/admin/giving/actions";

export default async function ProposeGivingChangePage({
  params,
  searchParams,
}: {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { accountId } = await params;
  const { type } = await searchParams;
  const session = await getStaffSession();
  if (!session || !canProposeGiving(session.profile.permissions)) {
    redirect("/admin/giving?error=You%20cannot%20propose%20Giving%20changes.");
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

  const proposalType =
    type === "disable" || type === "enable" ? type : "update";
  const snapshot = accountRowToSnapshot(account);
  if (proposalType === "disable") snapshot.status = "disabled";
  if (proposalType === "enable") snapshot.status = "published";

  return (
    <div>
      <HubPageHeader
        title="Propose a change"
        description="Prepare the new bank details. Nothing goes live until another authorized person approves."
        backHref={`/admin/giving/${accountId}`}
        backLabel="Back to destination"
      />
      <p className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--kcmi-red)_8%,white)] p-4 text-base text-[var(--color-text-body)]">
        These changes are NOT on the website until approved — and the public
        /giving page still uses seed content until cutover.
      </p>
      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <a
          href={`/admin/giving/${accountId}/propose`}
          className="underline"
        >
          Change details
        </a>
        <a
          href={`/admin/giving/${accountId}/propose?type=disable`}
          className="underline"
        >
          Turn off destination
        </a>
        <a
          href={`/admin/giving/${accountId}/propose?type=enable`}
          className="underline"
        >
          Turn on destination
        </a>
      </div>
      <GivingDestinationForm
        idPrefix="propose"
        snapshot={snapshot}
        proposalType={proposalType}
        targetAccountId={account.id}
        submitLabel="Save draft and compare"
        formAction={createGivingProposal}
        lockStableKey
      />
    </div>
  );
}
