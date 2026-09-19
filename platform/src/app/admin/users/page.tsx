import { getStaffSession, staffHasPermission } from "@/lib/auth/session";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import {
  InviteStaffForm,
  StaffMemberCard,
} from "@/components/hub/staff-access-panel";
import { listHubStaffMembers } from "@/lib/hub/staff-directory";

type SearchParams = Promise<{
  message?: string;
  error?: string;
  focus?: string;
}>;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const session = await getStaffSession();

  if (!session || !staffHasPermission(session.profile, "users.manage")) {
    return (
      <div>
        <HubPageHeader title="Staff & Access" backHref="/admin" />
        <p className="text-base text-[var(--color-text-muted)]" role="alert">
          Your account cannot manage Hub staff. Ask a Super Admin for help.
        </p>
      </div>
    );
  }

  let members: Awaited<ReturnType<typeof listHubStaffMembers>> = [];
  let loadError: string | null = null;
  try {
    members = await listHubStaffMembers();
  } catch {
    loadError =
      "We could not load the staff list right now. Please try again shortly.";
  }

  return (
    <div className="space-y-8">
      <HubPageHeader
        title="Staff & Access"
        description="Invite volunteers to the Hub and choose what they can look after. They set their own password and MFA."
        backHref="/admin"
        actions={<InviteStaffForm />}
      />
      <HubFlash message={params.message} error={params.error || loadError || undefined} />

      <section aria-labelledby="staff-list-heading" className="space-y-4">
        <h2 id="staff-list-heading" className="text-lg font-semibold">
          Current staff
        </h2>
        {members.length === 0 && !loadError ? (
          <p className="text-base text-[var(--color-text-muted)]">
            No Hub staff accounts yet. Invite someone to get started.
          </p>
        ) : (
          <ul className="grid gap-4">
            {members.map((member) => (
              <li key={member.id}>
                <StaffMemberCard
                  member={member}
                  currentUserId={session.user.id}
                  initiallyOpen={params.focus === member.id}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
