import { notFound } from "next/navigation";
import { getStaffSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { GivingSnapshotDiff } from "@/components/hub/giving-snapshot-diff";
import { GivingDestinationForm } from "@/components/hub/giving-destination-form";
import {
  canApproveGiving,
  canProposeGiving,
  canViewGivingAdmin,
  isProposalStale,
} from "@/lib/giving/access";
import { snapshotFromJson } from "@/lib/giving/snapshot";
import {
  GIVING_PROPOSAL_STATUS_LABELS,
  type GivingProposalStatus,
  type GivingProposalType,
} from "@/lib/giving/types";
import {
  approveGivingProposal,
  rejectGivingProposal,
  submitGivingProposal,
  updateGivingProposalDraft,
  withdrawGivingProposal,
} from "@/app/admin/giving/actions";

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function GivingProposalReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ proposalId: string }>;
  searchParams: SearchParams;
}) {
  const { proposalId } = await params;
  const flash = await searchParams;
  const session = await getStaffSession();
  if (!session || !canViewGivingAdmin(session.profile.permissions)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: proposal } = await supabase
    .from("giving_change_proposals")
    .select(
      "id, target_account_id, proposal_type, base_version, base_snapshot, proposed_snapshot, status, proposer_id, submitted_at, reviewed_at, review_reason, applied_at",
    )
    .eq("id", proposalId)
    .maybeSingle();

  if (!proposal) notFound();

  let liveVersion: number | null = null;
  if (proposal.target_account_id) {
    const { data: live } = await supabase
      .from("giving_accounts")
      .select("version")
      .eq("id", proposal.target_account_id)
      .maybeSingle();
    liveVersion = live?.version ?? null;
  }

  const current = snapshotFromJson(proposal.base_snapshot);
  const proposed = snapshotFromJson(proposal.proposed_snapshot);
  const status = proposal.status as GivingProposalStatus;
  const isOwner = proposal.proposer_id === session.user.id;
  const canPropose = canProposeGiving(session.profile.permissions);
  const canApprove = canApproveGiving(session.profile.permissions);
  const stale = isProposalStale({
    baseVersion: proposal.base_version,
    liveVersion,
    proposalType: proposal.proposal_type,
  });

  return (
    <div>
      <HubPageHeader
        title="Review Giving change"
        description={`${proposal.proposal_type} · ${GIVING_PROPOSAL_STATUS_LABELS[status]}`}
        backHref="/admin/giving"
        backLabel="Back to Giving"
      />
      <HubFlash message={flash.message} error={flash.error} />

      {status === "pending" || status === "draft" ? (
        <p
          role="status"
          className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--kcmi-red)_10%,white)] p-4 text-base font-semibold text-[var(--color-text-body)]"
        >
          These changes are NOT on the website.
        </p>
      ) : null}

      {status === "approved" ? (
        <p
          role="status"
          className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--kcmi-green)_12%,white)] p-4 text-base text-[var(--color-text-body)]"
        >
          Approved and published to the Giving database
          {proposal.applied_at
            ? ` on ${new Date(proposal.applied_at).toLocaleString()}`
            : ""}
          . Published destinations appear on the public Giving page.
        </p>
      ) : null}

      {status === "rejected" ? (
        <p
          role="status"
          className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 text-base text-[var(--color-text-body)]"
        >
          Rejected. Live database destination unchanged.
          {proposal.review_reason ? (
            <>
              {" "}
              Reason: <strong>{proposal.review_reason}</strong>
            </>
          ) : null}
        </p>
      ) : null}

      {status === "superseded" ? (
        <p className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 text-base text-[var(--color-text-muted)]">
          This proposal is out of date because another change was approved.
          Start a fresh proposal from the current destination.
        </p>
      ) : null}

      {stale && status === "pending" ? (
        <p className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 text-base text-[var(--color-text-body)]">
          Warning: the live destination version has moved. Approving this
          proposal will be blocked — return it to draft or start a new proposal.
        </p>
      ) : null}

      <GivingSnapshotDiff current={current} proposed={proposed} />

      {status === "draft" && isOwner && canPropose && proposed ? (
        <div className="mt-8 space-y-6">
          <h2 className="text-lg font-semibold">Edit draft</h2>
          <GivingDestinationForm
            idPrefix="edit-draft"
            snapshot={proposed}
            proposalType={proposal.proposal_type as GivingProposalType}
            targetAccountId={proposal.target_account_id}
            proposalId={proposal.id}
            submitLabel="Update draft"
            formAction={updateGivingProposalDraft}
            lockStableKey={proposal.proposal_type !== "create"}
          />
          <form action={submitGivingProposal}>
            <input type="hidden" name="proposal_id" value={proposal.id} />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-white"
            >
              Submit for approval
            </button>
          </form>
        </div>
      ) : null}

      {status === "pending" && isOwner && canPropose ? (
        <form action={withdrawGivingProposal} className="mt-8">
          <input type="hidden" name="proposal_id" value={proposal.id} />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-5 text-base font-semibold"
          >
            Return to draft to edit
          </button>
        </form>
      ) : null}

      {status === "pending" && canApprove && !isOwner ? (
        <div className="mt-8 space-y-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
          <h2 className="text-lg font-semibold text-[var(--color-text-body)]">
            Checker review
          </h2>
          <p className="text-base text-[var(--color-text-muted)]">
            Approving publishes these bank details to the Giving database right
            away. The public website seed page does not change until cutover.
          </p>
          <form action={approveGivingProposal} className="space-y-3">
            <input type="hidden" name="proposal_id" value={proposal.id} />
            <label className="block">
              <span className="text-sm font-semibold">Note (optional)</span>
              <input
                name="review_reason"
                className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3 text-base"
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-white"
            >
              Approve and publish this change
            </button>
          </form>
          <form action={rejectGivingProposal} className="space-y-3 border-t border-[var(--color-border)] pt-6">
            <input type="hidden" name="proposal_id" value={proposal.id} />
            <label className="block">
              <span className="text-sm font-semibold">
                Rejection reason (required)
              </span>
              <textarea
                name="review_reason"
                required
                minLength={3}
                rows={3}
                className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3 text-base"
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-destructive)] px-5 text-base font-semibold text-[var(--color-destructive)]"
            >
              Reject
            </button>
          </form>
        </div>
      ) : null}

      {status === "pending" && canApprove && isOwner ? (
        <p className="mt-8 text-base text-[var(--color-text-muted)]">
          You prepared this change, so you cannot approve it. Ask another
          Finance reviewer or Super Admin.
        </p>
      ) : null}
    </div>
  );
}
