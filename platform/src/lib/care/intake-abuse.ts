/** Shared Care intake anti-abuse helpers (no PII). */

export const CARE_INTAKE_GENERIC_REJECT_MESSAGE =
  "We could not accept that submission.";

/** Honeypot field filled → treat as bot. Do not reveal which signal fired. */
export function isCareIntakeHoneypotTriggered(company: unknown): boolean {
  return typeof company === "string" && company.trim() !== "";
}
