/**
 * Cloudflare Turnstile server-side verification helper.
 *
 * Deterministic non-production test mode:
 *   TURNSTILE_TEST_MODE=1 (or NEXT_PUBLIC_TURNSTILE_TEST_MODE=1) and token === "TEST_PASS"
 * never applies when KCMI_ENVIRONMENT=production or NODE_ENV=production.
 */

import { getServerEnv } from "@/lib/env/server";

export type TurnstileVerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

function allowTurnstileTestMode(): boolean {
  if (process.env.KCMI_ENVIRONMENT === "production") return false;
  if (process.env.NODE_ENV === "production") return false;
  return (
    process.env.TURNSTILE_TEST_MODE === "1" ||
    process.env.NEXT_PUBLIC_TURNSTILE_TEST_MODE === "1"
  );
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<TurnstileVerifyResult> {
  if (!token) {
    return { ok: false, reason: "Missing Turnstile token" };
  }

  if (allowTurnstileTestMode() && token === "TEST_PASS") {
    return { ok: true };
  }

  const env = getServerEnv();
  if (!env.TURNSTILE_SECRET_KEY) {
    return {
      ok: false,
      reason: "TURNSTILE_SECRET_KEY is not configured (placeholder env only)",
    };
  }

  const body = new URLSearchParams();
  body.set("secret", env.TURNSTILE_SECRET_KEY);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
    },
  );

  if (!response.ok) {
    return { ok: false, reason: "Turnstile verification HTTP failure" };
  }

  const data = (await response.json()) as { success?: boolean };
  if (!data.success) {
    return { ok: false, reason: "Turnstile verification failed" };
  }
  return { ok: true };
}
