import Image from "next/image";
import Link from "next/link";
import { isPublicFeaturedProgram } from "@/content/featured-program";
import type { FeaturedProgram } from "@/content/types";

type Props = {
  program: FeaturedProgram | null;
};

export function FeaturedProgramSection({ program }: Props) {
  if (!isPublicFeaturedProgram(program)) {
    return null;
  }

  return (
    <section
      id="programs"
      aria-labelledby="programs-heading"
      className="section-space-lg"
    >
      <div className="site-container-editorial">
        <article className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-brand)] text-[var(--color-text-on-brand)] shadow-[var(--shadow-soft)]">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
            <div className="relative min-h-64 bg-[color-mix(in_srgb,var(--kcmi-lavender)_30%,var(--kcmi-violet))] sm:min-h-80 lg:min-h-[28rem]">
              {program.imageSrc ? (
                <Image
                  src={program.imageSrc}
                  alt={program.imageAlt || ""}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 48vw"
                  priority={false}
                />
              ) : (
                <div
                  className="absolute inset-0 bg-gradient-to-br from-[var(--kcmi-violet)] via-[color-mix(in_srgb,var(--kcmi-red)_45%,var(--kcmi-violet))] to-[var(--kcmi-lavender)]"
                  aria-hidden
                />
              )}
              <div
                className="absolute inset-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--kcmi-violet)_55%,transparent)] to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[color-mix(in_srgb,var(--kcmi-violet)_40%,transparent)]"
                aria-hidden
              />
            </div>

            <div className="motion-fade-up flex flex-col justify-center space-y-5 px-6 py-10 sm:px-10 lg:px-12 lg:py-14">
              <p className="text-sm font-semibold tracking-[0.16em] text-[color-mix(in_srgb,white_75%,var(--kcmi-lavender))] uppercase">
                KCMI Spotlight
              </p>
              <h2
                id="programs-heading"
                className="font-display text-break-safe text-3xl font-semibold text-balance sm:text-4xl lg:text-5xl"
              >
                {program.title}
              </h2>
              {program.datesLabel ? (
                <p className="text-sm font-medium text-white/85">
                  {program.datesLabel}
                </p>
              ) : null}
              <p className="max-w-xl text-pretty text-white/90">
                {program.shortDescription}
              </p>
              <div className="pt-1">
                <Link
                  href={program.ctaHref}
                  className="ui-cta inline-flex min-h-12 max-w-full items-center rounded-[var(--radius-md)] bg-[var(--color-action-secondary)] px-6 text-sm font-semibold text-wrap text-[var(--color-action-secondary-fg)]"
                >
                  {program.ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
