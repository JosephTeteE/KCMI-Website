"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createProgram,
  saveProgramWizardEdit,
} from "@/app/admin/programs/actions";
import {
  HubSelectField,
  HubTextAreaField,
  HubTextField,
} from "@/components/hub/hub-form-fields";
import { MediaChooser, type MediaChooserItem } from "@/components/hub/media-chooser";
import { ProgramReviewScheduleSummary } from "@/components/hub/program-review-schedule-summary";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";
import { HUB_TOUR_PROGRAM_WIZARD_STEP_EVENT } from "@/lib/hub/tour";
import {
  programActionLabel,
  type ProgramActionKind,
} from "@/lib/programs/schedule";
import type { ProgramLocationKind } from "@/lib/programs/location";
import { DEFAULT_PROGRAM_TIMEZONE } from "@/lib/programs/sessions";
import { flattenProgramDays } from "@/lib/programs/days";
import type { WizardScheduleState } from "@/lib/programs/wizard-state";

export type ProgramWizardBranch = {
  id: string;
  name: string;
  country: string | null;
};

export type ProgramWizardInitial = {
  id: string;
  title: string;
  shortDescription: string;
  featuredMediaId: string | null;
  posterPreviewUrl: string | null;
  posterAlt: string | null;
  schedule: WizardScheduleState;
  locationKind: ProgramLocationKind | "";
  locationBranchId: string;
  locationLabel: string;
  actionKind: ProgramActionKind;
  ctaUrl: string;
  placement: "none" | "featured";
  status: "draft" | "preview" | "published" | "archived";
  timezone: string;
};

type ScheduleMode = "one_day" | "several_days";

/** One timed slot under a day (UI). Flattened to program_sessions on save. */
type DaySessionDraft = {
  key: string;
  startTime: string;
  endTime: string;
  label: string;
};

/** One calendar day with one or more sessions. Date is entered once. */
type DayDraft = {
  key: string;
  sessionDate: string;
  sessions: DaySessionDraft[];
};

const STEPS = [
  { id: 1, title: "About" },
  { id: 2, title: "When" },
  { id: 3, title: "Where" },
  { id: 4, title: "Visitor link" },
  { id: 5, title: "Review" },
] as const;

const LOCATION_OPTIONS: {
  value: ProgramLocationKind;
  label: string;
  hint: string;
}[] = [
  {
    value: "branch",
    label: "At a KCMI branch",
    hint: "Choose the branch by name.",
  },
  {
    value: "venue",
    label: "Another venue",
    hint: "A hall, stadium, or other place that is not a listed branch.",
  },
  {
    value: "online",
    label: "Online",
    hint: "Visitors join on the internet only.",
  },
  {
    value: "hybrid",
    label: "Both in-person and online",
    hint: "People can come in person and also join online.",
  },
];

const ACTION_OPTIONS: {
  value: ProgramActionKind;
  label: string;
}[] = [
  { value: "none", label: "No — no link needed" },
  { value: "registration", label: "Yes — registration or sign-up" },
  { value: "youtube", label: "Yes — YouTube video" },
  { value: "facebook", label: "Yes — Facebook video" },
  { value: "other", label: "Yes — another website" },
];

function newKey(): string {
  return crypto.randomUUID();
}

function emptyDaySession(partial?: Partial<DaySessionDraft>): DaySessionDraft {
  return {
    key: newKey(),
    startTime: "",
    endTime: "",
    label: "",
    ...partial,
  };
}

function emptyDay(partial?: Partial<DayDraft>): DayDraft {
  return {
    key: newKey(),
    sessionDate: "",
    sessions: [emptyDaySession()],
    ...partial,
  };
}

function choiceClass(selected: boolean): string {
  return [
    "flex min-h-11 cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border px-3 py-3 text-base",
    selected
      ? "border-[var(--color-action-primary)] bg-[var(--color-surface-tint)]"
      : "border-[var(--color-border)] bg-[var(--color-surface-elevated)]",
  ].join(" ");
}

function formatDateHeading(isoDate: string): string {
  if (!isoDate) return "Date not set";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTimeLabel(raw: string): string {
  if (!raw) return "";
  const [hh, mm] = raw.split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return raw;
  const dt = new Date();
  dt.setHours(hh!, mm!, 0, 0);
  return dt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function daysFromSchedule(schedule: WizardScheduleState): DayDraft[] {
  return schedule.days.map((day) => ({
    key: newKey(),
    sessionDate: day.sessionDate,
    sessions: day.sessions.map((session) =>
      emptyDaySession({
        startTime: session.startTime,
        endTime: session.endTime,
        label: session.label,
      }),
    ),
  }));
}

export function ProgramCreateWizard({
  branches,
  media,
}: {
  branches: ProgramWizardBranch[];
  media: MediaChooserItem[];
}) {
  return <ProgramWizard mode="create" branches={branches} media={media} />;
}

export function ProgramWizard({
  mode,
  branches,
  media,
  initial,
  canPublish = false,
}: {
  mode: "create" | "edit";
  branches: ProgramWizardBranch[];
  media: MediaChooserItem[];
  initial?: ProgramWizardInitial;
  canPublish?: boolean;
}) {
  const isEdit = mode === "edit" && Boolean(initial);
  const isPublished = isEdit && initial?.status === "published";
  const isDraft = !isPublished;

  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [changeUnlocked, setChangeUnlocked] = useState(!isPublished);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [shortDescription, setShortDescription] = useState(
    initial?.shortDescription ?? "",
  );
  const [posterMode, setPosterMode] = useState<"none" | "upload" | "library">(
    initial?.featuredMediaId ? "library" : "none",
  );
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterAlt, setPosterAlt] = useState(initial?.posterAlt ?? "");
  const [featuredMediaId, setFeaturedMediaId] = useState(
    initial?.featuredMediaId ?? "",
  );
  const [placement] = useState<"none" | "featured">(
    initial?.placement ?? "none",
  );

  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>(
    initial?.schedule.scheduleMode ?? "one_day",
  );
  const [oneDay, setOneDay] = useState(
    initial?.schedule.oneDay ?? {
      sessionDate: "",
      startTime: "",
      endTime: "",
    },
  );
  const [days, setDays] = useState<DayDraft[]>(() =>
    initial ? daysFromSchedule(initial.schedule) : [emptyDay()],
  );

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
  const [reviewPreviewed, setReviewPreviewed] = useState(false);

  useEffect(() => {
    function onTourWizardStep(event: Event) {
      const detail = (event as CustomEvent<{ step?: number }>).detail;
      const next = detail?.step;
      if (typeof next !== "number" || next < 1 || next > 5) return;
      setStepError(null);
      setStep(next);
    }
    window.addEventListener(HUB_TOUR_PROGRAM_WIZARD_STEP_EVENT, onTourWizardStep);
    return () =>
      window.removeEventListener(
        HUB_TOUR_PROGRAM_WIZARD_STEP_EVENT,
        onTourWizardStep,
      );
  }, []);

  const fieldsLocked = isPublished && !changeUnlocked;

  const selectedBranch = branches.find((b) => b.id === locationBranchId);
  const selectedMedia = media.find((m) => m.id === featuredMediaId);

  const effectiveSessions = useMemo(() => {
    if (scheduleMode === "one_day") {
      if (!oneDay.sessionDate || !oneDay.startTime) return [];
      return [
        {
          session_date: oneDay.sessionDate,
          start_time: oneDay.startTime,
          end_time: oneDay.endTime || null,
          label: null as string | null,
          sort_order: 0,
        },
      ];
    }
    return flattenProgramDays(days);
  }, [scheduleMode, oneDay, days]);

  const scheduleSessions = effectiveSessions.map((s) => ({
    sessionDate: s.session_date,
    startTime: s.start_time,
    endTime: s.end_time,
    label: s.label,
    sortOrder: s.sort_order,
  }));

  function validateStep(current: number): string | null {
    if (current === 1) {
      if (!title.trim()) return "Please enter a program name.";
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
    if (current === 2) {
      if (scheduleMode === "one_day") {
        if (!oneDay.sessionDate) return "Choose the date.";
        if (!oneDay.startTime) return "Choose the start time.";
        if (
          oneDay.endTime &&
          oneDay.startTime &&
          oneDay.endTime < oneDay.startTime
        ) {
          return "The finish time cannot be earlier than the start time.";
        }
        return null;
      }
      const filledDays = days.filter(
        (day) =>
          day.sessionDate ||
          day.sessions.some((s) => s.startTime || s.endTime || s.label),
      );
      if (filledDays.length === 0) {
        return "Add at least one day with a date and start time.";
      }
      for (const day of filledDays) {
        if (!day.sessionDate) return "Every day needs a date.";
        const activeSessions = day.sessions.filter(
          (s) => s.startTime || s.endTime || s.label,
        );
        const sessionsToCheck =
          activeSessions.length > 0 ? activeSessions : day.sessions;
        for (const session of sessionsToCheck) {
          if (!session.startTime && !session.endTime && !session.label) continue;
          if (!session.startTime) return "Every session needs a start time.";
          if (
            session.endTime &&
            session.startTime &&
            session.endTime < session.startTime
          ) {
            return "A session cannot finish before it starts.";
          }
        }
        if (!day.sessions.some((s) => s.startTime)) {
          return "Add at least one session with a start time for each day.";
        }
      }
      if (effectiveSessions.length === 0) {
        return "Add at least one day with a date and start time.";
      }
      return null;
    }
    if (current === 3) {
      if (!locationKind) return "Choose where this program happens.";
      if (locationKind === "branch" && !locationBranchId) {
        return "Choose a KCMI branch.";
      }
      if (
        (locationKind === "venue" || locationKind === "hybrid") &&
        !locationLabel.trim()
      ) {
        return locationKind === "hybrid"
          ? "Enter the place name for the in-person part."
          : "Enter the venue name.";
      }
      return null;
    }
    if (current === 4) {
      if (actionKind === "none") return null;
      if (!ctaUrl.trim()) {
        if (actionKind === "registration") {
          return "Paste the registration or sign-up link.";
        }
        if (actionKind === "youtube") return "Paste the YouTube link.";
        if (actionKind === "facebook") return "Paste the Facebook link.";
        return "Paste the link visitors should open.";
      }
      return null;
    }
    return null;
  }

  function goNext() {
    const error = validateStep(step);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    setStep((s) => Math.min(5, s + 1));
  }

  function goPrevious() {
    setStepError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  function locationSummary(): string {
    if (locationKind === "branch") {
      return selectedBranch?.name ?? "KCMI branch";
    }
    if (locationKind === "venue") {
      return locationLabel.trim() || "Another venue";
    }
    if (locationKind === "online") return "Online";
    if (locationKind === "hybrid") {
      return `In person (${locationLabel.trim() || "place TBA"}) and online`;
    }
    return "Not set";
  }

  function actionSummary(): string {
    if (actionKind === "none") return "No visitor link";
    const label = programActionLabel(actionKind) ?? "Learn more";
    return `${label} → ${ctaUrl.trim() || "(link missing)"}`;
  }

  function submitWizard(intent: "draft" | "live") {
    const errors = [1, 2, 3, 4]
      .map((s) => validateStep(s))
      .filter(Boolean) as string[];
    if (errors[0]) {
      setStepError(errors[0]);
      return;
    }
    if (isPublished && intent === "live" && !reviewPreviewed) {
      setStepError("Preview your changes before making them live.");
      return;
    }

    const fd = new FormData();
    if (isEdit && initial) {
      fd.set("id", initial.id);
      fd.set("save_intent", intent);
      fd.set("placement", placement);
      fd.set("body_text", "");
    } else {
      fd.set("body_text", "");
      fd.set("placement", "none");
    }
    fd.set("title", title.trim());
    fd.set("short_description", shortDescription.trim());
    fd.set("sessions_json", JSON.stringify(effectiveSessions));
    fd.set("timezone", initial?.timezone ?? DEFAULT_PROGRAM_TIMEZONE);
    fd.set("location_kind", locationKind);
    if (locationKind === "branch") {
      fd.set("location_branch_id", locationBranchId);
    } else if (locationKind === "venue" || locationKind === "hybrid") {
      fd.set("location_label", locationLabel.trim());
    } else if (locationKind === "online") {
      fd.set("location_label", locationLabel.trim() || "Online");
    }
    fd.set("action_kind", actionKind);
    if (actionKind !== "none") {
      fd.set("cta_url", ctaUrl.trim());
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

    startTransition(() => {
      if (isEdit) {
        void saveProgramWizardEdit(fd);
      } else {
        void createProgram(fd);
      }
    });
  }

  const statusBanner =
    isEdit && isDraft ? (
      <p
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-tint)] px-4 py-3 text-base font-semibold text-[var(--color-text-body)]"
        data-testid="program-draft-banner"
      >
        DRAFT — NOT ON THE WEBSITE
      </p>
    ) : isPublished ? (
      <p
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-base font-semibold text-[var(--color-text-body)]"
        data-testid="program-live-banner"
      >
        Currently on the website
      </p>
    ) : null;

  return (
    <div className="max-w-2xl space-y-8" data-tour="program-wizard">
      {statusBanner}

      {isPublished && !changeUnlocked ? (
        <div className="space-y-4" data-testid="program-live-locked">
          <dl className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 text-base">
            <div>
              <dt className="font-medium text-[var(--color-text-muted)]">Name</dt>
              <dd className="mt-1 text-[var(--color-text-body)]">
                {title.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-text-muted)]">When</dt>
              <dd className="mt-1 text-[var(--color-text-body)]">
                <ProgramReviewScheduleSummary sessions={scheduleSessions} />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-text-muted)]">Where</dt>
              <dd className="mt-1 text-[var(--color-text-body)]">
                {locationSummary()}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-text-muted)]">
                Visitor link
              </dt>
              <dd className="mt-1 break-all text-[var(--color-text-body)]">
                {actionSummary()}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => setChangeUnlocked(true)}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-[var(--color-action-primary-fg)]"
            data-tour="program-change"
          >
            {HUB_ACTION_LABELS.changeSermonDetails}
          </button>
        </div>
      ) : null}

      {!(isPublished && !changeUnlocked) ? (
        <>
      <nav aria-label="Program steps" className="space-y-3">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((item) => {
            const active = item.id === step;
            const done = item.id < step;
            return (
              <li
                key={item.id}
                className={[
                  "inline-flex min-h-9 items-center rounded-full px-3 text-sm font-semibold",
                  active
                    ? "bg-[var(--color-action-primary)] text-[var(--color-action-primary-fg)]"
                    : done
                      ? "bg-[var(--color-surface-tint)] text-[var(--color-text-body)]"
                      : "border border-[var(--color-border)] text-[var(--color-text-muted)]",
                ].join(" ")}
                aria-current={active ? "step" : undefined}
              >
                {item.id}. {item.title}
              </li>
            );
          })}
        </ol>
        <p className="text-base text-[var(--color-text-muted)]">
          {isEdit
            ? isPublished
              ? `Step ${step} of ${STEPS.length}. Changes stay private until you make them live.`
              : `Step ${step} of ${STEPS.length}. Save keeps this as a draft — not on the website.`
            : `Step ${step} of ${STEPS.length}. This saves as a draft — not on the website yet.`}
        </p>
      </nav>

      {stepError ? (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] border border-[var(--color-destructive)] bg-[var(--color-surface-elevated)] px-4 py-3 text-base text-[var(--color-destructive)]"
        >
          {stepError}
        </p>
      ) : null}

      <fieldset
        disabled={fieldsLocked}
        className="min-w-0 space-y-8 border-0 p-0 disabled:opacity-70"
      >

      {step === 1 ? (
        <section className="space-y-6" data-tour="program-wizard-about">
          <h2 className="text-xl font-semibold text-[var(--color-text-body)]">
            About this program
          </h2>
          <HubTextField
            id="title"
            label="Program name"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <HubTextAreaField
            id="short_description"
            label="Short description"
            hint="A short blurb for cards and lists."
            rows={3}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
          />

          <fieldset className="space-y-3">
            <legend className="text-base font-medium text-[var(--color-text-body)]">
              Program poster / main photo
            </legend>
            {isEdit &&
            (initial?.posterPreviewUrl ||
              (posterMode === "library" && featuredMediaId)) ? (
              <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
                <p className="text-base font-medium text-[var(--color-text-body)]">
                  Current poster
                </p>
                {initial?.posterPreviewUrl || selectedMedia?.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Hub admin preview of existing asset URL
                  <img
                    src={
                      selectedMedia?.previewUrl ??
                      initial?.posterPreviewUrl ??
                      ""
                    }
                    alt={
                      selectedMedia?.alt ||
                      initial?.posterAlt ||
                      "Current program poster"
                    }
                    className="aspect-[4/3] w-full max-w-sm rounded-[var(--radius-md)] object-cover"
                  />
                ) : null}
                <p className="hub-help text-[var(--color-text-muted)]">
                  {HUB_ACTION_LABELS.replacePhoto}: choose upload or an existing
                  photo below. Preview on Review, then save.
                </p>
              </div>
            ) : (
              <p className="hub-help text-[var(--color-text-muted)]">
                Optional. You can upload a new photo here or reuse one already
                saved.
              </p>
            )}
            {(
              [
                { value: "none", label: "No photo for now" },
                { value: "upload", label: HUB_ACTION_LABELS.uploadNewPhoto },
                { value: "library", label: HUB_ACTION_LABELS.useSavedPhoto },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={choiceClass(posterMode === option.value)}
              >
                <input
                  type="radio"
                  name="poster_mode"
                  className="mt-1 size-5"
                  checked={posterMode === option.value}
                  onChange={() => {
                    setPosterMode(option.value);
                    if (option.value !== "upload") setPosterFile(null);
                    if (option.value === "library" && initial?.featuredMediaId) {
                      setFeaturedMediaId(initial.featuredMediaId);
                    } else if (option.value !== "library") {
                      setFeaturedMediaId("");
                    }
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>

          {posterMode === "upload" ? (
            <div className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
              <div>
                <label
                  htmlFor="poster_file"
                  className="block text-base font-medium text-[var(--color-text-body)]"
                >
                  Choose photo
                </label>
                <input
                  id="poster_file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="mt-2 w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-base file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-surface-tint)] file:px-3 file:py-1.5 file:text-base file:font-medium"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setPosterFile(file);
                  }}
                />
                {posterFile ? (
                  <p className="hub-help mt-1.5 text-[var(--color-text-muted)]">
                    Selected: {posterFile.name}
                  </p>
                ) : null}
              </div>
              <HubTextAreaField
                id="alt_text"
                label="Describe this photo"
                hint="For someone who cannot see the image."
                rows={2}
                value={posterAlt}
                onChange={(e) => setPosterAlt(e.target.value)}
              />
            </div>
          ) : null}

          {posterMode === "library" ? (
            <MediaChooser
              items={media}
              selectedId={featuredMediaId || null}
              onSelect={(item) => setFeaturedMediaId(item.id)}
              heading="Choose a saved photo"
            />
          ) : null}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-6" data-tour="program-wizard-when">
          <h2 className="text-xl font-semibold text-[var(--color-text-body)]">
            When is it?
          </h2>
          <fieldset className="space-y-3">
            <legend className="text-base font-medium text-[var(--color-text-body)]">
              How many days?
            </legend>
            <label className={choiceClass(scheduleMode === "one_day")}>
              <input
                type="radio"
                name="schedule_mode"
                value="one_day"
                className="mt-1 size-5"
                checked={scheduleMode === "one_day"}
                onChange={() => setScheduleMode("one_day")}
              />
              <span>
                <span className="block font-medium">One day</span>
                <span className="hub-help block text-[var(--color-text-muted)]">
                  A single date with a start time, and an optional finish time.
                </span>
              </span>
            </label>
            <label className={choiceClass(scheduleMode === "several_days")}>
              <input
                type="radio"
                name="schedule_mode"
                value="several_days"
                className="mt-1 size-5"
                checked={scheduleMode === "several_days"}
                onChange={() => setScheduleMode("several_days")}
              />
              <span>
                <span className="block font-medium">Several days</span>
                <span className="hub-help block text-[var(--color-text-muted)]">
                  Add each day once. Put morning and evening sessions under the
                  same day — you do not re-enter the date for each session.
                </span>
              </span>
            </label>
          </fieldset>

          {scheduleMode === "one_day" ? (
            <div className="grid gap-6 sm:grid-cols-2">
              <HubTextField
                id="one_day_date"
                label="Date"
                type="date"
                required
                value={oneDay.sessionDate}
                onChange={(e) =>
                  setOneDay((prev) => ({
                    ...prev,
                    sessionDate: e.target.value,
                  }))
                }
              />
              <HubTextField
                id="one_day_start"
                label="Start time"
                type="time"
                required
                value={oneDay.startTime}
                onChange={(e) =>
                  setOneDay((prev) => ({
                    ...prev,
                    startTime: e.target.value,
                  }))
                }
              />
              <HubTextField
                id="one_day_end"
                label="Finish time (optional)"
                type="time"
                hint="Leave blank if you do not know the finish time yet."
                value={oneDay.endTime}
                onChange={(e) =>
                  setOneDay((prev) => ({
                    ...prev,
                    endTime: e.target.value,
                  }))
                }
              />
            </div>
          ) : (
            <div className="space-y-6" data-tour="program-multi-day-builder">
              {days.map((day, dayIndex) => (
                <div
                  key={day.key}
                  data-program-day={day.sessionDate || String(dayIndex + 1)}
                  className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"
                >
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-[var(--color-text-body)]">
                      {day.sessionDate
                        ? formatDateHeading(day.sessionDate)
                        : `Day ${dayIndex + 1}`}
                    </h3>
                    <HubTextField
                      id={`day_date_${day.key}`}
                      label="Date"
                      type="date"
                      required
                      value={day.sessionDate}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDays((prev) =>
                          prev.map((row) =>
                            row.key === day.key
                              ? { ...row, sessionDate: value }
                              : row,
                          ),
                        );
                      }}
                    />
                  </div>

                  {day.sessions.map((session, sessionIndex) => (
                    <div
                      key={session.key}
                      className="space-y-3 border-t border-[var(--color-border)] pt-4"
                    >
                      <p className="text-base font-medium text-[var(--color-text-body)]">
                        Session {sessionIndex + 1}
                        {session.startTime
                          ? ` · ${formatTimeLabel(session.startTime)}`
                          : ""}
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <HubTextField
                          id={`session_label_${session.key}`}
                          label="Session name (optional)"
                          placeholder="Morning service"
                          value={session.label}
                          onChange={(e) => {
                            const value = e.target.value;
                            setDays((prev) =>
                              prev.map((row) =>
                                row.key === day.key
                                  ? {
                                      ...row,
                                      sessions: row.sessions.map((s) =>
                                        s.key === session.key
                                          ? { ...s, label: value }
                                          : s,
                                      ),
                                    }
                                  : row,
                              ),
                            );
                          }}
                        />
                        <HubTextField
                          id={`session_start_${session.key}`}
                          label="Start time"
                          type="time"
                          value={session.startTime}
                          onChange={(e) => {
                            const value = e.target.value;
                            setDays((prev) =>
                              prev.map((row) =>
                                row.key === day.key
                                  ? {
                                      ...row,
                                      sessions: row.sessions.map((s) =>
                                        s.key === session.key
                                          ? { ...s, startTime: value }
                                          : s,
                                      ),
                                    }
                                  : row,
                              ),
                            );
                          }}
                        />
                        <HubTextField
                          id={`session_end_${session.key}`}
                          label="Finish time (optional)"
                          type="time"
                          value={session.endTime}
                          onChange={(e) => {
                            const value = e.target.value;
                            setDays((prev) =>
                              prev.map((row) =>
                                row.key === day.key
                                  ? {
                                      ...row,
                                      sessions: row.sessions.map((s) =>
                                        s.key === session.key
                                          ? { ...s, endTime: value }
                                          : s,
                                      ),
                                    }
                                  : row,
                              ),
                            );
                          }}
                        />
                      </div>
                      {day.sessions.length > 1 || days.length > 1 ? (
                        <button
                          type="button"
                          className="text-sm font-medium text-[var(--color-text-muted)] underline-offset-2 hover:underline"
                          onClick={() => {
                            setDays((prev) => {
                              const next = prev
                                .map((row) => {
                                  if (row.key !== day.key) return row;
                                  const sessions = row.sessions.filter(
                                    (s) => s.key !== session.key,
                                  );
                                  // Last session on a day: keep one empty session row
                                  // when this is the only day; otherwise drop the day.
                                  if (sessions.length === 0) {
                                    if (prev.length === 1) {
                                      return {
                                        ...row,
                                        sessions: [emptyDaySession()],
                                      };
                                    }
                                    return null;
                                  }
                                  return { ...row, sessions };
                                })
                                .filter((row): row is DayDraft => row != null);
                              return next.length > 0 ? next : [emptyDay()];
                            });
                          }}
                        >
                          Remove session
                        </button>
                      ) : null}
                    </div>
                  ))}

                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-base font-semibold text-[var(--color-text-body)]"
                    onClick={() =>
                      setDays((prev) =>
                        prev.map((row) =>
                          row.key === day.key
                            ? {
                                ...row,
                                sessions: [...row.sessions, emptyDaySession()],
                              }
                            : row,
                        ),
                      )
                    }
                  >
                    Add another session
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-page)] px-5 text-base font-semibold text-[var(--color-text-body)]"
                onClick={() => setDays((prev) => [...prev, emptyDay()])}
              >
                Add another day
              </button>
            </div>
          )}
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-6" data-tour="program-wizard-where">
          <h2 className="text-xl font-semibold text-[var(--color-text-body)]">
            Where is it?
          </h2>
          <fieldset className="space-y-3">
            <legend className="text-base font-medium text-[var(--color-text-body)]">
              Choose one
            </legend>
            {LOCATION_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={choiceClass(locationKind === option.value)}
              >
                <input
                  type="radio"
                  name="location_kind"
                  className="mt-1 size-5"
                  checked={locationKind === option.value}
                  onChange={() => {
                    setLocationKind(option.value);
                    if (option.value !== "branch") setLocationBranchId("");
                    if (option.value === "online") setLocationLabel("");
                    if (option.value === "branch") setLocationLabel("");
                  }}
                />
                <span>
                  <span className="block font-medium">{option.label}</span>
                  <span className="hub-help block text-[var(--color-text-muted)]">
                    {option.hint}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {locationKind === "branch" ? (
            <HubSelectField
              id="location_branch_id"
              label="KCMI branch"
              required
              value={locationBranchId}
              onChange={(e) => setLocationBranchId(e.target.value)}
              hint={
                branches.length === 0
                  ? "No published branches are available yet."
                  : undefined
              }
            >
              <option value="">Choose a branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </HubSelectField>
          ) : null}

          {locationKind === "venue" || locationKind === "hybrid" ? (
            <HubTextField
              id="location_label"
              label={
                locationKind === "hybrid"
                  ? "In-person place name"
                  : "Venue name"
              }
              required
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              hint={
                locationKind === "hybrid"
                  ? "Example: National Theatre, Accra"
                  : "Example: City Convention Centre"
              }
            />
          ) : null}
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-6" data-tour="program-wizard-link">
          <h2 className="text-xl font-semibold text-[var(--color-text-body)]">
            Does this program need a link for visitors?
          </h2>
          <fieldset className="space-y-3">
            <legend className="sr-only">Visitor link</legend>
            {ACTION_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={choiceClass(actionKind === option.value)}
              >
                <input
                  type="radio"
                  name="action_kind"
                  className="mt-1 size-5"
                  checked={actionKind === option.value}
                  onChange={() => {
                    setActionKind(option.value);
                    if (option.value === "none") setCtaUrl("");
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>

          {actionKind !== "none" ? (
            <div className="space-y-3">
              <HubTextField
                id="cta_url"
                label={
                  actionKind === "registration"
                    ? "Registration link"
                    : actionKind === "youtube"
                      ? "YouTube link"
                      : actionKind === "facebook"
                        ? "Facebook link"
                        : "Website link"
                }
                required
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                hint={
                  actionKind === "other"
                    ? "Paste https://… or a page on this site like /giving."
                    : "Paste the full https:// link."
                }
              />
              <p className="text-base text-[var(--color-text-muted)]">
                Button label on the website:{" "}
                <strong className="font-semibold text-[var(--color-text-body)]">
                  {programActionLabel(actionKind)}
                </strong>
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 5 ? (
        <section className="space-y-6" data-tour="program-wizard-review">
          <h2 className="text-xl font-semibold text-[var(--color-text-body)]">
            {isPublished
              ? "Review your changes"
              : isEdit
                ? "Review and save draft changes"
                : "Review and save as draft"}
          </h2>
          <dl className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 text-base">
            <div>
              <dt className="font-medium text-[var(--color-text-muted)]">Name</dt>
              <dd className="mt-1 text-[var(--color-text-body)]">
                {title.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-text-muted)]">
                Short description
              </dt>
              <dd className="mt-1 text-[var(--color-text-body)]">
                {shortDescription.trim() || "None"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-text-muted)]">Photo</dt>
              <dd className="mt-1 text-[var(--color-text-body)]">
                {posterMode === "upload" && posterFile
                  ? `New upload: ${posterFile.name}`
                  : posterMode === "library" &&
                      (selectedMedia || initial?.posterPreviewUrl)
                    ? selectedMedia?.alt ||
                      initial?.posterAlt ||
                      "Current poster"
                    : "No photo"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-text-muted)]">When</dt>
              <dd className="mt-1 text-[var(--color-text-body)]">
                <ProgramReviewScheduleSummary sessions={scheduleSessions} />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-text-muted)]">Where</dt>
              <dd className="mt-1 text-[var(--color-text-body)]">
                {locationSummary()}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--color-text-muted)]">
                Visitor link
              </dt>
              <dd className="mt-1 break-all text-[var(--color-text-body)]">
                {actionSummary()}
              </dd>
            </div>
          </dl>
          {!isPublished ? (
            <p className="text-base text-[var(--color-text-muted)]">
              {isEdit
                ? "Saving keeps this program as a draft. It will not appear on the public website."
                : "Homepage spotlight is not set here. After this draft exists, you can feature it from the Homepage editor if needed."}
            </p>
          ) : (
            <p className="text-base text-[var(--color-text-muted)]">
              Preview first. Making these changes live updates what visitors see.
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
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-base font-semibold text-[var(--color-text-body)]"
          >
            Previous step
          </button>
        ) : null}
        {step < 5 ? (
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
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-base font-semibold text-[var(--color-text-body)]"
            >
              {HUB_ACTION_LABELS.previewChanges}
            </button>
            <button
              type="button"
              disabled={isPending || !reviewPreviewed || !canPublish}
              onClick={() => submitWizard("live")}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-[var(--color-action-primary-fg)] transition-[filter,opacity] disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="program-make-live"
            >
              {isPending
                ? "Saving…"
                : HUB_ACTION_LABELS.makeChangesLive}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => submitWizard("draft")}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-5 text-base font-semibold text-[var(--color-action-primary-fg)] transition-[filter,opacity] disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="program-save-draft"
          >
            {isPending
              ? "Saving…"
              : isEdit
                ? "Save draft changes"
                : HUB_ACTION_LABELS.createProgramDraft}
          </button>
        )}
      </div>
        </>
      ) : null}
    </div>
  );
}
