import { describe, expect, it } from "vitest";
import { flattenProgramDays } from "@/lib/programs/days";
import { parseProgramFields } from "@/lib/programs/parse-fields";
import { programActionLabel } from "@/lib/programs/schedule";
import {
  groupSessionsIntoDays,
  resolveWizardSchedule,
  wizardScheduleFromDays,
  wizardScheduleFromLegacyInterval,
  type StoredSessionRow,
} from "@/lib/programs/wizard-state";

/** Staging QA shape: multi-day with blank end times. */
const STAGING_QA_SESSIONS: StoredSessionRow[] = [
  {
    session_date: "2026-11-12",
    start_time: "09:00:00",
    end_time: "11:00:00",
    label: null,
    sort_order: 0,
  },
  {
    session_date: "2026-11-12",
    start_time: "17:00:00",
    end_time: null,
    label: null,
    sort_order: 1,
  },
  {
    session_date: "2026-11-13",
    start_time: "09:00:00",
    end_time: null,
    label: null,
    sort_order: 2,
  },
];

function roundTrip(rows: readonly StoredSessionRow[]) {
  const schedule = resolveWizardSchedule({
    sessions: rows,
    startsAt: null,
    endsAt: null,
  });
  const flattened = flattenProgramDays(
    schedule.scheduleMode === "one_day"
      ? [
          {
            sessionDate: schedule.oneDay.sessionDate,
            sessions: [
              {
                startTime: schedule.oneDay.startTime,
                endTime: schedule.oneDay.endTime,
                label: "",
              },
            ],
          },
        ]
      : schedule.days,
  );
  return { schedule, flattened };
}

describe("D1.8.1 program edit round-trip", () => {
  it("A. reloads a one-day Program", () => {
    const rows = [
      {
        session_date: "2026-11-12",
        start_time: "09:00:00",
        end_time: "11:00:00",
        label: null,
        sort_order: 0,
      },
    ];
    const { schedule, flattened } = roundTrip(rows);
    expect(schedule.scheduleMode).toBe("one_day");
    expect(schedule.oneDay).toEqual({
      sessionDate: "2026-11-12",
      startTime: "09:00",
      endTime: "11:00",
    });
    expect(flattened).toHaveLength(1);
    expect(flattened[0]?.session_date).toBe("2026-11-12");
  });

  it("B. reloads a multi-day Program", () => {
    const { schedule, flattened } = roundTrip([...STAGING_QA_SESSIONS]);
    expect(schedule.scheduleMode).toBe("several_days");
    expect(schedule.days.map((d) => d.sessionDate)).toEqual([
      "2026-11-12",
      "2026-11-13",
    ]);
    expect(flattened).toHaveLength(3);
  });

  it("C. reloads two sessions on the same day", () => {
    const days = groupSessionsIntoDays([...STAGING_QA_SESSIONS]);
    expect(days[0]?.sessions).toHaveLength(2);
    expect(days[0]?.sessions.map((s) => s.startTime)).toEqual([
      "09:00",
      "17:00",
    ]);
    // One date field per day — not per session.
    expect(days[0]?.sessionDate).toBe("2026-11-12");
    expect(days).toHaveLength(2);
  });

  it("D. preserves blank end time", () => {
    const days = groupSessionsIntoDays([...STAGING_QA_SESSIONS]);
    expect(days[0]?.sessions[1]?.endTime).toBe("");
    expect(days[1]?.sessions[0]?.endTime).toBe("");
    const { flattened } = roundTrip([...STAGING_QA_SESSIONS]);
    expect(flattened[1]?.end_time).toBeNull();
    expect(flattened[2]?.end_time).toBeNull();
  });

  it("E. Registration action derives visitor label", () => {
    const fd = new FormData();
    fd.set("title", "Camp");
    fd.set("action_kind", "registration");
    fd.set("cta_url", "https://example.com/register");
    fd.set("location_kind", "online");
    fd.set(
      "sessions_json",
      JSON.stringify([
        { session_date: "2026-11-12", start_time: "09:00" },
      ]),
    );
    const parsed = parseProgramFields(fd);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fields.action_kind).toBe("registration");
    expect(parsed.fields.cta_label).toBe(programActionLabel("registration"));
  });

  it("F. YouTube action derives visitor label", () => {
    const fd = new FormData();
    fd.set("title", "Watch night");
    fd.set("action_kind", "youtube");
    fd.set("cta_url", "https://www.youtube.com/watch?v=abc12345678");
    fd.set("location_kind", "online");
    fd.set(
      "sessions_json",
      JSON.stringify([
        { session_date: "2026-11-12", start_time: "19:00" },
      ]),
    );
    const parsed = parseProgramFields(fd);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fields.action_kind).toBe("youtube");
    expect(parsed.fields.cta_label).toBe(programActionLabel("youtube"));
  });

  it("H. Facebook action derives visitor label", () => {
    const fd = new FormData();
    fd.set("title", "FB night");
    fd.set("action_kind", "facebook");
    fd.set("cta_url", "https://www.facebook.com/watch/?v=1234567890");
    fd.set("location_kind", "online");
    fd.set(
      "sessions_json",
      JSON.stringify([
        { session_date: "2026-11-12", start_time: "19:00" },
      ]),
    );
    const parsed = parseProgramFields(fd);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fields.action_kind).toBe("facebook");
    expect(parsed.fields.cta_label).toBe(programActionLabel("facebook"));
  });

  it("I. Other website action", () => {
    const fd = new FormData();
    fd.set("title", "Other link");
    fd.set("action_kind", "other");
    fd.set("cta_url", "https://example.com/page");
    fd.set("location_kind", "online");
    fd.set(
      "sessions_json",
      JSON.stringify([
        { session_date: "2026-11-12", start_time: "09:00" },
      ]),
    );
    const parsed = parseProgramFields(fd);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fields.action_kind).toBe("other");
    expect(parsed.fields.cta_label).toBe(programActionLabel("other"));
  });

  it("G. No action clears visitor link", () => {
    const fd = new FormData();
    fd.set("title", "Prayer meeting");
    fd.set("action_kind", "none");
    fd.set("location_kind", "venue");
    fd.set("location_label", "Main hall");
    fd.set(
      "sessions_json",
      JSON.stringify([
        { session_date: "2026-11-12", start_time: "06:00" },
      ]),
    );
    const parsed = parseProgramFields(fd);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fields.action_kind).toBe("none");
    expect(parsed.fields.cta_url).toBeNull();
    expect(parsed.fields.cta_label).toBeNull();
  });

  it("H. branch location round-trips in wizard fields", () => {
    const branchId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const fd = new FormData();
    fd.set("title", "Branch night");
    fd.set("action_kind", "none");
    fd.set("location_kind", "branch");
    fd.set("location_branch_id", branchId);
    fd.set(
      "sessions_json",
      JSON.stringify([
        { session_date: "2026-11-12", start_time: "18:00" },
      ]),
    );
    const parsed = parseProgramFields(fd);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fields.location_kind).toBe("branch");
    expect(parsed.fields.location_branch_id).toBe(branchId);
  });

  it("I. poster already assigned is kept when featured_media_id present", () => {
    const mediaId = "11111111-2222-4333-8444-555555555555";
    const fd = new FormData();
    fd.set("title", "With poster");
    fd.set("action_kind", "none");
    fd.set("location_kind", "online");
    fd.set("featured_media_id", mediaId);
    fd.set(
      "sessions_json",
      JSON.stringify([
        { session_date: "2026-11-12", start_time: "09:00" },
      ]),
    );
    const parsed = parseProgramFields(fd);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fields.featured_media_id).toBe(mediaId);
  });

  it("J. legacy starts_at fallback when sessions are empty", () => {
    const legacy = wizardScheduleFromLegacyInterval({
      startsAt: "2026-11-12T08:00:00.000Z",
      endsAt: "2026-11-12T10:00:00.000Z",
      timezone: "UTC",
    });
    expect(legacy).not.toBeNull();
    expect(legacy?.scheduleMode).toBe("one_day");
    expect(legacy?.oneDay.sessionDate).toBe("2026-11-12");
    expect(legacy?.oneDay.startTime).toBe("08:00");
    expect(legacy?.oneDay.endTime).toBe("10:00");

    const resolved = resolveWizardSchedule({
      sessions: [],
      startsAt: "2026-11-12T08:00:00.000Z",
      endsAt: "2026-11-12T10:00:00.000Z",
      timezone: "UTC",
    });
    expect(resolved.scheduleMode).toBe("one_day");
    expect(resolved.oneDay.sessionDate).toBe("2026-11-12");
  });

  it("sessions remain authoritative over legacy starts_at", () => {
    const schedule = resolveWizardSchedule({
      sessions: [...STAGING_QA_SESSIONS],
      startsAt: "2020-01-01T00:00:00.000Z",
      endsAt: null,
      timezone: "Africa/Lagos",
    });
    expect(schedule.days[0]?.sessionDate).toBe("2026-11-12");
    expect(schedule.days).toHaveLength(2);
  });

  it("edit label change survives flatten → group round-trip", () => {
    const schedule = wizardScheduleFromDays(
      groupSessionsIntoDays([...STAGING_QA_SESSIONS]),
    );
    const days = schedule.days.map((day, dayIndex) => ({
      ...day,
      sessions: day.sessions.map((session, sessionIndex) =>
        dayIndex === 0 && sessionIndex === 0
          ? { ...session, label: "Morning QA Session" }
          : session,
      ),
    }));
    const flattened = flattenProgramDays(days);
    expect(flattened[0]?.label).toBe("Morning QA Session");
    const regrouped = groupSessionsIntoDays(
      flattened.map((row) => ({
        session_date: row.session_date,
        start_time: row.start_time,
        end_time: row.end_time,
        label: row.label,
        sort_order: row.sort_order,
      })),
    );
    expect(regrouped[0]?.sessions[0]?.label).toBe("Morning QA Session");
    expect(regrouped[0]?.sessions[1]?.endTime).toBe("");
    expect(regrouped[1]?.sessions[0]?.startTime).toBe("09:00");
  });
});
