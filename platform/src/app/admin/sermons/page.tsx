import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession, staffHasPermission } from "@/lib/auth/session";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { HubStatusBadge } from "@/components/hub/hub-form-fields";

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function AdminSermonsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const session = await getStaffSession();
  const canManage =
    !!session && staffHasPermission(session.profile, "sermons.manage");

  const supabase = await createClient();
  const { data: sermons } = await supabase
    .from("sermons")
    .select("id, title, speaker, sermon_date, status, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div>
      <HubPageHeader
        title="Sermons"
        description="Manage sermon listings for the public Sermons page. Use a YouTube link — not embed code."
        actions={
          canManage ? (
            <Link
              href="/admin/sermons/new"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-sm font-semibold text-[var(--color-action-primary-fg)]"
            >
              New sermon
            </Link>
          ) : null
        }
      />
      <HubFlash message={params.message} error={params.error} />

      {(sermons?.length ?? 0) === 0 ? (
        <p className="text-[var(--color-text-muted)]">No sermons yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
          {sermons!.map((sermon) => (
            <li key={sermon.id}>
              <Link
                href={`/admin/sermons/${sermon.id}`}
                className="flex flex-col gap-2 px-4 py-4 hover:bg-[var(--kcmi-off-white)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--color-text-body)]">
                    {sermon.title}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {[sermon.speaker, sermon.sermon_date]
                      .filter(Boolean)
                      .join(" · ") || "No date or speaker yet"}
                  </p>
                </div>
                <HubStatusBadge status={sermon.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
