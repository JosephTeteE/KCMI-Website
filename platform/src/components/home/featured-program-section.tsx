import Link from "next/link";
import { ProgramFlyerMedia } from "@/components/content/program-flyer-media";
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
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <ProgramFlyerMedia
              src={program.imageSrc}
              alt={program.imageAlt || ""}
              variant="spotlight"
              sizes="(max-width: 1024px) 100vw, 48vw"
              className="rounded-none bg-[color-mix(in_srgb,var(--kcmi-lavender)_30%,var(--kcmi-violet))]"
            />

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
