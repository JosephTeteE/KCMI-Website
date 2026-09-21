import {
  assignWebsiteRequestAction,
  assignWebsiteRequestToMeAction,
  updateWebsiteRequestStatusAction,
} from "@/app/admin/requests/actions";
import type { WebsiteRequestDetail } from "@/lib/requests/types";
import {
  WEBSITE_REQUEST_STATUS_LABELS,
  WEBSITE_REQUEST_TOPIC_LABELS,
} from "@/lib/requests/types";

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function WebsiteRequestDetailView({
  request,
  canUpdate,
  canAssign,
  assigneeOptions,
}: {
  request: WebsiteRequestDetail;
  canUpdate: boolean;
  canAssign: boolean;
  assigneeOptions: { id: string; label: string }[];
}) {
  const mailto = request.email
    ? `mailto:${encodeURIComponent(request.email)}?subject=${encodeURIComponent(`Re: ${request.referenceCode}`)}`
    : null;

  return (
    <div className="space-y-8" data-testid="request-detail">
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 sm:p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold text-[var(--color-text-muted)]">
              Name
            </dt>
            <dd className="mt-1 text-base text-[var(--color-text-body)]">
              {request.fullName}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-[var(--color-text-muted)]">
              Topic
            </dt>
            <dd className="mt-1 text-base text-[var(--color-text-body)]">
              {WEBSITE_REQUEST_TOPIC_LABELS[request.topic]}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-sm font-semibold text-[var(--color-text-muted)]">
              Email
            </dt>
            <dd className="text-break-safe mt-1 text-base text-[var(--color-text-body)]">
              {request.email}
            </dd>
          </div>
          {request.phone ? (
            <div>
              <dt className="text-sm font-semibold text-[var(--color-text-muted)]">
                Phone
              </dt>
              <dd className="mt-1 text-base text-[var(--color-text-body)]">
                {request.phone}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-sm font-semibold text-[var(--color-text-muted)]">
              Status
            </dt>
            <dd className="mt-1 text-base text-[var(--color-text-body)]">
              {WEBSITE_REQUEST_STATUS_LABELS[request.status]}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-[var(--color-text-muted)]">
              Assigned
            </dt>
            <dd className="mt-1 text-base text-[var(--color-text-body)]">
              {request.assigneeLabel ?? "Unassigned"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-[var(--color-text-muted)]">
              Received
            </dt>
            <dd className="mt-1 text-base text-[var(--color-text-body)]">
              {formatDateTime(request.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-[var(--color-text-muted)]">
              Source
            </dt>
            <dd className="mt-1 text-base text-[var(--color-text-body)]">
              {request.source}
            </dd>
          </div>
        </dl>

        {request.emailNotificationStatus === "failed" ? (
          <p
            className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning-bg)] px-3 py-2 text-sm text-[var(--color-warning)]"
            role="status"
          >
            Staff email notification failed. The request is still saved in the
            Hub.
          </p>
        ) : null}

        <div className="mt-6 border-t border-[var(--color-border)] pt-5">
          <h2 className="text-base font-semibold text-[var(--color-text-body)]">
            Message
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-base text-[var(--color-text-body)]">
            {request.message}
          </p>
        </div>

        {mailto ? (
          <p className="mt-6">
            <a
              href={mailto}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 text-sm font-semibold text-[var(--color-action-primary-fg)]"
              data-testid="request-reply-mailto"
            >
              Reply by email
            </a>
          </p>
        ) : null}
      </section>

      {(canUpdate || canAssign) && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold">Actions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {canAssign ? (
              <form action={assignWebsiteRequestToMeAction}>
                <input type="hidden" name="requestId" value={request.id} />
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-semibold"
                >
                  Assign to me
                </button>
              </form>
            ) : null}

            {canUpdate && request.status === "new" ? (
              <form action={updateWebsiteRequestStatusAction}>
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="status" value="in_progress" />
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-semibold"
                >
                  Mark In progress
                </button>
              </form>
            ) : null}

            {canUpdate && request.status !== "closed" ? (
              <form action={updateWebsiteRequestStatusAction}>
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="status" value="closed" />
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-semibold"
                >
                  Close request
                </button>
              </form>
            ) : null}

            {canAssign && request.status === "closed" ? (
              <form action={updateWebsiteRequestStatusAction}>
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="status" value="in_progress" />
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-semibold"
                >
                  Reopen request
                </button>
              </form>
            ) : null}
          </div>

          {canAssign ? (
            <form
              action={assignWebsiteRequestAction}
              className="mt-6 flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="requestId" value={request.id} />
              <div className="min-w-[12rem] flex-1">
                <label
                  htmlFor="assignedTo"
                  className="block text-sm font-semibold text-[var(--color-text-body)]"
                >
                  Assign to staff
                </label>
                <select
                  id="assignedTo"
                  name="assignedTo"
                  defaultValue={request.assignedTo ?? ""}
                  className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-page)] px-3 py-3 text-base"
                >
                  <option value="">Unassigned</option>
                  {assigneeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 text-sm font-semibold text-[var(--color-action-primary-fg)]"
              >
                Save assignment
              </button>
            </form>
          ) : null}
        </section>
      )}
    </div>
  );
}
