import type { GivingDestinationSnapshot } from "@/lib/giving/types";
import { GIVING_ACCOUNT_STATUS_LABELS } from "@/lib/giving/types";

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  const display = value?.trim() ? value : "—";
  return (
    <div className="min-w-0">
      <dt className="text-sm font-semibold text-[var(--color-text-body)]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-base text-[var(--color-text-muted)]">
        {display}
      </dd>
    </div>
  );
}

export function GivingSnapshotView({
  title,
  snapshot,
  emptyLabel = "Nothing yet",
}: {
  title: string;
  snapshot: GivingDestinationSnapshot | null;
  emptyLabel?: string;
}) {
  if (!snapshot) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
        <h3 className="text-lg font-semibold text-[var(--color-text-body)]">
          {title}
        </h3>
        <p className="mt-2 text-base text-[var(--color-text-muted)]">
          {emptyLabel}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
      <h3 className="text-lg font-semibold text-[var(--color-text-body)]">
        {title}
      </h3>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Label" value={snapshot.label} />
        <Field label="Key" value={snapshot.stable_key} />
        <Field label="Bank" value={snapshot.bank_name} />
        <Field label="Account name" value={snapshot.account_name} />
        <Field label="Country" value={snapshot.country} />
        <Field
          label="Status"
          value={GIVING_ACCOUNT_STATUS_LABELS[snapshot.status]}
        />
        <Field label="SWIFT / BIC" value={snapshot.swift_bic} />
        <Field label="External link" value={snapshot.external_url} />
        <Field label="Visitor note" value={snapshot.visitor_note} />
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-sm font-semibold text-[var(--color-text-body)]">
            Description
          </dt>
          <dd className="mt-1 text-base text-[var(--color-text-muted)]">
            {snapshot.description.trim() || "—"}
          </dd>
        </div>
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-sm font-semibold text-[var(--color-text-body)]">
            Account numbers
          </dt>
          <dd className="mt-2 space-y-2">
            {snapshot.numbers.map((n) => (
              <p
                key={`${n.currency}-${n.account_number}`}
                className="font-mono text-base text-[var(--color-text-body)]"
              >
                {n.currency}: {n.account_number}
              </p>
            ))}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function GivingSnapshotDiff({
  current,
  proposed,
}: {
  current: GivingDestinationSnapshot | null;
  proposed: GivingDestinationSnapshot | null;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GivingSnapshotView
        title="CURRENT"
        snapshot={current}
        emptyLabel="No current destination (this is a new destination)."
      />
      <GivingSnapshotView title="PROPOSED" snapshot={proposed} />
    </div>
  );
}
