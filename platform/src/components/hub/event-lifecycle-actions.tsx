"use client";

import { setEventStatus } from "@/app/admin/events/actions";
import { HubSubmitButton } from "@/components/hub/hub-form-fields";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";
import { hubLifecycleActions } from "@/lib/hub/publication-copy";

export function EventLifecycleActions({
  eventId,
  status,
}: {
  eventId: string;
  status: string;
}) {
  const lifecycle = hubLifecycleActions(status);

  return (
    <section className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
      <h2 className="text-base font-semibold text-[var(--color-text-body)]">
        Website visibility
      </h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        {lifecycle.removeFromWebsite
          ? "Visitors can see this event on the website. You can update details above, or remove it from the public website."
          : lifecycle.restoreDraft
            ? "This event is removed from the public website. You can move it back to draft and publish again later."
            : "This draft is not visible to website visitors yet. Make it live when the details are ready."}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {lifecycle.makeLive ? (
          <form action={setEventStatus}>
            <input type="hidden" name="id" value={eventId} />
            <input type="hidden" name="status" value="published" />
            <HubSubmitButton variant="secondary">
              {HUB_ACTION_LABELS.makeLive}
            </HubSubmitButton>
          </form>
        ) : null}
        {lifecycle.removeFromWebsite ? (
          <form
            action={setEventStatus}
            onSubmit={(event) => {
              const ok = window.confirm(
                "Remove this event from the public website? The event stays in Hub as archived so you can restore it later.",
              );
              if (!ok) event.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={eventId} />
            <input type="hidden" name="status" value="archived" />
            <HubSubmitButton variant="danger">
              {HUB_ACTION_LABELS.removeFromWebsite}
            </HubSubmitButton>
          </form>
        ) : null}
        {lifecycle.restoreDraft ? (
          <form action={setEventStatus}>
            <input type="hidden" name="id" value={eventId} />
            <input type="hidden" name="status" value="draft" />
            <HubSubmitButton variant="quiet">
              {HUB_ACTION_LABELS.restoreDraft}
            </HubSubmitButton>
          </form>
        ) : null}
      </div>
    </section>
  );
}
