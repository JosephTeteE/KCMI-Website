"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";
import {
  HUB_TOUR_MENU_EVENT,
  HUB_TOUR_REPLAY_EVENT,
  HUB_TOUR_SELECT_CATEGORY_EVENT,
  HUB_TOUR_SELECT_SECTION_EVENT,
  HUB_TOUR_START_CHANGE_EVENT,
  HUB_TOUR_STEPS,
  isHubTourActive,
  isHubTourComplete,
  markHubTourComplete,
  readHubTourStepIndex,
  resetHubTour,
  setHubTourActive,
  writeHubTourStepIndex,
  type HubTourStep,
} from "@/lib/hub/tour";

function localStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function sessionStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
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

function subscribeTourResume(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => onStoreChange();
  window.addEventListener(HUB_TOUR_REPLAY_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(HUB_TOUR_REPLAY_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/** Stable snapshot for useSyncExternalStore (Object.is). */
let tourResumeSnapshot = { active: false, step: 0 };

function readTourResume(): { active: boolean; step: number } {
  const session = sessionStore();
  let next: { active: boolean; step: number };
  if (!session || isHubTourComplete(localStore()) || !isHubTourActive(session)) {
    next = { active: false, step: 0 };
  } else {
    next = { active: true, step: readHubTourStepIndex(session) };
  }
  if (
    tourResumeSnapshot.active === next.active &&
    tourResumeSnapshot.step === next.step
  ) {
    return tourResumeSnapshot;
  }
  tourResumeSnapshot = next;
  return tourResumeSnapshot;
}

type TargetBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function measureTarget(selector: string): TargetBox | null {
  const node = document.querySelector(selector);
  if (!(node instanceof HTMLElement)) return null;
  const rect = node.getBoundingClientRect();
  if (rect.width < 2 && rect.height < 2) return null;
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function bubbleStyle(box: TargetBox | null): CSSProperties {
  if (!box) {
    return {
      position: "fixed",
      left: "50%",
      bottom: "1.25rem",
      transform: "translateX(-50%)",
      width: "min(24rem, calc(100vw - 2rem))",
    };
  }
  const preferredTop = box.top + box.height + 12;
  const maxTop = Math.max(12, window.innerHeight - 280);
  const top = Math.min(preferredTop, maxTop);
  const left = Math.min(
    Math.max(12, box.left),
    Math.max(12, window.innerWidth - 380),
  );
  return {
    position: "fixed",
    top,
    left,
    width: "min(22rem, calc(100vw - 2rem))",
  };
}

function prepareStepUi(step: HubTourStep) {
  if (step.openMobileMenu) {
    window.dispatchEvent(
      new CustomEvent(HUB_TOUR_MENU_EVENT, { detail: { open: true } }),
    );
  }
  if (step.selectHomeSection) {
    window.dispatchEvent(
      new CustomEvent(HUB_TOUR_SELECT_SECTION_EVENT, {
        detail: { section: step.selectHomeSection },
      }),
    );
  }
  if (step.selectHomeCategory) {
    window.dispatchEvent(
      new CustomEvent(HUB_TOUR_SELECT_CATEGORY_EVENT, {
        detail: { category: step.selectHomeCategory },
      }),
    );
  }
  if (step.startChange) {
    window.dispatchEvent(new Event(HUB_TOUR_START_CHANGE_EVENT));
  }
}

export function HubTour() {
  const titleId = useId();
  const bodyId = useId();
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();
  const resume = useSyncExternalStore(
    subscribeTourResume,
    readTourResume,
    () => ({ active: false, step: 0 }),
  );
  const [manualActive, setManualActive] = useState(false);
  const [manualStep, setManualStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [targetBox, setTargetBox] = useState<TargetBox | null>(null);

  const active = !dismissed && (manualActive || resume.active);
  const step = manualActive ? manualStep : resume.step;
  const complete = hydrated && (dismissed || isHubTourComplete(localStore()));
  const promptOpen = hydrated && !complete && !active && !dismissed;

  useEffect(() => {
    function onReplay() {
      const next = localStore();
      const session = sessionStore();
      if (next) resetHubTour(next);
      if (session) {
        resetHubTour(session);
        setHubTourActive(session, true);
        writeHubTourStepIndex(session, 0);
      }
      setDismissed(false);
      setManualStep(0);
      setManualActive(true);
      router.push("/admin");
    }
    window.addEventListener(HUB_TOUR_REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(HUB_TOUR_REPLAY_EVENT, onReplay);
  }, [router]);

  useEffect(() => {
    if (!active) {
      queueMicrotask(() => setTargetBox(null));
      return;
    }
    const current = HUB_TOUR_STEPS[step];
    if (!current) return;
    prepareStepUi(current);
    let cancelled = false;
    let timer = 0;

    const tryMeasure = (attempt: number) => {
      if (cancelled) return;
      const box = measureTarget(current.target);
      if (box) {
        const node = document.querySelector(current.target);
        if (node instanceof HTMLElement) {
          node.scrollIntoView({
            block: "center",
            inline: "nearest",
            behavior: "smooth",
          });
        }
        setTargetBox(measureTarget(current.target) ?? box);
        return;
      }
      if (attempt < 8) {
        timer = window.setTimeout(
          () => tryMeasure(attempt + 1),
          80 * (attempt + 1),
        );
      } else {
        setTargetBox(null);
      }
    };

    const raf = window.requestAnimationFrame(() => tryMeasure(0));
    function onResize() {
      if (cancelled) return;
      const box = measureTarget(current.target);
      setTargetBox((prev) => {
        if (
          prev &&
          box &&
          prev.top === box.top &&
          prev.left === box.left &&
          prev.width === box.width &&
          prev.height === box.height
        ) {
          return prev;
        }
        if (!prev && !box) return prev;
        return box;
      });
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [active, step]);

  useEffect(() => {
    if (!active && !promptOpen) return;
    const node = dialogRef.current?.querySelector<HTMLElement>("button");
    node?.focus();
  }, [active, promptOpen, step]);

  function completeAndClose() {
    const store = localStore();
    const session = sessionStore();
    if (store) markHubTourComplete(store);
    if (session) setHubTourActive(session, false);
    window.dispatchEvent(
      new CustomEvent(HUB_TOUR_MENU_EVENT, { detail: { open: false } }),
    );
    setDismissed(true);
    setManualActive(false);
    setManualStep(0);
    setTargetBox(null);
  }

  function goToStep(nextIndex: number) {
    const clamped = Math.max(0, Math.min(nextIndex, HUB_TOUR_STEPS.length - 1));
    const next = HUB_TOUR_STEPS[clamped]!;
    const session = sessionStore();
    if (session) {
      setHubTourActive(session, true);
      writeHubTourStepIndex(session, clamped);
    }
    setManualActive(true);
    setManualStep(clamped);
    if (typeof window !== "undefined" && window.location.pathname !== next.href) {
      router.push(next.href);
    } else {
      prepareStepUi(next);
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      completeAndClose();
    }
  }

  if (dismissed || (!promptOpen && !active)) return null;

  const current = HUB_TOUR_STEPS[step] ?? HUB_TOUR_STEPS[0]!;
  const last = step === HUB_TOUR_STEPS.length - 1;
  const pad = 8;
  const cutout = targetBox
    ? {
        top: Math.max(0, targetBox.top - pad),
        left: Math.max(0, targetBox.left - pad),
        width: targetBox.width + pad * 2,
        height: targetBox.height + pad * 2,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[60]" onKeyDown={onKeyDown}>
      {promptOpen ? (
        <div className="flex h-full items-end justify-center bg-[color-mix(in_srgb,black_45%,transparent)] p-4 sm:items-center">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-[var(--shadow-soft)]"
          >
            <h2 id={titleId} className="text-xl font-semibold">
              Welcome to the KCMI Hub
            </h2>
            <p id={bodyId} className="hub-body mt-3 text-[var(--color-text-muted)]">
              Would you like a short tour? You can skip it and replay it later
              from Help & Tutorial.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-[var(--color-action-primary-fg)]"
                onClick={() => {
                  const session = sessionStore();
                  if (session) {
                    setHubTourActive(session, true);
                    writeHubTourStepIndex(session, 0);
                  }
                  setManualActive(true);
                  setManualStep(0);
                  router.push("/admin");
                }}
              >
                {HUB_ACTION_LABELS.startTour}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-5 text-base font-semibold underline-offset-2 hover:underline"
                onClick={completeAndClose}
              >
                {HUB_ACTION_LABELS.skipTour}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute inset-0 bg-black/55" />
            {cutout ? (
              <div
                className="absolute rounded-[var(--radius-md)] shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] ring-2 ring-[var(--color-action-primary)] ring-offset-2 ring-offset-transparent"
                style={{
                  top: cutout.top,
                  left: cutout.left,
                  width: cutout.width,
                  height: cutout.height,
                  background: "transparent",
                }}
              />
            ) : null}
          </div>

          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            className="z-[61] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 shadow-[var(--shadow-soft)]"
            style={bubbleStyle(targetBox)}
          >
            <p className="text-sm font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">
              Step {step + 1} of {HUB_TOUR_STEPS.length}
            </p>
            <h2 id={titleId} className="mt-2 text-xl font-semibold">
              {current.title}
            </h2>
            <p id={bodyId} className="hub-body mt-3 text-[var(--color-text-muted)]">
              {current.body}
            </p>
            {!targetBox ? (
              <p className="hub-help mt-2 text-[var(--color-text-muted)]">
                Looking for this control on the page…
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-4 text-base font-semibold underline-offset-2 hover:underline"
                onClick={completeAndClose}
              >
                {HUB_ACTION_LABELS.skipTour}
              </button>
              {step > 0 ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-base font-semibold"
                  onClick={() => goToStep(step - 1)}
                >
                  {HUB_ACTION_LABELS.backTour}
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 text-base font-semibold text-[var(--color-action-primary-fg)]"
                onClick={() => {
                  if (last) {
                    completeAndClose();
                    return;
                  }
                  goToStep(step + 1);
                }}
              >
                {last ? HUB_ACTION_LABELS.finishTour : HUB_ACTION_LABELS.nextTour}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function replayHubTour(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(HUB_TOUR_REPLAY_EVENT));
}
