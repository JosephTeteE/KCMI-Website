"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";
import {
  hubTourStepsForKind,
  HUB_TOUR_LIVESTREAM_BEGIN_EVENT,
  HUB_TOUR_MENU_EVENT,
  HUB_TOUR_PROGRAM_WIZARD_STEP_EVENT,
  HUB_TOUR_REPLAY_EVENT,
  HUB_TOUR_SELECT_CATEGORY_EVENT,
  HUB_TOUR_SELECT_SECTION_EVENT,
  HUB_TOUR_START_CHANGE_EVENT,
  isHubTourActive,
  isHubTourComplete,
  markHubTourComplete,
  readHubTourKind,
  readHubTourStepIndex,
  resetHubTour,
  resolveReplayTourKind,
  resolveTourEntryHref,
  setHubTourActive,
  tourStepMatchesRoute,
  writeHubTourKind,
  writeHubTourStepIndex,
  type HubTourKind,
  type HubTourStep,
} from "@/lib/hub/tour";
import {
  getTourViewport,
  placeTourBubble,
  tourScrollBehavior,
  type TourTargetBox,
} from "@/lib/hub/tour-layout";

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

let tourResumeSnapshot = {
  active: false,
  step: 0,
  kind: "dashboard" as HubTourKind,
};

function readTourResume(): {
  active: boolean;
  step: number;
  kind: HubTourKind;
} {
  const session = sessionStore();
  let next: { active: boolean; step: number; kind: HubTourKind };
  if (!session || isHubTourComplete(localStore()) || !isHubTourActive(session)) {
    next = { active: false, step: 0, kind: "dashboard" };
  } else {
    const kind = readHubTourKind(session);
    const steps = hubTourStepsForKind(kind);
    next = {
      active: true,
      kind,
      step: readHubTourStepIndex(session, steps.length),
    };
  }
  if (
    tourResumeSnapshot.active === next.active &&
    tourResumeSnapshot.step === next.step &&
    tourResumeSnapshot.kind === next.kind
  ) {
    return tourResumeSnapshot;
  }
  tourResumeSnapshot = next;
  return tourResumeSnapshot;
}

function measureTarget(
  selector: string,
  scopeSelector?: string,
): TourTargetBox | null {
  const scope = scopeSelector
    ? document.querySelector(scopeSelector)
    : document;
  const root = scope instanceof Element ? scope : document;
  const nodes = root.querySelectorAll(selector);
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue;
    const rect = node.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    const style = window.getComputedStyle(node);
    if (style.visibility === "hidden" || style.display === "none") continue;
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }
  // Fallback: any matching visible node in the document
  if (scopeSelector) return measureTarget(selector);
  return null;
}

function bubbleStyle(
  box: TourTargetBox | null,
  opts?: { openMobileMenu?: boolean; measuredHeight?: number },
): CSSProperties {
  const viewport = getTourViewport();
  const placed = placeTourBubble({
    target: box,
    viewport,
    openMobileMenu: opts?.openMobileMenu,
    estimatedHeight: opts?.measuredHeight,
  });

  const maxHeightCss = `min(${placed.maxHeight}px, calc(100dvh - 1.5rem - env(safe-area-inset-bottom, 0px)))`;

  if ("bottomAnchored" in placed) {
    return {
      position: "fixed",
      left: "50%",
      bottom:
        "max(1.25rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))",
      transform: "translateX(-50%)",
      width: `min(24rem, calc(100vw - 2rem))`,
      maxHeight: maxHeightCss,
    };
  }

  return {
    position: "fixed",
    top: placed.top,
    left: placed.left,
    width: placed.width,
    maxHeight: maxHeightCss,
  };
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function prepareStepUi(step: HubTourStep) {
  if (step.closeMobileMenu) {
    window.dispatchEvent(
      new CustomEvent(HUB_TOUR_MENU_EVENT, { detail: { open: false } }),
    );
  }
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
  if (typeof step.programWizardStep === "number") {
    window.dispatchEvent(
      new CustomEvent(HUB_TOUR_PROGRAM_WIZARD_STEP_EVENT, {
        detail: { step: step.programWizardStep },
      }),
    );
  }
  if (step.livestreamBegin) {
    window.dispatchEvent(
      new CustomEvent(HUB_TOUR_LIVESTREAM_BEGIN_EVENT, {
        detail: { mode: step.livestreamBegin },
      }),
    );
  }
}

export function HubTour() {
  const titleId = useId();
  const bodyId = useId();
  const router = useRouter();
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDialogElement>(null);
  const hydrated = useHydrated();
  const resume = useSyncExternalStore(
    subscribeTourResume,
    readTourResume,
    () => ({ active: false, step: 0, kind: "dashboard" as HubTourKind }),
  );
  const [manualActive, setManualActive] = useState(false);
  const [manualStep, setManualStep] = useState(0);
  const [manualKind, setManualKind] = useState<HubTourKind>("dashboard");
  const [dismissed, setDismissed] = useState(false);
  const [targetBox, setTargetBox] = useState<TourTargetBox | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [measuredBubbleHeight, setMeasuredBubbleHeight] = useState<
    number | undefined
  >(undefined);

  const kind: HubTourKind = manualActive ? manualKind : resume.kind;
  const steps = useMemo(() => hubTourStepsForKind(kind), [kind]);
  const active = !dismissed && (manualActive || resume.active);
  const step = manualActive ? manualStep : resume.step;
  const complete = hydrated && (dismissed || isHubTourComplete(localStore()));
  // First-run welcome only on Dashboard, and only for the dashboard tour kind.
  const promptOpen =
    hydrated &&
    !complete &&
    !active &&
    !dismissed &&
    (pathname === "/admin" || pathname === "/admin/");

  function beginTour(nextKind: HubTourKind, entryHref?: string) {
    const nextSteps = hubTourStepsForKind(nextKind);
    const session = sessionStore();
    const local = localStore();
    if (local) resetHubTour(local);
    if (session) {
      resetHubTour(session);
      setHubTourActive(session, true);
      writeHubTourKind(session, nextKind);
      writeHubTourStepIndex(session, 0, nextSteps.length);
    }
    setDismissed(false);
    setManualKind(nextKind);
    setManualStep(0);
    setManualActive(true);
    setTargetMissing(false);
    setSearching(true);
    const here = (pathname ?? "").replace(/\/$/, "") || "/";
    const dest = (entryHref ?? resolveTourEntryHref(nextKind, pathname)).replace(
      /\/$/,
      "",
    ) || "/";
    if (here !== dest) {
      router.push(dest);
    } else {
      const first = nextSteps[0];
      if (first) prepareStepUi(first);
    }
  }

  const beginTourRef = useRef(beginTour);
  useEffect(() => {
    beginTourRef.current = beginTour;
  });

  useEffect(() => {
    function onReplay() {
      const nextKind = resolveReplayTourKind(window.location.pathname);
      beginTourRef.current(nextKind);
    }
    window.addEventListener(HUB_TOUR_REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(HUB_TOUR_REPLAY_EVENT, onReplay);
  }, []);

  useEffect(() => {
    if (!active) {
      queueMicrotask(() => {
        setTargetBox(null);
        setTargetMissing(false);
        setSearching(false);
      });
      return;
    }
    const current = steps[step];
    if (!current) return;

    // Never leave the tour's route mid-flow (create+edit share program steps).
    if (!tourStepMatchesRoute(current, pathname)) {
      queueMicrotask(() => {
        setTargetBox(null);
        setTargetMissing(true);
        setSearching(false);
      });
      return;
    }

    prepareStepUi(current);
    let cancelled = false;
    let retryTimer = 0;
    let menuTimer = 0;
    const reducedMotion = prefersReducedMotion();
    const scrollBehavior = tourScrollBehavior(reducedMotion);

    // Mobile nav uses <dialog showModal>. Re-open the tour layer afterward
    // so the coach mark sits above the menu in the top layer.
    if (current.openMobileMenu && layerRef.current) {
      const layer = layerRef.current;
      // Short delay only — avoid a long blank wait before the next card paints.
      menuTimer = window.setTimeout(() => {
        if (cancelled) return;
        if (layer.open) layer.close();
        layer.showModal();
      }, 40);
    }

    const commitBox = (box: TourTargetBox) => {
      if (cancelled) return;
      setTargetBox(box);
      setTargetMissing(false);
      setSearching(false);
    };

    const tryMeasure = (attempt: number) => {
      if (cancelled) return;
      const scope = current.openMobileMenu ? "#hub-mobile-menu" : undefined;
      const box = measureTarget(current.target, scope);
      if (box) {
        const root = scope ? document.querySelector(scope) : document;
        const node =
          root instanceof Element
            ? root.querySelector(current.target)
            : document.querySelector(current.target);
        if (node instanceof HTMLElement) {
          node.scrollIntoView({
            block: "nearest",
            inline: "nearest",
            behavior: scrollBehavior,
          });
        }
        // Remeasure on the next frames — no smooth-scroll wait.
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            if (cancelled) return;
            commitBox(measureTarget(current.target, scope) ?? box);
          });
        });
        return;
      }
      // ~0.6s total: short search, then fail gracefully.
      if (attempt < 6) {
        setSearching(true);
        retryTimer = window.setTimeout(
          () => tryMeasure(attempt + 1),
          60 + attempt * 30,
        );
      } else {
        setTargetBox(null);
        setTargetMissing(true);
        setSearching(false);
      }
    };

    const raf = window.requestAnimationFrame(() => tryMeasure(0));
    function onViewportChange() {
      if (cancelled) return;
      const scope = current.openMobileMenu ? "#hub-mobile-menu" : undefined;
      const next = measureTarget(current.target, scope);
      if (next) {
        setTargetBox(next);
        setTargetMissing(false);
        setSearching(false);
      }
    }
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onViewportChange);
    vv?.addEventListener("scroll", onViewportChange);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(retryTimer);
      window.clearTimeout(menuTimer);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      vv?.removeEventListener("resize", onViewportChange);
      vv?.removeEventListener("scroll", onViewportChange);
    };
  }, [active, step, pathname, steps]);

  useEffect(() => {
    if (!active || !dialogRef.current) return;
    const node = dialogRef.current;
    const update = () => {
      const height = Math.ceil(node.getBoundingClientRect().height);
      if (height > 0) setMeasuredBubbleHeight(height);
    };
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => update())
        : null;
    ro?.observe(node);
    const raf = window.requestAnimationFrame(update);
    return () => {
      window.cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [active, step, targetBox, targetMissing, searching]);

  useEffect(() => {
    if (!active && !promptOpen) return;
    const node = dialogRef.current?.querySelector<HTMLElement>("button");
    node?.focus();
  }, [active, promptOpen, step]);

  // Native <dialog> menus use the top layer; keep the tour above them.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    if (active || promptOpen) {
      if (!layer.open) layer.showModal();
    } else if (layer.open) {
      layer.close();
    }
  }, [active, promptOpen]);

  function completeAndClose() {
    const store = localStore();
    const session = sessionStore();
    if (store) markHubTourComplete(store);
    if (session) {
      setHubTourActive(session, false);
      session.removeItem("kcmi-hub-tour-v2-kind");
    }
    window.dispatchEvent(
      new CustomEvent(HUB_TOUR_MENU_EVENT, { detail: { open: false } }),
    );
    setDismissed(true);
    setManualActive(false);
    setManualStep(0);
    setTargetBox(null);
    setTargetMissing(false);
    setSearching(false);
  }

  function goToStep(nextIndex: number) {
    const clamped = Math.max(0, Math.min(nextIndex, steps.length - 1));
    const next = steps[clamped]!;
    const session = sessionStore();
    if (session) {
      setHubTourActive(session, true);
      writeHubTourKind(session, kind);
      writeHubTourStepIndex(session, clamped, steps.length);
    }
    setManualActive(true);
    setManualKind(kind);
    setManualStep(clamped);
    setTargetMissing(false);
    setSearching(true);

    // Close menu unless the next step needs it open.
    if (!next.openMobileMenu) {
      window.dispatchEvent(
        new CustomEvent(HUB_TOUR_MENU_EVENT, { detail: { open: false } }),
      );
    }
    // Contextual tours stay on their route — do not router.push mid-tour.
    prepareStepUi(next);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      completeAndClose();
    }
  }

  if (dismissed || (!promptOpen && !active)) return null;

  const current = steps[step] ?? steps[0]!;
  const last = step === steps.length - 1;
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
    <dialog
      ref={layerRef}
      className="hub-tour-layer"
      onCancel={(event) => {
        event.preventDefault();
        completeAndClose();
      }}
      onKeyDown={onKeyDown}
    >
      <div className="fixed inset-0">
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
              Would you like a short tour of the Dashboard? You can skip it and
              replay it later from Help & Tutorial.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-[var(--color-action-primary-fg)]"
                onClick={() => beginTour("dashboard", "/admin")}
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
          {/* Dim only — do not trap pointer events so highlighted controls stay usable. */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute inset-0 bg-black/55" />
            {cutout ? (
              <div
                data-hub-tour-highlight="true"
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
            data-hub-tour-kind={kind}
            data-hub-tour-card="true"
            className="hub-tour-card z-[61] flex flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 shadow-[var(--shadow-soft)]"
            style={bubbleStyle(targetBox, {
              openMobileMenu: current.openMobileMenu,
              measuredHeight: measuredBubbleHeight,
            })}
          >
            <div
              key={`${kind}-${step}`}
              className="hub-tour-card-body min-h-0 flex-1 overflow-y-auto overscroll-contain"
            >
              <p className="text-sm font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">
                Step {step + 1} of {steps.length}
              </p>
              <h2 id={titleId} className="mt-2 text-xl font-semibold">
                {current.title}
              </h2>
              <p
                id={bodyId}
                className="hub-body mt-3 text-[var(--color-text-muted)]"
              >
                {current.body}
              </p>
              {searching && !targetBox && !targetMissing ? (
                <p className="hub-help mt-2 text-[var(--color-text-muted)]">
                  Looking for this control on the page…
                </p>
              ) : null}
              {targetMissing ? (
                <p className="hub-help mt-2 text-[var(--color-text-muted)]">
                  This step isn&apos;t available right now. Skip this step or
                  exit the tour.
                </p>
              ) : null}
            </div>
            <div
              data-hub-tour-actions="true"
              className="mt-5 flex shrink-0 flex-wrap gap-3 pb-[max(0px,env(safe-area-inset-bottom,0px))]"
            >
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-4 text-base font-semibold underline-offset-2 hover:underline"
                onClick={completeAndClose}
              >
                {HUB_ACTION_LABELS.skipTour}
              </button>
              {targetMissing ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-base font-semibold"
                  onClick={() => {
                    if (last) completeAndClose();
                    else goToStep(step + 1);
                  }}
                >
                  {HUB_ACTION_LABELS.skipTourStep}
                </button>
              ) : null}
              {step > 0 ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-base font-semibold"
                  onClick={() => goToStep(step - 1)}
                >
                  Previous step
                </button>
              ) : null}
              <button
                type="button"
                data-hub-tour-primary-action="true"
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 text-base font-semibold text-[var(--color-action-primary-fg)]"
                onClick={() => {
                  if (last) {
                    completeAndClose();
                    return;
                  }
                  goToStep(step + 1);
                }}
              >
                {last ? HUB_ACTION_LABELS.finishTour : "Next step"}
              </button>
            </div>
          </div>
        </>
      )}
      </div>
    </dialog>
  );
}

export function replayHubTour(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(HUB_TOUR_REPLAY_EVENT));
}
