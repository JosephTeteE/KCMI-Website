import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession, staffHasPermission } from "@/lib/auth/session";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ message?: string; error?: string }>;

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

export default async function EventRegistrationsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const flash = await searchParams;
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
    .select("id, title, slug, status, capacity, registration_enabled")
    .eq("id", id)
    .maybeSingle();

  if (!event) notFound();

  const { data: rows, error } = await supabase
    .from("event_registrations")
    .select(
      "id, reference_code, full_name, email, phone, num_people, status, submitted_at",
    )
    .eq("event_id", id)
    .order("submitted_at", { ascending: false });

  if (error) {
    redirect(
      `/admin/events/${id}?error=${encodeURIComponent(
        "Could not load registrations.",
      )}`,
    );
  }

  const people = (rows ?? [])
    .filter((r) => r.status !== "cancelled")
    .reduce((sum, r) => sum + r.num_people, 0);

  return (
    <div>
      <HubPageHeader
        title={`Registrations · ${event.title}`}
        description="Private registration list. Payment and receipts are not handled here."
        backHref={`/admin/events/${event.id}`}
        backLabel="Event"
      />
      <HubFlash message={flash.message} error={flash.error} />

      <p className="mb-6 text-base text-[var(--color-text-muted)]">
        Registration {event.registration_enabled ? "is on" : "is off"}
        {event.capacity != null
          ? ` · ${people} of ${event.capacity} people registered`
          : ` · ${people} people registered`}
        .{" "}
        <Link
          href={`/events/${event.slug}`}
          className="font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
        >
          Public event page
        </Link>
      </p>

      {(rows ?? []).length === 0 ? (
        <p className="text-base text-[var(--color-text-muted)]">
          No registrations yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
          <table className="min-w-full text-left text-base">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-tint)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">People</th>
                <th className="px-4 py-3 font-semibold">Submitted</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--color-border)] last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/events/${event.id}/registrations/${row.id}`}
                      className="font-mono font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
                    >
                      {row.reference_code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.full_name}</td>
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3">{row.phone}</td>
                  <td className="px-4 py-3">{row.num_people}</td>
                  <td className="px-4 py-3">
                    {new Date(row.submitted_at).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3">{statusLabel(row.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
