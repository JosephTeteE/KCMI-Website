import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession, staffHasPermission } from "@/lib/auth/session";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { HubStatusBadge } from "@/components/hub/hub-form-fields";

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function AdminProgramsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const session = await getStaffSession();
  const canCreate =
    session &&
    (staffHasPermission(session.profile, "programs.create") ||
      staffHasPermission(session.profile, "programs.update"));

  const supabase = await createClient();
  const { data: programs } = await supabase
    .from("programs")
    .select("id, title, status, placement, updated_at, published_at")
    .order("updated_at", { ascending: false });

  return (
    <div>
      <HubPageHeader
        title="Programs & Announcements"
        description="Add or update programs. A draft is not on the website. Preview first, then make it live."
        actions={
          canCreate ? (
            <Link
              href="/admin/programs/new"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-sm font-semibold text-[var(--color-action-primary-fg)]"
            >
              New program
            </Link>
          ) : null
        }
      />
      <HubFlash message={params.message} error={params.error} />

      {(programs?.length ?? 0) === 0 ? (
        <p className="text-[var(--color-text-muted)]">No programs yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
          {programs!.map((program) => (
            <li key={program.id}>
              <Link
                href={`/admin/programs/${program.id}`}
                className="flex flex-col gap-2 px-4 py-4 hover:bg-[var(--kcmi-off-white)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--color-text-body)]">
                    {program.title}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {program.placement === "featured"
                      ? "Shows on the homepage when live"
                      : program.placement === "none"
                        ? "Not featured on the homepage"
                        : `Homepage placement: ${program.placement}`}
                  </p>
                </div>
                <HubStatusBadge status={program.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
