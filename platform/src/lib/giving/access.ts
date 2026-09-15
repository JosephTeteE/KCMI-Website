import type { Permission } from "@/lib/authorization/rbac";
import type {
  GivingDestinationSnapshot,
  GivingProposalStatus,
} from "@/lib/giving/types";

export function canViewGivingAdmin(
  permissions: readonly Permission[],
): boolean {
  return (
    permissions.includes("giving.propose") ||
    permissions.includes("giving.approve") ||
    permissions.includes("audit.read")
  );
}

export function canProposeGiving(permissions: readonly Permission[]): boolean {
  return permissions.includes("giving.propose");
}

export function canApproveGiving(permissions: readonly Permission[]): boolean {
  return permissions.includes("giving.approve");
}

/** Pure gate used by unit tests (mirrors DB rules). */
export function canCheckerApproveProposal(input: {
  status: GivingProposalStatus;
  proposerId: string;
  checkerId: string;
  baseVersion: number | null;
  liveVersion: number | null;
  proposalType: string;
}): { ok: true } | { ok: false; reason: string } {
  if (input.status === "approved") {
    return { ok: true }; // idempotent already-applied path handled separately
  }
  if (input.status !== "pending") {
    return { ok: false, reason: "Only pending proposals can be approved." };
  }
  if (input.proposerId === input.checkerId) {
    return {
      ok: false,
      reason:
        "You cannot approve your own Giving change. Ask another authorized person.",
    };
  }
  if (input.proposalType !== "create") {
    if (
      input.liveVersion == null ||
      input.baseVersion == null ||
      input.liveVersion !== input.baseVersion
    ) {
      return {
        ok: false,
        reason:
          "This proposal is out of date. Someone else already changed the live destination. Start a new proposal.",
      };
    }
  }
  return { ok: true };
}

export function isProposalStale(input: {
  baseVersion: number | null;
  liveVersion: number | null;
  proposalType: string;
}): boolean {
  if (input.proposalType === "create") return false;
  if (input.baseVersion == null || input.liveVersion == null) return true;
  return input.baseVersion !== input.liveVersion;
}

export function emptyGivingSnapshot(): GivingDestinationSnapshot {
  return {
    stable_key: "",
    label: "",
    description: "",
    country: null,
    bank_name: "",
    account_name: "",
    swift_bic: null,
    external_url: null,
    visitor_note: null,
    display_order: 0,
    status: "published",
    numbers: [{ currency: "NGN", account_number: "", display_order: 0 }],
  };
}

/** Synthetic STAGING QA fixture — never real KCMI account numbers. */
export function stagingQaGivingSnapshot(
  suffix = "alpha",
): GivingDestinationSnapshot {
  return {
    stable_key: `staging-qa-${suffix}`,
    label: `STAGING QA — Synthetic ${suffix}`,
    description:
      "STAGING QA only. Not a real KCMI bank destination. Do not publish to the public website.",
    country: "NG",
    bank_name: "STAGING QA BANK",
    account_name: "STAGING QA SYNTHETIC ACCOUNT",
    swift_bic: null,
    external_url: null,
    visitor_note: null,
    display_order: 900,
    status: "published",
    numbers: [
      {
        currency: "NGN",
        account_number: "QA00000001",
        display_order: 0,
      },
    ],
  };
}
