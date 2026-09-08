import Image from "next/image";
import type { ChurchIdentity } from "@/content/types";

type Props = {
  identity: ChurchIdentity;
};

export function WelcomeSection({ identity }: Props) {
  return (
    <section
      id="welcome"
      aria-labelledby="welcome-heading"
      className="section-space bg-[var(--color-surface-tint)]"
    >
      <div className="site-container grid items-center gap-10 lg:grid-cols-2">
        <div className="relative aspect-[1200/797] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)]">
          <Image
            src="/media/home/church-view.webp"
            alt="Congregation gathered for worship at Kingdom Covenant Ministries International"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide text-[var(--color-action-primary)] uppercase">
            Welcome
          </p>
          <h2
            id="welcome-heading"
            className="font-display mt-3 text-3xl font-semibold text-balance sm:text-4xl"
          >
            {identity.visionTagline}
          </h2>
          <p className="mt-5 text-readable text-[var(--color-text-muted)]">
            {identity.discoverBlurb}
          </p>
          <p className="mt-4 text-readable-sm text-[var(--color-text-muted)]">
            {identity.legalName} is also known as {identity.alternateName}.
          </p>
        </div>
      </div>
    </section>
  );
}
