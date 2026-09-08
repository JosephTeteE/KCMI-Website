import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import {
  getDailyFaithRecharge,
  getPublicContactDetails,
  getSocialLinks,
} from "@/content";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Contact",
  description:
    "Contact Kingdom Covenant Ministries International by email or phone, find locations, and connect on social channels.",
  path: "/contact",
});

export default function ContactPage() {
  const contact = getPublicContactDetails();
  const social = getSocialLinks();
  const faith = getDailyFaithRecharge();

  return (
    <PageShell
      eyebrow="Connect"
      title="Contact Us"
      description="We at KCMI love to hear from you! Whether you have a prayer request, need counseling, or simply want to connect, we're here for you."
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <h2 className="font-display text-2xl font-semibold">Public contact</h2>
          <ul className="mt-5 space-y-4 text-readable">
            <li className="min-w-0">
              <p className="text-readable-sm font-semibold text-[var(--color-text-body)]">
                Email
              </p>
              <a
                href={`mailto:${contact.primaryEmail}`}
                className="text-break-safe text-[var(--color-action-primary)]"
              >
                {contact.primaryEmail}
              </a>
            </li>
            <li>
              <p className="text-readable-sm font-semibold text-[var(--color-text-body)]">
                Phone / WhatsApp
              </p>
              <a
                href={`tel:${contact.primaryPhoneTel}`}
                className="text-[var(--color-action-primary)]"
              >
                {contact.primaryPhoneDisplay}
              </a>
              <p className="text-break-safe mt-2 text-readable-sm text-[var(--color-text-muted)]">
                {faith.whatsappHint}
              </p>
            </li>
          </ul>
          <p className="mt-6 rounded-[var(--radius-md)] bg-[var(--color-surface-page)] px-4 py-3 text-readable-sm text-[var(--color-text-muted)]">
            Email or call us using the details above. Prayer, counselling, and
            other requests can also be sent through the forms on the Services
            page.
          </p>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
          <h2 className="font-display text-2xl font-semibold">Find us</h2>
          <p className="text-readable mt-3 text-[var(--color-text-muted)]">
            Outside of Port Harcourt, Nigeria? See our other locations for
            addresses and service times.
          </p>
          <Link
            href="/locations"
            className="mt-4 inline-flex min-h-11 items-center text-readable-sm font-semibold text-[var(--color-action-primary)]"
          >
            View locations
          </Link>
          <h3 className="mt-8 text-readable-sm font-semibold tracking-wide uppercase">
            Social
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {social.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-readable-sm"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
