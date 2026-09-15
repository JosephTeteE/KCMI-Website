import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  permissionsForRoles,
  roleHasPermission,
} from "@/lib/authorization/rbac";
import { getGivingAccountsSeed } from "@/content";
import {
  canApproveGiving,
  canCheckerApproveProposal,
  canProposeGiving,
  canViewGivingAdmin,
  isProposalStale,
  stagingQaGivingSnapshot,
} from "@/lib/giving/access";
import { validateGivingSnapshot } from "@/lib/giving/validate";
import {
  givingAccountParityKey,
  mapGivingDestinationToPublic,
} from "@/lib/giving/public-map";

describe("Giving D2 RBAC", () => {
  it("grants propose+approve to finance_reviewer and super_admin", () => {
    expect(roleHasPermission("finance_reviewer", "giving.propose")).toBe(true);
    expect(roleHasPermission("finance_reviewer", "giving.approve")).toBe(true);
    expect(roleHasPermission("super_admin", "giving.propose")).toBe(true);
    expect(roleHasPermission("super_admin", "giving.approve")).toBe(true);
  });

  it("denies media_admin propose/approve", () => {
    const perms = permissionsForRoles(["media_admin"]);
    expect(perms.has("giving.propose")).toBe(false);
    expect(perms.has("giving.approve")).toBe(false);
    expect(canProposeGiving([...perms])).toBe(false);
    expect(canApproveGiving([...perms])).toBe(false);
  });

  it("does not retain deprecated giving.change on roles", () => {
    const all = permissionsForRoles([
      "super_admin",
      "finance_reviewer",
      "media_admin",
    ]);
    expect(all.has("giving.change" as never)).toBe(false);
  });

  it("lets auditor view but not propose/approve", () => {
    const perms = [...permissionsForRoles(["auditor"])];
    expect(canViewGivingAdmin(perms)).toBe(true);
    expect(canProposeGiving(perms)).toBe(false);
    expect(canApproveGiving(perms)).toBe(false);
  });
});

describe("Giving D2 validation", () => {
  it("accepts synthetic STAGING QA snapshot", () => {
    const result = validateGivingSnapshot(stagingQaGivingSnapshot("alpha"));
    expect(result.ok).toBe(true);
  });

  it("blocks malformed account numbers and non-https URLs", () => {
    const badNumber = validateGivingSnapshot({
      ...stagingQaGivingSnapshot("bad"),
      numbers: [{ currency: "NGN", account_number: "!!", display_order: 0 }],
    });
    expect(badNumber.ok).toBe(false);

    const badUrl = validateGivingSnapshot({
      ...stagingQaGivingSnapshot("url"),
      external_url: "http://insecure.example",
    });
    expect(badUrl.ok).toBe(false);
  });

  it("requires dual-approval-sensitive fields to be present for publishable rows", () => {
    const missingBank = validateGivingSnapshot({
      ...stagingQaGivingSnapshot("bank"),
      bank_name: "",
    });
    expect(missingBank.ok).toBe(false);
  });
});

describe("Giving D2 maker/checker gates", () => {
  it("blocks self-approval", () => {
    const gate = canCheckerApproveProposal({
      status: "pending",
      proposerId: "user-a",
      checkerId: "user-a",
      baseVersion: 1,
      liveVersion: 1,
      proposalType: "update",
    });
    expect(gate.ok).toBe(false);
  });

  it("allows distinct checker on matching version", () => {
    const gate = canCheckerApproveProposal({
      status: "pending",
      proposerId: "user-a",
      checkerId: "user-b",
      baseVersion: 4,
      liveVersion: 4,
      proposalType: "update",
    });
    expect(gate.ok).toBe(true);
  });

  it("blocks stale proposal overwrite", () => {
    expect(
      isProposalStale({
        baseVersion: 4,
        liveVersion: 5,
        proposalType: "update",
      }),
    ).toBe(true);
    const gate = canCheckerApproveProposal({
      status: "pending",
      proposerId: "user-a",
      checkerId: "user-b",
      baseVersion: 4,
      liveVersion: 5,
      proposalType: "update",
    });
    expect(gate.ok).toBe(false);
  });

  it("treats second approval of already-approved as idempotent ok at gate layer", () => {
    const gate = canCheckerApproveProposal({
      status: "approved",
      proposerId: "user-a",
      checkerId: "user-b",
      baseVersion: 1,
      liveVersion: 2,
      proposalType: "update",
    });
    expect(gate.ok).toBe(true);
  });
});

describe("Giving D2 public page remains seed-backed", () => {
  it("public /giving page loads accounts asynchronously", () => {
    const page = readFileSync(
      resolve(process.cwd(), "src/app/(site)/giving/page.tsx"),
      "utf8",
    );
    expect(page).toMatch(/getGivingAccounts/);
    expect(page).toMatch(/getGivingPageIntro/);
    expect(page).toMatch(/await getGivingAccounts/);
    expect(page).toMatch(/CopyAccountNumber/);
  });

  it("seed destinations remain available as bootstrap reference", () => {
    const accounts = getGivingAccountsSeed();
    expect(accounts.length).toBeGreaterThanOrEqual(3);
    expect(accounts.some((a) => a.bankName === "ECOBANK")).toBe(true);
  });

  it("maps structured DB rows back to exact seed financial parity", () => {
    const seed = getGivingAccountsSeed();
    const mapped = [
      mapGivingDestinationToPublic({
        stable_key: "general-ecobank",
        label: "General Giving",
        description:
          "For tithes, offerings, and seed gifts to support the general ministry work.",
        bank_name: "ECOBANK",
        account_name: "KINGDOM COVENANT MINISTRIES INTERNATIONAL",
        swift_bic: null,
        visitor_note: "Please title your payment description accordingly.",
        numbers: [
          { currency: "NGN", account_number: "1602002211", display_order: 0 },
        ],
      }),
      mapGivingDestinationToPublic({
        stable_key: "care-union",
        label: "Care Group Giving",
        description:
          "For welfare, prisoner, needy, and less-privileged support.",
        bank_name: "UNION BANK",
        account_name: "KINGDOM COVENANT MINISTRIES INTERNATIONAL",
        swift_bic: null,
        visitor_note: 'Please include "Care Group" in your payment description.',
        numbers: [
          { currency: "NGN", account_number: "0055484937", display_order: 0 },
        ],
      }),
      mapGivingDestinationToPublic({
        stable_key: "international-zenith",
        label: "International Giving",
        description:
          "For donations in foreign currencies (USD, GBP, EUR) from outside Nigeria.",
        bank_name: "ZENITH BANK",
        account_name: "KINGDOM COVENANT MINISTRIES INTERNATIONAL",
        swift_bic: "ZEIBNGLA",
        visitor_note: "Please title your payment description accordingly.",
        numbers: [
          { currency: "USD", account_number: "5074346861", display_order: 0 },
          { currency: "GBP", account_number: "5061372275", display_order: 1 },
          { currency: "EUR", account_number: "5081098025", display_order: 2 },
        ],
      }),
    ];
    expect(mapped.map(givingAccountParityKey)).toEqual(
      seed.map(givingAccountParityKey),
    );
  });

  it("Hub actions require AAL2 via requireStaffAction", () => {
    const actions = readFileSync(
      resolve(process.cwd(), "src/app/admin/giving/actions.ts"),
      "utf8",
    );
    expect(actions).toMatch(/requireStaffAction\("giving\.propose"\)/);
    expect(actions).toMatch(/requireStaffAction\("giving\.approve"\)/);
    expect(actions).toMatch(/approve_giving_change_proposal/);
    expect(actions).toMatch(/reject_giving_change_proposal/);
    expect(actions).toMatch(/submit_giving_change_proposal/);
  });

  it("migration retires giving.change grants and adds dual-approval RPCs", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260914220000_giving_d2_management.sql",
      ),
      "utf8",
    );
    expect(migration).toMatch(/giving\.propose/);
    expect(migration).toMatch(/giving\.approve/);
    expect(migration).toMatch(/delete from public\.role_permissions[\s\S]*giving\.change/);
    expect(migration).toMatch(/approve_giving_change_proposal/);
    expect(migration).toMatch(/proposer_id = v_uid/);
    expect(migration).not.toMatch(/Paystack|Stripe|Flutterwave|donors|donations/i);
  });
});
