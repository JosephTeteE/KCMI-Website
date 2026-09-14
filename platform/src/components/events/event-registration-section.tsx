"use client";

import { useState, useTransition } from "react";
import {
  registerForEvent,
  type RegisterForEventResult,
} from "@/app/events/actions";
import { TurnstileField } from "@/components/security/turnstile-field";
import {
  evaluateRegistrationEligibility,
  MAX_PARTY_SIZE,
  MIN_PARTY_SIZE,
  type RegistrationEligibility,
} from "@/lib/events/registration-eligibility";
import { formatEventDateTimeLabel } from "@/lib/events/format";
import type { PublicEventDetail } from "@/lib/events/types";

function eligibilityMessage(
  eligibility: RegistrationEligibility,
  timezone: string,
): string | null {
  switch (eligibility.state) {
    case "disabled":
      return null;
    case "not_open":
      return `Registration opens ${formatEventDateTimeLabel(eligibility.opensAt, timezone)}.`;
    case "closed":
      return "Registration closed.";
    case "full":
      return "Registration full.";
    case "open":
      return null;
  }
}

export function EventRegistrationSection({
  event,
}: {
  event: PublicEventDetail;
}) {
  const eligibility = evaluateRegistrationEligibility({
    status: "published",
    registrationEnabled: event.registration.enabled,
    registrationOpensAt: event.registration.opensAt,
    registrationClosesAt: event.registration.closesAt,
    capacity: event.registration.capacity,
    registeredPeople: event.registration.registeredPeople,
  });

  const message = eligibilityMessage(eligibility, event.timezone);

  if (eligibility.state === "disabled") {
    return null;
  }

  if (eligibility.state !== "open") {
    return (
      <section
        className="mt-10 border-t border-[var(--color-border)] pt-8"
        aria-labelledby="event-registration-heading"
      >
        <h2
          id="event-registration-heading"
          className="font-display text-xl font-semibold"
        >
          Registration
        </h2>
        <p className="mt-3 text-readable text-[var(--color-text-muted)]">
          {message}
        </p>
      </section>
    );
  }

  return (
    <EventRegistrationForm
      eventId={event.id}
      eventTitle={event.title}
      datesLabel={event.datesLabel}
      remaining={eligibility.remaining}
    />
  );
}

function EventRegistrationForm({
  eventId,
  eventTitle,
  datesLabel,
  remaining,
}: {
  eventId: string;
  eventTitle: string;
  datesLabel: string;
  remaining: number | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<
    RegisterForEventResult,
    { ok: true }
  > | null>(null);

  const testMode =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_TURNSTILE_TEST_MODE === "1";

  const maxPeople =
    remaining != null
      ? Math.min(MAX_PARTY_SIZE, Math.max(MIN_PARTY_SIZE, remaining))
      : MAX_PARTY_SIZE;

  if (result) {
    return (
      <section
        className="mt-10 border-t border-[var(--color-border)] pt-8"
        aria-labelledby="event-registration-heading"
      >
        <h2
          id="event-registration-heading"
          className="font-display text-xl font-semibold"
        >
          Registration received
        </h2>
        <p className="mt-3 text-readable text-[var(--color-text-body)]">
          Thank you. We have received your registration for{" "}
          <span className="font-semibold">{result.eventTitle}</span>
          {result.datesLabel ? ` (${result.datesLabel})` : ""}.
        </p>
        <p className="mt-4 text-readable">
          <span className="font-semibold text-[var(--color-text-body)]">
            Reference:
          </span>{" "}
          <code className="rounded bg-[var(--color-surface-tint)] px-2 py-1 font-mono text-base tracking-wide">
            {result.referenceCode}
          </code>
        </p>
        <p className="mt-3 text-readable text-[var(--color-text-muted)]">
          People registered: {result.partySize}. Please keep this reference for
          your records.
          {result.emailSent
            ? " A confirmation email has been sent."
            : " If email confirmation is configured, you may also receive a copy."}
        </p>
        <p className="mt-3 text-readable-sm text-[var(--color-text-muted)]">
          This confirms we received your details. It does not confirm payment or
          guarantee a seat unless KCMI staff tell you otherwise.
        </p>
      </section>
    );
  }

  return (
    <section
      className="mt-10 border-t border-[var(--color-border)] pt-8"
      aria-labelledby="event-registration-heading"
      id="register"
    >
      <h2
        id="event-registration-heading"
        className="font-display text-xl font-semibold"
      >
        Register
      </h2>
      <p className="mt-2 text-readable text-[var(--color-text-muted)]">
        Register for {eventTitle}
        {datesLabel ? ` · ${datesLabel}` : ""}.
      </p>

      <form
        className="mt-6 max-w-xl space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const fd = new FormData(e.currentTarget);
          fd.set("event_id", eventId);
          fd.set("turnstile_token", token);
          startTransition(async () => {
            const res = await registerForEvent(fd);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            setResult(res);
          });
        }}
      >
        <div>
          <label
            htmlFor="full_name"
            className="text-readable-sm font-semibold text-[var(--color-text-body)]"
          >
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            className="mt-1 w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 text-base"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="text-readable-sm font-semibold text-[var(--color-text-body)]"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 text-base"
          />
        </div>
        <div>
          <label
            htmlFor="phone"
            className="text-readable-sm font-semibold text-[var(--color-text-body)]"
          >
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            minLength={7}
            className="mt-1 w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 text-base"
          />
        </div>
        <div>
          <label
            htmlFor="num_people"
            className="text-readable-sm font-semibold text-[var(--color-text-body)]"
          >
            Number of people
          </label>
          <input
            id="num_people"
            name="num_people"
            type="number"
            inputMode="numeric"
            min={MIN_PARTY_SIZE}
            max={maxPeople}
            defaultValue={1}
            required
            className="mt-1 w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 text-base"
          />
          <p className="mt-1 text-readable-sm text-[var(--color-text-muted)]">
            Between {MIN_PARTY_SIZE} and {maxPeople} on one form.
          </p>
        </div>

        <TurnstileField testMode={testMode} onToken={setToken} />

        {error ? (
          <p
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--color-destructive)] bg-[color-mix(in_srgb,var(--color-destructive)_8%,transparent)] px-4 py-3 text-readable text-[var(--color-destructive)]"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending || (!testMode && !token)}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 font-semibold text-[var(--color-action-primary-fg)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Submitting…" : "Submit registration"}
        </button>
      </form>
    </section>
  );
}
