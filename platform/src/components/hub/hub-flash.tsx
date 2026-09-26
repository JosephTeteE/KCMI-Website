type HubFlashProps = {
  message?: string;
  error?: string;
  viewHref?: string;
};

/** Only in-site program links may be rendered from a query param. */
export function safeProgramViewHref(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;
  if (!/^\/programs\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return undefined;
  return value;
}

export function HubFlash({ message, error, viewHref }: HubFlashProps) {
  if (!message && !error) return null;
  const view = safeProgramViewHref(viewHref);

  return (
    <div className="mb-6 space-y-3" role="status" aria-live="polite">
      {message ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--color-success)] bg-[var(--color-success-bg)] px-4 py-3 text-sm text-[var(--color-success)]">
          {message}
          {view ? (
            <>
              {" "}
              <a className="font-semibold underline" href={view}>
                View on website
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      {error ? (
        <p
          className="rounded-[var(--radius-md)] border border-[var(--color-destructive)] bg-[color-mix(in_srgb,var(--color-destructive)_12%,white)] px-4 py-3 text-sm text-[var(--color-destructive)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
