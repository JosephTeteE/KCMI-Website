/**
 * UI day → program_sessions flatten helper (no extra DB tables).
 */

export type ProgramDaySessionInput = {
  startTime: string;
  endTime: string;
  label: string;
};

export type ProgramDayInput = {
  sessionDate: string;
  sessions: readonly ProgramDaySessionInput[];
};

export type FlattenedProgramSession = {
  session_date: string;
  start_time: string;
  end_time: string | null;
  label: string | null;
  sort_order: number;
};

/** Flatten day → sessions UI into program_sessions rows (same date per day). */
export function flattenProgramDays(
  days: readonly ProgramDayInput[],
): FlattenedProgramSession[] {
  const rows: FlattenedProgramSession[] = [];
  let sort = 0;
  for (const day of days) {
    if (!day.sessionDate) continue;
    for (const session of day.sessions) {
      if (!session.startTime) continue;
      rows.push({
        session_date: day.sessionDate,
        start_time: session.startTime,
        end_time: session.endTime || null,
        label: session.label.trim() || null,
        sort_order: sort,
      });
      sort += 1;
    }
  }
  return rows;
}
