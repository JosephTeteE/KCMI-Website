/**
 * Cloudflare Turnstile server-side verification helper.
 * Does not call production until TURNSTILE_SECRET_KEY is provisioned.
 */

import { getServerEnv } from "@/lib/env/server";

export type TurnstileVerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<TurnstileVerifyResult> {
  const env = getServerEnv();
  if (!env.TURNSTILE_SECRET_KEY) {
    return {
      ok: false,
      reason: "TURNSTILE_SECRET_KEY is not configured (placeholder env only)",
    };
  }
  if (!token) {
    return { ok: false, reason: "Missing Turnstile token" };
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
