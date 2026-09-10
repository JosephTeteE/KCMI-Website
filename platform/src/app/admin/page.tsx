import Link from "next/link";
import { getStaffSession, staffHasPermission } from "@/lib/auth/session";
import { hasSupabasePublicConfig, isHostedKcmiEnvironment } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HUB_DASHBOARD_CARDS } from "@/lib/hub/dashboard-cards";
import { humanAuditAction } from "@/lib/hub/humanize";

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

  const [publishedBranches, livestream, featured, recent] = await Promise.all([
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
  ]);

  return (
    <div>
      <HubPageHeader
        title="What would you like to update?"
        description="Choose a card. Preview first. Nothing changes on the public website until you make it live."
      />

      <ul className="grid gap-4 sm:grid-cols-2" aria-label="Things you can update">
        {HUB_DASHBOARD_CARDS.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="flex min-h-36 flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 hover:border-[var(--color-action-primary)]"
            >
              <h2 className="text-xl font-semibold text-[var(--color-text-body)]">
                {card.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {card.outcome}
              </p>
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
            <dd className="mt-1 font-semibold">
              {livestream.data?.is_live ? "Live now" : "Not live"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--color-text-muted)]">
              Featured program
            </dt>
            <dd className="mt-1 font-semibold">
              {featured.data?.title ?? "None showing"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--color-text-muted)]">
              Published branches
            </dt>
            <dd className="mt-1 font-semibold">{publishedBranches.count ?? 0}</dd>
          </div>
        </dl>
      </section>

      {staffHasPermission(session.profile, "audit.read") ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[var(--color-text-body)]">
            Recent website changes
          </h2>
          {(recent.data?.length ?? 0) === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
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
