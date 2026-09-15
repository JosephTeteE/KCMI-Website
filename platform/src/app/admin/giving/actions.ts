"use server";

import { requireStaffAction } from "@/lib/cms/require-staff";
import { writeAuditEvent } from "@/lib/cms/audit";
import { redirectWithError, redirectWithMessage } from "@/lib/cms/hub-flash";
import { createClient } from "@/lib/supabase/server";
import {
  accountRowToSnapshot,
  snapshotFromJson,
  snapshotToJson,
} from "@/lib/giving/snapshot";
import { parseGivingSnapshotFromForm } from "@/lib/giving/validate";
import type { GivingProposalType } from "@/lib/giving/types";

function rpcMessage(error: { message?: string } | null, fallback: string) {
  const msg = error?.message?.trim();
  if (!msg) return fallback;
  // Strip Postgres exception prefix noise when present
  return msg.replace(/^.*P0001:\s*/i, "").replace(/^ERROR:\s*/i, "") || fallback;
}

export async function createGivingProposal(formData: FormData) {
  const gate = await requireStaffAction("giving.propose");
  if (!gate.ok) {
    redirectWithError("/admin/giving", gate.message);
  }

  const proposalType = String(
    formData.get("proposal_type") ?? "create",
  ) as GivingProposalType;
  const targetId = String(formData.get("target_account_id") ?? "").trim();
  const redirectOnError =
    proposalType === "create" || !targetId
      ? "/admin/giving/propose/new"
      : `/admin/giving/${targetId}/propose`;

  const parsed = parseGivingSnapshotFromForm(formData);
  if (!parsed.ok) {
    redirectWithError(redirectOnError, parsed.error);
  }

  let baseVersion: number | null = null;
  let baseSnapshot = null;

  const supabase = await createClient();
  const actorId = gate.session.user.id;

  if (proposalType !== "create") {
    if (!targetId) {
      redirectWithError("/admin/giving", "Missing Giving destination.");
    }
    const { data: account, error } = await supabase
      .from("giving_accounts")
      .select(
        "id, stable_key, label, description, country, bank_name, account_name, swift_bic, external_url, visitor_note, display_order, status, version, giving_account_numbers(currency, account_number, display_order)",
      )
      .eq("id", targetId)
      .maybeSingle();
    if (error || !account) {
      redirectWithError("/admin/giving", "That Giving destination could not be found.");
    }
    baseVersion = account.version;
    baseSnapshot = snapshotToJson(accountRowToSnapshot(account));

    if (proposalType === "disable") {
      parsed.snapshot.status = "disabled";
    }
    if (proposalType === "enable") {
      parsed.snapshot.status = "published";
    }
  }

  const { data, error } = await supabase
    .from("giving_change_proposals")
    .insert({
      target_account_id: proposalType === "create" ? null : targetId,
      proposal_type: proposalType,
      base_version: baseVersion,
      base_snapshot: baseSnapshot,
      proposer_id: actorId,
      proposed_snapshot: snapshotToJson(parsed.snapshot),
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    redirectWithError(
      redirectOnError,
      error?.message?.includes("duplicate")
        ? "That destination key is already in use in a proposal or account."
        : "We could not save this draft. Please try again.",
    );
  }

  await writeAuditEvent({
    action: "giving.proposal.create",
    entityType: "giving_change_proposal",
    entityId: data.id,
    actorId,
    metadata: {
      proposal_type: proposalType,
      target_account_id: proposalType === "create" ? null : targetId,
    },
  });

  redirectWithMessage(
    `/admin/giving/proposals/${data.id}`,
    "Draft saved. Review CURRENT vs PROPOSED, then submit for approval.",
  );
}

export async function updateGivingProposalDraft(formData: FormData) {
  const gate = await requireStaffAction("giving.propose");
  const proposalId = String(formData.get("proposal_id") ?? "").trim();
  if (!gate.ok) {
    redirectWithError(
      proposalId ? `/admin/giving/proposals/${proposalId}` : "/admin/giving",
      gate.message,
    );
  }
  if (!proposalId) {
    redirectWithError("/admin/giving", "Missing proposal.");
  }

  const parsed = parseGivingSnapshotFromForm(formData);
  if (!parsed.ok) {
    redirectWithError(`/admin/giving/proposals/${proposalId}`, parsed.error);
  }

  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from("giving_change_proposals")
    .select("id, status, proposer_id, proposal_type")
    .eq("id", proposalId)
    .maybeSingle();

  if (loadError || !existing) {
    redirectWithError("/admin/giving", "That proposal could not be found.");
  }
  if (existing.proposer_id !== gate.session.user.id) {
    redirectWithError(
      `/admin/giving/proposals/${proposalId}`,
      "Only the person who prepared this change can edit the draft.",
    );
  }
  if (existing.status !== "draft") {
    redirectWithError(
      `/admin/giving/proposals/${proposalId}`,
      "Pending proposals cannot be edited silently. Return it to draft first, then edit.",
    );
  }

  if (existing.proposal_type === "disable") {
    parsed.snapshot.status = "disabled";
  }
  if (existing.proposal_type === "enable") {
    parsed.snapshot.status = "published";
  }

  const { error } = await supabase
    .from("giving_change_proposals")
    .update({
      proposed_snapshot: snapshotToJson(parsed.snapshot),
    })
    .eq("id", proposalId)
    .eq("status", "draft")
    .eq("proposer_id", gate.session.user.id);

  if (error) {
    redirectWithError(
      `/admin/giving/proposals/${proposalId}`,
      "We could not update this draft. Please try again.",
    );
  }

  redirectWithMessage(
    `/admin/giving/proposals/${proposalId}`,
    "Draft updated.",
  );
}

export async function submitGivingProposal(formData: FormData) {
  const gate = await requireStaffAction("giving.propose");
  const proposalId = String(formData.get("proposal_id") ?? "").trim();
  if (!gate.ok) {
    redirectWithError(
      proposalId ? `/admin/giving/proposals/${proposalId}` : "/admin/giving",
      gate.message,
    );
  }
  if (!proposalId) {
    redirectWithError("/admin/giving", "Missing proposal.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_giving_change_proposal", {
    p_proposal_id: proposalId,
  });

  if (error || !data) {
    redirectWithError(
      `/admin/giving/proposals/${proposalId}`,
      rpcMessage(error, "We could not submit this for approval."),
    );
  }

  redirectWithMessage(
    `/admin/giving/proposals/${proposalId}`,
    "Submitted for approval. These changes are NOT on the website.",
  );
}

export async function withdrawGivingProposal(formData: FormData) {
  const gate = await requireStaffAction("giving.propose");
  const proposalId = String(formData.get("proposal_id") ?? "").trim();
  if (!gate.ok) {
    redirectWithError(
      proposalId ? `/admin/giving/proposals/${proposalId}` : "/admin/giving",
      gate.message,
    );
  }
  if (!proposalId) {
    redirectWithError("/admin/giving", "Missing proposal.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_giving_change_proposal", {
    p_proposal_id: proposalId,
  });

  if (error) {
    redirectWithError(
      `/admin/giving/proposals/${proposalId}`,
      rpcMessage(error, "We could not return this to draft."),
    );
  }

  redirectWithMessage(
    `/admin/giving/proposals/${proposalId}`,
    "Returned to draft. You can edit it again.",
  );
}

export async function approveGivingProposal(formData: FormData) {
  const gate = await requireStaffAction("giving.approve");
  const proposalId = String(formData.get("proposal_id") ?? "").trim();
  if (!gate.ok) {
    redirectWithError(
      proposalId ? `/admin/giving/proposals/${proposalId}` : "/admin/giving",
      gate.message,
    );
  }
  if (!proposalId) {
    redirectWithError("/admin/giving", "Missing proposal.");
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("giving_change_proposals")
    .select("proposer_id, status")
    .eq("id", proposalId)
    .maybeSingle();

  if (existing?.proposer_id === gate.session.user.id) {
    redirectWithError(
      `/admin/giving/proposals/${proposalId}`,
      "You cannot approve your own Giving change. Ask another authorized person.",
    );
  }

  const reason = String(formData.get("review_reason") ?? "").trim();
  const { error } = await supabase.rpc("approve_giving_change_proposal", {
    p_proposal_id: proposalId,
    p_review_reason: reason.length ? reason : null,
  });

  if (error) {
    redirectWithError(
      `/admin/giving/proposals/${proposalId}`,
      rpcMessage(error, "We could not approve and publish this change."),
    );
  }

  redirectWithMessage(
    `/admin/giving/proposals/${proposalId}`,
    "Approved and published to the Giving database.",
  );
}

export async function rejectGivingProposal(formData: FormData) {
  const gate = await requireStaffAction("giving.approve");
  const proposalId = String(formData.get("proposal_id") ?? "").trim();
  if (!gate.ok) {
    redirectWithError(
      proposalId ? `/admin/giving/proposals/${proposalId}` : "/admin/giving",
      gate.message,
    );
  }
  if (!proposalId) {
    redirectWithError("/admin/giving", "Missing proposal.");
  }

  const reason = String(formData.get("review_reason") ?? "").trim();
  if (reason.length < 3) {
    redirectWithError(
      `/admin/giving/proposals/${proposalId}`,
      "Please explain why this change is rejected.",
    );
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("giving_change_proposals")
    .select("proposer_id")
    .eq("id", proposalId)
    .maybeSingle();

  if (existing?.proposer_id === gate.session.user.id) {
    redirectWithError(
      `/admin/giving/proposals/${proposalId}`,
      "You cannot reject your own Giving change. Ask another authorized person.",
    );
  }

  const { error } = await supabase.rpc("reject_giving_change_proposal", {
    p_proposal_id: proposalId,
    p_review_reason: reason,
  });

  if (error) {
    redirectWithError(
      `/admin/giving/proposals/${proposalId}`,
      rpcMessage(error, "We could not reject this change."),
    );
  }

  redirectWithMessage(
    `/admin/giving/proposals/${proposalId}`,
    "Rejected. The live database destination was not changed.",
  );
}

/** Helper for pages that need to rehydrate a proposal snapshot (unused export for tests). */
export async function readProposalSnapshot(proposalId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("giving_change_proposals")
    .select("proposed_snapshot")
    .eq("id", proposalId)
    .maybeSingle();
  return snapshotFromJson(data?.proposed_snapshot ?? null);
}
