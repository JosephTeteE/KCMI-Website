import type { Json } from "@/lib/supabase/database.types";
import type { GivingDestinationSnapshot } from "@/lib/giving/types";

export function snapshotFromJson(
  value: Json | null | undefined,
): GivingDestinationSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const o = value as Record<string, unknown>;
  const numbersRaw = Array.isArray(o.numbers) ? o.numbers : [];
  const numbers = numbersRaw
    .map((row, i) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return null;
      const r = row as Record<string, unknown>;
      return {
        currency: String(r.currency ?? ""),
        account_number: String(r.account_number ?? ""),
        display_order: Number(r.display_order ?? i),
      };
    })
    .filter((n): n is GivingDestinationSnapshot["numbers"][number] => n != null);

  const status = String(o.status ?? "published");
  if (status !== "draft" && status !== "published" && status !== "disabled") {
    return null;
  }

  return {
    stable_key: String(o.stable_key ?? ""),
    label: String(o.label ?? ""),
    description: String(o.description ?? ""),
    country: o.country == null || o.country === "" ? null : String(o.country),
    bank_name: String(o.bank_name ?? ""),
    account_name: String(o.account_name ?? ""),
    swift_bic:
      o.swift_bic == null || o.swift_bic === "" ? null : String(o.swift_bic),
    external_url:
      o.external_url == null || o.external_url === ""
        ? null
        : String(o.external_url),
    visitor_note:
      o.visitor_note == null || o.visitor_note === ""
        ? null
        : String(o.visitor_note),
    display_order: Number(o.display_order ?? 0),
    status,
    numbers,
  };
}

export function snapshotToJson(snapshot: GivingDestinationSnapshot): Json {
  return {
    stable_key: snapshot.stable_key,
    label: snapshot.label,
    description: snapshot.description,
    country: snapshot.country,
    bank_name: snapshot.bank_name,
    account_name: snapshot.account_name,
    swift_bic: snapshot.swift_bic,
    external_url: snapshot.external_url,
    visitor_note: snapshot.visitor_note,
    display_order: snapshot.display_order,
    status: snapshot.status,
    numbers: snapshot.numbers.map((n) => ({
      currency: n.currency,
      account_number: n.account_number,
      display_order: n.display_order,
    })),
  };
}

export function accountRowToSnapshot(row: {
  stable_key: string;
  label: string;
  description: string;
  country: string | null;
  bank_name: string;
  account_name: string;
  swift_bic: string | null;
  external_url: string | null;
  visitor_note?: string | null;
  display_order: number;
  status: "draft" | "published" | "disabled";
  giving_account_numbers?: Array<{
    currency: string;
    account_number: string;
    display_order: number;
  }> | null;
}): GivingDestinationSnapshot {
  const numbers = [...(row.giving_account_numbers ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  );
  return {
    stable_key: row.stable_key,
    label: row.label,
    description: row.description,
    country: row.country,
    bank_name: row.bank_name,
    account_name: row.account_name,
    swift_bic: row.swift_bic,
    external_url: row.external_url,
    visitor_note: row.visitor_note ?? null,
    display_order: row.display_order,
    status: row.status,
    numbers,
  };
}
