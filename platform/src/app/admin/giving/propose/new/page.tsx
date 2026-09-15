import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/session";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { GivingDestinationForm } from "@/components/hub/giving-destination-form";
import { canProposeGiving, stagingQaGivingSnapshot } from "@/lib/giving/access";
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
        description="Use STAGING QA synthetic details for practice. Do not enter unverified real KCMI account numbers for public cutover yet."
        backHref="/admin/giving"
        backLabel="Back to Giving"
      />
      <p className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--kcmi-red)_8%,white)] p-4 text-base text-[var(--color-text-body)]">
        These changes are NOT on the website. Approval only updates the Giving
        database until a separate human cutover.
      </p>
      <GivingDestinationForm
        idPrefix="new"
        snapshot={stagingQaGivingSnapshot("new")}
        proposalType="create"
        submitLabel="Save draft and compare"
        formAction={createGivingProposal}
      />
    </div>
  );
}
