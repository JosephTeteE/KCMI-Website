"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { hasSupabasePublicConfig } from "@/lib/env/public";
import { humanSignInError } from "@/lib/hub/humanize";

export function SignInForm({ notice }: { notice?: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!hasSupabasePublicConfig()) {
    return (
      <p className="rounded-md border border-[var(--color-warning)] bg-[var(--color-warning-bg)] p-4 hub-body text-[var(--color-text-body)]">
        Hub sign-in is not ready on this computer yet. Ask a Super Admin to
        finish setup.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(humanSignInError(signInError.message));
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Sign-in failed. Check configuration and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {notice ? (
        <p
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-page)] px-3 py-2 hub-body text-[var(--color-text-body)]"
          role="status"
        >
          {notice}
        </p>
      ) : null}
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
      <div>
        <label htmlFor="password" className="block text-base font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-base"
        />
        <p className="mt-2">
          <Link
            href="/auth/forgot-password"
            className="text-base font-medium text-[var(--color-action-primary)] underline-offset-2 hover:underline"
          >
            Forgot password?
          </Link>
        </p>
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
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="hub-help text-[var(--color-text-muted)]">
        Staff accounts are invitation-only. There is no public Hub signup.
      </p>
    </form>
  );
}
