/**
 * D1.8 public/Hub program schedule formatting.
 * Prefers program_sessions; falls back to legacy starts_at/ends_at.
 */

export type ProgramSessionInput = {
  sessionDate: string; // YYYY-MM-DD
  startTime?: string | null; // HH:MM or HH:MM:SS
  endTime?: string | null;
  label?: string | null;
  sortOrder?: number;
};

export type ProgramActionKind =
  | "none"
  | "registration"
  | "youtube"
  | "facebook"
  | "other";

const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "long" });
const DAY_MONTH = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
});
const DAY_MONTH_YEAR = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function parseDateOnly(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function formatTime(raw: string | null | undefined): string | null {
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

function sameCalendarDay(a: string, b: string): boolean {
  return a === b;
}

/** Compact single-line label for cards (may include time). */
export function formatProgramScheduleLabel(
  sessions: ProgramSessionInput[],
  legacy?: { startsAt?: string | null; endsAt?: string | null },
): string | null {
  const rows = normalizeSessions(sessions, legacy);
  if (rows.length === 0) return null;

  if (rows.length === 1) {
    const s = rows[0]!;
    const date = parseDateOnly(s.sessionDate);
    const weekday = WEEKDAY.format(date);
    const dayMonth = DAY_MONTH.format(date);
    const start = formatTime(s.startTime);
    const end = formatTime(s.endTime);
    if (start && end) return `${weekday}, ${dayMonth} · ${start} – ${end}`;
    if (start) return `${weekday}, ${dayMonth} · ${start}`;
    return `${weekday}, ${dayMonth}`;
  }

  const dates = [...new Set(rows.map((r) => r.sessionDate))].sort();
  const first = parseDateOnly(dates[0]!);
  const last = parseDateOnly(dates[dates.length - 1]!);
  if (dates.length === 1) {
    const dayRows = rows.filter((r) => r.sessionDate === dates[0]);
    const times = dayRows
      .map((r) => formatTime(r.startTime))
      .filter(Boolean) as string[];
    const head = `${WEEKDAY.format(first)}, ${DAY_MONTH.format(first)}`;
    if (times.length === 0) return head;
    if (times.length === 1) return `${head} · ${times[0]}`;
    return `${head} · ${times.join(" · ")}`;
  }

  const sameYear = first.getUTCFullYear() === last.getUTCFullYear();
  if (sameYear) {
    return `${DAY_MONTH.format(first)} – ${DAY_MONTH_YEAR.format(last)}`;
  }
  return `${DAY_MONTH_YEAR.format(first)} – ${DAY_MONTH_YEAR.format(last)}`;
}

/** Multi-line schedule blocks for detail surfaces. */
export function formatProgramScheduleBlocks(
  sessions: ProgramSessionInput[],
  legacy?: { startsAt?: string | null; endsAt?: string | null },
): { heading: string; lines: string[] }[] {
  const rows = normalizeSessions(sessions, legacy);
  if (rows.length === 0) return [];

  const byDate = new Map<string, ProgramSessionInput[]>();
  for (const row of rows) {
    const list = byDate.get(row.sessionDate) ?? [];
    list.push(row);
    byDate.set(row.sessionDate, list);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayRows]) => {
      const d = parseDateOnly(date);
      const heading = `${WEEKDAY.format(d)}, ${DAY_MONTH_YEAR.format(d)}`;
      const lines = dayRows.map((r) => {
        const start = formatTime(r.startTime);
        const end = formatTime(r.endTime);
        const time =
          start && end ? `${start} – ${end}` : start ? start : null;
        if (r.label && time) return `${r.label} · ${time}`;
        if (r.label) return r.label;
        if (time) return time;
        return "All day";
      });
      return { heading, lines };
    });
}

export function normalizeSessions(
  sessions: ProgramSessionInput[],
  legacy?: { startsAt?: string | null; endsAt?: string | null },
): ProgramSessionInput[] {
  if (sessions.length > 0) {
    return [...sessions].sort((a, b) => {
      const d = a.sessionDate.localeCompare(b.sessionDate);
      if (d !== 0) return d;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
  }
  if (!legacy?.startsAt) return [];
  const start = new Date(legacy.startsAt);
  const sessionDate = start.toISOString().slice(0, 10);
  const startTime = start.toISOString().slice(11, 16);
  let endTime: string | null = null;
  if (legacy.endsAt) {
    const end = new Date(legacy.endsAt);
    if (sameCalendarDay(sessionDate, end.toISOString().slice(0, 10))) {
      endTime = end.toISOString().slice(11, 16);
    }
  }
  return [
    {
      sessionDate,
      startTime,
      endTime,
      sortOrder: 0,
    },
  ];
}

export function programActionLabel(kind: ProgramActionKind): string | null {
  switch (kind) {
    case "registration":
      return "Register";
    case "youtube":
    case "facebook":
      return "Watch video";
    case "other":
      return "Learn more";
    case "none":
    default:
      return null;
  }
}

export function timezoneForCountry(country: string | null | undefined): string {
  const c = (country ?? "").trim().toLowerCase();
  if (c === "nigeria") return "Africa/Lagos";
  if (c === "ghana") return "Africa/Accra";
  if (c === "togo") return "Africa/Lome";
  return "Africa/Lagos";
}
