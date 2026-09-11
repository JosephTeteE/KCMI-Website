"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { hasSupabasePublicConfig } from "@/lib/env/public";
import { humanMfaError } from "@/lib/hub/humanize";

export default function MfaPage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"enroll" | "challenge">("enroll");

  useEffect(() => {
    if (!hasSupabasePublicConfig()) return;
    void (async () => {
      const supabase = createClient();
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2") {
        router.replace("/admin");
        return;
      }
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.[0];
      if (totp?.id) {
        setFactorId(totp.id);
        setMode("challenge");
        return;
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "KCMI Hub",
      });
      if (error) {
        setMessage(humanMfaError(error.message));
        return;
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setMode("enroll");
    })();
  }, [router]);

  if (!hasSupabasePublicConfig()) {
    return (
      <p className="mx-auto max-w-lg p-8 hub-body text-[var(--color-text-muted)]">
        This Hub computer is not set up yet. Ask a Super Admin to finish setup.
      </p>
    );
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setMessage(null);
    const supabase = createClient();
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      setMessage(humanMfaError(challenge.error.message));
      return;
    }
    const verified = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code,
    });
    if (verified.error) {
      setMessage(humanMfaError(verified.error.message));
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">Add extra protection</h1>
      <p className="hub-body text-[var(--color-text-muted)]">
        Your authenticator app gives you a new 6-digit code when you sign in.
        Scan the picture, then type the code. You will need this code when you
        change the website.
      </p>
      {mode === "enroll" && qr ? (
        <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          <p className="hub-body">Scan this QR code with your authenticator app:</p>
          {/* QR from Supabase is an SVG data URL */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr}
            alt="QR code to connect your authenticator app"
            width={200}
            height={200}
          />
          {secret ? (
            <p className="break-all text-sm text-[var(--color-text-muted)]">
          Manual setup code: {secret}
            </p>
          ) : null}
        </div>
      ) : null}
      <form onSubmit={verify} className="space-y-3">
        <label htmlFor="code" className="block text-base font-medium">
          6-digit app code
        </label>
        <input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full min-h-11 rounded-md border border-[var(--color-border)] px-3 py-2 text-base"
        />
        {message ? (
          <p className="hub-body text-[var(--color-destructive)]" role="alert">
            {message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={!factorId}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md bg-[var(--color-action-primary)] px-4 py-2 text-base font-semibold text-[var(--color-action-primary-fg)] disabled:cursor-not-allowed"
        >
          Continue to the Hub
        </button>
      </form>
    </div>
  );
}
