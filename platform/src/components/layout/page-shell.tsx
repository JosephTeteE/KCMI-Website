import type { ReactNode } from "react";

type ContentWidth = "readable" | "full";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  /**
   * readable — constrain body for sparse/single-column pages on large desktops.
   * full — use the full site container (locations, multi-column grids).
   */
  contentWidth?: ContentWidth;
};

export function PageHero({ eyebrow, title, description }: Omit<Props, "children" | "contentWidth">) {
  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <div className="site-container page-masthead">
        <div className="stack-heading max-w-3xl">
          {eyebrow ? (
            <p className="text-readable-sm font-semibold tracking-wide text-[var(--color-action-primary)] uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="font-display text-3xl font-semibold text-balance sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="text-readable max-w-2xl text-[var(--color-text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function PageShell({
  eyebrow,
  title,
  description,
  children,
  contentWidth = "readable",
}: Props) {
  const bodyClass =
    contentWidth === "full"
      ? "site-container section-space"
      : "page-shell-readable section-space";

  return (
    <main id="main-content">
      <PageHero eyebrow={eyebrow} title={title} description={description} />
      <div className={bodyClass}>{children}</div>
    </main>
  );
}
