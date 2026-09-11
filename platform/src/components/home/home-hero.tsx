import Image from "next/image";
import Link from "next/link";
import type { HomePublicContent, ServiceTime } from "@/content/types";

type Props = {
  home: HomePublicContent;
  times?: ServiceTime[];
  locationLabel?: string;
  isLive?: boolean;
};

export function HomeHero({
  home,
  times = [],
  locationLabel,
  isLive = false,
}: Props) {
  const visibleTimes = times.filter(
    (item) => item.day.trim() && item.time.trim(),
  );

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
              className="ui-cta inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-md)] border border-white/40 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm"
            >
              {isLive ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--kcmi-red)_85%,black)] px-2 py-0.5 text-[0.65rem] font-bold tracking-wide uppercase"
                  aria-label="Live now"
                >
                  <span
                    className="size-1.5 rounded-full bg-white"
                    aria-hidden
                  />
                  Live
                </span>
              ) : null}
              {home.heroSecondaryCtaLabel}
            </Link>
          </div>

          {visibleTimes.length > 0 ? (
            <div
              id="worship"
              className="mt-2 max-w-xl border-t border-white/20 pt-5"
            >
              <p className="text-sm font-semibold tracking-[0.14em] text-white/75 uppercase">
                Headquarters
                {locationLabel ? ` · ${locationLabel}` : ""}
              </p>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {visibleTimes.map((item) => (
                  <li
                    key={`${item.day}-${item.time}`}
                    className="text-base text-white/90"
                  >
                    <span className="text-white/70">{item.day}</span>{" "}
                    <span className="font-semibold">{item.time}</span>
                    {item.note ? (
                      <span className="text-white/65"> · {item.note}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div id="worship" className="sr-only">
              Plan a visit
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
