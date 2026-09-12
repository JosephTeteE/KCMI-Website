"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";

/** Desktop-width canvas used for Hub section thumbnail previews. */
export const HUB_PREVIEW_CANVAS_WIDTH = 960;
/** Phone-width canvas for genuine phone composition in full preview. */
export const HUB_PREVIEW_PHONE_WIDTH = 390;

/**
 * Scale a fixed canvas into the available Hub card width.
 * Never clips or requires horizontal scrolling; narrow cards shrink as a thumbnail.
 */
export function hubPreviewFitScale(
  frameWidth: number,
  canvasWidth = HUB_PREVIEW_CANVAS_WIDTH,
): number {
  const width = Math.max(1, frameWidth);
  return Math.min(1, width / canvasWidth);
}

type DeviceMode = "phone" | "desktop";

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
  const [device, setDevice] = useState<DeviceMode>("phone");

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

  const scaledHeight = Math.max(8, innerHeight * scale);
  const fullCanvasWidth =
    device === "phone" ? HUB_PREVIEW_PHONE_WIDTH : HUB_PREVIEW_CANVAS_WIDTH;

  useEffect(() => {
    const root = frameRef.current;
    if (!root) return;
    // Belt-and-suspenders beside `inert`: remove focusability from thumbnail subtree.
    const focusable = root.querySelectorAll<HTMLElement>(
      "a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex='-1'])",
    );
    for (const el of focusable) {
      el.setAttribute("tabindex", "-1");
    }
  }, [children, scale, innerHeight]);

  return (
    <section
      aria-label={title}
      className="min-w-0 max-w-full overflow-x-hidden rounded-[var(--radius-lg)] border-2 border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)]"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-page)] px-4 py-3">
        <div className="min-w-0 flex-1 basis-[12rem]">
          <p className="text-base font-semibold text-[var(--color-text-body)]">
            {title}
            <span className="ml-2 text-base font-medium text-[var(--color-text-muted)]">
              {caption}
            </span>
          </p>
          <p className="hub-help mt-1 text-[var(--color-text-muted)]">
            Section preview (thumbnail) — for orientation, not for reading body
            text
          </p>
        </div>
        <button
          ref={openButtonRef}
          type="button"
          className="inline-flex min-h-11 shrink-0 items-center text-base font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
          onClick={openLarge}
        >
          {HUB_ACTION_LABELS.viewFullSizePreview}
        </button>
      </div>
      {/*
        Orientation thumbnail only: inert + aria-hidden so public controls inside
        are not focusable/clickable. Full Phone/Desktop dialog below stays interactive.
        Inner canvas is absolutely positioned so the fixed 960px width cannot force
        horizontal document overflow (transform scale does not shrink layout size).
      */}
      <div
        ref={frameRef}
        data-hub-preview-scaled="true"
        data-hub-preview="scaled"
        className="relative min-w-0 max-w-full overflow-hidden bg-[var(--color-surface-page)]"
        style={{ height: scaledHeight, width: "100%" }}
        aria-hidden="true"
        inert
      >
        <div
          ref={innerRef}
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{
            width: HUB_PREVIEW_CANVAS_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
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
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            closeLarge();
          }
        }}
      >
        <div className="mx-auto my-6 max-h-[90vh] w-[min(1100px,calc(100%-2rem))] overflow-auto rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p id={titleId} className="text-base font-semibold">
                {title} — full preview
              </p>
              <p className="hub-help mt-1 text-[var(--color-text-muted)]">
                {device === "phone"
                  ? "Phone layout (390px-wide composition)"
                  : "Desktop layout"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div
                role="group"
                aria-label="Preview device"
                className="flex rounded-[var(--radius-md)] border border-[var(--color-border)] p-1"
              >
                <button
                  type="button"
                  aria-pressed={device === "phone"}
                  onClick={() => setDevice("phone")}
                  className={`inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-4 text-base font-semibold ${
                    device === "phone"
                      ? "bg-[var(--color-action-primary)] text-[var(--color-text-on-brand)]"
                      : "text-[var(--color-text-body)]"
                  }`}
                >
                  Phone
                </button>
                <button
                  type="button"
                  aria-pressed={device === "desktop"}
                  onClick={() => setDevice("desktop")}
                  className={`inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-4 text-base font-semibold ${
                    device === "desktop"
                      ? "bg-[var(--color-action-primary)] text-[var(--color-text-on-brand)]"
                      : "text-[var(--color-text-body)]"
                  }`}
                >
                  Desktop
                </button>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-3 text-base font-semibold"
                onClick={closeLarge}
              >
                Close
              </button>
            </div>
          </div>
          {largeOpen ? (
            <div className="flex justify-center bg-[var(--color-surface-page)] p-4">
              <div
                data-hub-preview="full"
                className="w-full min-w-0 bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)]"
                style={{ maxWidth: fullCanvasWidth }}
              >
                {/*
                  Phone uses a 390px-wide public composition so the layout is
                  responsive phone, not a squeezed desktop canvas.
                  Full preview remains an interactive surface (unlike the thumbnail).
                */}
                <div style={{ width: "100%", maxWidth: fullCanvasWidth }}>
                  {children}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </dialog>
    </section>
  );
}

/** Readable Hub copy block outside scaled thumbnails (Preview Mode B). */
export function HubReadableCurrentCopy({
  heading = "Words currently on the website",
  children,
}: {
  heading?: string;
  children: ReactNode;
}) {
  return (
    <section
      data-hub-role="readable-current"
      className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-page)] p-4"
    >
      <h3 className="text-base font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {heading}
      </h3>
      <div className="space-y-3 text-base text-[var(--color-text-body)]">
        {children}
      </div>
    </section>
  );
}
