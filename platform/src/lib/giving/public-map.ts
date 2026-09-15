import type { GivingAccount } from "@/content/types";
import type { GivingDestinationSnapshot } from "@/lib/giving/types";

/**
 * Map a structured Giving destination to the public GivingAccount shape.
 * Single NGN number (seed local accounts) → accountNumber only (seed parity).
 * Multi-currency → accountsByCurrency only.
 */
export function mapGivingDestinationToPublic(
  snapshot: Pick<
    GivingDestinationSnapshot,
    | "stable_key"
    | "label"
    | "description"
    | "bank_name"
    | "account_name"
    | "swift_bic"
    | "visitor_note"
    | "numbers"
  >,
): GivingAccount {
  const numbers = [...snapshot.numbers].sort(
    (a, b) => a.display_order - b.display_order,
  );

  const isSeedLocalSingleNgn =
    numbers.length === 1 && numbers[0]?.currency === "NGN";

  const account: GivingAccount = {
    id: snapshot.stable_key,
    purpose: snapshot.label,
    description: snapshot.description,
    accountName: snapshot.account_name,
    bankName: snapshot.bank_name,
  };

  if (snapshot.swift_bic) {
    account.swiftCode = snapshot.swift_bic;
  }
  if (snapshot.visitor_note) {
    account.note = snapshot.visitor_note;
  }

  if (isSeedLocalSingleNgn) {
    account.accountNumber = numbers[0].account_number;
  } else {
    account.accountsByCurrency = numbers.map((n) => ({
      currency: n.currency,
      accountNumber: n.account_number,
    }));
  }

  return account;
}

/** Exact financial fields used for seed↔DB parity checks. */
export function givingAccountParityKey(account: GivingAccount): string {
  const numbers = account.accountNumber
    ? [`*:${account.accountNumber}`]
    : (account.accountsByCurrency ?? []).map(
        (c) => `${c.currency}:${c.accountNumber}`,
      );
  return [
    account.id,
    account.purpose,
    account.description,
    account.accountName,
    account.bankName,
    account.swiftCode ?? "",
    account.note ?? "",
    ...numbers,
  ].join("|");
}
