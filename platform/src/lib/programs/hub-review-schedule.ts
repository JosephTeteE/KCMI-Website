/**
 * Hub Program Review schedule summary — operator verification before save/live.
 * Shares date/time conventions with public schedule helpers; structure is more explicit.
 */

import type { ProgramSessionInput } from "@/lib/programs/schedule";

export type HubReviewScheduleSession = {
  /** Optional session name; omit/blank when unnamed. */
  label: string | null;
  /** Start–end or start-only. Never "undefined", "—", or a fake end. */
  time: string;
};

export type HubReviewScheduleDay = {
  heading: string;
  sessions: HubReviewScheduleSession[];
};

const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "long" });
const DAY_MONTH_YEAR = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function parseDateOnly(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function formatTimePart(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const part = raw.slice(0, 5);
  const [hh, mm] = part.split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  const dt = new Date();
  dt.setHours(hh!, mm!, 0, 0);
  return dt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function sessionTimeLine(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): string | null {
  const start = formatTimePart(startTime);
  if (!start) return null;
  const end = formatTimePart(endTime);
  if (end) return `${start} – ${end}`;
  return start;
}

function dayHeading(isoDate: string): string {
  const d = parseDateOnly(isoDate);
  return `${WEEKDAY.format(d)}, ${DAY_MONTH_YEAR.format(d)}`;
}

/**
 * Build day-grouped Review schedule for Hub create/edit Review.
 * One session → one day heading + one time line (concise).
 * Multiple sessions → list under each date; blank end → start only; blank label → time only.
 */
export function buildHubProgramReviewSchedule(
  sessions: readonly ProgramSessionInput[],
): HubReviewScheduleDay[] {
  const normalized = [...sessions]
    .filter((s) => Boolean(s.sessionDate) && Boolean(s.startTime))
    .sort((a, b) => {
      const byDate = a.sessionDate.localeCompare(b.sessionDate);
      if (byDate !== 0) return byDate;
      const byOrder = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (byOrder !== 0) return byOrder;
      return (a.startTime ?? "").localeCompare(b.startTime ?? "");
    });

  if (normalized.length === 0) return [];

  const byDate = new Map<string, ProgramSessionInput[]>();
  for (const row of normalized) {
    const list = byDate.get(row.sessionDate) ?? [];
    list.push(row);
    byDate.set(row.sessionDate, list);
  }

  return [...byDate.entries()].map(([date, dayRows]) => {
    const sessionsOut: HubReviewScheduleSession[] = [];
    for (const row of dayRows) {
      const time = sessionTimeLine(row.startTime, row.endTime);
      if (!time) continue;
      const label = row.label?.trim() ? row.label.trim() : null;
      sessionsOut.push({ label, time });
    }
    return {
      heading: dayHeading(date),
      sessions: sessionsOut,
    };
  });
}

/** Plain-text dump for tests / accessibility summaries. */
export function formatHubProgramReviewScheduleText(
  sessions: readonly ProgramSessionInput[],
): string {
  const days = buildHubProgramReviewSchedule(sessions);
  if (days.length === 0) return "";
  return days
    .map((day) => {
      const lines = day.sessions.flatMap((s) =>
        s.label ? [s.label, s.time] : [s.time],
      );
      return [day.heading, ...lines].join("\n");
    })
    .join("\n\n");
}
