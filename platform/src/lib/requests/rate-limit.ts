/**
 * Website Contact intake rate limiting.
 * Hashed requester keys only. Never store/log raw IP or PII.
 */

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createSecretKeyClient } from "@/lib/supabase/admin";
import { requireSupabaseSecretConfig } from "@/lib/env/server";
import { logWebsiteRequestIntakeEvent } from "@/lib/requests/intake-log";

export const WEBSITE_REQUEST_RATE_LIMIT = {
  maxAttempts: 8,
  windowSeconds: 3600,
} as const;

export const WEBSITE_REQUEST_RATE_LIMITED_MESSAGE =
  "Please try again in a little while.";

type RateLimitRpcResult = {
  allowed?: boolean;
  attempt_count?: number;
  limit?: number;
};

function pepper(): string {
  return requireSupabaseSecretConfig().secretKey;
}

export function hashWebsiteRequestRequesterKey(
  rawAddress: string,
  secret: string = pepper(),
): string {
  const normalized = rawAddress.trim().toLowerCase() || "unknown";
  return createHmac("sha256", secret)
    .update(`kcmi-website-request|v1|${normalized}`)
    .digest("hex");
}

export async function readWebsiteRequestRequesterAddress(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const realIp = h.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Consume one attempt. On infrastructure failure: fail open and log safely.
 */
export async function consumeWebsiteRequestRateLimit(): Promise<{
  allowed: boolean;
}> {
  let requesterKey: string;
  try {
    const address = await readWebsiteRequestRequesterAddress();
    requesterKey = hashWebsiteRequestRequesterKey(address);
  } catch {
    logWebsiteRequestIntakeEvent({
      outcome: "rate_limit_hash_failed",
      code: "hash_error",
    });
    return { allowed: true };
  }

  try {
    const supabase = createSecretKeyClient();
    const { data, error } = await supabase.rpc(
      "website_request_rate_limit_consume",
      {
        p_requester_key: requesterKey,
        p_limit: WEBSITE_REQUEST_RATE_LIMIT.maxAttempts,
        p_window_seconds: WEBSITE_REQUEST_RATE_LIMIT.windowSeconds,
      },
    );

    if (error) {
      logWebsiteRequestIntakeEvent({
        outcome: "rate_limit_check_failed",
        code: error.code ?? "rpc_error",
      });
      return { allowed: true };
    }

    const result = data as RateLimitRpcResult | null;
    const allowed = result?.allowed !== false;
    if (!allowed) {
      logWebsiteRequestIntakeEvent({
        outcome: "rate_limited",
        code: "limit_exceeded",
      });
    }
    return { allowed };
  } catch {
    logWebsiteRequestIntakeEvent({
      outcome: "rate_limit_check_failed",
      code: "unexpected",
    });
    return { allowed: true };
  }
}
