"use client";

import { useState } from "react";

export function CopyAccountNumber({
  value,
  label = "Copy account number",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="mt-2 inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
