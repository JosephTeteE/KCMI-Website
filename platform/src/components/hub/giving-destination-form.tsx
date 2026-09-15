import type { GivingDestinationSnapshot } from "@/lib/giving/types";

type GivingDestinationFormProps = {
  idPrefix: string;
  snapshot: GivingDestinationSnapshot;
  proposalType: "create" | "update" | "disable" | "enable";
  targetAccountId?: string | null;
  proposalId?: string | null;
  submitLabel: string;
  formAction: (formData: FormData) => void | Promise<void>;
  lockStableKey?: boolean;
};

export function GivingDestinationForm({
  idPrefix,
  snapshot,
  proposalType,
  targetAccountId,
  proposalId,
  submitLabel,
  formAction,
  lockStableKey = false,
}: GivingDestinationFormProps) {
  const numbers =
    snapshot.numbers.length > 0
      ? snapshot.numbers
      : [{ currency: "NGN", account_number: "", display_order: 0 }];

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="proposal_type" value={proposalType} />
      {targetAccountId ? (
        <input type="hidden" name="target_account_id" value={targetAccountId} />
      ) : null}
      {proposalId ? (
        <input type="hidden" name="proposal_id" value={proposalId} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold text-[var(--color-text-body)]">
            Destination label
          </span>
          <input
            id={`${idPrefix}-label`}
            name="label"
            required
            defaultValue={snapshot.label}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3 text-base"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[var(--color-text-body)]">
            Short key
          </span>
          <input
            id={`${idPrefix}-key`}
            name="stable_key"
            required
            readOnly={lockStableKey}
            defaultValue={snapshot.stable_key}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3 font-mono text-base"
          />
          <span className="mt-1 block text-sm text-[var(--color-text-muted)]">
            Lowercase letters, numbers, hyphens. Example: general-ecobank
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[var(--color-text-body)]">
            Display order
          </span>
          <input
            id={`${idPrefix}-order`}
            name="display_order"
            type="number"
            defaultValue={snapshot.display_order}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3 text-base"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[var(--color-text-body)]">
            Bank name
          </span>
          <input
            id={`${idPrefix}-bank`}
            name="bank_name"
            required
            defaultValue={snapshot.bank_name}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3 text-base"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[var(--color-text-body)]">
            Account name
          </span>
          <input
            id={`${idPrefix}-account-name`}
            name="account_name"
            required
            defaultValue={snapshot.account_name}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3 text-base"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[var(--color-text-body)]">
            Country (optional)
          </span>
          <input
            id={`${idPrefix}-country`}
            name="country"
            defaultValue={snapshot.country ?? ""}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3 text-base"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[var(--color-text-body)]">
            SWIFT / BIC (optional)
          </span>
          <input
            id={`${idPrefix}-swift`}
            name="swift_bic"
            defaultValue={snapshot.swift_bic ?? ""}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3 font-mono text-base"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold text-[var(--color-text-body)]">
            External giving link (optional, https only)
          </span>
          <input
            id={`${idPrefix}-url`}
            name="external_url"
            type="url"
            defaultValue={snapshot.external_url ?? ""}
            placeholder="https://"
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3 text-base"
          />
          <span className="mt-1 block text-sm text-[var(--color-text-muted)]">
            Leave blank unless a verified online giving destination exists.
            Changing this always needs dual approval.
          </span>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold text-[var(--color-text-body)]">
            Visitor note (optional)
          </span>
          <input
            id={`${idPrefix}-note`}
            name="visitor_note"
            defaultValue={snapshot.visitor_note ?? ""}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3 text-base"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold text-[var(--color-text-body)]">
            Description
          </span>
          <textarea
            id={`${idPrefix}-description`}
            name="description"
            rows={3}
            defaultValue={snapshot.description}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3 text-base"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[var(--color-text-body)]">
            Database status after approval
          </span>
          <select
            id={`${idPrefix}-status`}
            name="status"
            defaultValue={snapshot.status}
            disabled={proposalType === "disable" || proposalType === "enable"}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3 text-base"
          >
            <option value="published">Ready in database</option>
            <option value="disabled">Turned off</option>
            <option value="draft">Not ready</option>
          </select>
          {(proposalType === "disable" || proposalType === "enable") && (
            <input type="hidden" name="status" value={snapshot.status} />
          )}
        </label>
      </div>

      <fieldset className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
        <legend className="px-1 text-sm font-semibold text-[var(--color-text-body)]">
          Account numbers by currency
        </legend>
        <p className="text-sm text-[var(--color-text-muted)]">
          Add one row per currency. Use synthetic STAGING QA numbers in tests —
          never invent real KCMI account numbers here during discovery cutover.
        </p>
        {numbers.map((n, index) => (
          <div
            key={`${n.currency}-${index}`}
            className="grid gap-3 sm:grid-cols-2"
          >
            <label className="block">
              <span className="text-sm font-semibold">Currency</span>
              <input
                name="number_currency"
                required
                defaultValue={n.currency}
                className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3 font-mono text-base uppercase"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Account number</span>
              <input
                name="number_account"
                required
                defaultValue={n.account_number}
                className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3 font-mono text-base"
              />
            </label>
          </div>
        ))}
        {/* Extra blank row for multi-currency edits */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold">Extra currency (optional)</span>
            <input
              name="number_currency"
              defaultValue=""
              className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3 font-mono text-base uppercase"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Extra account number</span>
            <input
              name="number_account"
              defaultValue=""
              className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3 font-mono text-base"
            />
          </label>
        </div>
      </fieldset>

      <button
        type="submit"
        className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-white"
      >
        {submitLabel}
      </button>
    </form>
  );
}
