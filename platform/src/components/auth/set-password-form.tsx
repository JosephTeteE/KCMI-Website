"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasSupabasePublicConfig } from "@/lib/env/public";
import { humanPasswordUpdateError } from "@/lib/hub/humanize";

const MIN_PASSWORD_LENGTH = 8;

type SessionState = "checking" | "ready" | "missing";

export function SetPasswordForm() {
  const router = useRouter();
  const configReady = hasSupabasePublicConfig();
  const [sessionState, setSessionState] = useState<SessionState>(
    configReady ? "checking" : "missing",
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!configReady) {
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    async function refreshSessionState() {
      const { data, error: userError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (userError || !data.user) {
        setSessionState("missing");
        return;
      }
      setSessionState("ready");
    }

    void refreshSessionState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        void refreshSessionState();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [configReady]);

  if (!configReady) {
    return (
      <p className="rounded-md border border-[var(--color-warning)] bg-[var(--color-warning-bg)] p-4 hub-body text-[var(--color-text-body)]">
        Hub auth is not ready on this computer yet. Ask a Super Admin to finish
        setup.
      </p>
    );
  }

  if (sessionState === "checking") {
    return (
      <p className="hub-body text-[var(--color-text-muted)]">
        Checking your secure link…
      </p>
    );
  }

  if (sessionState === "missing") {
    return (
      <div className="space-y-4">
        <p className="hub-body text-[var(--color-text-body)]" role="alert">
          This password link has expired or is no longer valid. Request a new
          recovery email, then open the fresh link to choose a password.
        </p>
        <p>
          <Link
            href="/auth/forgot-password"
            className="text-base font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
          >
            Send a recovery email
          </Link>
        </p>
        <p>
          <Link
            href="/auth/sign-in"
            className="hub-help text-[var(--color-text-muted)] underline-offset-2 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`,
      );
      return;
    }
    if (password !== confirm) {
      setError("Those passwords do not match. Enter the same password twice.");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(humanPasswordUpdateError(updateError.message));
        return;
      }
      router.replace("/auth/mfa");
      router.refresh();
    } catch {
      setError("We could not save your password. Wait a moment and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="new-password" className="block text-base font-medium">
          New password
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-base"
        />
      </div>
      <div>
        <label
          htmlFor="confirm-password"
          className="block text-base font-medium"
        >
          Confirm password
        </label>
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 w-full min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-base"
        />
      </div>
      {error ? (
        <p className="hub-body text-[var(--color-destructive)]" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md bg-[var(--color-action-primary)] px-4 py-2 text-base font-medium text-[var(--color-action-primary-fg)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save password"}
      </button>
      <p className="hub-help text-[var(--color-text-muted)]">
        After saving, you will open the Hub with your authenticator app. If you
        already set one up, enter your 6-digit code. If not, you will scan a new
        QR code first.
      </p>
    </form>
  );
}
