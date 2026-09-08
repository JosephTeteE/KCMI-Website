import { redirect } from "next/navigation";
import { getStaffSession, requiresMfaEnrollment } from "@/lib/auth/session";
import { HubNav } from "@/components/layout/hub-nav";
import { hasSupabasePublicConfig } from "@/lib/env";
import { signOutAction } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!hasSupabasePublicConfig()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-sm text-[var(--color-text-muted)]">
        <h1 className="text-xl font-semibold text-[var(--color-text-body)]">
          Hub unavailable
        </h1>
        <p className="mt-2">
          Server-side Hub protection is active, but Supabase public env vars are
          not configured. Provision local Supabase and set{" "}
          <code>.env.local</code> from <code>.env.example</code>.
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
          Your account is authenticated but has no Hub role permissions. Contact
          a platform administrator.
        </p>
        <form action={signOutAction} className="mt-6">
          <button type="submit" className="text-sm text-[var(--color-destructive)]">
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface-page)] md:flex-row">
      <HubNav profile={session.profile} />
      <div className="flex-1 p-6 md:p-10">{children}</div>
    </div>
  );
}
