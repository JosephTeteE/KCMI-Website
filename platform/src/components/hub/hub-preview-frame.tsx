"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";

/** Desktop-width canvas used for Hub thumbnail previews of public sections. */
export const HUB_PREVIEW_CANVAS_WIDTH = 960;

/**
 * Scale a fixed desktop canvas into the available Hub card width.
 * Never clips or requires horizontal scrolling; narrow cards shrink as a thumbnail.
 */
export function hubPreviewFitScale(
  frameWidth: number,
  canvasWidth = HUB_PREVIEW_CANVAS_WIDTH,
): number {
  const width = Math.max(1, frameWidth);
  return Math.min(1, width / canvasWidth);
}

export function HubPreviewFrame({
  title,
  live,
  variant,
  children,
}: {
  title: string;
  live?: boolean;
  variant?: "live" | "draft" | "proposed";
  children: ReactNode;
}) {
  const tone = variant ?? (live ? "live" : "proposed");
  const caption =
    tone === "live"
      ? "Currently on the website"
      : tone === "draft"
        ? "Preview of this draft"
        : "Preview only — not public yet";
  const frameRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState(320);
  const [largeOpen, setLargeOpen] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    const inner = innerRef.current;
    if (!frame || !inner) return;

    const update = () => {
      setScale(hubPreviewFitScale(frame.clientWidth));
      setInnerHeight(inner.scrollHeight);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  function openLarge() {
    setLargeOpen(true);
    const node = dialogRef.current;
    if (!node) return;
    if (!node.open) node.showModal();
    queueMicrotask(() => closeButtonRef.current?.focus());
  }

  function closeLarge() {
    setLargeOpen(false);
    dialogRef.current?.close();
    openButtonRef.current?.focus();
  }

  const scaledWidth = HUB_PREVIEW_CANVAS_WIDTH * scale;
  const scaledHeight = Math.max(8, innerHeight * scale);

  return (
    <section
      aria-label={title}
      className="overflow-hidden rounded-[var(--radius-lg)] border-2 border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-page)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--color-text-body)]">
          {title}
          <span className="ml-2 text-xs font-medium text-[var(--color-text-muted)]">
            {caption}
          </span>
        </p>
        <button
          ref={openButtonRef}
          type="button"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
          onClick={openLarge}
        >
          {HUB_ACTION_LABELS.viewFullSizePreview}
        </button>
      </div>
      <div
        ref={frameRef}
        className="overflow-hidden bg-[var(--color-surface-page)]"
        style={{ height: scaledHeight }}
      >
        <div
          className="origin-top-left"
          style={{ width: scaledWidth, height: scaledHeight }}
        >
          <div
            ref={innerRef}
            className="pointer-events-none origin-top-left"
            style={{
              width: HUB_PREVIEW_CANVAS_WIDTH,
              transform: `scale(${scale})`,
            }}
          >
            {children}
          </div>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="hub-nav-dialog"
        onClose={() => {
          setLargeOpen(false);
          openButtonRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeLarge();
        }}
      >
        <div className="mx-auto my-6 max-h-[90vh] w-[min(960px,calc(100%-2rem))] overflow-auto rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p id={titleId} className="text-sm font-semibold">
              {title} — full-size preview
            </p>
            <button
              ref={closeButtonRef}
              type="button"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-3 text-sm font-semibold"
              onClick={closeLarge}
            >
              Close
            </button>
          </div>
          {largeOpen ? (
            <div className="pointer-events-none">{children}</div>
          ) : null}
        </div>
      </dialog>
    </section>
  );
}
