import { describe, expect, it } from "vitest";
import {
  buildHubProgramReviewSchedule,
  formatHubProgramReviewScheduleText,
} from "@/lib/programs/hub-review-schedule";

/** Staging QA schedule shape used for D1.8.1 edit parity. */
const STAGING_QA = [
  {
    sessionDate: "2026-11-12",
    startTime: "09:00",
    endTime: "11:00",
    label: null as string | null,
    sortOrder: 0,
  },
  {
    sessionDate: "2026-11-12",
    startTime: "17:00",
    endTime: null,
    label: null as string | null,
    sortOrder: 1,
  },
  {
    sessionDate: "2026-11-13",
    startTime: "09:00",
    endTime: null,
    label: null as string | null,
    sortOrder: 2,
  },
];

describe("Hub Program Review schedule summary", () => {
  it("A. one day / one session with end", () => {
    const text = formatHubProgramReviewScheduleText([
      {
        sessionDate: "2026-10-10",
        startTime: "17:00",
        endTime: "20:00",
        sortOrder: 0,
      },
    ]);
    expect(text).toContain("Saturday, 10 October 2026");
    expect(text).toContain("5:00 PM – 8:00 PM");
    expect(text).not.toMatch(/undefined|—\s*$/m);
    expect(buildHubProgramReviewSchedule([
      {
        sessionDate: "2026-10-10",
        startTime: "17:00",
        endTime: "20:00",
      },
    ])).toHaveLength(1);
  });

  it("B. one day / one session without end", () => {
    const text = formatHubProgramReviewScheduleText([
      {
        sessionDate: "2026-10-11",
        startTime: "08:30",
        endTime: null,
        sortOrder: 0,
      },
    ]);
    expect(text).toContain("Sunday, 11 October 2026");
    expect(text).toContain("8:30 AM");
    expect(text).not.toContain("–");
    expect(text).not.toMatch(/undefined/);
  });

  it("C. one day / two sessions", () => {
    const days = buildHubProgramReviewSchedule([
      {
        sessionDate: "2026-11-12",
        startTime: "09:00",
        endTime: "11:00",
        sortOrder: 0,
      },
      {
        sessionDate: "2026-11-12",
        startTime: "17:00",
        endTime: null,
        sortOrder: 1,
      },
    ]);
    expect(days).toHaveLength(1);
    expect(days[0]?.sessions).toHaveLength(2);
    expect(days[0]?.sessions[0]?.time).toBe("9:00 AM – 11:00 AM");
    expect(days[0]?.sessions[1]?.time).toBe("5:00 PM");
  });

  it("D. multi-day", () => {
    const days = buildHubProgramReviewSchedule(STAGING_QA);
    expect(days).toHaveLength(2);
    expect(days[0]?.heading).toMatch(/Thursday.*12 November 2026/);
    expect(days[1]?.heading).toMatch(/Friday.*13 November 2026/);
    expect(days[0]?.sessions).toHaveLength(2);
    expect(days[1]?.sessions).toHaveLength(1);
  });

  it("E. named session", () => {
    const text = formatHubProgramReviewScheduleText([
      {
        sessionDate: "2026-11-12",
        startTime: "09:00",
        endTime: "11:00",
        label: "Morning QA Session",
        sortOrder: 0,
      },
    ]);
    expect(text).toContain("Morning QA Session");
    expect(text).toContain("9:00 AM – 11:00 AM");
    const days = buildHubProgramReviewSchedule([
      {
        sessionDate: "2026-11-12",
        startTime: "09:00",
        endTime: "11:00",
        label: "Morning QA Session",
      },
    ]);
    expect(days[0]?.sessions[0]?.label).toBe("Morning QA Session");
  });

  it("F. unnamed session", () => {
    const days = buildHubProgramReviewSchedule([
      {
        sessionDate: "2026-11-12",
        startTime: "17:00",
        endTime: null,
        label: "   ",
        sortOrder: 0,
      },
    ]);
    expect(days[0]?.sessions[0]?.label).toBeNull();
    expect(days[0]?.sessions[0]?.time).toBe("5:00 PM");
    const text = formatHubProgramReviewScheduleText([
      {
        sessionDate: "2026-11-12",
        startTime: "17:00",
        endTime: null,
        label: null,
      },
    ]);
    expect(text.split("\n")).toEqual([
      expect.stringMatching(/Thursday/),
      "5:00 PM",
    ]);
  });

  it("G. blank end time", () => {
    const days = buildHubProgramReviewSchedule(STAGING_QA);
    expect(days[0]?.sessions[1]?.time).toBe("5:00 PM");
    expect(days[1]?.sessions[0]?.time).toBe("9:00 AM");
    const text = formatHubProgramReviewScheduleText(STAGING_QA);
    expect(text).not.toMatch(/undefined/);
    expect(text).not.toMatch(/9:00 AM –\s*$/m);
    expect(text).not.toMatch(/5:00 PM –/);
  });

  it("renders all three staging QA sessions for Review", () => {
    const text = formatHubProgramReviewScheduleText(STAGING_QA);
    expect(text).toContain("9:00 AM – 11:00 AM");
    expect(text).toContain("5:00 PM");
    expect(text).toContain("9:00 AM");
    // Friday morning start appears once under Friday heading
    expect(text).toMatch(/Thursday[\s\S]*9:00 AM – 11:00 AM[\s\S]*5:00 PM/);
    expect(text).toMatch(/Friday[\s\S]*9:00 AM/);
    const days = buildHubProgramReviewSchedule(STAGING_QA);
    const totalSessions = days.reduce((n, d) => n + d.sessions.length, 0);
    expect(totalSessions).toBe(3);
  });
});
