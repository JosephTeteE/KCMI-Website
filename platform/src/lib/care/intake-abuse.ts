/** Shared Care intake anti-abuse helpers (no PII). */

export const CARE_INTAKE_GENERIC_REJECT_MESSAGE =
  "We could not accept that submission.";

/** Shown when Care intake is turned off (page or direct submit). */
export const CARE_INTAKE_GATE_DISABLED_MESSAGE =
  "Online requests are not available right now. Please contact KCMI another way.";

/** Honeypot field filled → treat as bot. Do not reveal which signal fired. */
export function isCareIntakeHoneypotTriggered(company: unknown): boolean {
  return typeof company === "string" && company.trim() !== "";
}
