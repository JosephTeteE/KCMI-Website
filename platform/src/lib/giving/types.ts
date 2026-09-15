/** Structured Giving destination snapshot (proposal + live apply). */
export type GivingAccountNumberSnapshot = {
  currency: string;
  account_number: string;
  display_order: number;
};

export type GivingDestinationSnapshot = {
  stable_key: string;
  label: string;
  description: string;
  country: string | null;
  bank_name: string;
  account_name: string;
  swift_bic: string | null;
  external_url: string | null;
  display_order: number;
  status: "draft" | "published" | "disabled";
  numbers: GivingAccountNumberSnapshot[];
};

export type GivingProposalType = "create" | "update" | "disable" | "enable";

export type GivingProposalStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "superseded";

export const GIVING_PROPOSAL_STATUS_LABELS: Record<GivingProposalStatus, string> =
  {
    draft: "Draft",
    pending: "Waiting for approval",
    approved: "Approved and published to the database",
    rejected: "Rejected",
    superseded: "Out of date",
  };

export const GIVING_ACCOUNT_STATUS_LABELS: Record<
  GivingDestinationSnapshot["status"],
  string
> = {
  draft: "Not ready",
  published: "Ready in database",
  disabled: "Turned off",
};
