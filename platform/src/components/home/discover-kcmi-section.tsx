import Image from "next/image";
import Link from "next/link";
import type { HomePublicContent, PublicMediaRef, ServiceOffering } from "@/content/types";
import { FALLBACK_PORTRAIT } from "@/content/website/public-map";

type Props = {
  home: HomePublicContent;
  offerings: ServiceOffering[];
  aboutHref?: string;
};

function pathwayLink(
  href: string,
  label: string,
  external?: boolean,
) {
  if (external) {
    return (
      <a
        href={href}
        className="ui-cta inline-flex min-h-11 items-center text-sm font-semibold text-white underline-offset-4 hover:underline"
        rel="noopener noreferrer"
        target="_blank"
      >
        {label}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="ui-cta inline-flex min-h-11 items-center text-sm font-semibold text-white underline-offset-4 hover:underline"
    >
      {label}
    </Link>
  );
}

/**
 * Distinct verified KCMI pathway visuals (no third-party stock).
 * Hub-managed welcome + hero images are reused where already supported;
 * About uses the verified leadership portrait rather than repeating one photo.
 */
function pathwayImage(
  id: "cell" | "teams" | "about",
  home: HomePublicContent,
): PublicMediaRef {
  if (id === "cell") return home.welcomeImage;
  if (id === "teams") return home.heroImage;
  return FALLBACK_PORTRAIT;
}

export function DiscoverKcmiSection({
  home,
  offerings,
  aboutHref = "/about",
}: Props) {
  const cell =
    offerings.find((item) => item.id === "cell-fellowships") ??
    offerings.find((item) => /cell/i.test(item.title));
  const teams =
    offerings.find((item) => item.id === "service-teams") ??
    offerings.find((item) => /team/i.test(item.title));

  const pathways = [
    cell
      ? {
          id: "cell" as const,
          title: cell.title,
          body: cell.body,
          ctaLabel: cell.cta?.label ?? "Learn more",
          href: cell.cta?.href ?? "/services",
          external: cell.cta?.external,
          tone: "from-[color-mix(in_srgb,var(--kcmi-violet)_75%,black)]",
        }
      : null,
    teams
      ? {
          id: "teams" as const,
          title: teams.title,
          body: teams.body,
          ctaLabel: teams.cta?.label ?? "Learn more",
          href: teams.cta?.href ?? "/services",
          external: teams.cta?.external,
          tone: "from-[color-mix(in_srgb,var(--kcmi-red)_70%,black)]",
        }
      : null,
    {
      id: "about" as const,
      title: "About KCMI",
      body: home.welcomeBody,
      ctaLabel: "About KCMI",
      href: aboutHref,
      external: false,
      tone: "from-[color-mix(in_srgb,var(--neutral-950)_80%,var(--kcmi-violet))]",
    },
  ].filter(Boolean) as {
    id: "cell" | "teams" | "about";
    title: string;
    body: string;
    ctaLabel: string;
    href: string;
    external?: boolean;
    tone: string;
  }[];

  return (
    <section
      id="welcome"
      aria-labelledby="discover-heading"
      className="section-space-lg"
      data-qa-section="discover-kcmi"
    >
      <div className="site-container-editorial">
        <div className="motion-fade-up max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.16em] text-[var(--color-action-primary)] uppercase">
            {home.welcomeEyebrow}
          </p>
          <h2
            id="discover-heading"
            className="font-display mt-3 text-3xl font-semibold text-balance sm:text-4xl"
          >
            {home.welcomeHeading}
          </h2>
        </div>

        <ul className="discover-pathway-grid mt-10 grid gap-4 lg:grid-cols-3">
          {pathways.map((pathway) => {
            const media = pathwayImage(pathway.id, home);
            return (
              <li key={pathway.id} className="motion-fade-up min-w-0">
                <article
                  data-discover-pathway={pathway.id}
                  className="discover-pathway-card relative flex min-h-[22rem] overflow-hidden rounded-[var(--radius-lg)] text-white"
                >
                  <div className="absolute inset-0">
                      <Image
                        src={media.src}
                        alt=""
                        fill
                        sizes="(max-width: 1024px) 100vw, (min-width: 1920px) 30vw, 33vw"
                        className="object-cover"
                        style={{
                          objectPosition:
                            pathway.id === "cell"
                              ? "30% center"
                              : pathway.id === "teams"
                                ? "55% center"
                                : "50% 20%",
                        }}
                      />
                    <div
                      className={`absolute inset-0 bg-gradient-to-t ${pathway.tone} via-[color-mix(in_srgb,black_45%,transparent)] to-[color-mix(in_srgb,black_20%,transparent)]`}
                      aria-hidden
                    />
                  </div>
                  <div className="relative mt-auto flex flex-col gap-3 p-6 sm:p-7">
                    <h3 className="font-display text-2xl font-semibold text-balance">
                      {pathway.title}
                    </h3>
                    <p className="max-w-prose text-sm text-pretty text-white/90">
                      {pathway.body}
                    </p>
                    {pathwayLink(pathway.href, pathway.ctaLabel, pathway.external)}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
