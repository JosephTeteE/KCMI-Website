import Link from "next/link";

type Props = {
  heading: string;
};

/**
 * Fail-closed Care gate-off UI. Never links to Google Forms.
 */
export function CareIntakeUnavailable({ heading }: Props) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 sm:p-8">
      <h2 className="font-display text-2xl font-semibold">{heading}</h2>
      <p className="text-readable mt-3 text-[var(--color-text-muted)]">
        Online requests are temporarily unavailable. Please contact KCMI.
      </p>
      <Link
        href="/contact"
        className="mt-6 inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-white"
      >
        Contact Us
      </Link>
    </section>
  );
}
