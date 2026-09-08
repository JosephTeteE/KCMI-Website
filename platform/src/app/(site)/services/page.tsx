import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import {
  getServiceOfferings,
  getServicesPageIntro,
  getServiceTimes,
} from "@/content";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Services",
  description:
    "Worship times, cell fellowships, service teams, and spiritual resources at Kingdom Covenant Ministries International.",
  path: "/services",
});

export default async function ServicesPage() {
  const intro = getServicesPageIntro();
  const offerings = getServiceOfferings();
  const hqTimes = await getServiceTimes();

  return (
    <PageShell eyebrow="Gather & grow" title="Services at KCMI" description={intro}>
      <div className="mb-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <h2 className="font-display text-2xl font-semibold">Headquarters worship times</h2>
        <p className="text-readable-sm mt-2 text-[var(--color-text-muted)]">
          Published Headquarters worship times in Port Harcourt.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {hqTimes.map((t) => (
            <li
              key={`${t.day}-${t.time}`}
              className="rounded-[var(--radius-md)] bg-[var(--color-surface-page)] px-4 py-4"
            >
              <p className="text-readable-sm text-[var(--color-text-muted)]">{t.day}</p>
              <p className="font-display text-2xl font-semibold text-[var(--color-action-primary)]">
                {t.time}
              </p>
            </li>
          ))}
        </ul>
        <Link
          href="/locations"
          className="mt-4 inline-flex min-h-11 items-center text-readable-sm font-semibold text-[var(--color-action-primary)]"
        >
          See all branch schedules
        </Link>
      </div>

      <ul className="grid gap-6 lg:grid-cols-2">
        {offerings.map((item) => (
          <li
            key={item.id}
            className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6"
          >
            <h2 className="font-display text-2xl font-semibold">{item.title}</h2>
            <p className="text-readable mt-3 text-[var(--color-text-muted)]">{item.body}</p>
            {item.times ? (
              <ul className="mt-4 space-y-1 text-readable-sm font-semibold text-[var(--color-action-primary)]">
                {item.times.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            ) : null}
            {item.cta ? (
              <a
                href={item.cta.href}
                className="mt-5 inline-flex min-h-11 items-center text-readable-sm font-semibold text-[var(--color-action-primary)]"
                {...(item.cta.external
                  ? { rel: "noopener noreferrer", target: "_blank" }
                  : {})}
              >
                {item.cta.label}
              </a>
            ) : null}
            {item.links ? (
              <ul className="mt-5 space-y-2">
                {item.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        href={link.href}
                        className="text-readable-sm font-medium text-[var(--color-text-body)] hover:text-[var(--color-action-primary)]"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-readable-sm font-medium text-[var(--color-text-body)] hover:text-[var(--color-action-primary)]"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
