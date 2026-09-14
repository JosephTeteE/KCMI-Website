/**
 * E3 registration eligibility and capacity helpers (pure).
 */

export type RegistrationEventInput = {
  status: string;
  registrationEnabled: boolean;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  capacity: number | null;
  registeredPeople?: number;
};

export type RegistrationEligibility =
  | { state: "disabled" }
  | { state: "not_open"; opensAt: string }
  | { state: "closed"; closesAt: string | null }
  | { state: "full"; capacity: number }
  | { state: "open"; remaining: number | null };

export const MAX_PARTY_SIZE = 20;
export const MIN_PARTY_SIZE = 1;
/** Same event + email within this window returns the existing registration. */
export const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

export function evaluateRegistrationEligibility(
  event: RegistrationEventInput,
  now: Date = new Date(),
): RegistrationEligibility {
  if (event.status !== "published" || !event.registrationEnabled) {
    return { state: "disabled" };
  }

  if (
    event.registrationOpensAt &&
    now.getTime() < new Date(event.registrationOpensAt).getTime()
  ) {
    return { state: "not_open", opensAt: event.registrationOpensAt };
  }

  if (
    event.registrationClosesAt &&
    now.getTime() > new Date(event.registrationClosesAt).getTime()
  ) {
    return { state: "closed", closesAt: event.registrationClosesAt };
  }

  const used = event.registeredPeople ?? 0;
  if (event.capacity != null) {
    const remaining = event.capacity - used;
    if (remaining <= 0) {
      return { state: "full", capacity: event.capacity };
    }
    return { state: "open", remaining };
  }

  return { state: "open", remaining: null };
}

export function parsePartySize(
  raw: unknown,
): { ok: true; value: number } | { ok: false; error: string } {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseInt(raw.trim(), 10)
        : NaN;
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, error: "Enter how many people are registering." };
  }
  if (n < MIN_PARTY_SIZE) {
    return { ok: false, error: "At least one person is required." };
  }
  if (n > MAX_PARTY_SIZE) {
    return {
      ok: false,
      error: `You can register up to ${MAX_PARTY_SIZE} people on one form.`,
    };
  }
  return { ok: true, value: n };
}
