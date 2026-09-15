"use client";

import { useActionState, useState } from "react";
import {
  submitPrayerAction,
  type PrayerActionState,
} from "@/app/(site)/prayer/actions";

const initial: PrayerActionState = { ok: false, message: "" };

export function PrayerRequestForm() {
  const [state, formAction, pending] = useActionState(submitPrayerAction, initial);
  const [contactRequested, setContactRequested] = useState<"yes" | "no" | "">("");

  if (state.ok && state.referenceCode) {
    return (
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 sm:p-8"
        role="status"
      >
        <h2 className="font-display text-2xl font-semibold text-[var(--color-text-body)]">
          Prayer request received
        </h2>
        <p className="text-readable mt-3 text-[var(--color-text-muted)]">
          Thank you. Your request has been received privately. Authorized Prayer
          team members may review it.
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

  const needsContact = contactRequested === "yes";

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

      {/* Honeypot — hidden from people; bots often fill it */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label htmlFor="prayer-company">Company</label>
        <input id="prayer-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label
          htmlFor="prayer-narrative"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Prayer request <span className="text-[var(--color-destructive)]">*</span>
        </label>
        <p className="mt-1 text-readable-sm text-[var(--color-text-muted)]">
          Share what you would like us to pray about. Include only what is needed.
        </p>
        <textarea
          id="prayer-narrative"
          name="narrative"
          required
          rows={6}
          maxLength={8000}
          className="mt-3 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-3 text-base"
          aria-invalid={Boolean(state.fieldErrors?.narrative)}
        />
        {state.fieldErrors?.narrative ? (
          <p className="mt-1 text-sm text-[var(--color-destructive)]">
            {state.fieldErrors.narrative}
          </p>
        ) : null}
      </div>

      <fieldset>
        <legend className="text-base font-semibold text-[var(--color-text-body)]">
          Would you like someone from KCMI to pray with you by phone?{" "}
          <span className="text-[var(--color-destructive)]">*</span>
        </legend>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="inline-flex min-h-11 items-center gap-2 text-base">
            <input
              type="radio"
              name="contactRequested"
              value="yes"
              checked={contactRequested === "yes"}
              onChange={() => setContactRequested("yes")}
              required
            />
            Yes
          </label>
          <label className="inline-flex min-h-11 items-center gap-2 text-base">
            <input
              type="radio"
              name="contactRequested"
              value="no"
              checked={contactRequested === "no"}
              onChange={() => setContactRequested("no")}
            />
            No
          </label>
        </div>
        {state.fieldErrors?.contactRequested ? (
          <p className="mt-1 text-sm text-[var(--color-destructive)]">
            {state.fieldErrors.contactRequested}
          </p>
        ) : null}
      </fieldset>

      <div>
        <label
          htmlFor="prayer-name"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Name
          {needsContact ? (
            <span className="text-[var(--color-destructive)]"> *</span>
          ) : (
            <span className="font-normal text-[var(--color-text-muted)]">
              {" "}
              (optional)
            </span>
          )}
        </label>
        <input
          id="prayer-name"
          name="displayName"
          type="text"
          maxLength={120}
          autoComplete="name"
          required={needsContact}
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
          htmlFor="prayer-phone"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Phone number
          {needsContact ? (
            <span className="text-[var(--color-destructive)]"> *</span>
          ) : (
            <span className="font-normal text-[var(--color-text-muted)]">
              {" "}
              (optional)
            </span>
          )}
        </label>
        <input
          id="prayer-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required={needsContact}
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
          htmlFor="prayer-email"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Email{" "}
          <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
        </label>
        <input
          id="prayer-email"
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

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Sending…" : "Submit prayer request"}
      </button>
    </form>
  );
}
