import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const controlClass =
  "mt-2 w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-base text-[var(--color-text-body)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]";

const labelClass = "block text-sm font-medium text-[var(--color-text-body)]";

const hintClass = "mt-1.5 text-sm text-[var(--color-text-muted)]";

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
};

export function HubTextField({
  id,
  label,
  hint,
  required,
  ...inputProps
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? <span className="text-[var(--color-destructive)]"> *</span> : null}
      </label>
      <input
        id={id}
        name={id}
        required={required}
        className={controlClass}
        {...inputProps}
      />
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </div>
  );
}

export function HubTextAreaField({
  id,
  label,
  hint,
  required,
  rows = 4,
  ...textareaProps
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? <span className="text-[var(--color-destructive)]"> *</span> : null}
      </label>
      <textarea
        id={id}
        name={id}
        required={required}
        rows={rows}
        className={`${controlClass} min-h-28`}
        {...textareaProps}
      />
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </div>
  );
}

export function HubSelectField({
  id,
  label,
  hint,
  required,
  children,
  ...selectProps
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? <span className="text-[var(--color-destructive)]"> *</span> : null}
      </label>
      <select
        id={id}
        name={id}
        required={required}
        className={controlClass}
        {...selectProps}
      >
        {children}
      </select>
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </div>
  );
}

export function HubCheckboxField({
  id,
  label,
  hint,
  defaultChecked,
  ...inputProps
}: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <div>
      <label
        htmlFor={id}
        className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-[var(--color-text-body)]"
      >
        <input
          id={id}
          name={id}
          type="checkbox"
          defaultChecked={defaultChecked}
          className="size-5 rounded border-[var(--color-border)] text-[var(--color-action-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
          {...inputProps}
        />
        {label}
      </label>
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </div>
  );
}

export function HubFileField({
  id,
  label,
  hint,
  required,
  accept,
}: FieldProps & { accept?: string }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? <span className="text-[var(--color-destructive)]"> *</span> : null}
      </label>
      <input
        id={id}
        name={id}
        type="file"
        required={required}
        accept={accept}
        className={`${controlClass} file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-surface-tint)] file:px-3 file:py-1.5 file:text-sm file:font-medium`}
      />
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </div>
  );
}

export function HubSubmitButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "quiet";
}) {
  const styles =
    variant === "primary"
      ? "bg-[var(--color-action-primary)] text-[var(--color-action-primary-fg)]"
      : variant === "secondary"
        ? "bg-[var(--color-action-secondary)] text-[var(--color-action-secondary-fg)]"
        : variant === "danger"
          ? "bg-[var(--color-destructive)] text-[var(--color-destructive-fg)]"
          : "border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-body)]";

  return (
    <button
      type="submit"
      className={`inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-5 text-sm font-semibold ${styles}`}
    >
      {children}
    </button>
  );
}

export function HubStatusBadge({ status }: { status: string }) {
  const tone =
    status === "published"
      ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
      : status === "preview"
        ? "bg-[var(--color-warning-bg)] text-[var(--color-warning)]"
        : status === "archived"
          ? "bg-[var(--color-surface-tint)] text-[var(--color-text-muted)]"
          : "bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)]";

  const label =
    status === "preview"
      ? "Ready for preview"
      : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold tracking-wide ${tone}`}
    >
      {label}
    </span>
  );
}
