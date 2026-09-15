import Link from "next/link";
import { getStaffSession, staffHasPermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import {
  canApproveGiving,
  canProposeGiving,
  canViewGivingAdmin,
} from "@/lib/giving/access";
import {
  GIVING_ACCOUNT_STATUS_LABELS,
  GIVING_PROPOSAL_STATUS_LABELS,
  type GivingProposalStatus,
} from "@/lib/giving/types";
import { getGivingAccounts } from "@/content";

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function AdminGivingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const session = await getStaffSession();
  if (!session || !canViewGivingAdmin(session.profile.permissions)) {
    return (
      <div>
        <HubPageHeader title="Giving" />
        <p className="text-base text-[var(--color-text-muted)]">
          Your account cannot manage Giving destinations. Ask a Finance
          reviewer or Super Admin.
        </p>
      </div>
    );
  }

  const canPropose = canProposeGiving(session.profile.permissions);
  const canApprove = canApproveGiving(session.profile.permissions);
  const supabase = await createClient();

  const [{ data: accounts }, { data: pending }] = await Promise.all([
    supabase
      .from("giving_accounts")
      .select(
        "id, stable_key, label, bank_name, account_name, status, version, display_order, giving_account_numbers(currency, account_number, display_order)",
      )
      .order("display_order", { ascending: true }),
    supabase
      .from("giving_change_proposals")
      .select(
        "id, proposal_type, status, submitted_at, proposer_id, target_account_id, base_version",
      )
      .eq("status", "pending")
      .order("submitted_at", { ascending: true }),
  ]);

  const websiteAccounts = getGivingAccounts();

  return (
    <div>
      <HubPageHeader
        title="Giving"
        description="Manage bank destinations with dual approval. The public website still shows verified seed content until a separate human cutover."
        actions={
          canPropose ? (
            <Link
              href="/admin/giving/propose/new"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 text-base font-semibold text-white"
            >
              Propose a new destination
            </Link>
          ) : null
        }
      />
      <HubFlash message={params.message} error={params.error} />

      <section className="mb-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-action-primary)_8%,white)] p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text-body)]">
          Important
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-base text-[var(--color-text-muted)]">
          <li>
            <strong className="text-[var(--color-text-body)]">
              Current website content
            </strong>{" "}
            still comes from verified seed/legacy Giving details on{" "}
            <Link href="/giving" className="underline">
              /giving
            </Link>
            .
          </li>
          <li>
            <strong className="text-[var(--color-text-body)]">
              Database management state
            </strong>{" "}
            below is for secure dual-approval work. Empty or STAGING QA rows are{" "}
            <em>not</em> automatically live on the public website.
          </li>
          <li>
            Approval publishes to the Giving database immediately. Public
            cutover happens later only after human re-confirmation.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-[var(--color-text-body)]">
          Current website content (seed)
        </h2>
        <p className="mt-2 text-base text-[var(--color-text-muted)]">
          What visitors see today on /giving. Not edited from this screen.
        </p>
        <ul className="mt-4 grid gap-3">
          {websiteAccounts.map((account) => (
            <li
              key={account.id}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4"
            >
              <p className="font-semibold text-[var(--color-text-body)]">
                {account.purpose}
              </p>
              <p className="mt-1 text-base text-[var(--color-text-muted)]">
                {account.bankName}
                {account.accountNumber
                  ? ` · ${account.accountNumber}`
                  : account.accountsByCurrency
                    ? ` · ${account.accountsByCurrency
                        .map((c) => c.currency)
                        .join(", ")}`
                    : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-[var(--color-text-body)]">
          Current Giving Details (database)
        </h2>
        <p className="mt-2 text-base text-[var(--color-text-muted)]">
          Managed destinations awaiting public cutover. Use synthetic STAGING QA
          fixtures for workflow practice — not real KCMI numbers until verified.
        </p>
        {(accounts ?? []).length === 0 ? (
          <p className="mt-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-5 text-base text-[var(--color-text-muted)]">
            No destinations in the database yet. That is expected until human
            verification and cutover. Propose a STAGING QA destination to
            practice the approval flow.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {(accounts ?? []).map((account) => (
              <li
                key={account.id}
                className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-[var(--color-text-body)]">
                      {account.label}
                    </p>
                    <p className="mt-1 text-base text-[var(--color-text-muted)]">
                      {account.bank_name} ·{" "}
                      {
                        GIVING_ACCOUNT_STATUS_LABELS[
                          account.status as keyof typeof GIVING_ACCOUNT_STATUS_LABELS
                        ]
                      }{" "}
                      · version {account.version}
                    </p>
                    <ul className="mt-2 space-y-1 font-mono text-sm text-[var(--color-text-body)]">
                      {(account.giving_account_numbers ?? [])
                        .slice()
                        .sort((a, b) => a.display_order - b.display_order)
                        .map((n) => (
                          <li key={`${n.currency}-${n.account_number}`}>
                            {n.currency}: {n.account_number}
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/giving/${account.id}`}
                      className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-base font-semibold"
                    >
                      View details
                    </Link>
                    {canPropose ? (
                      <Link
                        href={`/admin/giving/${account.id}/propose`}
                        className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-action-primary)] px-4 text-base font-semibold text-[var(--color-action-primary)]"
                      >
                        Propose a change
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[var(--color-text-body)]">
          Pending changes
        </h2>
        <p className="mt-2 text-base text-[var(--color-text-muted)]">
          Waiting for a second person to approve or reject.
        </p>
        {(pending ?? []).length === 0 ? (
          <p className="mt-4 text-base text-[var(--color-text-muted)]">
            No pending Giving changes.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {(pending ?? []).map((proposal) => {
              const isOwn = proposal.proposer_id === session.user.id;
              return (
                <li
                  key={proposal.id}
                  className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4"
                >
                  <p className="font-semibold text-[var(--color-text-body)]">
                    {proposal.proposal_type} ·{" "}
                    {
                      GIVING_PROPOSAL_STATUS_LABELS[
                        proposal.status as GivingProposalStatus
                      ]
                    }
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    These changes are NOT on the website.
                    {isOwn
                      ? " You prepared this change — another person must review it."
                      : canApprove
                        ? " Ready for your review."
                        : ""}
                  </p>
                  <Link
                    href={`/admin/giving/proposals/${proposal.id}`}
                    className="mt-3 inline-flex min-h-11 items-center text-base font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
                  >
                    Review
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {staffHasPermission(session.profile, "audit.read") ? (
        <p className="mt-8 text-sm text-[var(--color-text-muted)]">
          Approval history is recorded in Hub audit events.
        </p>
      ) : null}
    </div>
  );
}
