import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { getFaqs } from "@/content";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "FAQs",
  description:
    "Frequently asked questions about Kingdom Covenant Ministries International — salvation, services, giving, prayer, and more.",
  path: "/faqs",
});

export default function FaqsPage() {
  const faqs = getFaqs();

  return (
    <PageShell
      eyebrow="Help"
      title="Frequently Asked Questions"
      description="Common questions about worship, giving, prayer, and how to get in touch."
    >
      <div className="mx-auto max-w-3xl space-y-3">
        {faqs.map((faq) => (
          <details
            key={faq.id}
            className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 py-2 open:pb-5"
          >
            <summary className="cursor-pointer list-none rounded-[var(--radius-sm)] py-3 text-readable font-semibold text-[var(--color-text-body)] outline-offset-4 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex min-h-11 items-start justify-between gap-4">
                <span>{faq.question}</span>
                <span
                  aria-hidden
                  className="mt-1 shrink-0 text-[var(--color-action-primary)] transition group-open:rotate-45"
                >
                  +
                </span>
              </span>
            </summary>
            <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
              {faq.answerParagraphs.map((p) => (
                <p key={p.slice(0, 48)} className="text-readable text-[var(--color-text-muted)]">
                  {p}
                </p>
              ))}
              {faq.links?.length ? (
                <ul className="flex flex-wrap gap-3 pt-1">
                  {faq.links.map((link) => (
                    <li key={link.href}>
                      {link.external ? (
                        <a
                          href={link.href}
                          className="text-readable-sm font-semibold text-[var(--color-action-primary)]"
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-readable-sm font-semibold text-[var(--color-action-primary)]"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </PageShell>
  );
}
