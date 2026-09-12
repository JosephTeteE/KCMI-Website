/**
 * D1.8 Program wizard initial-state helpers.
 * Reconstructs day → sessions[] from program_sessions (or legacy starts_at).
 *
 * Legacy path: starts_at/ends_at remain on programs for back-compat.
 * Deprecation: once all editors write sessions and public adapters prefer
 * sessions, stop writing new legacy-only schedules; eventually drop
 * starts_at/ends_at in a future migration after a dual-write period.
 */

import {
  DEFAULT_PROGRAM_TIMEZONE,
  type ParsedProgramSession,
} from "@/lib/programs/sessions";

export type WizardSessionDraft = {
  startTime: string;
  endTime: string;
  label: string;
};

export type WizardDayDraft = {
  sessionDate: string;
  sessions: WizardSessionDraft[];
};

export type WizardScheduleState = {
  scheduleMode: "one_day" | "several_days";
  oneDay: {
    sessionDate: string;
    startTime: string;
    endTime: string;
  };
  days: WizardDayDraft[];
};

export type StoredSessionRow = {
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  label: string | null;
  sort_order: number | null;
};

function trimTime(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.slice(0, 5);
}

function compareTime(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Group stored program_sessions into the wizard day → sessions[] shape.
 * Days ascending by date; sessions by sort_order then start time.
 */
export function groupSessionsIntoDays(
  rows: readonly StoredSessionRow[],
): WizardDayDraft[] {
  const sorted = [...rows].sort((a, b) => {
    const byDate = a.session_date.localeCompare(b.session_date);
    if (byDate !== 0) return byDate;
    const ao = a.sort_order ?? 0;
    const bo = b.sort_order ?? 0;
    if (ao !== bo) return ao - bo;
    return compareTime(trimTime(a.start_time), trimTime(b.start_time));
  });

  const byDate = new Map<string, WizardSessionDraft[]>();
  for (const row of sorted) {
    if (!row.session_date) continue;
    const list = byDate.get(row.session_date) ?? [];
    list.push({
      startTime: trimTime(row.start_time),
      endTime: trimTime(row.end_time),
      label: (row.label ?? "").trim(),
    });
    byDate.set(row.session_date, list);
  }

  return [...byDate.entries()].map(([sessionDate, sessions]) => ({
    sessionDate,
    sessions:
      sessions.length > 0
        ? sessions
        : [{ startTime: "", endTime: "", label: "" }],
  }));
}

export function wizardScheduleFromDays(
  days: readonly WizardDayDraft[],
): WizardScheduleState {
  const normalized =
    days.length > 0
      ? days.map((day) => ({
          sessionDate: day.sessionDate,
          sessions:
            day.sessions.length > 0
              ? day.sessions.map((s) => ({ ...s }))
              : [{ startTime: "", endTime: "", label: "" }],
        }))
      : [
          {
            sessionDate: "",
            sessions: [{ startTime: "", endTime: "", label: "" }],
          },
        ];

  const first = normalized[0]!;
  const firstSession = first.sessions[0]!;
  const isOneDay =
    normalized.length === 1 && first.sessions.length === 1;

  if (isOneDay) {
    return {
      scheduleMode: "one_day",
      oneDay: {
        sessionDate: first.sessionDate,
        startTime: firstSession.startTime,
        endTime: firstSession.endTime,
      },
      days: normalized,
    };
  }

  return {
    scheduleMode: "several_days",
    oneDay: {
      sessionDate: "",
      startTime: "",
      endTime: "",
    },
    days: normalized,
  };
}

/**
 * Derive an in-memory editable schedule from legacy starts_at / ends_at.
 * Used only when program_sessions is empty.
 */
export function wizardScheduleFromLegacyInterval(input: {
  startsAt: string | null;
  endsAt: string | null;
  timezone?: string | null;
}): WizardScheduleState | null {
  if (!input.startsAt) return null;

  const tz = input.timezone?.trim() || DEFAULT_PROGRAM_TIMEZONE;
  const startParts = localPartsFromTimestamptz(input.startsAt, tz);
  if (!startParts) return null;

  let endTime = "";
  if (input.endsAt) {
    const endParts = localPartsFromTimestamptz(input.endsAt, tz);
    if (endParts && endParts.date === startParts.date) {
      endTime = endParts.time;
    }
  }

  return wizardScheduleFromDays([
    {
      sessionDate: startParts.date,
      sessions: [
        {
          startTime: startParts.time,
          endTime,
          label: "",
        },
      ],
    },
  ]);
}

function localPartsFromTimestamptz(
  iso: string,
  timeZone: string,
): { date: string; time: string } | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const y = get("year");
  const m = get("month");
  const d = get("day");
  const hh = get("hour");
  const mm = get("minute");
  if (!y || !m || !d || !hh || !mm) return null;
  return {
    date: `${y}-${m}-${d}`,
    time: `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`,
  };
}

/** Prefer sessions; else legacy interval. Empty editable shell when neither. */
export function resolveWizardSchedule(input: {
  sessions: readonly StoredSessionRow[];
  startsAt: string | null;
  endsAt: string | null;
  timezone?: string | null;
}): WizardScheduleState {
  if (input.sessions.length > 0) {
    return wizardScheduleFromDays(groupSessionsIntoDays(input.sessions));
  }
  const legacy = wizardScheduleFromLegacyInterval({
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timezone: input.timezone,
  });
  if (legacy) return legacy;
  return wizardScheduleFromDays([
    {
      sessionDate: "",
      sessions: [{ startTime: "", endTime: "", label: "" }],
    },
  ]);
}

/** Round-trip helper used by tests: stored rows ↔ wizard days ↔ flatten. */
export function sessionsToWizardDays(
  sessions: readonly ParsedProgramSession[],
): WizardDayDraft[] {
  return groupSessionsIntoDays(
    sessions.map((s) => ({
      session_date: s.session_date,
      start_time: s.start_time,
      end_time: s.end_time,
      label: s.label,
      sort_order: s.sort_order,
    })),
  );
}
