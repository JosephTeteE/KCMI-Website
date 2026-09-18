"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  createProgram,
  saveProgramWizardEdit,
  setProgramStatus,
} from "@/app/admin/programs/actions";
import { MediaChooser, type MediaChooserItem } from "@/components/hub/media-chooser";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";
import { DEFAULT_PROGRAM_TIMEZONE } from "@/lib/programs/sessions";
import type { ProgramActionKind } from "@/lib/programs/schedule";
import type { ProgramLocationKind } from "@/lib/programs/location";

export type ProgramFormInitial = {
  id: string;
  title: string;
  shortDescription: string;
  status: "draft" | "preview" | "published" | "archived";
  featuredMediaId: string | null;
  coverPreviewUrl: string | null;
  coverAlt: string;
  locationKind: ProgramLocationKind | null;
  locationBranchId: string | null;
  locationLabel: string;
  actionKind: ProgramActionKind;
  ctaUrl: string;
  sessionDate: string;
  sessionStart: string;
  sessionEnd: string;
  timezone: string;
};

type BranchOption = { id: string; name: string; country: string | null };

type Props = {
  mode: "create" | "edit";
  branches: BranchOption[];
  media: MediaChooserItem[];
  initial?: ProgramFormInitial;
  canPublish?: boolean;
};

/**
 * Single-screen Program editor: Name, Description, Poster + optional Advanced.
 * Save Draft / Publish (or Make changes live for published programs).
 */
export function ProgramForm({
  mode,
  branches,
  media,
  initial,
  canPublish = false,
}: Props) {
  const isEdit = mode === "edit" && Boolean(initial);
  const isPublished = isEdit && initial?.status === "published";
  const isDraft =
    isEdit &&
    (initial?.status === "draft" || initial?.status === "preview");

  const [title, setTitle] = useState(initial?.title ?? "");
  const [shortDescription, setShortDescription] = useState(
    initial?.shortDescription ?? "",
  );
  const [posterMode, setPosterMode] = useState<"none" | "library" | "upload">(
    initial?.featuredMediaId ? "library" : "none",
  );
  const [featuredMediaId, setFeaturedMediaId] = useState(
    initial?.featuredMediaId ?? "",
  );
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterAlt, setPosterAlt] = useState(initial?.coverAlt ?? "");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [sessionDate, setSessionDate] = useState(initial?.sessionDate ?? "");
  const [sessionStart, setSessionStart] = useState(initial?.sessionStart ?? "");
  const [sessionEnd, setSessionEnd] = useState(initial?.sessionEnd ?? "");
  const [locationKind, setLocationKind] = useState<ProgramLocationKind | "">(
    initial?.locationKind ?? "",
  );
  const [locationBranchId, setLocationBranchId] = useState(
    initial?.locationBranchId ?? "",
  );
  const [locationLabel, setLocationLabel] = useState(
    initial?.locationLabel ?? "",
  );
  const [actionKind, setActionKind] = useState<ProgramActionKind>(
    initial?.actionKind ?? "none",
  );
  const [ctaUrl, setCtaUrl] = useState(initial?.ctaUrl ?? "");

  const [changeUnlocked, setChangeUnlocked] = useState(!isPublished);
  const [reviewPreviewed, setReviewPreviewed] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function buildSessionsJson(): string {
    if (!sessionDate.trim()) {
      return "[]";
    }
    return JSON.stringify([
      {
        session_date: sessionDate.trim(),
        start_time: sessionStart.trim() || null,
        end_time: sessionEnd.trim() || null,
        label: null,
        sort_order: 0,
      },
    ]);
  }

  function appendCommonFields(fd: FormData) {
    fd.set("title", title.trim());
    fd.set("short_description", shortDescription.trim());
    fd.set("body_text", "");
    fd.set("sessions_json", buildSessionsJson());
    fd.set("timezone", initial?.timezone ?? DEFAULT_PROGRAM_TIMEZONE);
    fd.set("action_kind", actionKind);
    if (actionKind !== "none") {
      fd.set("cta_url", ctaUrl.trim());
    }
    if (locationKind) {
      fd.set("location_kind", locationKind);
      if (locationKind === "branch") {
        fd.set("location_branch_id", locationBranchId);
      } else if (
        locationKind === "venue" ||
        locationKind === "hybrid" ||
        locationKind === "online"
      ) {
        fd.set("location_label", locationLabel.trim());
      }
    }
    if (posterMode === "library" && featuredMediaId) {
      fd.set("featured_media_id", featuredMediaId);
    }
    if (posterMode === "none" && isEdit) {
      fd.set("featured_media_id", "");
    }
    if (posterMode === "upload" && posterFile) {
      fd.set("file", posterFile);
      fd.set("alt_text", posterAlt.trim());
      fd.set("crop_aspect", "card");
      fd.set("focal_x", "0.5");
      fd.set("focal_y", "0.5");
    }
  }

  function submit(intent: "draft" | "publish" | "live") {
    setStepError(null);
    if (!title.trim()) {
      setStepError("Please enter a program name.");
      return;
    }
    if (posterMode === "upload" && posterFile && !posterAlt.trim()) {
      setStepError("Add a short description of the photo (alt text).");
      return;
    }
    if (sessionDate.trim() && !sessionStart.trim()) {
      setStepError("Add a start time for the date, or clear the date.");
      return;
    }

    const fd = new FormData();
    if (isEdit && initial) {
      fd.set("id", initial.id);
      fd.set("save_intent", intent === "publish" ? "publish" : intent);
      fd.set("placement", "none");
    } else {
      fd.set("save_intent", intent === "publish" ? "publish" : "draft");
      fd.set("placement", "none");
    }
    appendCommonFields(fd);

    startTransition(() => {
      if (isEdit) {
        void saveProgramWizardEdit(fd);
      } else {
        void createProgram(fd);
      }
    });
  }

  const selectedLibrary = media.find((item) => item.id === featuredMediaId);

  return (
    <div className="max-w-2xl space-y-8" data-testid="program-form">
      {isEdit && isDraft ? (
        <p
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-tint)] px-4 py-3 text-base font-semibold"
          data-testid="program-draft-banner"
        >
          DRAFT — NOT ON THE WEBSITE
        </p>
      ) : null}
      {isPublished ? (
        <p
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-base font-semibold"
          data-testid="program-live-banner"
        >
          Currently on the website
        </p>
      ) : null}

      {isPublished && !changeUnlocked ? (
        <div className="space-y-4" data-testid="program-live-locked">
          <dl className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 text-base">
            <div>
              <dt className="font-medium text-[var(--color-text-muted)]">Name</dt>
              <dd className="mt-1">{title.trim() || "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-text-muted)]">
                Description
              </dt>
              <dd className="mt-1 whitespace-pre-wrap">
                {shortDescription.trim() || "—"}
              </dd>
            </div>
            {(initial?.coverPreviewUrl || selectedLibrary?.previewUrl) && (
              <div>
                <dt className="font-medium text-[var(--color-text-muted)]">
                  Poster
                </dt>
                <dd className="mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      selectedLibrary?.previewUrl ??
                      initial?.coverPreviewUrl ??
                      ""
                    }
                    alt={posterAlt || selectedLibrary?.alt || "Program poster"}
                    className="max-h-48 rounded-[var(--radius-md)] object-cover"
                  />
                </dd>
              </div>
            )}
          </dl>
          <div className="flex flex-wrap gap-3">
            {initial ? (
              <Link
                href={`/admin/programs/${initial.id}/preview`}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-5 text-base font-semibold"
              >
                Preview on website layout
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setChangeUnlocked(true)}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-[var(--color-action-primary-fg)]"
            >
              {HUB_ACTION_LABELS.changeSermonDetails}
            </button>
            {canPublish && initial ? (
              <form action={setProgramStatus}>
                <input type="hidden" name="id" value={initial.id} />
                <input type="hidden" name="status" value="archived" />
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-5 text-base font-semibold"
                >
                  {HUB_ACTION_LABELS.removeFromWebsite}
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label htmlFor="program-title" className="block text-base font-medium">
              Program name
            </label>
            <input
              id="program-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-2 block w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-page)] px-3 py-2 text-base"
              data-testid="program-title"
            />
          </div>

          <div>
            <label
              htmlFor="program-description"
              className="block text-base font-medium"
            >
              Short description
            </label>
            <textarea
              id="program-description"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              rows={4}
              className="mt-2 block w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-page)] px-3 py-2 text-base"
              data-testid="program-description"
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-base font-medium">Program poster</legend>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  ["none", "No poster"],
                  ["library", "Use saved photo"],
                  ["upload", "Upload new photo"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-base"
                >
                  <input
                    type="radio"
                    name="poster_mode"
                    checked={posterMode === value}
                    onChange={() => setPosterMode(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
            {posterMode === "library" ? (
              <MediaChooser
                items={media}
                selectedId={featuredMediaId || null}
                onSelect={(item) => {
                  setFeaturedMediaId(item.id);
                  setPosterAlt(item.alt);
                }}
              />
            ) : null}
            {posterMode === "upload" ? (
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-base"
                />
                <div>
                  <label
                    htmlFor="poster-alt"
                    className="block text-base font-medium"
                  >
                    Photo description (alt text)
                  </label>
                  <input
                    id="poster-alt"
                    value={posterAlt}
                    onChange={(e) => setPosterAlt(e.target.value)}
                    className="mt-2 block w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-base"
                  />
                </div>
              </div>
            ) : null}
          </fieldset>

          <details
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4"
            open={advancedOpen}
            onToggle={(e) =>
              setAdvancedOpen((e.target as HTMLDetailsElement).open)
            }
            data-testid="program-advanced"
          >
            <summary className="cursor-pointer text-base font-semibold">
              Advanced details (optional)
            </summary>
            <div className="mt-4 space-y-4">
              <p className="text-sm text-[var(--color-text-muted)]">
                Leave blank if you do not need a date, place, or visitor link.
                Nothing is invented for you.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="session-date" className="block text-sm font-medium">
                    Date
                  </label>
                  <input
                    id="session-date"
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="mt-1 block w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-base"
                  />
                </div>
                <div>
                  <label htmlFor="session-start" className="block text-sm font-medium">
                    Start time
                  </label>
                  <input
                    id="session-start"
                    type="time"
                    value={sessionStart}
                    onChange={(e) => setSessionStart(e.target.value)}
                    className="mt-1 block w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-base"
                  />
                </div>
                <div>
                  <label htmlFor="session-end" className="block text-sm font-medium">
                    End time
                  </label>
                  <input
                    id="session-end"
                    type="time"
                    value={sessionEnd}
                    onChange={(e) => setSessionEnd(e.target.value)}
                    className="mt-1 block w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-base"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="location-kind" className="block text-sm font-medium">
                  Location
                </label>
                <select
                  id="location-kind"
                  value={locationKind}
                  onChange={(e) =>
                    setLocationKind(e.target.value as ProgramLocationKind | "")
                  }
                  className="mt-1 block w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-base"
                >
                  <option value="">Not set</option>
                  <option value="branch">KCMI branch</option>
                  <option value="venue">Venue</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              {locationKind === "branch" ? (
                <div>
                  <label htmlFor="location-branch" className="block text-sm font-medium">
                    Branch
                  </label>
                  <select
                    id="location-branch"
                    value={locationBranchId}
                    onChange={(e) => setLocationBranchId(e.target.value)}
                    className="mt-1 block w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-base"
                  >
                    <option value="">Choose a branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {locationKind === "venue" ||
              locationKind === "hybrid" ||
              locationKind === "online" ? (
                <div>
                  <label htmlFor="location-label" className="block text-sm font-medium">
                    Place name
                  </label>
                  <input
                    id="location-label"
                    value={locationLabel}
                    onChange={(e) => setLocationLabel(e.target.value)}
                    className="mt-1 block w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-base"
                  />
                </div>
              ) : null}

              <div>
                <label htmlFor="action-kind" className="block text-sm font-medium">
                  Visitor link
                </label>
                <select
                  id="action-kind"
                  value={actionKind}
                  onChange={(e) =>
                    setActionKind(e.target.value as ProgramActionKind)
                  }
                  className="mt-1 block w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-base"
                >
                  <option value="none">No link</option>
                  <option value="other">Website link</option>
                  <option value="youtube">YouTube</option>
                  <option value="facebook">Facebook</option>
                  <option value="registration">Registration link</option>
                </select>
              </div>
              {actionKind !== "none" ? (
                <div>
                  <label htmlFor="cta-url" className="block text-sm font-medium">
                    Link URL
                  </label>
                  <input
                    id="cta-url"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    className="mt-1 block w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-base"
                  />
                </div>
              ) : null}
            </div>
          </details>

          {stepError ? (
            <p className="text-base text-[var(--color-destructive)]" role="alert">
              {stepError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-6">
            {isPublished ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setReviewPreviewed(true);
                    setStepError(null);
                  }}
                  className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-5 text-base font-semibold"
                >
                  {HUB_ACTION_LABELS.previewChanges}
                </button>
                <button
                  type="button"
                  disabled={isPending || !reviewPreviewed || !canPublish}
                  onClick={() => submit("live")}
                  className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-[var(--color-action-primary-fg)] disabled:opacity-50"
                  data-testid="program-make-live"
                >
                  {isPending ? "Saving…" : HUB_ACTION_LABELS.makeChangesLive}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => submit("draft")}
                  className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-5 text-base font-semibold disabled:opacity-50"
                  data-testid="program-save-draft"
                >
                  {isPending
                    ? "Saving…"
                    : isEdit
                      ? "Save draft changes"
                      : HUB_ACTION_LABELS.createProgramDraft}
                </button>
                {canPublish ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => submit("publish")}
                    className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-[var(--color-action-primary-fg)] disabled:opacity-50"
                    data-testid="program-publish"
                  >
                    {isPending ? "Publishing…" : "Publish Program"}
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
