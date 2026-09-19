/**
 * Volunteer-friendly 12-hour time helpers.
 * Storage remains 24-hour `HH:MM` (or null). Blank stays blank — never invent now/midnight.
 */

export type Meridiem = "AM" | "PM";

export type Time12hParts = {
  hour: string; // "" | "1"…"12"
  minute: string; // "" | "00" | "05" | … | "55"
  meridiem: Meridiem | "";
};

export const TIME_12H_HOURS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
] as const;

/** 5-minute steps keep the control usable without a spinner. */
export const TIME_12H_MINUTES = [
  "00",
  "05",
  "10",
  "15",
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
  "55",
] as const;

const TIME_24 = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Split stored `HH:MM` into 12-hour parts. Empty/invalid → blank parts. */
export function splitTime24To12(raw: string | null | undefined): Time12hParts {
  const value = (raw ?? "").trim().slice(0, 5);
  if (!TIME_24.test(value)) {
    return { hour: "", minute: "", meridiem: "" };
  }
  const [hhRaw, mmRaw] = value.split(":") as [string, string];
  const hh = Number(hhRaw);
  const mm = Number(mmRaw);
  const meridiem: Meridiem = hh >= 12 ? "PM" : "AM";
  let hour12 = hh % 12;
  if (hour12 === 0) hour12 = 12;
  const minute =
    TIME_12H_MINUTES.find((step) => Number(step) === mm) ??
    String(mm).padStart(2, "0");
  return {
    hour: String(hour12),
    minute,
    meridiem,
  };
}

/**
 * Combine 12-hour UI parts into `HH:MM`, or null when incomplete/blank.
 * Partial selections (e.g. hour only) return null — do not invent minutes/AM-PM.
 */
export function joinTime12To24(parts: Time12hParts): string | null {
  const hour = parts.hour.trim();
  const minute = parts.minute.trim();
  const meridiem = parts.meridiem;
  if (!hour && !minute && !meridiem) return null;
  if (!hour || !minute || (meridiem !== "AM" && meridiem !== "PM")) {
    return null;
  }
  const h12 = Number(hour);
  const mm = Number(minute);
  if (!Number.isFinite(h12) || h12 < 1 || h12 > 12) return null;
  if (!Number.isFinite(mm) || mm < 0 || mm > 59) return null;
  let h24 = h12 % 12;
  if (meridiem === "PM") h24 += 12;
  return `${String(h24).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Round-trip helper used by tests and form serialization. */
export function normalizeStoredTimeHm(
  raw: string | null | undefined,
): string | null {
  const value = (raw ?? "").trim().slice(0, 5);
  if (!value) return null;
  if (!TIME_24.test(value)) return null;
  return value;
}
