/**
 * Program upcoming / expiry helpers (read-time).
 *
 * Timezone contract:
 * - `program_sessions.session_date` is a calendar date in the program's IANA
 *   timezone (`programs.timezone`, default Africa/Lagos — KCMI HQ / Nigeria).
 * - `start_time` / `end_time` are local wall-clock times in that same zone.
 * - A session with a date but no end time remains current through 23:59 local
 *   on that date.
 * - Published programs with no sessions (poster-only) stay visible — expiry
 *   only applies when a schedule exists.
 */

import { zonedDateTimeToIso, DEFAULT_PROGRAM_TIMEZONE } from "@/lib/programs/sessions";
import type { ProgramSessionInput } from "@/lib/programs/schedule";

export type ProgramExpirySession = {
  sessionDate: string;
  startTime?: string | null;
  endTime?: string | null;
};

/**
 * Calendar date from a `date` column or an accidental datetime string.
 * Exact `YYYY-MM-DD` is required downstream; a timestamp prefix must not
 * make a real session look missing.
 */
export function normalizeSessionCalendarDate(
  value: string | null | undefined,
): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec((value ?? "").trim());
  return match?.[1] ?? null;
}

/** Wall-clock `HH:MM` from `HH:MM` or `HH:MM:SS`. */
function wallClockHm(value: string | null | undefined, fallback: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)/.exec((value ?? "").trim());
  return match ? `${match[1]}:${match[2]}` : fallback;
}

/**
 * Instant when a session stops counting as upcoming/in-progress.
 * Prefer end_time; otherwise 23:59 local on the session date.
 */
export function sessionEffectiveEndIso(
  session: ProgramExpirySession,
  timeZone: string = DEFAULT_PROGRAM_TIMEZONE,
): string | null {
  const date = normalizeSessionCalendarDate(session.sessionDate);
  if (!date) return null;
  // Date with optional start but no end → through 23:59 local that day.
  const endHm = wallClockHm(session.endTime, "23:59");
  return zonedDateTimeToIso(date, endHm, timeZone);
}

/** True when at least one session has not yet reached its effective end. */
export function programHasUpcomingOrCurrentSession(
  sessions: ProgramExpirySession[],
  options?: {
    timeZone?: string;
    now?: Date;
  },
): boolean {
  if (!sessions.length) return false;
  const timeZone = options?.timeZone ?? DEFAULT_PROGRAM_TIMEZONE;
  const nowMs = (options?.now ?? new Date()).getTime();
  for (const session of sessions) {
    const endIso = sessionEffectiveEndIso(session, timeZone);
    if (!endIso) continue;
    if (new Date(endIso).getTime() >= nowMs) return true;
  }
  return false;
}

/**
 * Whether a published program should appear on upcoming/public listing surfaces
 * that allow unscheduled poster-only programs (e.g. search/featured fallbacks).
 * - No sessions → keep (intentional unscheduled / poster-only).
 * - Has sessions → only while at least one is upcoming or in progress.
 */
export function isProgramVisibleOnUpcomingSurfaces(
  sessions: ProgramExpirySession[],
  options?: {
    timeZone?: string;
    now?: Date;
  },
): boolean {
  if (!sessions.length) return true;
  return programHasUpcomingOrCurrentSession(sessions, options);
}

/**
 * Homepage "Upcoming Programs" eligibility:
 * requires at least one session that is still upcoming/in progress.
 * Unscheduled flyer programs are NOT listed here indefinitely.
 */
export function isScheduledUpcomingForHomepage(
  sessions: ProgramExpirySession[],
  options?: {
    timeZone?: string;
    now?: Date;
  },
): boolean {
  return programHasUpcomingOrCurrentSession(sessions, options);
}

/** Earliest effective start among sessions that have not yet ended. */
export function nextUpcomingSessionStartIso(
  sessions: ProgramExpirySession[],
  options?: {
    timeZone?: string;
    now?: Date;
  },
): string | null {
  if (!sessions.length) return null;
  const timeZone = options?.timeZone ?? DEFAULT_PROGRAM_TIMEZONE;
  const nowMs = (options?.now ?? new Date()).getTime();
  let best: string | null = null;
  let bestMs = Number.POSITIVE_INFINITY;

  for (const session of sessions) {
    const endIso = sessionEffectiveEndIso(session, timeZone);
    if (!endIso) continue;
    const endMs = new Date(endIso).getTime();
    if (endMs < nowMs) continue;

    const startHm = wallClockHm(session.startTime, "00:00");
    const startDate = normalizeSessionCalendarDate(session.sessionDate);
    if (!startDate) continue;
    const startIso = zonedDateTimeToIso(startDate, startHm, timeZone);
    if (!startIso) continue;
    const startMs = new Date(startIso).getTime();
    if (startMs < bestMs) {
      bestMs = startMs;
      best = startIso;
    }
  }
  return best;
}

export function mapScheduleSessionsForExpiry(
  sessions: ProgramSessionInput[],
): ProgramExpirySession[] {
  return sessions.map((s) => ({
    sessionDate: s.sessionDate,
    startTime: s.startTime,
    endTime: s.endTime,
  }));
}
