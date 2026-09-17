import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import {
  getChurchIdentity,
  getHeaderCta,
  getPrimaryNavigation,
} from "@/content";

export default function NotFound() {
  const identity = getChurchIdentity();
  const nav = getPrimaryNavigation();
  const cta = getHeaderCta();

  const actions = [
    { href: "/", label: "Home" },
    { href: "/locations", label: "Locations" },
    { href: "/contact", label: "Contact Us" },
  ] as const;

  return (
    <>
      <SkipLink />
      <SiteHeader
        brandName={identity.legalName}
        shortName={identity.shortName}
        items={nav}
        cta={cta}
      />
      <main id="main-content" className="flex flex-1 flex-col">
        <div className="site-container flex flex-1 flex-col justify-center py-16 sm:py-24">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-readable-sm font-semibold tracking-wide text-[var(--color-action-primary)] uppercase">
              {identity.shortName}
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-balance sm:text-4xl">
              Page not found
            </h1>
            <p className="text-readable mt-4 text-[var(--color-text-muted)]">
              The page may have moved or the link may be incorrect.
            </p>
            <ul className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
              {actions.map((action) => (
                <li key={action.href}>
                  <Link
                    href={action.href}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-base font-semibold text-[var(--color-text-body)] transition-colors hover:border-[var(--color-action-primary)] hover:text-[var(--color-action-primary)] sm:w-auto"
                  >
                    {action.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
