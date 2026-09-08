import Link from "next/link";
import { getStaffSession, staffHasPermission } from "@/lib/auth/session";
import { hasSupabasePublicConfig, isHostedKcmiEnvironment } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { HubPageHeader } from "@/components/hub/hub-page-header";

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

  const [
    draftPrograms,
    publishedPrograms,
    sermons,
    branches,
    livestream,
    audit,
  ] = await Promise.all([
    supabase
      .from("programs")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("programs")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase.from("sermons").select("id", { count: "exact", head: true }),
    supabase.from("church_branches").select("id", { count: "exact", head: true }),
    supabase
      .from("livestream_settings")
      .select("is_live")
      .eq("singleton_key", "default")
      .maybeSingle(),
    staffHasPermission(session.profile, "audit.read")
      ? supabase
          .from("audit_events")
          .select("id, action, entity_type, entity_id, created_at")
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] as const, error: null }),
  ]);

  const cards = [
    {
      label: "Draft programs",
      value: draftPrograms.count ?? 0,
      href: "/admin/programs",
    },
    {
      label: "Published programs",
      value: publishedPrograms.count ?? 0,
      href: "/admin/programs",
    },
    {
      label: "Sermons",
      value: sermons.count ?? 0,
      href: "/admin/sermons",
    },
    {
      label: "Branches",
      value: branches.count ?? 0,
      href: "/admin/branches",
    },
    {
      label: "Livestream",
      value: livestream.data?.is_live ? "Live now" : "Not live",
      href: "/admin/livestream",
    },
  ];

  return (
    <div>
      <HubPageHeader
        title="Dashboard"
        description="Overview of Hub content. Pastoral tools are not shown here."
      />

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5"
          >
            <dt className="text-sm text-[var(--color-text-muted)]">{card.label}</dt>
            <dd className="mt-2 text-2xl font-semibold text-[var(--color-text-body)]">
              {card.value}
            </dd>
            <Link
              href={card.href}
              className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-[var(--color-action-primary)] underline-offset-2 hover:underline"
            >
              Open
            </Link>
          </div>
        ))}
      </dl>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--color-text-body)]">
          Recent activity
        </h2>
        {!staffHasPermission(session.profile, "audit.read") ? (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            Your account cannot view audit history.
          </p>
        ) : (audit.data?.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            No recent activity yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
            {(audit.data ?? []).map((event) => (
              <li key={event.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-[var(--color-text-body)]">
                    {event.action}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {event.entity_type}
                    {event.entity_id ? ` · ${event.entity_id.slice(0, 8)}…` : ""}
                  </p>
                </div>
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

      <p className="mt-8 text-sm text-[var(--color-text-muted)]">
        Session assurance level: {session.aal ?? "unknown"}
      </p>
    </div>
  );
}
