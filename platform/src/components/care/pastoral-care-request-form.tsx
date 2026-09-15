"use client";

import { useActionState } from "react";
import {
  submitPastoralAction,
  type PastoralActionState,
} from "@/app/(site)/pastoral-care/actions";

const initial: PastoralActionState = { ok: false, message: "" };

export function PastoralCareRequestForm() {
  const [state, formAction, pending] = useActionState(
    submitPastoralAction,
    initial,
  );

  if (state.ok && state.referenceCode) {
    return (
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 sm:p-8"
        role="status"
      >
        <h2 className="font-display text-2xl font-semibold text-[var(--color-text-body)]">
          Pastoral Care request received
        </h2>
        <p className="text-readable mt-3 text-[var(--color-text-muted)]">
          Thank you. Your request has been received privately. Authorized
          Pastoral Care staff may review it and contact you using the details you
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
        <label htmlFor="pastoral-company">Company</label>
        <input
          id="pastoral-company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <label
          htmlFor="pastoral-name"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Name <span className="text-[var(--color-destructive)]">*</span>
        </label>
        <input
          id="pastoral-name"
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
          htmlFor="pastoral-phone"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Phone <span className="text-[var(--color-destructive)]">*</span>
        </label>
        <input
          id="pastoral-phone"
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
          htmlFor="pastoral-email"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Email{" "}
          <span className="font-normal text-[var(--color-text-muted)]">
            (optional)
          </span>
        </label>
        <input
          id="pastoral-email"
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
          htmlFor="pastoral-reason"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Reason for requesting Pastoral Care{" "}
          <span className="text-[var(--color-destructive)]">*</span>
        </label>
        <p className="mt-1 text-readable-sm text-[var(--color-text-muted)]">
          Share only what is necessary for Pastoral Care staff to understand your
          request.
        </p>
        <textarea
          id="pastoral-reason"
          name="reason"
          required
          rows={5}
          maxLength={6000}
          className="mt-3 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-3 text-base"
          aria-invalid={Boolean(state.fieldErrors?.reason)}
        />
        {state.fieldErrors?.reason ? (
          <p className="mt-1 text-sm text-[var(--color-destructive)]">
            {state.fieldErrors.reason}
          </p>
        ) : null}
      </div>

      <fieldset>
        <legend className="text-base font-semibold text-[var(--color-text-body)]">
          Preferred way to speak{" "}
          <span className="text-[var(--color-destructive)]">*</span>
        </legend>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="inline-flex min-h-11 items-center gap-2 text-base">
            <input type="radio" name="preferredMethod" value="in_person" required />
            In person
          </label>
          <label className="inline-flex min-h-11 items-center gap-2 text-base">
            <input type="radio" name="preferredMethod" value="phone" />
            By phone
          </label>
        </div>
        {state.fieldErrors?.preferredMethod ? (
          <p className="mt-1 text-sm text-[var(--color-destructive)]">
            {state.fieldErrors.preferredMethod}
          </p>
        ) : null}
      </fieldset>

      <div>
        <label
          htmlFor="pastoral-time"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Preferred time{" "}
          <span className="text-[var(--color-destructive)]">*</span>
        </label>
        <input
          id="pastoral-time"
          name="preferredTime"
          type="text"
          required
          maxLength={200}
          placeholder="For example: weekday mornings, Sunday afternoon"
          className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-base"
          aria-invalid={Boolean(state.fieldErrors?.preferredTime)}
        />
        {state.fieldErrors?.preferredTime ? (
          <p className="mt-1 text-sm text-[var(--color-destructive)]">
            {state.fieldErrors.preferredTime}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="pastoral-additional"
          className="block text-sm font-medium text-[var(--color-text-muted)]"
        >
          Additional information{" "}
          <span className="font-normal">(optional)</span>
        </label>
        <textarea
          id="pastoral-additional"
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
        {pending ? "Sending…" : "Submit Pastoral Care request"}
      </button>
    </form>
  );
}
