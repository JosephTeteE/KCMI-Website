/**
 * Safe Care intake observability — never log narratives or contact PII.
 */

import type { CareServiceType } from "@/lib/care/types";

export type CareIntakeLogOutcome =
  | "accepted"
  | "gate_disabled"
  | "validation_rejected"
  | "honeypot_rejected"
  | "rate_limited"
  | "rate_limit_check_failed"
  | "rate_limit_hash_failed"
  | "insert_failed";

const SENSITIVE_KEY =
  /narrative|display_name|displayName|email|phone|additional|reason|description|name|body|raw|ip|address|payload/i;

export function assertSafeCareIntakeMetadata(
  metadata: Record<string, unknown> | undefined,
): void {
  if (!metadata) return;
  for (const key of Object.keys(metadata)) {
    if (SENSITIVE_KEY.test(key)) {
      throw new Error(`Unsafe Care intake log key: ${key}`);
    }
  }
}

/**
 * Structured console log for Care intake. Values must be non-sensitive codes only.
 */
export function logCareIntakeEvent(args: {
  service: CareServiceType;
  outcome: CareIntakeLogOutcome;
  code?: string;
  referenceCode?: string;
}): void {
  const entry: Record<string, unknown> = {
    scope: "care_intake",
    service: args.service,
    outcome: args.outcome,
  };
  if (args.code) entry.code = args.code;
  if (args.referenceCode) entry.reference_code = args.referenceCode;
  assertSafeCareIntakeMetadata(entry);
  console.info(JSON.stringify(entry));
}
