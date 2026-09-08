import Link from "next/link";
import type { StaffProfile } from "@/lib/auth/session";
import { operatingRoleLabel } from "@/lib/authorization/rbac";
import { signOutAction } from "@/app/auth/actions";

const NAV = [
  { href: "/admin", label: "Dashboard", enabled: true },
  { href: "/admin/programs", label: "Programs", enabled: true },
  { href: "/admin/sermons", label: "Sermons", enabled: true },
  { href: "/admin/media", label: "Media", enabled: true },
  { href: "/admin/branches", label: "Branches", enabled: true },
  { href: "/admin/livestream", label: "Livestream", enabled: true },
  { href: "/admin/events", label: "Events", enabled: false },
  { href: "/admin/pastoral", label: "Pastoral", enabled: false },
  { href: "/admin/giving", label: "Giving", enabled: false },
] as const;

export function HubNav({ profile }: { profile: StaffProfile }) {
  return (
    <aside className="w-full max-w-xs border-r border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        KCMI Hub
      </p>
      <p className="mt-1 truncate text-sm text-[var(--color-text-body)]">
        {profile.displayName ?? profile.email ?? "Staff"}
      </p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        Roles:{" "}
        {profile.roles.length
          ? profile.roles.map((role) => operatingRoleLabel(role)).join(", ")
          : "none assigned"}
      </p>
      <nav className="mt-6 flex flex-col gap-1" aria-label="Hub">
        {NAV.map((item) =>
          item.enabled ? (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm text-[var(--color-text-body)] hover:bg-[var(--kcmi-off-white)]"
            >
              {item.label}
            </Link>
          ) : (
            <span
              key={item.href}
              className="inline-flex min-h-11 cursor-not-allowed items-center rounded-md px-3 py-2 text-sm text-[var(--color-text-muted)] opacity-60"
              title="Coming in a later phase"
            >
              {item.label} (soon)
            </span>
          ),
        )}
      </nav>
      <form action={signOutAction} className="mt-8">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center text-sm text-[var(--color-destructive)] underline-offset-2 hover:underline"
        >
          Sign out
        </button>
      </form>
    </aside>
  );
}
