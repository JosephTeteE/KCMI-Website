import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  joinTime12To24,
  splitTime24To12,
} from "@/lib/hub/time-12h";
import {
  isProgramVisibleOnUpcomingSurfaces,
  programHasUpcomingOrCurrentSession,
  sessionEffectiveEndIso,
} from "@/lib/programs/expiry";
import { parseProgramFields } from "@/lib/programs/parse-fields";
import { effectiveLivestreamIsLive } from "@/lib/livestream/effective-live";
import { isPrayerIntakeEnabled } from "@/lib/care/prayer-intake";
import { isPastoralIntakeEnabled } from "@/lib/care/pastoral-intake";
import { isWelfareIntakeEnabled } from "@/lib/care/welfare-intake";

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    fd.set(k, v);
  }
  return fd;
}

describe("12-hour time conversion", () => {
  it("converts AM times", () => {
    expect(
      joinTime12To24({ hour: "9", minute: "05", meridiem: "AM" }),
    ).toBe("09:05");
    expect(
      joinTime12To24({ hour: "12", minute: "00", meridiem: "AM" }),
    ).toBe("00:00");
  });

  it("converts PM times", () => {
    expect(
      joinTime12To24({ hour: "5", minute: "30", meridiem: "PM" }),
    ).toBe("17:30");
    expect(
      joinTime12To24({ hour: "12", minute: "15", meridiem: "PM" }),
    ).toBe("12:15");
  });

  it("keeps blank time blank", () => {
    expect(joinTime12To24({ hour: "", minute: "", meridiem: "" })).toBeNull();
    expect(joinTime12To24({ hour: "5", minute: "", meridiem: "PM" })).toBeNull();
    expect(splitTime24To12(null)).toEqual({
      hour: "",
      minute: "",
      meridiem: "",
    });
    expect(splitTime24To12("")).toEqual({
      hour: "",
      minute: "",
      meridiem: "",
    });
  });

  it("round-trips stored HH:MM", () => {
    expect(splitTime24To12("17:30")).toEqual({
      hour: "5",
      minute: "30",
      meridiem: "PM",
    });
    expect(
      joinTime12To24(splitTime24To12("08:00")!),
    ).toBe("08:00");
  });
});

describe("program multi-session scheduling", () => {
  it("accepts one session and multiple unrelated dates", () => {
    const one = parseProgramFields(
      form({
        title: "Single",
        sessions_json: JSON.stringify([
          {
            session_date: "2026-09-23",
            start_time: "17:30",
            end_time: null,
            label: null,
            sort_order: 0,
          },
        ]),
        action_kind: "none",
      }),
      { forcePlacementNone: true },
    );
    expect(one.ok).toBe(true);
    if (!one.ok) return;
    expect(one.fields.sessions).toHaveLength(1);

    const many = parseProgramFields(
      form({
        title: "Camp week",
        sessions_json: JSON.stringify([
          {
            session_date: "2026-09-23",
            start_time: "17:30",
            end_time: null,
            sort_order: 0,
          },
          {
            session_date: "2026-09-24",
            start_time: "17:30",
            end_time: null,
            sort_order: 1,
          },
          {
            session_date: "2026-09-26",
            start_time: "09:00",
            end_time: null,
            sort_order: 2,
          },
          {
            session_date: "2026-09-27",
            start_time: "08:00",
            end_time: null,
            sort_order: 3,
          },
        ]),
        action_kind: "none",
      }),
      { forcePlacementNone: true },
    );
    expect(many.ok).toBe(true);
    if (!many.ok) return;
    expect(many.fields.sessions.map((s) => s.session_date)).toEqual([
      "2026-09-23",
      "2026-09-24",
      "2026-09-26",
      "2026-09-27",
    ]);
  });

  it("ProgramForm exposes multi-session Advanced schedule UX", () => {
    const formUi = readSrc("src/components/hub/program-form.tsx");
    expect(formUi).toContain("Add another date/time");
    expect(formUi).toContain("Remove session");
    expect(formUi).toContain("HubTime12hField");
    expect(formUi).not.toContain('type="time"');
  });
});

describe("program auto expiry", () => {
  it("treats missing end time as through 23:59 local", () => {
    const end = sessionEffectiveEndIso(
      { sessionDate: "2026-09-23", startTime: "17:30", endTime: null },
      "Africa/Lagos",
    );
    expect(end).toBe(
      sessionEffectiveEndIso(
        { sessionDate: "2026-09-23", startTime: null, endTime: "23:59" },
        "Africa/Lagos",
      ),
    );
  });

  it("hides expired programs from upcoming surfaces", () => {
    const sessions = [
      { sessionDate: "2020-01-01", startTime: "10:00", endTime: "12:00" },
    ];
    expect(
      isProgramVisibleOnUpcomingSurfaces(sessions, {
        timeZone: "Africa/Lagos",
        now: new Date("2026-09-19T12:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("keeps future programs visible", () => {
    const sessions = [
      { sessionDate: "2026-12-01", startTime: "17:30", endTime: null },
    ];
    expect(
      programHasUpcomingOrCurrentSession(sessions, {
        timeZone: "Africa/Lagos",
        now: new Date("2026-09-19T12:00:00.000Z"),
      }),
    ).toBe(true);
  });

  it("keeps unscheduled published programs visible", () => {
    expect(
      isProgramVisibleOnUpcomingSurfaces([], {
        now: new Date("2026-09-19T12:00:00.000Z"),
      }),
    ).toBe(true);
  });
});

describe("livestream auto-off", () => {
  it("manual OFF is immediately offline", () => {
    expect(
      effectiveLivestreamIsLive({
        isLive: false,
        autoEndAt: "2099-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("ON before auto_end_at stays live", () => {
    expect(
      effectiveLivestreamIsLive({
        isLive: true,
        autoEndAt: "2099-01-01T00:00:00.000Z",
        now: new Date("2026-09-19T12:00:00.000Z"),
      }),
    ).toBe(true);
  });

  it("automatically offline after auto_end_at", () => {
    expect(
      effectiveLivestreamIsLive({
        isLive: true,
        autoEndAt: "2020-01-01T00:00:00.000Z",
        now: new Date("2026-09-19T12:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("null auto_end_at relies on is_live only", () => {
    expect(
      effectiveLivestreamIsLive({ isLive: true, autoEndAt: null }),
    ).toBe(true);
  });
});

describe("care intake gates", () => {
  const prayer = process.env.KCMI_PRAYER_INTAKE_ENABLED;
  const pastoral = process.env.KCMI_PASTORAL_INTAKE_ENABLED;
  const welfare = process.env.KCMI_WELFARE_INTAKE_ENABLED;

  afterEach(() => {
    if (prayer === undefined) delete process.env.KCMI_PRAYER_INTAKE_ENABLED;
    else process.env.KCMI_PRAYER_INTAKE_ENABLED = prayer;
    if (pastoral === undefined) delete process.env.KCMI_PASTORAL_INTAKE_ENABLED;
    else process.env.KCMI_PASTORAL_INTAKE_ENABLED = pastoral;
    if (welfare === undefined) delete process.env.KCMI_WELFARE_INTAKE_ENABLED;
    else process.env.KCMI_WELFARE_INTAKE_ENABLED = welfare;
  });

  it("accepted truthy values are 1 / true / yes (case-insensitive)", () => {
    for (const value of ["1", "true", "TRUE", "yes", "Yes"]) {
      process.env.KCMI_PRAYER_INTAKE_ENABLED = value;
      process.env.KCMI_PASTORAL_INTAKE_ENABLED = value;
      process.env.KCMI_WELFARE_INTAKE_ENABLED = value;
      expect(isPrayerIntakeEnabled()).toBe(true);
      expect(isPastoralIntakeEnabled()).toBe(true);
      expect(isWelfareIntakeEnabled()).toBe(true);
    }
  });

  it("flags OFF => CareIntakeUnavailable on public routes", () => {
    delete process.env.KCMI_PRAYER_INTAKE_ENABLED;
    delete process.env.KCMI_PASTORAL_INTAKE_ENABLED;
    delete process.env.KCMI_WELFARE_INTAKE_ENABLED;
    expect(isPrayerIntakeEnabled()).toBe(false);
    expect(isPastoralIntakeEnabled()).toBe(false);
    expect(isWelfareIntakeEnabled()).toBe(false);
    for (const page of [
      "src/app/(site)/prayer/page.tsx",
      "src/app/(site)/pastoral-care/page.tsx",
      "src/app/(site)/welfare/page.tsx",
    ]) {
      const source = readSrc(page);
      expect(source).toContain("CareIntakeUnavailable");
      expect(source).toMatch(/intakeEnabled \?/);
    }
  });
});
