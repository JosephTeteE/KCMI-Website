import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import {
  getHeadquartersLocationLabel,
  getServiceOfferings,
  getServicesPageIntro,
  getServiceTimes,
} from "@/content";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Services",
  description:
    "Worship times, cell fellowships, service teams, sermons, and care request forms at Kingdom Covenant Ministries International.",
  path: "/services",
});

export default async function ServicesPage() {
  const intro = await getServicesPageIntro();
  const offerings = await getServiceOfferings();
  const hqTimes = await getServiceTimes();
  const hqLabel = await getHeadquartersLocationLabel();
  const ministries = offerings.filter((item) => item.kind !== "care" && item.kind !== "media");
  const media = offerings.filter((item) => item.kind === "media");
  const care = offerings.filter((item) => item.kind === "care");

  return (
    <PageShell eyebrow="Gather" title="Services at KCMI" description={intro}>
      <div className="card-pad mb-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <h2 className="font-display text-2xl font-semibold">Headquarters worship times</h2>
        <p className="text-readable-sm mt-2 text-[var(--color-text-muted)]">
          Published Headquarters worship times in {hqLabel}.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {hqTimes.map((time) => (
            <li
              key={`${time.day}-${time.time}`}
              className="rounded-[var(--radius-md)] bg-[var(--color-surface-page)] px-4 py-4"
            >
              <p className="text-readable-sm text-[var(--color-text-muted)]">{time.day}</p>
              <p className="font-display text-2xl font-semibold text-[var(--color-action-primary)]">
                {time.time}
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

      <section aria-labelledby="ministries-heading" className="mb-8">
        <h2 id="ministries-heading" className="font-display text-2xl font-semibold">
          Ministries
        </h2>
        <ul className="mt-6 grid gap-6 lg:grid-cols-2">
          {ministries.map((item) => (
            <OfferingCard key={item.id} item={item} />
          ))}
        </ul>
      </section>

      {media.map((item) => (
        <section key={item.id} aria-labelledby={`${item.id}-heading`} className="mb-8">
          <h2 id={`${item.id}-heading`} className="font-display text-2xl font-semibold">
            {item.title}
          </h2>
          <p className="text-readable mt-3 max-w-3xl text-[var(--color-text-muted)]">
            {item.body}
          </p>
          <OfferingLinks item={item} />
        </section>
      ))}

      {care.map((item) => (
        <section key={item.id} aria-labelledby={`${item.id}-heading`}>
          <h2 id={`${item.id}-heading`} className="font-display text-2xl font-semibold">
            {item.title}
          </h2>
          <p className="text-readable mt-3 max-w-3xl text-[var(--color-text-muted)]">
            {item.body}
          </p>
          <OfferingLinks item={item} />
        </section>
      ))}
    </PageShell>
  );
}

function OfferingCard({
  item,
}: {
  item: Awaited<ReturnType<typeof getServiceOfferings>>[number];
}) {
  return (
    <li className="card-pad min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <h3 className="font-display text-2xl font-semibold">{item.title}</h3>
      <p className="text-readable mt-3 text-[var(--color-text-muted)]">{item.body}</p>
      {item.cta ? (
        <a
          href={item.cta.href}
          className="mt-5 inline-flex min-h-11 items-center text-readable-sm font-semibold text-[var(--color-action-primary)]"
          {...(item.cta.external ? { rel: "noopener noreferrer", target: "_blank" } : {})}
        >
          {item.cta.label}
        </a>
      ) : null}
      <OfferingLinks item={item} />
    </li>
  );
}

function OfferingLinks({
  item,
}: {
  item: Awaited<ReturnType<typeof getServiceOfferings>>[number];
}) {
  if (!item.links?.length) return null;
  return (
    <ul className="mt-5 space-y-2">
      {item.links.map((link) => (
        <li key={link.href}>
          {link.external ? (
            <a
              href={link.href}
              className="ui-text-link text-readable-sm"
              rel="noopener noreferrer"
              target="_blank"
            >
              {link.label}
            </a>
          ) : (
            <Link
              href={link.href}
              className="ui-text-link text-readable-sm"
            >
              {link.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
