import Link from "next/link";

type HubPageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function HubPageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = "Back",
}: HubPageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--color-action-primary)] underline-offset-2 hover:underline"
          >
            ← {backLabel}
          </Link>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-body)] sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-base text-[var(--color-text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </header>
  );
}
