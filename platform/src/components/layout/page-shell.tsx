import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function PageHero({ eyebrow, title, description }: Omit<Props, "children">) {
  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <div className="site-container section-space !pb-10 !pt-12">
        {eyebrow ? (
          <p className="text-readable-sm font-semibold tracking-wide text-[var(--color-action-primary)] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display mt-3 max-w-3xl text-4xl font-semibold text-balance sm:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="text-readable mt-5 max-w-2xl text-[var(--color-text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
    </header>
  );
}

export function PageShell({ eyebrow, title, description, children }: Props) {
  return (
    <main id="main-content">
      <PageHero eyebrow={eyebrow} title={title} description={description} />
      <div className="site-container section-space">{children}</div>
    </main>
  );
}
