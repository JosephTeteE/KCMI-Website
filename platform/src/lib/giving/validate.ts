import type { GivingDestinationSnapshot } from "@/lib/giving/types";

export type GivingValidationResult =
  | { ok: true; snapshot: GivingDestinationSnapshot }
  | { ok: false; error: string };

const KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CURRENCY_RE = /^[A-Z]{3}$/;
const ACCOUNT_RE = /^[A-Za-z0-9][A-Za-z0-9 \-]*$/;
const SWIFT_RE = /^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$/;

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  return t.length ? t : null;
}

/**
 * Conservative destination validation — no country-specific account formats.
 */
export function validateGivingSnapshot(
  input: Partial<GivingDestinationSnapshot> & {
    numbers?: Array<Partial<GivingDestinationSnapshot["numbers"][number]>>;
  },
): GivingValidationResult {
  const stable_key = (input.stable_key ?? "").trim();
  const label = (input.label ?? "").trim();
  const description = (input.description ?? "").trim();
  const country = emptyToNull(input.country ?? null);
  const bank_name = (input.bank_name ?? "").trim();
  const account_name = (input.account_name ?? "").trim();
  const swift_bic = emptyToNull(input.swift_bic ?? null)?.toUpperCase() ?? null;
  const external_url = emptyToNull(input.external_url ?? null);
  const display_order = Number.isFinite(input.display_order)
    ? Number(input.display_order)
    : 0;
  const status = input.status ?? "published";

  if (!KEY_RE.test(stable_key) || stable_key.length > 80) {
    return {
      ok: false,
      error:
        "Use a short key with lowercase letters, numbers, and hyphens only.",
    };
  }
  if (!label || label.length > 120) {
    return { ok: false, error: "Please enter a clear destination label." };
  }
  if (description.length > 2000) {
    return { ok: false, error: "Please shorten the description." };
  }
  if (!bank_name || bank_name.length > 120) {
    return { ok: false, error: "Please enter the bank name." };
  }
  if (!account_name || account_name.length > 200) {
    return { ok: false, error: "Please enter the account name." };
  }
  if (status !== "draft" && status !== "published" && status !== "disabled") {
    return { ok: false, error: "Destination status is not valid." };
  }
  if (swift_bic && !SWIFT_RE.test(swift_bic)) {
    return {
      ok: false,
      error: "SWIFT/BIC must be 8 or 11 letters and numbers.",
    };
  }
  if (external_url && !/^https:\/\//i.test(external_url)) {
    return {
      ok: false,
      error: "External giving links must start with https://",
    };
  }

  const rawNumbers = Array.isArray(input.numbers) ? input.numbers : [];
  if (rawNumbers.length < 1) {
    return {
      ok: false,
      error: "Add at least one account number and currency.",
    };
  }

  const numbers: GivingDestinationSnapshot["numbers"] = [];
  const seen = new Set<string>();
  for (let i = 0; i < rawNumbers.length; i++) {
    const row = rawNumbers[i];
    const currency = (row?.currency ?? "").trim().toUpperCase();
    const account_number = (row?.account_number ?? "").trim();
    if (!CURRENCY_RE.test(currency)) {
      return {
        ok: false,
        error: "Currency must be a 3-letter code such as NGN or USD.",
      };
    }
    if (account_number.length < 4 || account_number.length > 34) {
      return {
        ok: false,
        error: "Account numbers must be between 4 and 34 characters.",
      };
    }
    if (!ACCOUNT_RE.test(account_number)) {
      return {
        ok: false,
        error:
          "Account numbers may only use letters, numbers, spaces, and hyphens.",
      };
    }
    if (seen.has(currency)) {
      return {
        ok: false,
        error: `Currency ${currency} is listed more than once.`,
      };
    }
    seen.add(currency);
    numbers.push({
      currency,
      account_number,
      display_order: Number.isFinite(row?.display_order)
        ? Number(row?.display_order)
        : i,
    });
  }

  return {
    ok: true,
    snapshot: {
      stable_key,
      label,
      description,
      country,
      bank_name,
      account_name,
      swift_bic,
      external_url,
      display_order,
      status,
      numbers,
    },
  };
}

export function parseGivingSnapshotFromForm(
  formData: FormData,
): GivingValidationResult {
  const currencies = formData.getAll("number_currency").map(String);
  const accounts = formData.getAll("number_account").map(String);
  const numbers = currencies
    .map((currency, i) => ({
      currency,
      account_number: accounts[i] ?? "",
      display_order: i,
    }))
    .filter(
      (row) => row.currency.trim().length > 0 || row.account_number.trim().length > 0,
    );

  return validateGivingSnapshot({
    stable_key: String(formData.get("stable_key") ?? ""),
    label: String(formData.get("label") ?? ""),
    description: String(formData.get("description") ?? ""),
    country: String(formData.get("country") ?? ""),
    bank_name: String(formData.get("bank_name") ?? ""),
    account_name: String(formData.get("account_name") ?? ""),
    swift_bic: String(formData.get("swift_bic") ?? ""),
    external_url: String(formData.get("external_url") ?? ""),
    display_order: Number(formData.get("display_order") ?? 0),
    status: String(formData.get("status") ?? "published") as
      | "draft"
      | "published"
      | "disabled",
    numbers,
  });
}
