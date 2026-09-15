/**
 * Care P4 — first-party public intake rate limiting.
 * Hashed requester keys only. Never store/log raw IP, PII, or narratives.
 */

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createSecretKeyClient } from "@/lib/supabase/admin";
import { requireSupabaseSecretConfig } from "@/lib/env/server";
import type { CareServiceType } from "@/lib/care/types";
import { logCareIntakeEvent } from "@/lib/care/intake-log";

/**
 * Limits are per service domain and per salted requester key.
 * Rationale: shared church/office Wi‑Fi must remain usable; bots still hit a ceiling.
 * 8 attempts / hour / domain is enough for real visitors, tight for automated spam.
 */
export const CARE_INTAKE_RATE_LIMIT = {
  maxAttempts: 8,
  windowSeconds: 3600,
} as const;

export const CARE_INTAKE_RATE_LIMITED_MESSAGE =
  "Please try again in a little while.";

type RateLimitRpcResult = {
  allowed?: boolean;
  attempt_count?: number;
  limit?: number;
};

function pepper(): string {
  // Reuse existing server secret; no separate pepper required for launch.
  return requireSupabaseSecretConfig().secretKey;
}

/**
 * Derive a one-way requester key from request headers.
 * Never returns or logs the raw address.
 */
export function hashCareIntakeRequesterKey(
  rawAddress: string,
  secret: string = pepper(),
): string {
  const normalized = rawAddress.trim().toLowerCase() || "unknown";
  return createHmac("sha256", secret)
    .update(`kcmi-care-intake|v1|${normalized}`)
    .digest("hex");
}

export async function readCareIntakeRequesterAddress(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const realIp = h.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Consume one attempt for this requester + Care domain.
 * On infrastructure failure: fail open (allow) and log a safe technical code —
 * pastoral availability must not depend solely on the rate-limit table.
 */
export async function consumeCareIntakeRateLimit(
  service: CareServiceType,
): Promise<{ allowed: boolean }> {
  let requesterKey: string;
  try {
    const address = await readCareIntakeRequesterAddress();
    requesterKey = hashCareIntakeRequesterKey(address);
  } catch {
    logCareIntakeEvent({
      service,
      outcome: "rate_limit_hash_failed",
      code: "hash_error",
    });
    return { allowed: true };
  }

  try {
    const supabase = createSecretKeyClient();
    const { data, error } = await supabase.rpc(
      "care_intake_rate_limit_consume",
      {
        p_requester_key: requesterKey,
        p_service: service,
        p_limit: CARE_INTAKE_RATE_LIMIT.maxAttempts,
        p_window_seconds: CARE_INTAKE_RATE_LIMIT.windowSeconds,
      },
    );

    if (error) {
      logCareIntakeEvent({
        service,
        outcome: "rate_limit_check_failed",
        code: error.code ?? "rpc_error",
      });
      return { allowed: true };
    }

    const result = data as RateLimitRpcResult | null;
    const allowed = result?.allowed !== false;
    if (!allowed) {
      logCareIntakeEvent({
        service,
        outcome: "rate_limited",
        code: "limit_exceeded",
      });
    }
    return { allowed };
  } catch {
    logCareIntakeEvent({
      service,
      outcome: "rate_limit_check_failed",
      code: "unexpected",
    });
    return { allowed: true };
  }
}
