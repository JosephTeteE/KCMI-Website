import Image from "next/image";
import Link from "next/link";
import type { HomePublicContent } from "@/content/types";

type Props = {
  home: HomePublicContent;
};

export function HomeHero({ home }: Props) {
  return (
    <section
      aria-labelledby="home-hero-heading"
      className="relative isolate overflow-hidden bg-[var(--neutral-950)] text-[var(--color-text-on-brand)]"
    >
      <div className="absolute inset-0">
        <Image
          src={home.heroImage.src}
          alt={home.heroImage.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-70"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[color-mix(in_srgb,var(--kcmi-violet)_88%,black)] via-[color-mix(in_srgb,var(--kcmi-violet)_55%,transparent)] to-[color-mix(in_srgb,var(--kcmi-red)_35%,transparent)]"
          aria-hidden
        />
      </div>

      <div className="site-container relative grid min-h-[min(88vh,44rem)] items-end pb-14 pt-28 sm:pb-20 sm:pt-32">
        <div className="motion-fade-up max-w-3xl space-y-6">
          <p className="text-sm font-semibold tracking-[0.18em] text-[color-mix(in_srgb,white_82%,var(--kcmi-lavender))] uppercase">
            {home.heroKicker}
          </p>
          <h1
            id="home-hero-heading"
            className="font-display text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl lg:text-6xl"
          >
            {home.heroHeadline}
          </h1>
          <p className="text-lead max-w-2xl text-pretty text-white/90">
            {home.heroSupporting}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={home.heroPrimaryCtaHref}
              className="ui-cta inline-flex min-h-12 items-center rounded-[var(--radius-md)] bg-[var(--color-action-secondary)] px-5 text-sm font-semibold text-[var(--color-action-secondary-fg)]"
            >
              {home.heroPrimaryCtaLabel}
            </Link>
            <Link
              href={home.heroSecondaryCtaHref}
              className="ui-cta inline-flex min-h-12 items-center rounded-[var(--radius-md)] border border-white/40 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm"
            >
              {home.heroSecondaryCtaLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
