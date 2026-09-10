import Image from "next/image";
import type { HomePublicContent } from "@/content/types";

type Props = {
  home: HomePublicContent;
  legalName: string;
  alternateName: string;
};

export function WelcomeSection({ home, legalName, alternateName }: Props) {
  return (
    <section
      id="welcome"
      aria-labelledby="welcome-heading"
      className="section-space-lg bg-[var(--color-surface-tint)]"
    >
      <div className="site-container grid items-center gap-10 lg:grid-cols-2">
        <div className="relative aspect-[1200/797] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)]">
          <Image
            src={home.welcomeImage.src}
            alt={home.welcomeImage.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide text-[var(--color-action-primary)] uppercase">
            {home.welcomeEyebrow}
          </p>
          <h2
            id="welcome-heading"
            className="font-display mt-3 text-3xl font-semibold text-balance sm:text-4xl"
          >
            {home.welcomeHeading}
          </h2>
          <p className="mt-5 text-readable text-[var(--color-text-muted)]">
            {home.welcomeBody}
          </p>
          <p className="mt-4 text-readable-sm text-[var(--color-text-muted)]">
            {legalName} is also known as {alternateName}.
          </p>
        </div>
      </div>
    </section>
  );
}
