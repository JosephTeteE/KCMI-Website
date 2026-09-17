import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PrayerRequestForm } from "@/components/prayer/prayer-request-form";
import {
  isPrayerIntakeEnabled,
  LEGACY_PRAYER_GOOGLE_FORM_URL,
} from "@/lib/care/prayer-intake";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Prayer",
  description:
    "Share a private prayer request with Kingdom Covenant Ministries International.",
  path: "/prayer",
});

export default function PrayerPage() {
  const intakeEnabled = isPrayerIntakeEnabled();

  return (
    <PageShell
      eyebrow="Care"
      title="Prayer requests"
      description="Need prayer? We would be glad to pray with you."
    >
      <div className="mx-auto max-w-2xl space-y-8">
        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 sm:p-8">
          <blockquote className="font-display text-xl font-semibold text-balance text-[var(--color-text-body)] sm:text-2xl">
            “I urge that petitions, prayers, intercessions, and thanksgivings be
            made for everyone.”
          </blockquote>
          <p className="mt-3 text-readable-sm text-[var(--color-text-muted)]">
            1 Timothy 2:1
          </p>
          <p className="text-readable mt-6 text-[var(--color-text-muted)]">
            Whether you prefer to share a name or remain unnamed when no follow-up
            is needed, you are welcome to ask for prayer.
          </p>
        </section>

        <section
          aria-labelledby="prayer-privacy-heading"
          className="rounded-[var(--radius-lg)] bg-[var(--color-surface-page)] px-5 py-4"
        >
          <h2
            id="prayer-privacy-heading"
            className="text-base font-semibold text-[var(--color-text-body)]"
          >
            Before you share
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-readable-sm text-[var(--color-text-muted)]">
            <li>Share only what you are comfortable sharing.</li>
            <li>
              Prayer requests are reviewed by the appropriate KCMI Prayer and
              Care team.
            </li>
            <li>
              Contact details are optional unless you ask for a prayer call.
            </li>
            <li>
              This form is not monitored as an emergency service. If you are in
              immediate danger, contact local emergency services.
            </li>
          </ul>
        </section>

        {intakeEnabled ? (
          <section aria-labelledby="prayer-form-heading">
            <h2
              id="prayer-form-heading"
              className="font-display text-2xl font-semibold"
            >
              Share a prayer request
            </h2>
            <div className="mt-6">
              <PrayerRequestForm />
            </div>
          </section>
        ) : (
          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold">
              Submit a Prayer Request
            </h2>
            <p className="text-readable mt-3 text-[var(--color-text-muted)]">
              Use the button below to share your request with the KCMI Prayer
              team.
            </p>
            <a
              href={LEGACY_PRAYER_GOOGLE_FORM_URL}
              className="mt-6 inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-white"
              rel="noopener noreferrer"
              target="_blank"
            >
              Submit a Prayer Request
            </a>
            <p className="mt-4 text-readable-sm text-[var(--color-text-muted)]">
              You can also find prayer and care links on the{" "}
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
