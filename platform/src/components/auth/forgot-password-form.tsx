"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabasePublicConfig } from "@/lib/env/public";
import { FORGOT_PASSWORD_GENERIC_CONFIRMATION } from "@/lib/hub/humanize";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasSupabasePublicConfig()) {
    return (
      <p className="rounded-md border border-[var(--color-warning)] bg-[var(--color-warning-bg)] p-4 hub-body text-[var(--color-text-body)]">
        Hub auth is not ready on this computer yet. Ask a Super Admin to finish
        setup.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/confirm?next=/auth/set-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo },
      );
      // Always show the generic confirmation — do not reveal whether the email exists.
      if (resetError) {
        setError(
          "We could not start password recovery right now. Wait a moment and try again.",
        );
        return;
      }
      setSent(true);
    } catch {
      setError(
        "We could not start password recovery right now. Wait a moment and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="hub-body text-[var(--color-text-body)]" role="status">
          {FORGOT_PASSWORD_GENERIC_CONFIRMATION}
        </p>
        <p className="hub-help text-[var(--color-text-muted)]">
          Open the email on this device, then choose a new password. The link
          expires after a short time.
        </p>
        <Link
          href="/auth/sign-in"
          className="inline-flex min-h-11 items-center text-base font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-base font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
        {pending ? "Sending…" : "Send recovery email"}
      </button>
      <p>
        <Link
          href="/auth/sign-in"
          className="hub-help text-[var(--color-text-muted)] underline-offset-2 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
