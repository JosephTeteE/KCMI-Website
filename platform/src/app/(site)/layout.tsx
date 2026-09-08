import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import {
  getChurchIdentity,
  getHeaderCta,
  getPrimaryNavigation,
} from "@/content";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = getChurchIdentity();
  const nav = getPrimaryNavigation();
  const cta = getHeaderCta();

  return (
    <>
      <SkipLink />
      <SiteHeader
        brandName={identity.legalName}
        shortName={identity.shortName}
        items={nav}
        cta={cta}
      />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </>
  );
}
