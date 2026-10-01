import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/session";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { GivingDestinationForm } from "@/components/hub/giving-destination-form";
import { canProposeGiving, emptyGivingSnapshot } from "@/lib/giving/access";
import { createGivingProposal } from "@/app/admin/giving/actions";

export default async function ProposeNewGivingDestinationPage() {
  const session = await getStaffSession();
  if (!session || !canProposeGiving(session.profile.permissions)) {
    redirect("/admin/giving?error=You%20cannot%20propose%20Giving%20changes.");
  }

  return (
    <div>
      <HubPageHeader
        title="Propose a new destination"
        description="Enter verified bank details for church review. These details are not on the website until another authorized person approves them."
        backHref="/admin/giving"
        backLabel="Back to Giving"
      />
      <p className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--kcmi-red)_8%,white)] p-4 text-base text-[var(--color-text-body)]">
        These details stay off the website until another authorized person
        approves them.
      </p>
      <GivingDestinationForm
        idPrefix="new"
        snapshot={emptyGivingSnapshot()}
        proposalType="create"
        submitLabel="Save draft and compare"
        formAction={createGivingProposal}
      />
    </div>
  );
}
