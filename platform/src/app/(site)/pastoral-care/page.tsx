import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PastoralCareRequestForm } from "@/components/care/pastoral-care-request-form";
import {
  isPastoralIntakeEnabled,
  LEGACY_PASTORAL_GOOGLE_FORM_URL,
} from "@/lib/care/pastoral-intake";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Pastoral Care",
  description:
    "Request Pastoral Care support from Kingdom Covenant Ministries International.",
  path: "/pastoral-care",
});

export default function PastoralCarePage() {
  const intakeEnabled = isPastoralIntakeEnabled();

  return (
    <PageShell
      eyebrow="Care"
      title="Pastoral Care"
      description="Authorized KCMI Pastoral Care staff may review requests shared here. Share only what is necessary."
    >
      <div className="mx-auto max-w-2xl space-y-8">
        <section
          aria-labelledby="pastoral-privacy-heading"
          className="rounded-[var(--radius-lg)] bg-[var(--color-surface-page)] px-5 py-4"
        >
          <h2
            id="pastoral-privacy-heading"
            className="text-base font-semibold text-[var(--color-text-body)]"
          >
            Before you share
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-readable-sm text-[var(--color-text-muted)]">
            <li>
              Your request is reviewed only by authorized KCMI Pastoral Care
              staff.
            </li>
            <li>Share only what is necessary for Pastoral Care to help.</li>
            <li>
              KCMI may contact you using the details you supply.
            </li>
            <li>
              This is not an emergency, medical, legal, or professional therapy
              service. If you are in immediate danger, contact local emergency
              services.
            </li>
          </ul>
          <p className="mt-3 text-readable-sm text-[var(--color-text-muted)]">
            Final public wording is subject to human/legal review before
            production cutover.
          </p>
        </section>

        {intakeEnabled ? (
          <section aria-labelledby="pastoral-form-heading">
            <h2
              id="pastoral-form-heading"
              className="font-display text-2xl font-semibold"
            >
              Request Pastoral Care
            </h2>
            <div className="mt-6">
              <PastoralCareRequestForm />
            </div>
          </section>
        ) : (
          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold">
              Submit a Pastoral Care request
            </h2>
            <p className="text-readable mt-3 text-[var(--color-text-muted)]">
              Pastoral Care requests are currently received through our existing
              form. First-party intake on this page is prepared but not enabled
              for visitors yet.
            </p>
            <a
              href={LEGACY_PASTORAL_GOOGLE_FORM_URL}
              className="mt-6 inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-white"
              rel="noopener noreferrer"
              target="_blank"
            >
              Open Pastoral Care form
            </a>
            <p className="mt-4 text-readable-sm text-[var(--color-text-muted)]">
              You can also find care links on the{" "}
              <Link
                href="/services"
                className="font-semibold text-[var(--color-action-primary)]"
              >
                Services
              </Link>{" "}
              page.
            </p>
          </section>
        )}
      </div>
    </PageShell>
  );
}
