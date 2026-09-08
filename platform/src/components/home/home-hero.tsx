import Image from "next/image";
import Link from "next/link";
import type { ChurchIdentity } from "@/content/types";

type Props = {
  identity: ChurchIdentity;
  liveHref: string;
};

export function HomeHero({ identity, liveHref }: Props) {
  return (
    <section
      aria-labelledby="home-hero-heading"
      className="relative isolate overflow-hidden bg-[var(--neutral-950)] text-[var(--color-text-on-brand)]"
    >
      <div className="absolute inset-0">
        <Image
          src="/media/hero/welcome-1920.webp"
          alt=""
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
            {identity.shortName} · {identity.alternateName}
          </p>
          <h1
            id="home-hero-heading"
            className="font-display text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl lg:text-6xl"
          >
            {identity.legalName}
          </h1>
          <p className="text-lead max-w-2xl text-pretty text-white/90">
            {identity.heroSupporting}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="#worship"
              className="inline-flex min-h-12 items-center rounded-[var(--radius-md)] bg-[var(--color-action-secondary)] px-5 text-sm font-semibold text-[var(--color-action-secondary-fg)]"
            >
              Plan a visit
            </Link>
            <Link
              href={liveHref}
              className="inline-flex min-h-12 items-center rounded-[var(--radius-md)] border border-white/40 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm"
            >
              Watch Live
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
