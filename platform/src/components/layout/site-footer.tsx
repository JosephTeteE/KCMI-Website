import Image from "next/image";
import Link from "next/link";
import {
  getChurchIdentity,
  getDailyFaithRecharge,
  getFooterLegalNavigation,
  getFooterNavigation,
  getSocialLinks,
} from "@/content";
import { SocialPlatformIcon } from "@/components/layout/social-platform-icon";

export function SiteFooter() {
  const identity = getChurchIdentity();
  const nav = getFooterNavigation();
  const legalNav = getFooterLegalNavigation();
  const social = getSocialLinks();
  const faith = getDailyFaithRecharge();
  const copyrightYear = new Date().getFullYear();

  return (
    <footer className="site-footer mt-auto">
      <div className="site-footer-accent" aria-hidden />

      <div className="site-container site-footer-main">
        <div className="site-footer-brand min-w-0">
          <div className="site-footer-lockup">
            <Image
              src="/brand/kcmi-logo.webp"
              alt=""
              width={40}
              height={40}
              className="site-footer-logo"
            />
            <div className="min-w-0">
              <p className="font-display text-xl font-semibold tracking-tight text-[var(--color-action-primary)]">
                {identity.shortName}
              </p>
              <p className="text-readable-sm text-[var(--color-text-muted)]">
                {identity.alternateName}
              </p>
              <p className="site-footer-tagline text-readable-sm text-[var(--color-text-muted)]">
                {identity.visionTagline}
              </p>
            </div>
          </div>
        </div>

        <nav
          className="site-footer-explore min-w-0"
          aria-labelledby="footer-explore-heading"
        >
          <h2 id="footer-explore-heading" className="site-footer-heading">
            Explore
          </h2>
          <ul className="site-footer-explore-list">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="site-footer-link">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-footer-contact min-w-0">
          <h2 className="site-footer-heading">Contact</h2>
          <p className="site-footer-contact-list">
            <Link href="/contact" className="site-footer-link site-footer-link-strong">
              Contact KCMI
            </Link>
          </p>
        </div>
      </div>

      <div className="site-footer-connect">
        <div className="site-container site-footer-invite">
          <div className="site-footer-dfr min-w-0">
            <h2 className="site-footer-heading">{faith.heading}</h2>
            <p className="site-footer-dfr-body text-readable-sm text-[var(--color-text-muted)]">
              {faith.body}
            </p>
          </div>
          <div className="site-footer-invite-actions min-w-0">
            <a
              href={faith.spotify.href}
              className="site-footer-link site-footer-link-strong"
              rel="noopener noreferrer"
              target="_blank"
            >
              {faith.spotify.label}
            </a>
          </div>
          <ul className="site-footer-social">
            {social.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="site-footer-social-link"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <SocialPlatformIcon label={item.label} />
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="site-footer-legal">
        <div className="site-container site-footer-legal-inner">
          <p className="site-footer-legal-line">
            © {copyrightYear} {identity.legalName} · {identity.alternateName}
          </p>
          <nav className="site-footer-legal-nav" aria-label="Legal">
            {legalNav.map((item, index) => (
              <span key={item.href} className="site-footer-legal-item">
                {index > 0 ? (
                  <span className="site-footer-legal-sep" aria-hidden>
                    ·
                  </span>
                ) : null}
                <Link href={item.href} className="site-footer-legal-link">
                  {item.label}
                </Link>
              </span>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
