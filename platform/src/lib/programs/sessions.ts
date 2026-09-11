/**
 * D1.8 program session parsing.
 * The wizard posts sessions as JSON; this module is the server-side trust boundary.
 */

import { z } from "zod";

export const MAX_PROGRAM_SESSIONS = 60;

/** Timezones KCMI actually operates in. Unknown values fall back to Lagos. */
export const PROGRAM_TIMEZONES = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Lome",
] as const;

export const DEFAULT_PROGRAM_TIMEZONE = "Africa/Lagos";

export type ProgramTimezone = (typeof PROGRAM_TIMEZONES)[number];

export type ParsedProgramSession = {
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  label: string | null;
  sort_order: number;
};

export type ParseProgramSessionsResult =
  | { ok: true; sessions: ParsedProgramSession[] }
  | { ok: false; error: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const blankToNull = (value: unknown) =>
  typeof value === "string" && value.trim().length === 0 ? null : value;

const timeSchema = z.preprocess(
  blankToNull,
  z
    .string()
    .regex(TIME_PATTERN, "Use a time like 09:00 or 17:30.")
    .nullable()
    .optional(),
);

const sessionSchema = z.object({
  session_date: z
    .string()
    .regex(DATE_PATTERN, "Choose a date for every session."),
  start_time: timeSchema,
  end_time: timeSchema,
  label: z.preprocess(
    blankToNull,
    z.string().trim().max(80, "Session names must be 80 characters or fewer.").nullable().optional(),
  ),
  sort_order: z.number().int().min(0).max(999).optional(),
});

const payloadSchema = z
  .array(sessionSchema)
  .max(MAX_PROGRAM_SESSIONS, `A program can have at most ${MAX_PROGRAM_SESSIONS} sessions.`);

function isRealCalendarDate(value: string): boolean {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export function parseProgramSessionsJson(
  raw: FormDataEntryValue | null,
): ParseProgramSessionsResult {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: true, sessions: [] };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "The program dates could not be read. Please add them again." };
  }

  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Please check the program dates and times.",
    };
  }

  const rows: ParsedProgramSession[] = [];
  parsed.data.forEach((row, index) => {
    rows.push({
      session_date: row.session_date,
      start_time: row.start_time ?? null,
      end_time: row.end_time ?? null,
      label: row.label ?? null,
      sort_order: row.sort_order ?? index,
    });
  });

  for (const row of rows) {
    if (!isRealCalendarDate(row.session_date)) {
      return { ok: false, error: "One of the dates does not exist. Please check it." };
    }
    if (row.end_time && !row.start_time) {
      return {
        ok: false,
        error: "A session with a finish time also needs a start time.",
      };
    }
    if (row.start_time && row.end_time && row.end_time < row.start_time) {
      return {
        ok: false,
        error: "A session cannot finish before it starts.",
      };
    }
  }

  rows.sort((a, b) => {
    const byDate = a.session_date.localeCompare(b.session_date);
    if (byDate !== 0) return byDate;
    return a.sort_order - b.sort_order;
  });

  return { ok: true, sessions: rows };
}

export function parseProgramTimezone(value: unknown): ProgramTimezone {
  return typeof value === "string" &&
    (PROGRAM_TIMEZONES as readonly string[]).includes(value)
    ? (value as ProgramTimezone)
    : DEFAULT_PROGRAM_TIMEZONE;
}

function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  const asUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour"),
    read("minute"),
    read("second"),
  );
  return (asUtc - instant.getTime()) / 60_000;
}

/** Convert a local calendar date + wall-clock time in `timeZone` to a UTC ISO string. */
export function zonedDateTimeToIso(
  sessionDate: string,
  time: string | null,
  timeZone: string,
): string | null {
  if (!DATE_PATTERN.test(sessionDate)) return null;
  const [y, m, d] = sessionDate.split("-").map(Number);
  const [hh, mm] = (time ?? "00:00").split(":").map(Number);
  if (
    y === undefined ||
    m === undefined ||
    d === undefined ||
    hh === undefined ||
    mm === undefined
  ) {
    return null;
  }

  const wallClock = Date.UTC(y, m - 1, d, hh, mm);
  let instant = wallClock - zoneOffsetMinutes(new Date(wallClock), timeZone) * 60_000;
  instant = wallClock - zoneOffsetMinutes(new Date(instant), timeZone) * 60_000;
  const result = new Date(instant);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

/**
 * Legacy single-interval compatibility values for `programs.starts_at` / `ends_at`.
 * Sessions remain the source of truth for public schedule labels.
 */
export function legacyIntervalFromSessions(
  sessions: ParsedProgramSession[],
  timeZone: string,
): { startsAt: string | null; endsAt: string | null } {
  if (sessions.length === 0) {
    return { startsAt: null, endsAt: null };
  }

  const first = sessions[0]!;
  const last = sessions[sessions.length - 1]!;
  const startsAt = zonedDateTimeToIso(first.session_date, first.start_time, timeZone);
  const endsAt = zonedDateTimeToIso(
    last.session_date,
    last.end_time ?? last.start_time,
    timeZone,
  );

  if (!startsAt) return { startsAt: null, endsAt: null };
  if (!endsAt || endsAt < startsAt) return { startsAt, endsAt: null };
  return { startsAt, endsAt };
}
