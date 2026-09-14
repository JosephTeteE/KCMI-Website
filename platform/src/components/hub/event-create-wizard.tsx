"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createEvent,
  saveEventWizardEdit,
} from "@/app/admin/events/actions";
import { EventDetailBody } from "@/components/events/event-detail";
import {
  HubSelectField,
  HubTextAreaField,
  HubTextField,
} from "@/components/hub/hub-form-fields";
import { HubPreviewFrame } from "@/components/hub/hub-preview-frame";
import { MediaChooser, type MediaChooserItem } from "@/components/hub/media-chooser";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";
import {
  EVENT_TIMEZONE_OPTIONS,
  zonedLocalToUtcIso,
} from "@/lib/events/datetime";
import { EVENT_KIND_OPTIONS, type EventKind } from "@/lib/events/parse-fields";
import { toPublicEventDetail } from "@/lib/events/hub-preview";
import { formatEventDateLabel } from "@/lib/events/format";
import type { PublicEventKind } from "@/lib/events/types";

export type EventWizardBranch = {
  id: string;
  name: string;
  country: string | null;
  cityLabel: string;
  slug: string;
};

export type EventWizardInitial = {
  id: string;
  title: string;
  theme: string;
  summary: string;
  bodyText: string;
  eventKind: EventKind;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timezone: string;
  venueLabel: string;
  venueCity: string;
  venueCountry: string;
  locationBranchId: string;
  contactEmail: string;
  contactPhoneDisplay: string;
  featuredMediaId: string | null;
  posterPreviewUrl: string | null;
  posterAlt: string | null;
  status: "draft" | "preview" | "published" | "archived";
  slug: string;
};

const STEPS = [
  { id: 1, title: "Details" },
  { id: 2, title: "When" },
  { id: 3, title: "Where" },
  { id: 4, title: "Photo" },
  { id: 5, title: "Contact" },
  { id: 6, title: "Review" },
] as const;

export function EventCreateWizard(props: {
  branches: EventWizardBranch[];
  media: MediaChooserItem[];
}) {
  return <EventWizard mode="create" canManage {...props} />;
}

export function EventWizard({
  mode,
  branches,
  media,
  initial,
  canManage = false,
}: {
  mode: "create" | "edit";
  branches: EventWizardBranch[];
  media: MediaChooserItem[];
  initial?: EventWizardInitial;
  canManage?: boolean;
}) {
  const isEdit = mode === "edit" && Boolean(initial);
  const isPublished = isEdit && initial?.status === "published";

  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [changeUnlocked, setChangeUnlocked] = useState(!isPublished);
  const [reviewPreviewed, setReviewPreviewed] = useState(false);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [theme, setTheme] = useState(initial?.theme ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [bodyText, setBodyText] = useState(initial?.bodyText ?? "");
  const [eventKind, setEventKind] = useState<EventKind>(
    initial?.eventKind ?? "other",
  );

  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "");
  const [timezone, setTimezone] = useState(
    initial?.timezone ?? "Africa/Lagos",
  );

  const [venueLabel, setVenueLabel] = useState(initial?.venueLabel ?? "");
  const [venueCity, setVenueCity] = useState(initial?.venueCity ?? "");
  const [venueCountry, setVenueCountry] = useState(
    initial?.venueCountry ?? "",
  );
  const [locationBranchId, setLocationBranchId] = useState(
    initial?.locationBranchId ?? "",
  );

  const [posterMode, setPosterMode] = useState<"none" | "upload" | "library">(
    initial?.featuredMediaId ? "library" : "none",
  );
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterAlt, setPosterAlt] = useState(initial?.posterAlt ?? "");
  const [featuredMediaId, setFeaturedMediaId] = useState(
    initial?.featuredMediaId ?? "",
  );
  const [posterObjectUrl, setPosterObjectUrl] = useState<string | null>(null);

  const [contactEmail, setContactEmail] = useState(
    initial?.contactEmail ?? "",
  );
  const [contactPhoneDisplay, setContactPhoneDisplay] = useState(
    initial?.contactPhoneDisplay ?? "",
  );

  const fieldsLocked = isPublished && !changeUnlocked;
  const selectedBranch = branches.find((b) => b.id === locationBranchId);
  const selectedMedia = media.find((m) => m.id === featuredMediaId);

  const proposedImageSrc =
    posterMode === "upload" && posterObjectUrl
      ? posterObjectUrl
      : posterMode === "library" && selectedMedia
        ? selectedMedia.previewUrl
        : initial?.posterPreviewUrl ?? null;

  const proposedImageAlt =
    posterMode === "upload"
      ? posterAlt
      : selectedMedia?.alt || initial?.posterAlt || "";

  const previewDetail = useMemo(() => {
    const startsAt =
      zonedLocalToUtcIso(startDate, startTime || null, timezone) ??
      new Date().toISOString();
    const endsAt = endDate
      ? zonedLocalToUtcIso(endDate, endTime || null, timezone)
      : null;
    return toPublicEventDetail({
      id: initial?.id,
      slug: initial?.slug,
      title: title.trim() || "Untitled event",
      theme: theme.trim() || null,
      summary,
      bodyText,
      kind: eventKind as PublicEventKind,
      startsAt,
      endsAt,
      timezone,
      venueLabel: venueLabel.trim() || null,
      venueCity: venueCity.trim() || selectedBranch?.cityLabel || null,
      venueCountry: venueCountry.trim() || selectedBranch?.country || null,
      imageSrc: proposedImageSrc,
      imageAlt: proposedImageAlt,
      contactEmail: contactEmail.trim() || null,
      contactPhoneDisplay: contactPhoneDisplay.trim() || null,
      branchName: selectedBranch?.name ?? null,
      branchSlug: selectedBranch?.slug ?? null,
    });
  }, [
    startDate,
    startTime,
    endDate,
    endTime,
    timezone,
    title,
    theme,
    summary,
    bodyText,
    eventKind,
    venueLabel,
    venueCity,
    venueCountry,
    selectedBranch,
    proposedImageSrc,
    proposedImageAlt,
    contactEmail,
    contactPhoneDisplay,
    initial?.id,
    initial?.slug,
  ]);

  function validateStep(current: number): string | null {
    if (current === 1) {
      if (!title.trim()) return "Please enter an event name.";
      return null;
    }
    if (current === 2) {
      if (!startDate) return "Choose when the event starts.";
      if (endDate && endDate < startDate) {
        return "The end date cannot be earlier than the start date.";
      }
      return null;
    }
    if (current === 4) {
      if (posterMode === "upload") {
        if (!posterFile) return "Choose a photo to upload, or pick a different option.";
        if (!posterAlt.trim()) {
          return "Describe the photo for someone who cannot see it.";
        }
      }
      if (posterMode === "library" && !featuredMediaId) {
        return "Choose a photo from the library, or pick a different option.";
      }
      return null;
    }
    if (current === 5 && contactEmail.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
        return "Enter a valid contact email, or leave it blank.";
      }
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    setStep((s) => Math.min(6, s + 1));
  }

  function goPrevious() {
    setStepError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  function buildFormData(intent: "draft" | "live"): FormData {
    const fd = new FormData();
    if (initial?.id) fd.set("id", initial.id);
    fd.set("save_intent", intent);
    fd.set("title", title);
    fd.set("theme", theme);
    fd.set("summary", summary);
    fd.set("body_text", bodyText);
    fd.set("event_kind", eventKind);
    fd.set("start_date", startDate);
    fd.set("start_time", startTime);
    fd.set("end_date", endDate);
    fd.set("end_time", endTime);
    fd.set("timezone", timezone);
    fd.set("venue_label", venueLabel);
    fd.set("venue_city", venueCity);
    fd.set("venue_country", venueCountry);
    fd.set("location_branch_id", locationBranchId);
    fd.set("contact_email", contactEmail);
    fd.set("contact_phone_display", contactPhoneDisplay);
    if (posterMode === "library") {
      fd.set("featured_media_id", featuredMediaId);
    } else if (posterMode === "none") {
      fd.set("featured_media_id", "");
    } else if (posterMode === "upload" && posterFile) {
      fd.set("file", posterFile);
      fd.set("alt_text", posterAlt);
    } else if (initial?.featuredMediaId) {
      fd.set("featured_media_id", initial.featuredMediaId);
    }
    return fd;
  }

  function submitWizard(intent: "draft" | "live") {
    for (let s = 1; s <= 6; s += 1) {
      const err = validateStep(s);
      if (err) {
        setStep(s);
        setStepError(err);
        return;
      }
    }
    setStepError(null);
    const fd = buildFormData(intent);
    startTransition(async () => {
      if (isEdit) {
        await saveEventWizardEdit(fd);
      } else {
        await createEvent(fd);
      }
    });
  }

  const datesLabel =
    startDate &&
    formatEventDateLabel({
      startsAt:
        zonedLocalToUtcIso(startDate, startTime || null, timezone) ??
        `${startDate}T00:00:00Z`,
      endsAt: endDate
        ? zonedLocalToUtcIso(endDate, endTime || null, timezone)
        : null,
      timezone,
    });

  return (
    <div className="space-y-6">
      {isPublished && !changeUnlocked ? (
        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
          <p className="text-base font-semibold text-[var(--color-text-body)]">
            Currently on the website
          </p>
          <p className="mt-1 hub-help text-[var(--color-text-muted)]">
            Visitors see this event now. Change details only when you are ready
            to preview and make updates live.
          </p>
          <dl className="mt-4 grid gap-3 text-base sm:grid-cols-2">
            <div>
              <dt className="font-medium text-[var(--color-text-muted)]">Name</dt>
              <dd className="mt-1">{initial?.title}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-text-muted)]">When</dt>
              <dd className="mt-1">{datesLabel || "—"}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="mt-5 inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-[var(--color-action-primary-fg)]"
            onClick={() => setChangeUnlocked(true)}
          >
            Change this event
          </button>
        </section>
      ) : null}

      {(!isPublished || changeUnlocked) && (
        <>
          <ol className="flex flex-wrap gap-2" aria-label="Event steps">
            {STEPS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={fieldsLocked}
                  onClick={() => {
                    setStepError(null);
                    setStep(item.id);
                  }}
                  className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${
                    step === item.id
                      ? "bg-[var(--color-action-primary)] text-[var(--color-action-primary-fg)]"
                      : "border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-body)]"
                  }`}
                >
                  {item.id}. {item.title}
                </button>
              </li>
            ))}
          </ol>

          <p className="hub-help text-[var(--color-text-muted)]">
            Step {step} of {STEPS.length}.{" "}
            {isPublished
              ? "Changes stay private until you make them live."
              : "This saves as a draft and will not appear on the website until you make it live."}
          </p>

          {stepError ? (
            <p
              role="alert"
              className="rounded-[var(--radius-md)] border border-[var(--color-destructive)] bg-[color-mix(in_srgb,var(--color-destructive)_8%,transparent)] px-4 py-3 text-base text-[var(--color-destructive)]"
            >
              {stepError}
            </p>
          ) : null}

          <fieldset disabled={fieldsLocked || isPending} className="space-y-6">
            {step === 1 ? (
              <section className="space-y-4">
                <HubTextField
                  label="Event name"
                  id="title_ui"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <HubTextField
                  label="Theme (optional)"
                  id="theme_ui"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  hint="A short theme line visitors may see under the title."
                />
                <HubSelectField
                  label="What kind of event is this?"
                  id="event_kind_ui"
                  value={eventKind}
                  onChange={(e) => setEventKind(e.target.value as EventKind)}
                >
                  {EVENT_KIND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </HubSelectField>
                <HubTextAreaField
                  label="Short summary"
                  id="summary_ui"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  hint="A few sentences for the Events list and page intro."
                />
                <HubTextAreaField
                  label="Full details"
                  id="body_ui"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={6}
                  hint="Longer information visitors read on the event page."
                />
              </section>
            ) : null}

            {step === 2 ? (
              <section className="space-y-4">
                <HubSelectField
                  label="Timezone"
                  id="timezone_ui"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  {EVENT_TIMEZONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </HubSelectField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <HubTextField
                    label="Start date"
                    id="start_date_ui"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                  <HubTextField
                    label="Start time (optional)"
                    id="start_time_ui"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                  <HubTextField
                    label="End date (optional)"
                    id="end_date_ui"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                  <HubTextField
                    label="End time (optional)"
                    id="end_time_ui"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </section>
            ) : null}

            {step === 3 ? (
              <section className="space-y-4">
                <HubTextField
                  label="Venue name (optional)"
                  id="venue_label_ui"
                  value={venueLabel}
                  onChange={(e) => setVenueLabel(e.target.value)}
                  hint="For example: KCMI Headquarters auditorium."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <HubTextField
                    label="City (optional)"
                    id="venue_city_ui"
                    value={venueCity}
                    onChange={(e) => setVenueCity(e.target.value)}
                  />
                  <HubTextField
                    label="Country (optional)"
                    id="venue_country_ui"
                    value={venueCountry}
                    onChange={(e) => setVenueCountry(e.target.value)}
                  />
                </div>
                <HubSelectField
                  label="Link a KCMI branch (optional)"
                  id="location_branch_id_ui"
                  value={locationBranchId}
                  onChange={(e) => setLocationBranchId(e.target.value)}
                  hint="When linked, visitors can open that branch page from the event."
                >
                  <option value="">No branch link</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                      {branch.country ? ` · ${branch.country}` : ""}
                    </option>
                  ))}
                </HubSelectField>
              </section>
            ) : null}

            {step === 4 ? (
              <section className="space-y-4">
                <p className="hub-help text-[var(--color-text-muted)]">
                  Event photos use the same Photos library as the rest of the
                  website. You can skip a photo — the public page uses a branded
                  text layout instead.
                </p>
                <div className="flex flex-wrap gap-3">
                  {(
                    [
                      ["none", "No photo"],
                      ["upload", HUB_ACTION_LABELS.uploadNewPhoto],
                      ["library", HUB_ACTION_LABELS.useSavedPhoto],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className={`inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-md)] border px-4 text-base ${
                        posterMode === value
                          ? "border-[var(--color-action-primary)] bg-[color-mix(in_srgb,var(--color-action-primary)_10%,transparent)] font-semibold"
                          : "border-[var(--color-border)]"
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name="poster_mode"
                        checked={posterMode === value}
                        onChange={() => {
                          setPosterMode(value);
                          if (value !== "upload") {
                            setPosterFile(null);
                            if (posterObjectUrl) {
                              URL.revokeObjectURL(posterObjectUrl);
                              setPosterObjectUrl(null);
                            }
                          }
                        }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {posterMode === "upload" ? (
                  <div className="space-y-4">
                    <HubTextField
                      label="Choose a photo"
                      id="file_ui"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setPosterFile(file);
                        if (posterObjectUrl) URL.revokeObjectURL(posterObjectUrl);
                        setPosterObjectUrl(file ? URL.createObjectURL(file) : null);
                      }}
                    />
                    <HubTextField
                      label="Describe the photo"
                      id="alt_text_ui"
                      value={posterAlt}
                      onChange={(e) => setPosterAlt(e.target.value)}
                      hint="This helps visitors who cannot see the image."
                    />
                  </div>
                ) : null}
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
                {proposedImageSrc ? (
                  <div className="relative aspect-[16/9] max-w-lg overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-tint)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proposedImageSrc}
                      alt={proposedImageAlt || ""}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
              </section>
            ) : null}

            {step === 5 ? (
              <section className="space-y-4">
                <HubTextField
                  label="Public contact email (optional)"
                  id="contact_email_ui"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
                <HubTextField
                  label="Public phone display (optional)"
                  id="contact_phone_ui"
                  value={contactPhoneDisplay}
                  onChange={(e) => setContactPhoneDisplay(e.target.value)}
                  hint="Shown exactly as typed (for example +234 …)."
                />
              </section>
            ) : null}

            {step === 6 ? (
              <section className="space-y-6">
                <dl className="grid gap-4 text-base sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-[var(--color-text-muted)]">
                      Name
                    </dt>
                    <dd className="mt-1">{title || "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[var(--color-text-muted)]">
                      Kind
                    </dt>
                    <dd className="mt-1">
                      {EVENT_KIND_OPTIONS.find((o) => o.value === eventKind)
                        ?.label ?? eventKind}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[var(--color-text-muted)]">
                      When
                    </dt>
                    <dd className="mt-1">{datesLabel || "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[var(--color-text-muted)]">
                      Where
                    </dt>
                    <dd className="mt-1">
                      {[venueLabel, venueCity, venueCountry, selectedBranch?.name]
                        .filter(Boolean)
                        .join(" · ") || "Not set"}
                    </dd>
                  </div>
                </dl>

                <HubPreviewFrame
                  title="Visitor event page"
                  variant={isPublished ? "proposed" : "draft"}
                >
                  <div className="bg-[var(--color-surface-page)] p-4">
                    <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-action-primary)]">
                      {previewDetail.kindLabel}
                    </p>
                    <h2 className="font-display text-2xl font-semibold">
                      {previewDetail.title}
                    </h2>
                    <p className="mt-1 text-base text-[var(--color-text-muted)]">
                      {previewDetail.datesLabel}
                    </p>
                    <div className="mt-6">
                      <EventDetailBody
                        event={previewDetail}
                        showAllEventsLink={false}
                      />
                    </div>
                  </div>
                </HubPreviewFrame>

                {!isPublished ? (
                  <p className="text-base text-[var(--color-text-muted)]">
                    {isEdit
                      ? "Saving keeps this event as a draft. It will not appear on the public website."
                      : "Saving creates a draft only. Make it live from the event page when ready."}
                  </p>
                ) : (
                  <p className="text-base text-[var(--color-text-muted)]">
                    Preview first. Making these changes live updates what
                    visitors see. The public web address stays the same.
                  </p>
                )}
              </section>
            ) : null}
          </fieldset>

          <div className="flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={goPrevious}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-base font-semibold"
              >
                Previous step
              </button>
            ) : null}
            {step < 6 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-[var(--color-action-primary-fg)]"
              >
                Next step
              </button>
            ) : isPublished ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setStepError(null);
                    setReviewPreviewed(true);
                  }}
                  className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-base font-semibold"
                >
                  {HUB_ACTION_LABELS.previewChanges}
                </button>
                <button
                  type="button"
                  disabled={isPending || !reviewPreviewed || !canManage}
                  onClick={() => submitWizard("live")}
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-[var(--color-action-primary-fg)] disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="event-make-live"
                >
                  {isPending ? "Saving…" : HUB_ACTION_LABELS.makeChangesLive}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isPending || !canManage}
                onClick={() => submitWizard("draft")}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-[var(--color-action-primary-fg)] disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="event-save-draft"
              >
                {isPending
                  ? "Saving…"
                  : isEdit
                    ? "Save draft changes"
                    : HUB_ACTION_LABELS.createEventDraft}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
