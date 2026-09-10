import type { ReactNode } from "react";

export function HubHelpDetails({
  summary,
  children,
}: {
  summary: string;
  children: ReactNode;
}) {
  return (
    <details className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-page)] px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-[var(--color-action-primary)]">
        {summary}
      </summary>
      <div className="mt-3 text-sm text-[var(--color-text-muted)]">{children}</div>
    </details>
  );
}
