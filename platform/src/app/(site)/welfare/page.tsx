import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { CareIntakeUnavailable } from "@/components/care/care-intake-unavailable";
import { WelfareRequestForm } from "@/components/care/welfare-request-form";
import { isWelfareIntakeEnabled } from "@/lib/care/welfare-intake";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Welfare",
  description:
    "Request Welfare support from Kingdom Covenant Ministries International.",
  path: "/welfare",
});

export default function WelfarePage() {
  const intakeEnabled = isWelfareIntakeEnabled();

  return (
    <PageShell
      eyebrow="Care"
      title="Welfare"
      description="If you need practical support, you can send a request to the KCMI Welfare team."
    >
      <div className="mx-auto max-w-2xl space-y-8">
        <section
          aria-labelledby="welfare-privacy-heading"
          className="rounded-[var(--radius-lg)] bg-[var(--color-surface-page)] px-5 py-4"
        >
          <h2
            id="welfare-privacy-heading"
            className="text-base font-semibold text-[var(--color-text-body)]"
          >
            Before you share
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-readable-sm text-[var(--color-text-muted)]">
            <li>Share only what is needed to explain the request.</li>
            <li>Requests are reviewed by authorized KCMI Welfare staff.</li>
            <li>
              Supporting documents are not required through this website.
            </li>
            <li>
              This is not an emergency service. If you are in immediate danger,
              contact local emergency services.
            </li>
          </ul>
        </section>

        {intakeEnabled ? (
          <section aria-labelledby="welfare-form-heading">
            <h2
              id="welfare-form-heading"
              className="font-display text-2xl font-semibold"
            >
              Request Welfare Support
            </h2>
            <div className="mt-6">
              <WelfareRequestForm />
            </div>
          </section>
        ) : (
          <CareIntakeUnavailable heading="Request Welfare Support" />
        )}

        <p className="text-readable-sm text-[var(--color-text-muted)]">
          You can also find care links on the{" "}
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
