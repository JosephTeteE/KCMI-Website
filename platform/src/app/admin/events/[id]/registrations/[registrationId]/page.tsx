import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession, staffHasPermission } from "@/lib/auth/session";
import { HubPageHeader } from "@/components/hub/hub-page-header";

type Params = Promise<{ id: string; registrationId: string }>;

function statusLabel(status: string): string {
  switch (status) {
    case "submitted":
      return "Received";
    case "confirmed":
      return "Confirmed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export default async function EventRegistrationDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id, registrationId } = await params;
  const session = await getStaffSession();
  if (!session) redirect("/auth/sign-in");

  if (!staffHasPermission(session.profile, "registrations.manage")) {
    redirect(
      `/admin/events/${id}?error=${encodeURIComponent(
        "You do not have permission to view registrations.",
      )}`,
    );
  }

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();
  if (!event) notFound();

  const { data: row } = await supabase
    .from("event_registrations")
    .select(
      "id, reference_code, full_name, email, phone, num_people, status, submitted_at",
    )
    .eq("id", registrationId)
    .eq("event_id", id)
    .maybeSingle();

  if (!row) notFound();

  return (
    <div>
      <HubPageHeader
        title={row.reference_code}
        description={event.title}
        backHref={`/admin/events/${event.id}/registrations`}
        backLabel="Registrations"
      />

      <dl className="mt-6 grid max-w-xl gap-4 text-base sm:grid-cols-2">
        <div>
          <dt className="font-medium text-[var(--color-text-muted)]">Name</dt>
          <dd className="mt-1">{row.full_name}</dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--color-text-muted)]">Email</dt>
          <dd className="mt-1">{row.email}</dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--color-text-muted)]">Phone</dt>
          <dd className="mt-1">{row.phone}</dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--color-text-muted)]">People</dt>
          <dd className="mt-1">{row.num_people}</dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--color-text-muted)]">Submitted</dt>
          <dd className="mt-1">
            {new Date(row.submitted_at).toLocaleString("en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--color-text-muted)]">Status</dt>
          <dd className="mt-1">{statusLabel(row.status)}</dd>
        </div>
      </dl>

      <p className="mt-8 text-base text-[var(--color-text-muted)]">
        Payment review is not available in this phase.{" "}
        <Link
          href={`/admin/events/${event.id}`}
          className="font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
        >
          Back to event
        </Link>
      </p>
    </div>
  );
}
