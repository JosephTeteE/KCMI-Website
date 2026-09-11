"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { isPublicFeaturedProgram } from "@/content/featured-program";
import type { FeaturedProgram } from "@/content/types";
import { validateSocialUrl } from "@/lib/cms/social-url";
import {
  markSpotlightSeen,
  shouldShowSpotlightTakeover,
  spotlightStorageKey,
  type SpotlightFrequency,
} from "@/lib/home/spotlight-takeover";

type Props = {
  program: FeaturedProgram | null;
  promoVideoUrl?: string | null;
  frequency?: SpotlightFrequency;
  enabled?: boolean;
  windowStart?: string | null;
  windowEnd?: string | null;
};

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.getAttribute("aria-hidden") !== "true" &&
      el.tabIndex !== -1,
  );
}

function storageFor(frequency: SpotlightFrequency): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return frequency === "once_per_session"
      ? window.sessionStorage
      : window.localStorage;
  } catch {
    return null;
  }
}

export function ProgramSpotlightTakeover({
  program,
  promoVideoUrl = null,
  frequency = "once_per_browser",
  enabled = true,
  windowStart = null,
  windowEnd = null,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [forcedClosed, setForcedClosed] = useState(false);

  const validatedPromo = promoVideoUrl
    ? validateSocialUrl(promoVideoUrl)
    : null;
  const safePromoUrl =
    validatedPromo?.ok &&
    /youtube\.com|youtu\.be|facebook\.com|fb\.watch/i.test(
      new URL(validatedPromo.url).hostname,
    )
      ? validatedPromo.url
      : null;

  const dismiss = useCallback(() => {
    if (!program) return;
    markSpotlightSeen(
      storageFor(frequency),
      spotlightStorageKey(program.id, frequency),
    );
    setForcedClosed(true);
    dialogRef.current?.close();
    previouslyFocused.current?.focus?.();
  }, [frequency, program]);

  const open =
    !forcedClosed &&
    isPublicFeaturedProgram(program) &&
    shouldShowSpotlightTakeover({
      enabled,
      programId: program.id,
      frequency,
      windowStart,
      windowEnd,
      storage: storageFor(frequency),
    });

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = dialogRef.current;
    if (!node) return;
    if (!node.open) node.showModal();
    queueMicrotask(() => closeRef.current?.focus());

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const focusable = getFocusable(node);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    node.addEventListener("keydown", onKeyDown);
    return () => node.removeEventListener("keydown", onKeyDown);
  }, [dismiss, open]);

  if (!isPublicFeaturedProgram(program) || !open) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="fixed inset-0 z-[80] m-auto max-h-[min(92vh,40rem)] w-[min(92vw,42rem)] overflow-hidden rounded-[var(--radius-lg)] border-0 bg-[var(--color-surface-page)] p-0 text-[var(--color-text-body)] shadow-[var(--shadow-soft)] open:flex open:flex-col backdrop:bg-black/60"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClose={dismiss}
    >
      <div className="relative min-h-48 bg-[var(--color-surface-brand)] sm:min-h-56">
        {program.imageSrc ? (
          <Image
            src={program.imageSrc}
            alt={program.imageAlt || ""}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 92vw, 42rem"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-[var(--kcmi-violet)] to-[var(--kcmi-red)]"
            aria-hidden
          />
        )}
        <button
          ref={closeRef}
          type="button"
          onClick={dismiss}
          className="absolute top-3 right-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/55 text-sm font-semibold text-white"
          aria-label="Dismiss spotlight"
        >
          Close
        </button>
      </div>

      <div className="motion-fade-up space-y-4 px-6 py-6 sm:px-8">
        <p className="text-sm font-semibold tracking-[0.16em] text-[var(--color-action-primary)] uppercase">
          KCMI Spotlight
        </p>
        <h2 id={titleId} className="font-display text-2xl font-semibold sm:text-3xl">
          {program.title}
        </h2>
        {program.datesLabel ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            {program.datesLabel}
          </p>
        ) : null}
        <p id={descriptionId} className="text-readable text-[var(--color-text-muted)]">
          {program.shortDescription}
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href={program.ctaHref}
            className="ui-cta inline-flex min-h-12 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-sm font-semibold text-[var(--color-action-primary-fg)]"
            onClick={dismiss}
          >
            {program.ctaLabel}
          </Link>
          {safePromoUrl ? (
            <a
              href={safePromoUrl}
              className="ui-cta inline-flex min-h-12 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-5 text-sm font-semibold text-[var(--color-text-body)]"
              rel="noopener noreferrer"
              target="_blank"
            >
              Watch promo
            </a>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
