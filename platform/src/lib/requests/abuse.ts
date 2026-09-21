/** Shared anti-abuse helpers for website Contact intake (no PII). */

export const WEBSITE_REQUEST_GENERIC_REJECT_MESSAGE =
  "We could not accept that submission.";

/** Honeypot field filled → treat as bot. Do not reveal which signal fired. */
export function isWebsiteRequestHoneypotTriggered(company: unknown): boolean {
  return typeof company === "string" && company.trim() !== "";
}
