import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffSession, requiresMfaEnrollment } from "@/lib/auth/session";
import { HubNav } from "@/components/layout/hub-nav";
import { HubTour } from "@/components/hub/hub-tour";
import { hasSupabasePublicConfig, isHostedKcmiEnvironment } from "@/lib/env";
import { signOutAction } from "@/app/auth/actions";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!hasSupabasePublicConfig()) {
    if (isHostedKcmiEnvironment()) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      );
    }
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-sm text-[var(--color-text-muted)]">
        <h1 className="text-xl font-semibold text-[var(--color-text-body)]">
          Hub unavailable
        </h1>
        <p className="mt-2">
          This Hub computer is not set up yet. Ask a Super Admin to finish
          setup.
        </p>
      </div>
    );
  }

  let session;
  try {
    session = await getStaffSession();
  } catch {
    redirect("/auth/sign-in");
  }

  if (!session) {
    redirect("/auth/sign-in");
  }

  if (requiresMfaEnrollment(session.aal)) {
    redirect("/auth/mfa");
  }

  if (!session.profile.permissions.includes("hub.access")) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          You are signed in, but this account cannot use the Hub. Ask a Super
          Admin for help.
        </p>
        <form action={signOutAction} className="mt-6">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-3 text-sm font-semibold text-[var(--color-destructive)] hover:bg-[color-mix(in_srgb,var(--color-destructive)_10%,transparent)] hover:underline"
          >
            {HUB_ACTION_LABELS.signOut}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface-page)] lg:flex-row">
      <HubNav profile={session.profile} />
      <div className="min-w-0 flex-1 p-4 lg:p-10">{children}</div>
      <HubTour />
    </div>
  );
}
