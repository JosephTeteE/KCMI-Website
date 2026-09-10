"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";
import {
  HUB_TOUR_REPLAY_EVENT,
  HUB_TOUR_STEPS,
  isHubTourComplete,
  markHubTourComplete,
  resetHubTour,
} from "@/lib/hub/tour";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

export function HubTour() {
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const complete = hydrated && (dismissed || isHubTourComplete(storage()));
  const promptOpen = hydrated && !complete && !active && !dismissed;

  useEffect(() => {
    function onReplay() {
      const next = storage();
      if (next) resetHubTour(next);
      setDismissed(false);
      setStep(0);
      setActive(true);
    }
    window.addEventListener(HUB_TOUR_REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(HUB_TOUR_REPLAY_EVENT, onReplay);
  }, []);

  useEffect(() => {
    if (!active && !promptOpen) return;
    const node = dialogRef.current?.querySelector<HTMLElement>("button");
    node?.focus();
  }, [active, promptOpen, step]);

  function completeAndClose() {
    const store = storage();
    if (store) markHubTourComplete(store);
    setDismissed(true);
    setActive(false);
    setStep(0);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      completeAndClose();
    }
  }

  if (dismissed || (!promptOpen && !active)) return null;

  const current = HUB_TOUR_STEPS[step];
  const last = step === HUB_TOUR_STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_srgb,black_45%,transparent)] p-4 sm:items-center"
      onKeyDown={onKeyDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-[var(--shadow-soft)]"
      >
        {promptOpen ? (
          <>
            <h2 id={titleId} className="text-xl font-semibold">
              Welcome to the KCMI Hub
            </h2>
            <p id={bodyId} className="mt-3 text-sm text-[var(--color-text-muted)]">
              Would you like a short tour? You can skip it and replay it later
              from Help & Tutorial.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-sm font-semibold text-[var(--color-action-primary-fg)]"
                onClick={() => {
                  setActive(true);
                  setStep(0);
                }}
              >
                {HUB_ACTION_LABELS.startTour}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-5 text-sm font-semibold underline-offset-2 hover:underline"
                onClick={completeAndClose}
              >
                {HUB_ACTION_LABELS.skipTour}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Step {step + 1} of {HUB_TOUR_STEPS.length}
            </p>
            <h2 id={titleId} className="mt-2 text-xl font-semibold">
              {current.title}
            </h2>
            <p id={bodyId} className="mt-3 text-sm text-[var(--color-text-muted)]">
              {current.body}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-5 text-sm font-semibold underline-offset-2 hover:underline"
                onClick={completeAndClose}
              >
                {HUB_ACTION_LABELS.skipTour}
              </button>
              {step > 0 ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-5 text-sm font-semibold"
                  onClick={() => setStep((value) => Math.max(0, value - 1))}
                >
                  {HUB_ACTION_LABELS.backTour}
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-sm font-semibold text-[var(--color-action-primary-fg)]"
                onClick={() => {
                  if (last) {
                    completeAndClose();
                    return;
                  }
                  setStep((value) => value + 1);
                }}
              >
                {last ? HUB_ACTION_LABELS.finishTour : HUB_ACTION_LABELS.nextTour}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function replayHubTour(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(HUB_TOUR_REPLAY_EVENT));
}
