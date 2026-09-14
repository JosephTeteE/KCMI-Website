import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession, staffHasPermission } from "@/lib/auth/session";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { HubStatusBadge } from "@/components/hub/hub-form-fields";
import { isPastEvent } from "@/lib/events/format";

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const session = await getStaffSession();
  const canManage =
    !!session && staffHasPermission(session.profile, "events.manage");

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select(
      "id, title, status, event_kind, starts_at, ends_at, updated_at, published_at",
    )
    .order("updated_at", { ascending: false });

  const now = new Date();
  const drafts =
    events?.filter(
      (e) => e.status === "draft" || e.status === "preview",
    ) ?? [];
  const live =
    events?.filter(
      (e) =>
        e.status === "published" &&
        !isPastEvent({ startsAt: e.starts_at, endsAt: e.ends_at }, now),
    ) ?? [];
  const past =
    events?.filter(
      (e) =>
        e.status === "published" &&
        isPastEvent({ startsAt: e.starts_at, endsAt: e.ends_at }, now),
    ) ?? [];
  const archived = events?.filter((e) => e.status === "archived") ?? [];

  return (
    <div>
      <HubPageHeader
        title="Events"
        description="Create camps, conferences, and gatherings. Drafts stay off the website until you make them live."
        actions={
          canManage ? (
            <Link
              href="/admin/events/new"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-[var(--color-action-primary-fg)]"
            >
              Create Event
            </Link>
          ) : null
        }
      />
      <HubFlash message={params.message} error={params.error} />

      {(events?.length ?? 0) === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <p className="text-base font-semibold text-[var(--color-text-body)]">
            No events yet
          </p>
          <p className="mt-2 text-base text-[var(--color-text-muted)]">
            When you create an event, it starts as a draft. Visitors will not see
            it until you make it live.
          </p>
          {canManage ? (
            <Link
              href="/admin/events/new"
              className="mt-5 inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-[var(--color-action-primary-fg)]"
            >
              Create Event
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="space-y-10">
          <EventGroup title="Draft Events" items={drafts} empty="No drafts." />
          <EventGroup title="Live Events" items={live} empty="No live events." />
          <EventGroup
            title="Past Events"
            items={past}
            empty="No past published events."
          />
          {archived.length > 0 ? (
            <EventGroup
              title="Removed from website"
              items={archived}
              empty=""
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function EventGroup({
  title,
  items,
  empty,
}: {
  title: string;
  items: {
    id: string;
    title: string;
    status: string;
    starts_at: string;
  }[];
  empty: string;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-[var(--color-text-body)]">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-base text-[var(--color-text-muted)]">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
          {items.map((event) => (
            <li key={event.id}>
              <Link
                href={`/admin/events/${event.id}`}
                className="flex flex-col gap-2 px-4 py-4 hover:bg-[var(--kcmi-off-white)] sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="truncate text-base font-medium text-[var(--color-text-body)]">
                  {event.title}
                </p>
                <HubStatusBadge status={event.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
