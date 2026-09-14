import { afterEach, describe, expect, it, vi } from "vitest";
import {
  evaluateRegistrationEligibility,
  parsePartySize,
  DUPLICATE_WINDOW_MS,
  MAX_PARTY_SIZE,
} from "@/lib/events/registration-eligibility";
import {
  generateRegistrationReferenceCode,
  isRegistrationReferenceCode,
} from "@/lib/events/reference-code";
import { sendRegistrationConfirmationEmail } from "@/lib/events/registration-email";
import {
  allowRegistrationAttempt,
  resetRegistrationRateLimitForTests,
} from "@/lib/events/registration-rate-limit";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { parseEventFields } from "@/lib/events/parse-fields";
import { permissionsForRoles } from "@/lib/authorization/rbac";

afterEach(() => {
  resetRegistrationRateLimitForTests();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Events E3 eligibility", () => {
  const base = {
    status: "published",
    registrationEnabled: true,
    registrationOpensAt: null as string | null,
    registrationClosesAt: null as string | null,
    capacity: null as number | null,
    registeredPeople: 0,
  };
  const now = new Date("2026-09-14T12:00:00Z");

  it("accepts published + enabled Event", () => {
    expect(evaluateRegistrationEligibility(base, now).state).toBe("open");
  });

  it("rejects draft / archived / disabled", () => {
    expect(
      evaluateRegistrationEligibility({ ...base, status: "draft" }, now).state,
    ).toBe("disabled");
    expect(
      evaluateRegistrationEligibility({ ...base, status: "archived" }, now)
        .state,
    ).toBe("disabled");
    expect(
      evaluateRegistrationEligibility(
        { ...base, registrationEnabled: false },
        now,
      ).state,
    ).toBe("disabled");
  });

  it("rejects before open and after close", () => {
    expect(
      evaluateRegistrationEligibility(
        {
          ...base,
          registrationOpensAt: "2026-09-15T00:00:00Z",
        },
        now,
      ).state,
    ).toBe("not_open");
    expect(
      evaluateRegistrationEligibility(
        {
          ...base,
          registrationClosesAt: "2026-09-01T00:00:00Z",
        },
        now,
      ).state,
    ).toBe("closed");
  });

  it("capacity accepts within limit and rejects overflow", () => {
    expect(
      evaluateRegistrationEligibility(
        { ...base, capacity: 10, registeredPeople: 7 },
        now,
      ),
    ).toEqual({ state: "open", remaining: 3 });
    expect(
      evaluateRegistrationEligibility(
        { ...base, capacity: 10, registeredPeople: 10 },
        now,
      ).state,
    ).toBe("full");
  });
});

describe("Events E3 party size", () => {
  it("validates party size bounds", () => {
    expect(parsePartySize(1)).toEqual({ ok: true, value: 1 });
    expect(parsePartySize(MAX_PARTY_SIZE)).toEqual({
      ok: true,
      value: MAX_PARTY_SIZE,
    });
    expect(parsePartySize(0).ok).toBe(false);
    expect(parsePartySize(MAX_PARTY_SIZE + 1).ok).toBe(false);
    expect(parsePartySize("abc").ok).toBe(false);
  });
});

describe("Events E3 reference codes", () => {
  it("generates unique non-sequential KCMI codes", () => {
    const a = generateRegistrationReferenceCode(() =>
      Uint8Array.from([1, 2, 3, 4, 5, 6]),
    );
    const b = generateRegistrationReferenceCode(() =>
      Uint8Array.from([9, 8, 7, 6, 5, 4]),
    );
    expect(isRegistrationReferenceCode(a)).toBe(true);
    expect(isRegistrationReferenceCode(b)).toBe(true);
    expect(a).not.toBe(b);
    expect(a.startsWith("KCMI-")).toBe(true);
    expect(a).not.toMatch(/KCMI-00000/);
  });
});

describe("Events E3 Turnstile", () => {
  it("rejects missing token", async () => {
    const result = await verifyTurnstileToken("");
    expect(result.ok).toBe(false);
  });

  it("accepts TEST_PASS only in non-production test mode", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("TURNSTILE_TEST_MODE", "1");
    vi.stubEnv("KCMI_ENVIRONMENT", undefined);
    expect((await verifyTurnstileToken("TEST_PASS")).ok).toBe(true);

    vi.stubEnv("TURNSTILE_TEST_MODE", undefined);
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_TEST_MODE", undefined);
    const closed = await verifyTurnstileToken("TEST_PASS");
    expect(closed.ok).toBe(false);
  });

  it("never allows test bypass in production environment", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_TEST_MODE", "1");
    vi.stubEnv("KCMI_ENVIRONMENT", "production");
    const result = await verifyTurnstileToken("TEST_PASS");
    expect(result.ok).toBe(false);
  });
});

describe("Events E3 email failure isolation", () => {
  it("reports skipped/failure without throwing (registration must not roll back)", async () => {
    vi.stubEnv("RESEND_API_KEY", undefined);
    vi.stubEnv("RESEND_FROM_EMAIL", undefined);
    const skipped = await sendRegistrationConfirmationEmail({
      to: "visitor@example.com",
      registrantName: "Ada",
      eventTitle: "Conference",
      eventDatesLabel: "10 March 2027",
      partySize: 2,
      referenceCode: "KCMI-ABCD12",
      eventUrl: "https://example.com/events/conference",
    });
    expect(skipped.ok).toBe(false);
    if (!skipped.ok) expect(skipped.skipped).toBe(true);

    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_FROM_EMAIL", "events@example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    );
    const failed = await sendRegistrationConfirmationEmail({
      to: "visitor@example.com",
      registrantName: "Ada",
      eventTitle: "Conference",
      eventDatesLabel: "10 March 2027",
      partySize: 2,
      referenceCode: "KCMI-ABCD12",
      eventUrl: "https://example.com/events/conference",
    });
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.skipped).toBe(false);
  });
});

describe("Events E3 duplicate window + rate limit", () => {
  it("documents duplicate window length", () => {
    expect(DUPLICATE_WINDOW_MS).toBe(5 * 60 * 1000);
  });

  it("rate-limits repeated attempts for the same key", () => {
    const key = "event-email-hash";
    for (let i = 0; i < 8; i += 1) {
      expect(allowRegistrationAttempt(key)).toBe(true);
    }
    expect(allowRegistrationAttempt(key)).toBe(false);
  });
});

describe("Events E3 Hub registration settings parse", () => {
  it("parses registration on/off, window, and capacity", () => {
    const fd = new FormData();
    fd.set("title", "Conference");
    fd.set("event_kind", "conference");
    fd.set("timezone", "Africa/Lagos");
    fd.set("start_date", "2027-03-10");
    fd.set("registration_enabled", "true");
    fd.set("registration_opens_date", "2027-01-01");
    fd.set("registration_closes_date", "2027-03-01");
    fd.set("capacity", "120");
    const parsed = parseEventFields(fd);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fields.registration_enabled).toBe(true);
    expect(parsed.fields.capacity).toBe(120);
    expect(parsed.fields.registration_opens_at).toBeTruthy();
    expect(parsed.fields.registration_closes_at).toBeTruthy();
  });

  it("rejects close before open", () => {
    const fd = new FormData();
    fd.set("title", "Conference");
    fd.set("event_kind", "conference");
    fd.set("timezone", "Africa/Lagos");
    fd.set("start_date", "2027-03-10");
    fd.set("registration_enabled", "true");
    fd.set("registration_opens_date", "2027-03-01");
    fd.set("registration_closes_date", "2027-01-01");
    expect(parseEventFields(fd).ok).toBe(false);
  });
});

describe("Events E3 RBAC separation", () => {
  it("media_admin cannot manage registrations; registrar can", () => {
    expect(permissionsForRoles(["media_admin"]).has("registrations.manage")).toBe(
      false,
    );
    expect(permissionsForRoles(["registrar"]).has("registrations.manage")).toBe(
      true,
    );
    expect(
      permissionsForRoles(["finance_reviewer"]).has("registrations.manage"),
    ).toBe(false);
  });
});
