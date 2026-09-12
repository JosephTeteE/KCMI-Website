import {
  buildHubProgramReviewSchedule,
  type HubReviewScheduleDay,
} from "@/lib/programs/hub-review-schedule";
import type { ProgramSessionInput } from "@/lib/programs/schedule";

/**
 * Shared When summary for Program create + edit Review (and published preview).
 */
export function ProgramReviewScheduleSummary({
  sessions,
  emptyLabel = "—",
  className,
  "data-testid": testId = "program-review-when",
}: {
  sessions: readonly ProgramSessionInput[];
  emptyLabel?: string;
  className?: string;
  "data-testid"?: string;
}) {
  const days = buildHubProgramReviewSchedule(sessions);
  if (days.length === 0) {
    return (
      <div className={className} data-testid={testId}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={className} data-testid={testId}>
      <HubReviewScheduleDays days={days} />
    </div>
  );
}

export function HubReviewScheduleDays({
  days,
}: {
  days: readonly HubReviewScheduleDay[];
}) {
  return (
    <div className="space-y-4">
      {days.map((day) => (
        <div key={day.heading} className="space-y-2">
          <p className="font-semibold text-[var(--color-text-body)]">
            {day.heading}
          </p>
          <ul className="space-y-3">
            {day.sessions.map((session, index) => (
              <li
                key={`${day.heading}-${index}-${session.time}`}
                className="space-y-0.5"
              >
                {session.label ? (
                  <p className="text-[var(--color-text-body)]">{session.label}</p>
                ) : null}
                <p className="text-[var(--color-text-body)]">{session.time}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
