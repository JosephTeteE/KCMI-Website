import { describe, expect, it } from "vitest";
import {
  formatProgramScheduleBlocks,
  formatProgramScheduleLabel,
  programActionLabel,
  timezoneForCountry,
} from "@/lib/programs/schedule";

describe("program schedule formatting", () => {
  it("formats a one-day timed session with time", () => {
    const label = formatProgramScheduleLabel([
      {
        sessionDate: "2026-10-11",
        startTime: "08:30",
        endTime: "10:30",
      },
    ]);
    expect(label).toMatch(/Sunday/);
    expect(label).toMatch(/8:30/);
    expect(label).toMatch(/AM/i);
  });

  it("keeps a dated evening start time (scenario B/H style)", () => {
    const label = formatProgramScheduleLabel([
      { sessionDate: "2026-10-10", startTime: "17:00" },
    ]);
    expect(label).toMatch(/Saturday/);
    expect(label).toMatch(/10/);
    expect(label).toMatch(/5:00/);
    expect(label).not.toMatch(/–/);
  });

  it("formats a multi-day range without inventing times", () => {
    const label = formatProgramScheduleLabel([
      { sessionDate: "2026-10-14", startTime: "09:00", sortOrder: 0 },
      { sessionDate: "2026-10-18", startTime: "17:00", sortOrder: 1 },
    ]);
    expect(label).toMatch(/14/);
    expect(label).toMatch(/18/);
  });

  it("groups two sessions on one day with both times visible", () => {
    const label = formatProgramScheduleLabel([
      { sessionDate: "2026-10-15", startTime: "09:00", sortOrder: 0 },
      { sessionDate: "2026-10-15", startTime: "17:00", sortOrder: 1 },
    ]);
    expect(label).toMatch(/9:00/);
    expect(label).toMatch(/5:00/);
    const blocks = formatProgramScheduleBlocks([
      { sessionDate: "2026-10-15", startTime: "09:00", label: "Morning", sortOrder: 0 },
      { sessionDate: "2026-10-15", startTime: "17:00", label: "Evening", sortOrder: 1 },
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.lines).toHaveLength(2);
    expect(blocks[0]!.lines[0]).toMatch(/Morning/);
    expect(blocks[0]!.lines[1]).toMatch(/Evening/);
  });

  it("omits end time when unknown", () => {
    const label = formatProgramScheduleLabel([
      { sessionDate: "2026-10-11", startTime: "17:00" },
    ]);
    expect(label).toMatch(/5:00/);
    expect(label).not.toMatch(/–/);
  });

  it("falls back to legacy starts_at", () => {
    const label = formatProgramScheduleLabel([], {
      startsAt: "2026-10-11T07:30:00.000Z",
    });
    expect(label).toBeTruthy();
  });
});

describe("program action labels", () => {
  it("derives volunteer-facing labels", () => {
    expect(programActionLabel("registration")).toBe("Register");
    expect(programActionLabel("youtube")).toBe("Watch video");
    expect(programActionLabel("facebook")).toBe("Watch video");
    expect(programActionLabel("other")).toBe("Learn more");
    expect(programActionLabel("none")).toBeNull();
  });
});

describe("branch timezone helpers", () => {
  it("maps West Africa countries", () => {
    expect(timezoneForCountry("Nigeria")).toBe("Africa/Lagos");
    expect(timezoneForCountry("Ghana")).toBe("Africa/Accra");
    expect(timezoneForCountry("Togo")).toBe("Africa/Lome");
  });
});
