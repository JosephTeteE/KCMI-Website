"use client";

import { useActionState } from "react";
import {
  submitWelfareAction,
  type WelfareActionState,
} from "@/app/(site)/welfare/actions";
import {
  WELFARE_REQUEST_CATEGORIES,
  WELFARE_REQUEST_CATEGORY_LABELS,
} from "@/lib/care/types";

const initial: WelfareActionState = { ok: false, message: "" };

export function WelfareRequestForm() {
  const [state, formAction, pending] = useActionState(
    submitWelfareAction,
    initial,
  );

  if (state.ok && state.referenceCode) {
    return (
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 sm:p-8"
        role="status"
      >
        <h2 className="font-display text-2xl font-semibold text-[var(--color-text-body)]">
          Welfare request received
        </h2>
        <p className="text-readable mt-3 text-[var(--color-text-muted)]">
          Thank you. Your request has been received privately. Authorized
          Welfare staff may review it and contact you using the details you
          provided.
        </p>
        <p className="mt-4 font-mono text-base font-semibold text-[var(--color-text-body)]">
          Reference: {state.referenceCode}
        </p>
        <p className="mt-3 text-readable-sm text-[var(--color-text-muted)]">
          You do not need to keep this reference unless someone from KCMI asks
          for it. This form is not monitored as an emergency service.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.message && !state.ok ? (
        <p
          className="rounded-[var(--radius-md)] border border-[var(--color-destructive)] bg-[color-mix(in_srgb,var(--color-destructive)_12%,white)] px-4 py-3 text-sm text-[var(--color-destructive)]"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label htmlFor="welfare-company">Company</label>
        <input
          id="welfare-company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <label
          htmlFor="welfare-name"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Name <span className="text-[var(--color-destructive)]">*</span>
        </label>
        <input
          id="welfare-name"
          name="displayName"
          type="text"
          maxLength={120}
          autoComplete="name"
          required
          className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-base"
          aria-invalid={Boolean(state.fieldErrors?.displayName)}
        />
        {state.fieldErrors?.displayName ? (
          <p className="mt-1 text-sm text-[var(--color-destructive)]">
            {state.fieldErrors.displayName}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="welfare-phone"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Phone <span className="text-[var(--color-destructive)]">*</span>
        </label>
        <input
          id="welfare-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-base"
          aria-invalid={Boolean(state.fieldErrors?.phone)}
        />
        {state.fieldErrors?.phone ? (
          <p className="mt-1 text-sm text-[var(--color-destructive)]">
            {state.fieldErrors.phone}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="welfare-email"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Email{" "}
          <span className="font-normal text-[var(--color-text-muted)]">
            (optional)
          </span>
        </label>
        <input
          id="welfare-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-base"
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        {state.fieldErrors?.email ? (
          <p className="mt-1 text-sm text-[var(--color-destructive)]">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="welfare-category"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Type of request{" "}
          <span className="text-[var(--color-destructive)]">*</span>
        </label>
        <select
          id="welfare-category"
          name="category"
          required
          defaultValue=""
          className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-base"
          aria-invalid={Boolean(state.fieldErrors?.category)}
        >
          <option value="" disabled>
            Select a type
          </option>
          {WELFARE_REQUEST_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {WELFARE_REQUEST_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-readable-sm text-[var(--color-text-muted)]">
          “Medical” means practical support related to a medical need — this is
          not a medical intake form.
        </p>
        {state.fieldErrors?.category ? (
          <p className="mt-1 text-sm text-[var(--color-destructive)]">
            {state.fieldErrors.category}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="welfare-description"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Description of need{" "}
          <span className="text-[var(--color-destructive)]">*</span>
        </label>
        <p className="mt-1 text-readable-sm text-[var(--color-text-muted)]">
          Describe the current situation and the specific assistance needed.
          Share only what is necessary. No documents are required here.
        </p>
        <textarea
          id="welfare-description"
          name="description"
          required
          rows={5}
          maxLength={6000}
          className="mt-3 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-3 text-base"
          aria-invalid={Boolean(state.fieldErrors?.description)}
        />
        {state.fieldErrors?.description ? (
          <p className="mt-1 text-sm text-[var(--color-destructive)]">
            {state.fieldErrors.description}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="welfare-additional"
          className="block text-sm font-medium text-[var(--color-text-muted)]"
        >
          Additional information{" "}
          <span className="font-normal">(optional)</span>
        </label>
        <textarea
          id="welfare-additional"
          name="additional"
          rows={3}
          maxLength={2000}
          className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-body)]"
          aria-invalid={Boolean(state.fieldErrors?.additional)}
        />
        {state.fieldErrors?.additional ? (
          <p className="mt-1 text-sm text-[var(--color-destructive)]">
            {state.fieldErrors.additional}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Sending…" : "Submit Welfare request"}
      </button>
    </form>
  );
}
