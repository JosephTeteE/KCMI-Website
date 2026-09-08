export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-[var(--radius-md)] focus:bg-[var(--color-action-primary)] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-[var(--color-action-primary-fg)]"
    >
      Skip to main content
    </a>
  );
}
