import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { CareIntakeUnavailable } from "@/components/care/care-intake-unavailable";
import { PrayerRequestForm } from "@/components/prayer/prayer-request-form";
import { isPrayerIntakeEnabled } from "@/lib/care/prayer-intake";
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
          <CareIntakeUnavailable heading="Submit a Prayer Request" />
        )}

        <p className="text-readable-sm text-[var(--color-text-muted)]">
          You can also find prayer and care links on the{" "}
          <Link
            href="/services"
            className="font-semibold text-[var(--color-action-primary)]"
          >
            Services
          </Link>{" "}
          page.
        </p>
      </div>
    </PageShell>
  );
}
