"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSafeHubHistoryReferrer } from "@/lib/auth/confirm-redirect";

type Props = {
  fallbackHref: string;
  label?: string;
};

/**
 * Volunteer-friendly Back control: returns to the immediate prior Hub page when
 * history/referrer is same-origin /admin; otherwise uses a deterministic parent.
 * Never follows an external referrer.
 */
export function HubBackLink({ fallbackHref, label = "Back" }: Props) {
  const router = useRouter();

  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }
    event.preventDefault();

    if (typeof window === "undefined") {
      router.push(fallbackHref);
      return;
    }

    const referrer = document.referrer;
    if (
      referrer &&
      isSafeHubHistoryReferrer(referrer, window.location.origin) &&
      window.history.length > 1
    ) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <Link
      href={fallbackHref}
      onClick={onClick}
      className="inline-flex min-h-11 items-center text-base font-medium text-[var(--color-action-primary)] underline-offset-2 hover:underline"
      data-testid="hub-back-link"
    >
      ← {label}
    </Link>
  );
}
