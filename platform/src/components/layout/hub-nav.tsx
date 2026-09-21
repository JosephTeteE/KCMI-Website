"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StaffProfile } from "@/lib/auth/session";
import { operatingRoleLabel } from "@/lib/authorization/rbac";
import { canViewGivingAdmin } from "@/lib/giving/access";
import { canViewCareHub } from "@/lib/care/access";
import { canViewRequestsInbox } from "@/lib/requests/access";
import { signOutAction } from "@/app/auth/actions";
import { HubHelpMenu } from "@/components/hub/hub-help-menu";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";
import { HUB_TOUR_MENU_EVENT } from "@/lib/hub/tour";

const NAV_BASE = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/website", label: "Website pages" },
  { href: "/admin/programs", label: "Programs & Announcements" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/sermons", label: "Sermons" },
  { href: "/admin/media", label: "Photos" },
  { href: "/admin/branches", label: "Branches" },
  { href: "/admin/livestream", label: "Livestream" },
] as const;

function hubNavItems(profile: StaffProfile) {
  const items: { href: string; label: string; exact?: boolean }[] = [
    ...NAV_BASE,
  ];
  if (canViewCareHub(profile.permissions)) {
    items.push({ href: "/admin/care", label: "Care" });
  }
  if (canViewRequestsInbox(profile.permissions)) {
    items.push({ href: "/admin/requests", label: "Messages & Requests" });
  }
  if (canViewGivingAdmin(profile.permissions)) {
    items.push({ href: "/admin/giving", label: "Giving" });
  }
  if (profile.permissions.includes("users.manage")) {
    items.push({ href: "/admin/users", label: "Staff & Access" });
  }
  return items;
}

function isCurrent(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function HubIdentity({ profile }: { profile: StaffProfile }) {
  const roleLabel = profile.roles.length
    ? profile.roles.map((role) => operatingRoleLabel(role)).join(", ")
    : "Staff";
  const email = profile.email?.trim() || "";

  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-[var(--color-text-body)]">
        {roleLabel}
      </p>
      {email ? (
        <p className="mt-0.5 truncate text-sm text-[var(--color-text-muted)]" title={email}>
          {email}
        </p>
      ) : null}
    </div>
  );
}

function HubLinks({
  pathname,
  profile,
  onNavigate,
}: {
  pathname: string;
  profile: StaffProfile;
  onNavigate?: () => void;
}) {
  const nav = hubNavItems(profile);
  return (
    <ul className="flex flex-col gap-1">
      {nav.map((item) => {
        const current = isCurrent(
          pathname,
          item.href,
          "exact" in item ? Boolean(item.exact) : false,
        );
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              onClick={onNavigate}
              className={`inline-flex min-h-11 w-full items-center rounded-md px-3 py-2 text-base ${
                current
                  ? "bg-[var(--kcmi-off-white)] font-semibold text-[var(--color-action-primary)]"
                  : "text-[var(--color-text-body)] hover:bg-[var(--kcmi-off-white)]"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function HubNavBody({
  profile,
  pathname,
  onNavigate,
}: {
  profile: StaffProfile;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        KCMI Hub
      </p>
      <div className="mt-3 min-w-0">
        <HubIdentity profile={profile} />
      </div>
      <nav className="mt-6" aria-label="Hub">
        <HubLinks
          pathname={pathname}
          profile={profile}
          onNavigate={onNavigate}
        />
      </nav>
      <HubHelpMenu onAction={onNavigate} />
      <form action={signOutAction} className="mt-8">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-3 text-base font-semibold text-[var(--color-destructive)] underline-offset-2 hover:bg-[color-mix(in_srgb,var(--color-destructive)_10%,transparent)] hover:underline"
        >
          {HUB_ACTION_LABELS.signOut}
        </button>
      </form>
    </>
  );
}

export function HubNav({ profile }: { profile: StaffProfile }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open) {
      if (!node.open) node.showModal();
    } else if (node.open) {
      node.close();
    }
  }, [open]);

  useEffect(() => {
    function onTourMenu(event: Event) {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setOpen(detail?.open !== false);
    }
    window.addEventListener(HUB_TOUR_MENU_EVENT, onTourMenu);
    return () => window.removeEventListener(HUB_TOUR_MENU_EVENT, onTourMenu);
  }, []);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 lg:hidden">
        <p className="text-base font-semibold tracking-wide text-[var(--color-text-body)] uppercase">
          KCMI Hub
        </p>
        <button
          type="button"
          data-tour-menu-open
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-base font-semibold"
          aria-label="Open Hub menu"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls="hub-mobile-menu"
          onClick={() => setOpen(true)}
        >
          Menu
        </button>
      </header>

      <dialog
        id="hub-mobile-menu"
        ref={dialogRef}
        className="hub-nav-dialog lg:hidden"
        aria-labelledby={titleId}
        onClose={close}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onCancel={close}
      >
        <div className="flex h-full max-w-xs flex-col overflow-y-auto bg-[var(--color-surface-elevated)] p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p id={titleId} className="text-base font-semibold uppercase tracking-wide">
              KCMI Hub
            </p>
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-3 text-base font-semibold"
              onClick={close}
            >
              Close
            </button>
          </div>
          <HubNavBody profile={profile} pathname={pathname} onNavigate={close} />
        </div>
      </dialog>

      <aside className="hidden w-full max-w-xs shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 lg:block">
        <HubNavBody profile={profile} pathname={pathname} />
      </aside>
    </>
  );
}
