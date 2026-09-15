import {
  addCareNoteAction,
  assignCareRequestAction,
  updateCareStatusAction,
} from "@/app/admin/care/actions";
import type { CareCaseNote, CareRequestDetail } from "@/lib/care/types";
import {
  CARE_SERVICE_LABELS,
  CARE_STATUS_LABELS,
  CARE_STATUSES,
} from "@/lib/care/types";

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CareRequestDetailView({
  request,
  notes,
  canAssign,
  canReopen,
  assigneeOptions,
}: {
  request: CareRequestDetail;
  notes: CareCaseNote[];
  canAssign: boolean;
  canReopen: boolean;
  assigneeOptions: { id: string; label: string }[];
}) {
  const statusChoices = CARE_STATUSES.filter((status) => {
    if (request.status === "closed" && status !== "closed") {
      return canReopen;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-[var(--color-text-muted)]">Reference</dt>
            <dd className="font-mono text-base font-semibold">{request.referenceCode}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--color-text-muted)]">Domain</dt>
            <dd className="text-base">{CARE_SERVICE_LABELS[request.serviceType]}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--color-text-muted)]">Submitted</dt>
            <dd className="text-base">{formatWhen(request.submittedAt)}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--color-text-muted)]">Status</dt>
            <dd className="text-base">{CARE_STATUS_LABELS[request.status]}</dd>
          </div>
          {request.displayName ? (
            <div>
              <dt className="text-sm text-[var(--color-text-muted)]">Name</dt>
              <dd className="text-base">{request.displayName}</dd>
            </div>
          ) : null}
          {request.email ? (
            <div>
              <dt className="text-sm text-[var(--color-text-muted)]">Email</dt>
              <dd className="text-base">{request.email}</dd>
            </div>
          ) : null}
          {request.phone ? (
            <div>
              <dt className="text-sm text-[var(--color-text-muted)]">Phone</dt>
              <dd className="text-base">{request.phone}</dd>
            </div>
          ) : null}
          {request.preferredContactTiming ? (
            <div>
              <dt className="text-sm text-[var(--color-text-muted)]">Preferred timing</dt>
              <dd className="text-base">{request.preferredContactTiming}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section
        aria-labelledby="care-narrative-heading"
        className="rounded-[var(--radius-lg)] border-2 border-[var(--color-action-primary)] bg-[color-mix(in_srgb,var(--color-action-primary)_6%,white)] p-5"
      >
        <h2
          id="care-narrative-heading"
          className="text-lg font-semibold text-[var(--color-text-body)]"
        >
          Visitor narrative
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Highly sensitive. Do not copy into email, chat, or public pages.
        </p>
        <p className="mt-4 whitespace-pre-wrap text-base text-[var(--color-text-body)]">
          {request.narrative}
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form action={updateCareStatusAction} className="space-y-3">
          <input type="hidden" name="requestId" value={request.id} />
          <h2 className="text-lg font-semibold">Update status</h2>
          <label className="block text-sm text-[var(--color-text-muted)]" htmlFor="care-status">
            Status
          </label>
          <select
            id="care-status"
            name="status"
            defaultValue={request.status}
            className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-base"
          >
            {statusChoices.map((status) => (
              <option key={status} value={status}>
                {CARE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 text-base font-semibold text-white"
          >
            Save status
          </button>
        </form>

        {canAssign ? (
          <form action={assignCareRequestAction} className="space-y-3">
            <input type="hidden" name="requestId" value={request.id} />
            <h2 className="text-lg font-semibold">Assignment</h2>
            <label className="block text-sm text-[var(--color-text-muted)]" htmlFor="care-assignee">
              Assigned staff
            </label>
            <select
              id="care-assignee"
              name="assignedTo"
              defaultValue={request.assignedTo ?? ""}
              className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-base"
            >
              <option value="">Unassigned</option>
              {assigneeOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-base font-semibold"
            >
              Save assignment
            </button>
          </form>
        ) : null}
      </section>

      <section aria-labelledby="care-notes-heading" className="space-y-4">
        <h2 id="care-notes-heading" className="text-lg font-semibold">
          Internal staff notes
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Not visible to visitors. Never emailed in full.
        </p>
        {notes.length === 0 ? (
          <p className="text-base text-[var(--color-text-muted)]">No notes yet.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3"
              >
                <p className="whitespace-pre-wrap text-base">{note.body}</p>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  {formatWhen(note.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <form action={addCareNoteAction} className="space-y-3">
          <input type="hidden" name="requestId" value={request.id} />
          <label className="block text-sm text-[var(--color-text-muted)]" htmlFor="care-note">
            Add a short note
          </label>
          <textarea
            id="care-note"
            name="body"
            rows={3}
            maxLength={4000}
            required
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-base"
          />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 text-base font-semibold text-white"
          >
            Save note
          </button>
        </form>
      </section>
    </div>
  );
}
