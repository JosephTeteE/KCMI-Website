"use client";

import { useEffect, useId, useState } from "react";
import {
  TIME_12H_HOURS,
  TIME_12H_MINUTES,
  joinTime12To24,
  splitTime24To12,
  type Meridiem,
  type Time12hParts,
} from "@/lib/hub/time-12h";

type Props = {
  id?: string;
  label: string;
  /** Stored 24-hour `HH:MM`, or empty string when blank. */
  value: string;
  onChange: (nextHm: string) => void;
  optionalHint?: string;
};

/**
 * Accessible 12-hour time control (Hour / Minute / AM·PM).
 * Blank remains blank — never defaults to now or midnight.
 * Partial selections stay visible until the full time can be committed.
 */
export function HubTime12hField({
  id,
  label,
  value,
  onChange,
  optionalHint,
}: Props) {
  const autoId = useId();
  const baseId = id ?? autoId;
  const [parts, setParts] = useState<Time12hParts>(() =>
    splitTime24To12(value || null),
  );

  useEffect(() => {
    setParts(splitTime24To12(value || null));
  }, [value]);

  function commit(next: Time12hParts) {
    setParts(next);
    const joined = joinTime12To24(next);
    if (joined) {
      onChange(joined);
      return;
    }
    // Incomplete or fully blank → store blank (do not invent a time).
    if (!next.hour && !next.minute && !next.meridiem) {
      onChange("");
    }
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      {optionalHint ? (
        <p className="text-sm text-[var(--color-text-muted)]">{optionalHint}</p>
      ) : null}
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor={`${baseId}-hour`} className="block text-xs font-medium">
            Hour
          </label>
          <select
            id={`${baseId}-hour`}
            value={parts.hour}
            onChange={(e) => commit({ ...parts, hour: e.target.value })}
            className="mt-1 block min-h-11 min-w-[4.5rem] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-page)] px-2 text-base"
            data-testid={`${baseId}-hour`}
          >
            <option value="">—</option>
            {TIME_12H_HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={`${baseId}-minute`}
            className="block text-xs font-medium"
          >
            Minute
          </label>
          <select
            id={`${baseId}-minute`}
            value={parts.minute}
            onChange={(e) => commit({ ...parts, minute: e.target.value })}
            className="mt-1 block min-h-11 min-w-[4.5rem] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-page)] px-2 text-base"
            data-testid={`${baseId}-minute`}
          >
            <option value="">—</option>
            {parts.minute &&
            !TIME_12H_MINUTES.includes(
              parts.minute as (typeof TIME_12H_MINUTES)[number],
            ) ? (
              <option value={parts.minute}>{parts.minute}</option>
            ) : null}
            {TIME_12H_MINUTES.map((minute) => (
              <option key={minute} value={minute}>
                {minute}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={`${baseId}-meridiem`}
            className="block text-xs font-medium"
          >
            AM / PM
          </label>
          <select
            id={`${baseId}-meridiem`}
            value={parts.meridiem}
            onChange={(e) =>
              commit({
                ...parts,
                meridiem: e.target.value as Meridiem | "",
              })
            }
            className="mt-1 block min-h-11 min-w-[5rem] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-page)] px-2 text-base"
            data-testid={`${baseId}-meridiem`}
          >
            <option value="">—</option>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
        {parts.hour || parts.minute || parts.meridiem || value ? (
          <button
            type="button"
            className="mb-0.5 inline-flex min-h-11 items-center px-2 text-sm font-medium text-[var(--color-action-primary)] underline-offset-2 hover:underline"
            onClick={() => {
              setParts({ hour: "", minute: "", meridiem: "" });
              onChange("");
            }}
          >
            Clear
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}
