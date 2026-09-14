/**
 * Convert calendar date + optional time in an IANA timezone to UTC ISO.
 */

function partsInZone(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour) % 24,
    minute: Number(bag.minute),
    second: Number(bag.second),
  };
}

export function zonedLocalToUtcIso(
  dateYmd: string,
  timeHm: string | null | undefined,
  timeZone: string,
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return null;
  const time = (timeHm?.trim() || "00:00").slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(time)) return null;

  const [y, m, d] = dateYmd.split("-").map(Number) as [number, number, number];
  const [hh, mm] = time.split(":").map(Number) as [number, number];

  let guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  for (let i = 0; i < 4; i += 1) {
    const parts = partsInZone(new Date(guess), timeZone);
    const asUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const desired = Date.UTC(y, m - 1, d, hh, mm, 0);
    const delta = desired - asUtc;
    if (delta === 0) break;
    guess += delta;
  }

  const verify = partsInZone(new Date(guess), timeZone);
  if (
    verify.year !== y ||
    verify.month !== m ||
    verify.day !== d ||
    verify.hour !== hh ||
    verify.minute !== mm
  ) {
    return null;
  }

  return new Date(guess).toISOString();
}

export function utcIsoToLocalParts(
  iso: string,
  timeZone: string,
): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { date: "", time: "" };
  }
  const parts = partsInZone(d, timeZone);
  const date = `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  const time = `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
  return { date, time };
}

export const EVENT_TIMEZONE_OPTIONS = [
  { value: "Africa/Lagos", label: "West Africa Time (Lagos)" },
  { value: "Africa/Accra", label: "Ghana (Accra)" },
  { value: "Africa/Lome", label: "Togo (Lomé)" },
  { value: "UTC", label: "UTC" },
] as const;
