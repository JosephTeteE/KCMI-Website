/**
 * Safe website Contact intake observability — never log message bodies or contact PII.
 */

export type WebsiteRequestIntakeOutcome =
  | "honeypot_rejected"
  | "rate_limited"
  | "rate_limit_check_failed"
  | "rate_limit_hash_failed"
  | "validation_rejected"
  | "insert_failed"
  | "accepted"
  | "email_failed"
  | "email_sent"
  | "email_skipped";

export function logWebsiteRequestIntakeEvent(input: {
  outcome: WebsiteRequestIntakeOutcome;
  code?: string;
  referenceCode?: string;
}): void {
  const payload: Record<string, string> = {
    scope: "website_request_intake",
    outcome: input.outcome,
  };
  if (input.code) payload.code = input.code;
  if (input.referenceCode) payload.reference_code = input.referenceCode;
  console.info(JSON.stringify(payload));
}
