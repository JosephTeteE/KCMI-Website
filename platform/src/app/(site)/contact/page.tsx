import Link from "next/link";
import { ContactRequestForm } from "@/components/contact/contact-request-form";
import { PageShell } from "@/components/layout/page-shell";
import {
  getDailyFaithRecharge,
  getPublicContactDetails,
  getSocialLinks,
} from "@/content";
import { parseTopicQuery } from "@/lib/requests/types";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Contact",
  description:
    "Contact Kingdom Covenant Ministries International by message, email, or phone.",
  path: "/contact",
});

type SearchParams = Promise<{ topic?: string }>;

export default async function ContactPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const contact = await getPublicContactDetails();
  const social = await getSocialLinks();
  const faith = await getDailyFaithRecharge();
  const preselectedTopic = parseTopicQuery(params.topic);
  const source = preselectedTopic
    ? `contact?topic=${params.topic}`
    : "contact";

  return (
    <PageShell
      eyebrow="Connect"
      title="Contact Us"
      description={
        contact.intro ??
        "Write or call the church office. Prayer and care requests can be shared through the Prayer, Pastoral Care, and Welfare pages."
      }
      contentWidth="full"
    >
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
        <section
          aria-labelledby="contact-form-heading"
          className="card-pad rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
        >
          <h2
            id="contact-form-heading"
            className="font-display text-2xl font-semibold"
          >
            Send a message
          </h2>
          <p className="text-readable mt-3 text-[var(--color-text-muted)]">
            For general enquiries, Cell Fellowship, service teams, or
            testimonies. Prayer, Pastoral Care, and Welfare have their own
            private forms.
          </p>
          <div className="mt-6">
            <ContactRequestForm
              initialTopic={preselectedTopic ?? "general"}
              source={source}
            />
          </div>
        </section>

        <div className="space-y-8">
          <section className="card-pad rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
            <h2 className="font-display text-2xl font-semibold">
              Email and phone
            </h2>
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
                  Phone
                </p>
                <a
                  href={`tel:${contact.primaryPhoneTel}`}
                  className="text-[var(--color-action-primary)]"
                >
                  {contact.primaryPhoneDisplay}
                </a>
              </li>
            </ul>
            <p className="mt-6 rounded-[var(--radius-md)] bg-[var(--color-surface-page)] px-4 py-3 text-readable-sm text-[var(--color-text-muted)]">
              You can also email or call using the details above. Prayer,
              Pastoral Care, and Welfare requests should use those dedicated
              pages.
            </p>
            <p className="mt-4 text-readable-sm text-[var(--color-text-muted)]">
              {faith.heading}: {faith.body}{" "}
              <a
                href={faith.spotify.href}
                className="font-semibold text-[var(--color-action-primary)]"
                rel="noopener noreferrer"
                target="_blank"
              >
                {faith.spotify.label}
              </a>
              .
            </p>
          </section>

          <section className="card-pad rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
            <h2 className="font-display text-2xl font-semibold">Find us</h2>
            <p className="text-readable mt-3 text-[var(--color-text-muted)]">
              See locations for addresses and service times.
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
              {social.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-readable-sm"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
