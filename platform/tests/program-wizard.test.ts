import { describe, expect, it } from "vitest";
import {
  parseProgramActionKind,
  validateProgramActionUrl,
} from "@/lib/programs/action-url";
import { parseProgramFields } from "@/lib/programs/parse-fields";
import {
  legacyIntervalFromSessions,
  parseProgramSessionsJson,
  parseProgramTimezone,
} from "@/lib/programs/sessions";

describe("validateProgramActionUrl", () => {
  it("allows empty URL only when action is none", () => {
    expect(validateProgramActionUrl("none", "")).toEqual({
      ok: true,
      url: null,
    });
    expect(validateProgramActionUrl("registration", "").ok).toBe(false);
  });

  it("accepts YouTube hosts and rejects others", () => {
    const ok = validateProgramActionUrl(
      "youtube",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(ok.ok).toBe(true);
    expect(
      validateProgramActionUrl("youtube", "https://example.com/watch").ok,
    ).toBe(false);
    expect(
      validateProgramActionUrl("youtube", "https://youtu.be/dQw4w9WgXcQ").ok,
    ).toBe(true);
  });

  it("accepts Facebook hosts and rejects embed markup", () => {
    expect(
      validateProgramActionUrl("facebook", "https://www.facebook.com/watch/?v=1")
        .ok,
    ).toBe(true);
    expect(
      validateProgramActionUrl(
        "facebook",
        '<iframe src="https://www.facebook.com/x"></iframe>',
      ).ok,
    ).toBe(false);
  });

  it("allows site paths only for other", () => {
    expect(validateProgramActionUrl("other", "/giving")).toEqual({
      ok: true,
      url: "/giving",
    });
    expect(validateProgramActionUrl("registration", "/giving").ok).toBe(false);
  });

  it("requires https for absolute URLs", () => {
    expect(
      validateProgramActionUrl("other", "http://example.com/page").ok,
    ).toBe(false);
  });
});

describe("parseProgramActionKind", () => {
  it("falls back to none for unknown values", () => {
    expect(parseProgramActionKind("youtube")).toBe("youtube");
    expect(parseProgramActionKind("nope")).toBe("none");
  });
});

describe("parseProgramSessionsJson", () => {
  it("parses and sorts sessions", () => {
    const result = parseProgramSessionsJson(
      JSON.stringify([
        {
          session_date: "2026-10-12",
          start_time: "17:00",
          end_time: "19:00",
          label: "Evening",
          sort_order: 1,
        },
        {
          session_date: "2026-10-11",
          start_time: "09:00",
          sort_order: 0,
        },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sessions).toHaveLength(2);
    expect(result.sessions[0]!.session_date).toBe("2026-10-11");
    expect(result.sessions[1]!.label).toBe("Evening");
  });

  it("rejects finish-before-start", () => {
    const result = parseProgramSessionsJson(
      JSON.stringify([
        {
          session_date: "2026-10-11",
          start_time: "18:00",
          end_time: "09:00",
        },
      ]),
    );
    expect(result.ok).toBe(false);
  });

  it("accepts empty payload as no sessions", () => {
    expect(parseProgramSessionsJson(null)).toEqual({ ok: true, sessions: [] });
    expect(parseProgramSessionsJson("")).toEqual({ ok: true, sessions: [] });
  });
});

describe("legacyIntervalFromSessions", () => {
  it("builds starts_at / ends_at from first and last session", () => {
    const interval = legacyIntervalFromSessions(
      [
        {
          session_date: "2026-10-11",
          start_time: "08:30",
          end_time: "10:30",
          label: null,
          sort_order: 0,
        },
        {
          session_date: "2026-10-12",
          start_time: "17:00",
          end_time: "19:00",
          label: null,
          sort_order: 1,
        },
      ],
      "Africa/Lagos",
    );
    expect(interval.startsAt).toBeTruthy();
    expect(interval.endsAt).toBeTruthy();
    expect(interval.startsAt! < interval.endsAt!).toBe(true);
  });
});

describe("parseProgramTimezone", () => {
  it("falls back to Lagos", () => {
    expect(parseProgramTimezone("Africa/Accra")).toBe("Africa/Accra");
    expect(parseProgramTimezone("Mars/Olympus")).toBe("Africa/Lagos");
  });
});

describe("parseProgramFields (wizard payload)", () => {
  it("derives CTA label and keeps placement none when forced", () => {
    const fd = new FormData();
    fd.set("title", "Youth Convention");
    fd.set("short_description", "Five days of worship");
    fd.set("action_kind", "registration");
    fd.set("cta_url", "https://example.com/register");
    fd.set(
      "sessions_json",
      JSON.stringify([
        {
          session_date: "2026-11-01",
          start_time: "09:00",
          end_time: "12:00",
        },
      ]),
    );
    fd.set("location_kind", "venue");
    fd.set("location_label", "City Hall");
    fd.set("timezone", "Africa/Lagos");
    fd.set("placement", "featured");

    const parsed = parseProgramFields(fd, { forcePlacementNone: true });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fields.placement).toBe("none");
    expect(parsed.fields.cta_label).toBe("Register");
    expect(parsed.fields.action_kind).toBe("registration");
    expect(parsed.fields.sessions).toHaveLength(1);
    expect(parsed.fields.location_kind).toBe("venue");
    expect(parsed.fields.starts_at).toBeTruthy();
  });

  it("keeps legacy edit path when action_kind is omitted", () => {
    const fd = new FormData();
    fd.set("title", "Sunday Service");
    fd.set("cta_label", "Learn more");
    fd.set("cta_url", "/giving");
    fd.set("starts_at", "2026-10-11T09:00");
    fd.set("placement", "card");

    const parsed = parseProgramFields(fd);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fields.hasActionKindPayload).toBe(false);
    expect(parsed.fields.cta_label).toBe("Learn more");
    expect(parsed.fields.cta_url).toBe("/giving");
    expect(parsed.fields.placement).toBe("card");
    expect(parsed.fields.sessions).toHaveLength(0);
  });
});

describe("flattenProgramDays (UI day grouping)", () => {
  it("writes the same session_date for every session under one day", async () => {
    const { flattenProgramDays } = await import("@/lib/programs/days");
    const rows = flattenProgramDays([
      {
        sessionDate: "2026-10-15",
        sessions: [
          { startTime: "09:00", endTime: "", label: "Morning service" },
          { startTime: "17:00", endTime: "", label: "Evening service" },
        ],
      },
      {
        sessionDate: "2026-10-16",
        sessions: [{ startTime: "10:00", endTime: "12:00", label: "" }],
      },
    ]);
    expect(rows).toHaveLength(3);
    expect(rows.filter((r) => r.session_date === "2026-10-15")).toHaveLength(2);
    expect(rows.map((r) => r.start_time)).toEqual(["09:00", "17:00", "10:00"]);
    expect(rows[0]?.label).toBe("Morning service");
  });

  it("skips days without a date or sessions without a start", async () => {
    const { flattenProgramDays } = await import("@/lib/programs/days");
    expect(
      flattenProgramDays([
        {
          sessionDate: "",
          sessions: [{ startTime: "09:00", endTime: "", label: "" }],
        },
        {
          sessionDate: "2026-10-15",
          sessions: [{ startTime: "", endTime: "10:00", label: "x" }],
        },
      ]),
    ).toEqual([]);
  });
});
