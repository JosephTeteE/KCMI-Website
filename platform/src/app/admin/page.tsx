import Link from "next/link";
import { getStaffSession, staffHasPermission } from "@/lib/auth/session";
import { hasSupabasePublicConfig, isHostedKcmiEnvironment } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HUB_DASHBOARD_CARDS, HUB_DASHBOARD_CARD_PERMISSIONS } from "@/lib/hub/dashboard-cards";
import { humanAuditAction } from "@/lib/hub/humanize";
import type { Permission } from "@/lib/authorization/rbac";

const CARD_TOUR: Record<string, string> = {
  "/admin/website/home": "dashboard-homepage",
  "/admin/programs": "dashboard-programs",
  "/admin/events": "dashboard-events",
  "/admin/branches": "dashboard-branches",
  "/admin/sermons": "dashboard-sermons",
  "/admin/livestream": "dashboard-livestream",
};

const CARD_ICONS: Record<string, string> = {
  "/admin/website/home": "⌂",
  "/admin/programs": "◎",
  "/admin/branches": "⌖",
  "/admin/sermons": "▷",
  "/admin/livestream": "◉",
  "/admin/media": "▤",
};

type BranchHealthRow = {
  id: string;
  name: string;
  phone_evidence_note: string | null;
  phones: unknown;
  phone_display: string | null;
  phone_tel: string | null;
  branch_service_times: { id: string }[] | null;
};

function hasPhones(row: BranchHealthRow): boolean {
  if (Array.isArray(row.phones) && row.phones.length > 0) return true;
  if (row.phone_display?.trim() || row.phone_tel?.trim()) return true;
  return false;
}

function branchNeedsAttention(row: BranchHealthRow): string[] {
  const warnings: string[] = [];
  const times = Array.isArray(row.branch_service_times)
    ? row.branch_service_times
    : [];
  if (times.length === 0) {
    warnings.push("Service times are missing.");
  }
  if (row.phone_evidence_note?.trim()) {
    warnings.push("Phone number needs verification.");
  } else if (!hasPhones(row)) {
    warnings.push("Phone number is missing.");
  }
  return warnings;
}

export default async function AdminDashboardPage() {
  if (!hasSupabasePublicConfig()) {
    if (isHostedKcmiEnvironment()) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      );
    }
    return null;
  }
  const session = await getStaffSession();
  if (!session) return null;

  const supabase = await createClient();

  const [publishedBranches, livestream, featured, recent, healthBranches] =
    await Promise.all([
      supabase
        .from("church_branches")
        .select("id", { count: "exact", head: true })
        .eq("is_public", true)
        .eq("status", "published"),
      supabase
        .from("livestream_settings")
        .select("is_live")
        .eq("singleton_key", "default")
        .maybeSingle(),
      supabase
        .from("programs")
        .select("title")
        .eq("status", "published")
        .eq("placement", "featured")
        .maybeSingle(),
      staffHasPermission(session.profile, "audit.read")
        ? supabase
            .from("audit_events")
            .select("id, action, created_at")
            .order("created_at", { ascending: false })
            .limit(5)
        : Promise.resolve({ data: [] as const, error: null }),
      supabase
        .from("church_branches")
        .select(
          "id, name, phone_evidence_note, phones, phone_display, phone_tel, branch_service_times(id)",
        )
        .eq("is_public", true)
        .eq("status", "published")
        .order("sort_order", { ascending: true }),
    ]);

  const attention = ((healthBranches.data ?? []) as BranchHealthRow[])
    .map((row) => ({
      id: row.id,
      name: row.name,
      warnings: branchNeedsAttention(row),
    }))
    .filter((item) => item.warnings.length > 0);

  return (
    <div>
      <HubPageHeader
        title="What would you like to update?"
        description="Choose a card. Preview first. Nothing changes on the public website until you make it live."
      />

      <ul className="grid gap-4 sm:grid-cols-2" aria-label="Things you can update">
        {HUB_DASHBOARD_CARDS.filter((card) => {
          const needed = HUB_DASHBOARD_CARD_PERMISSIONS[card.href];
          if (!needed) return true;
          return needed.some((p) =>
            staffHasPermission(session.profile, p as Permission),
          );
        }).map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              data-tour={CARD_TOUR[card.href]}
              className="flex min-h-36 flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 hover:border-[var(--color-action-primary)]"
            >
              <div className="flex items-start gap-3">
                <span
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-tint)] text-lg text-[var(--color-action-primary)]"
                  aria-hidden
                >
                  {CARD_ICONS[card.href] ?? "•"}
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold text-[var(--color-text-body)]">
                    {card.title}
                  </h2>
                  <p className="hub-help mt-2 text-[var(--color-text-muted)]">
                    {card.outcome}
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text-body)]">
          Website status
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-[var(--color-text-muted)]">Livestream</dt>
            <dd className="mt-1 text-base font-semibold">
              {livestream.data?.is_live ? "Live now" : "Not live"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--color-text-muted)]">Spotlight</dt>
            <dd className="mt-1 text-base font-semibold">
              {featured.data?.title ?? "None showing"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--color-text-muted)]">
              Published branches
            </dt>
            <dd className="mt-1 text-base font-semibold">
              {publishedBranches.count ?? 0}
            </dd>
          </div>
        </dl>
      </section>

      {attention.length > 0 ? (
        <section className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-warning)] bg-[var(--color-warning-bg)] p-5">
          <h2 className="text-lg font-semibold text-[var(--color-text-body)]">
            Needs attention
          </h2>
          <p className="hub-help mt-2 text-[var(--color-text-muted)]">
            These Hub warnings are for staff only. Visitors do not see them.
          </p>
          <ul className="mt-4 space-y-3">
            {attention.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/admin/branches/${item.id}`}
                  className="block rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-warning)_35%,var(--color-border))] bg-[var(--color-surface-elevated)] px-4 py-3 hover:border-[var(--color-action-primary)]"
                >
                  <p className="text-base font-semibold text-[var(--color-text-body)]">
                    {item.name}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {item.warnings.map((warning) => (
                      <li
                        key={warning}
                        className="hub-help text-[var(--color-text-muted)]"
                      >
                        {warning}
                      </li>
                    ))}
                  </ul>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {staffHasPermission(session.profile, "audit.read") ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[var(--color-text-body)]">
            Recent website changes
          </h2>
          {(recent.data?.length ?? 0) === 0 ? (
            <p className="hub-help mt-3 text-[var(--color-text-muted)]">
              No recent changes yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
              {(recent.data ?? []).map((event) => (
                <li
                  key={event.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="font-medium text-[var(--color-text-body)]">
                    {humanAuditAction(event.action)}
                  </p>
                  <time
                    className="text-sm text-[var(--color-text-muted)]"
                    dateTime={event.created_at}
                  >
                    {new Date(event.created_at).toLocaleString("en-GB")}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
