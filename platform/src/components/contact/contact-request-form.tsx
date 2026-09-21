"use client";

import { useActionState } from "react";
import {
  submitContactAction,
  type ContactActionState,
} from "@/app/(site)/contact/actions";
import {
  WEBSITE_REQUEST_TOPICS,
  WEBSITE_REQUEST_TOPIC_LABELS,
  type WebsiteRequestTopic,
} from "@/lib/requests/types";

const initial: ContactActionState = { ok: false, message: "" };

type Props = {
  initialTopic?: WebsiteRequestTopic | null;
  source?: string;
};

export function ContactRequestForm({
  initialTopic = "general",
  source = "contact",
}: Props) {
  const [state, formAction, pending] = useActionState(
    submitContactAction,
    initial,
  );

  if (state.ok && state.referenceCode) {
    return (
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 sm:p-8"
        role="status"
        data-testid="contact-success"
      >
        <h2 className="font-display text-2xl font-semibold text-[var(--color-text-body)]">
          Message received
        </h2>
        <p className="text-readable mt-3 text-[var(--color-text-muted)]">
          Thank you. Your message has been received. The KCMI team will follow
          up using the details you provided when needed.
        </p>
        <p className="mt-4 font-mono text-base font-semibold text-[var(--color-text-body)]">
          Reference: {state.referenceCode}
        </p>
        <p className="mt-3 text-readable-sm text-[var(--color-text-muted)]">
          For prayer, Pastoral Care, or Welfare support, please use those
          dedicated pages instead of this form.
        </p>
      </div>
    );
  }

  const defaultTopic = initialTopic ?? "general";

  return (
    <form
      action={formAction}
      className="space-y-6"
      noValidate
      data-testid="contact-request-form"
    >
      {state.message && !state.ok ? (
        <p
          className="rounded-[var(--radius-md)] border border-[var(--color-destructive)] bg-[color-mix(in_srgb,var(--color-destructive)_12%,white)] px-4 py-3 text-sm text-[var(--color-destructive)]"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <input type="hidden" name="source" value={source} />

      {/* Honeypot — hidden from people; bots often fill it */}
      <div
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
        aria-hidden
      >
        <label htmlFor="contact-company">Company</label>
        <input
          id="contact-company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <label
          htmlFor="contact-full-name"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Name <span className="text-[var(--color-destructive)]">*</span>
        </label>
        <input
          id="contact-full-name"
          name="fullName"
          type="text"
          required
          maxLength={120}
          autoComplete="name"
          className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-3 text-base"
          aria-invalid={Boolean(state.fieldErrors?.fullName)}
        />
        {state.fieldErrors?.fullName ? (
          <p className="mt-1 text-sm text-[var(--color-destructive)]">
            {state.fieldErrors.fullName}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="contact-email"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Email <span className="text-[var(--color-destructive)]">*</span>
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-3 text-base"
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
          htmlFor="contact-phone"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Phone <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
        </label>
        <input
          id="contact-phone"
          name="phone"
          type="tel"
          maxLength={32}
          autoComplete="tel"
          className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-3 text-base"
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
          htmlFor="contact-topic"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Topic <span className="text-[var(--color-destructive)]">*</span>
        </label>
        <select
          id="contact-topic"
          name="topic"
          required
          defaultValue={defaultTopic}
          className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-3 text-base"
          aria-invalid={Boolean(state.fieldErrors?.topic)}
        >
          {WEBSITE_REQUEST_TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {WEBSITE_REQUEST_TOPIC_LABELS[topic]}
            </option>
          ))}
        </select>
        {state.fieldErrors?.topic ? (
          <p className="mt-1 text-sm text-[var(--color-destructive)]">
            {state.fieldErrors.topic}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="block text-base font-semibold text-[var(--color-text-body)]"
        >
          Message <span className="text-[var(--color-destructive)]">*</span>
        </label>
        <p className="mt-1 text-readable-sm text-[var(--color-text-muted)]">
          Share what you would like the church office to know. Do not use this
          form for prayer, Pastoral Care, or Welfare requests.
        </p>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={6}
          maxLength={4000}
          className="mt-3 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-3 text-base"
          aria-invalid={Boolean(state.fieldErrors?.message)}
        />
        {state.fieldErrors?.message ? (
          <p className="mt-1 text-sm text-[var(--color-destructive)]">
            {state.fieldErrors.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-6 text-base font-semibold text-[var(--color-action-primary-fg)] disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
