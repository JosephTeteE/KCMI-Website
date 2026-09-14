/**
 * E1 public Events date formatting.
 * Multi-day ranges use visitor-facing labels (e.g. August 12–16, 2026).
 * Display respects the event's stored IANA timezone.
 */

export type EventDateInput = {
  startsAt: string;
  endsAt?: string | null;
  /** IANA timezone for visitor-facing calendar labels. */
  timezone?: string | null;
};

const DEFAULT_TZ = "Africa/Lagos";

function resolveTz(timezone?: string | null): string {
  const tz = timezone?.trim();
  if (!tz) return DEFAULT_TZ;
  try {
    // Validate IANA timezone; fall back if invalid.
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

function asDate(iso: string): Date {
  return new Date(iso);
}

function partsInTz(d: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    minute: Number(bag.minute),
  };
}

function sameCalendarDay(a: Date, b: Date, timeZone: string): boolean {
  const pa = partsInTz(a, timeZone);
  const pb = partsInTz(b, timeZone);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

function hasMeaningfulTime(d: Date, timeZone: string): boolean {
  const p = partsInTz(d, timeZone);
  return !(p.hour === 0 && p.minute === 0);
}

function formatters(timeZone: string) {
  return {
    dayMonth: new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      timeZone,
    }),
    dayMonthYear: new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone,
    }),
    time: new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    }),
  };
}

/** Compact visitor-facing date / range label. */
export function formatEventDateLabel(input: EventDateInput): string {
  const start = asDate(input.startsAt);
  if (Number.isNaN(start.getTime())) return "";

  const timeZone = resolveTz(input.timezone);
  const { dayMonth, dayMonthYear, time } = formatters(timeZone);

  const endRaw = input.endsAt ? asDate(input.endsAt) : null;
  const end =
    endRaw && !Number.isNaN(endRaw.getTime()) ? endRaw : null;

  if (!end || sameCalendarDay(start, end, timeZone)) {
    const date = dayMonthYear.format(start);
    if (hasMeaningfulTime(start, timeZone)) {
      const startTime = time.format(start);
      if (
        end &&
        hasMeaningfulTime(end, timeZone) &&
        end.getTime() !== start.getTime()
      ) {
        return `${date} · ${startTime} – ${time.format(end)}`;
      }
      return `${date} · ${startTime}`;
    }
    return date;
  }

  const startParts = partsInTz(start, timeZone);
  const endParts = partsInTz(end, timeZone);
  if (startParts.year === endParts.year) {
    return `${dayMonth.format(start)} – ${dayMonthYear.format(end)}`;
  }
  return `${dayMonthYear.format(start)} – ${dayMonthYear.format(end)}`;
}

/** True when the event's effective end (or start) is strictly before now. */
export function isPastEvent(
  input: EventDateInput,
  now: Date = new Date(),
): boolean {
  const endIso = input.endsAt ?? input.startsAt;
  const end = asDate(endIso);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() < now.getTime();
}

export function eventKindLabel(
  kind:
    | "camp"
    | "conference"
    | "convention"
    | "retreat"
    | "special_service"
    | "other",
): string {
  switch (kind) {
    case "camp":
      return "Camp";
    case "conference":
      return "Conference";
    case "convention":
      return "Convention";
    case "retreat":
      return "Retreat";
    case "special_service":
      return "Special service";
    case "other":
      return "Event";
  }
}

/**
 * Publication gate for public queries.
 * Only `published` is visitor-visible. Draft / preview / archived are not.
 */
export function isPublicPublishedEventStatus(
  status: string | null | undefined,
): boolean {
  return status === "published";
}
