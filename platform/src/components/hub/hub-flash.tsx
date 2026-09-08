type HubFlashProps = {
  message?: string;
  error?: string;
};

export function HubFlash({ message, error }: HubFlashProps) {
  if (!message && !error) return null;

  return (
    <div className="mb-6 space-y-3" role="status" aria-live="polite">
      {message ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--color-success)] bg-[var(--color-success-bg)] px-4 py-3 text-sm text-[var(--color-success)]">
          {message}
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
