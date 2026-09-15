import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHmac } from "node:crypto";
import {
  CARE_INTAKE_GENERIC_REJECT_MESSAGE,
  isCareIntakeHoneypotTriggered,
} from "@/lib/care/intake-abuse";
import {
  assertSafeCareIntakeMetadata,
  logCareIntakeEvent,
} from "@/lib/care/intake-log";
import {
  CARE_INTAKE_RATE_LIMIT,
  CARE_INTAKE_RATE_LIMITED_MESSAGE,
  hashCareIntakeRequesterKey,
} from "@/lib/care/intake-rate-limit";
import { isPrayerIntakeEnabled } from "@/lib/care/prayer-intake";
import { isPastoralIntakeEnabled } from "@/lib/care/pastoral-intake";
import { isWelfareIntakeEnabled } from "@/lib/care/welfare-intake";
import { LEGACY_PRAYER_GOOGLE_FORM_URL } from "@/lib/care/prayer-intake";
import { LEGACY_PASTORAL_GOOGLE_FORM_URL } from "@/lib/care/pastoral-intake";
import { LEGACY_WELFARE_GOOGLE_FORM_URL } from "@/lib/care/welfare-intake";
import { permissionsForRoles } from "@/lib/authorization/rbac";
import { canReadCareDomain } from "@/lib/care/access";
import { PUBLIC_SEARCH_PAGE_CATALOG } from "@/lib/search/page-catalog";

describe("Care P4 gate independence", () => {
  const originals = {
    prayer: process.env.KCMI_PRAYER_INTAKE_ENABLED,
    pastoral: process.env.KCMI_PASTORAL_INTAKE_ENABLED,
    welfare: process.env.KCMI_WELFARE_INTAKE_ENABLED,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(originals)) {
      const envKey =
        key === "prayer"
          ? "KCMI_PRAYER_INTAKE_ENABLED"
          : key === "pastoral"
            ? "KCMI_PASTORAL_INTAKE_ENABLED"
            : "KCMI_WELFARE_INTAKE_ENABLED";
      if (value === undefined) delete process.env[envKey];
      else process.env[envKey] = value;
    }
  });

  it("keeps each gate independent", () => {
    delete process.env.KCMI_PRAYER_INTAKE_ENABLED;
    delete process.env.KCMI_PASTORAL_INTAKE_ENABLED;
    delete process.env.KCMI_WELFARE_INTAKE_ENABLED;
    expect(isPrayerIntakeEnabled()).toBe(false);
    expect(isPastoralIntakeEnabled()).toBe(false);
    expect(isWelfareIntakeEnabled()).toBe(false);

    process.env.KCMI_PRAYER_INTAKE_ENABLED = "1";
    expect(isPrayerIntakeEnabled()).toBe(true);
    expect(isPastoralIntakeEnabled()).toBe(false);
    expect(isWelfareIntakeEnabled()).toBe(false);
  });
});

describe("Care P4 honeypot", () => {
  it("detects filled honeypot without domain leakage", () => {
    expect(isCareIntakeHoneypotTriggered("Acme")).toBe(true);
    expect(isCareIntakeHoneypotTriggered("")).toBe(false);
    expect(isCareIntakeHoneypotTriggered(undefined)).toBe(false);
    expect(CARE_INTAKE_GENERIC_REJECT_MESSAGE.toLowerCase()).not.toMatch(
      /honeypot|bot|rate/,
    );
  });
});

describe("Care P4 rate-limit hashing and schema privacy", () => {
  it("hashes requester material one-way without embedding raw IP", () => {
    const secret = "unit-test-secret-not-for-production";
    const key = hashCareIntakeRequesterKey("203.0.113.10", secret);
    expect(key).toHaveLength(64);
    expect(key).not.toContain("203.0.113.10");
    expect(key).toBe(
      createHmac("sha256", secret)
        .update("kcmi-care-intake|v1|203.0.113.10")
        .digest("hex"),
    );
    expect(CARE_INTAKE_RATE_LIMIT.maxAttempts).toBe(8);
    expect(CARE_INTAKE_RATE_LIMIT.windowSeconds).toBe(3600);
  });

  it("rate-limit migration stores no PII/narrative columns", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260918120000_care_p4_intake_rate_limits.sql",
      ),
      "utf8",
    );
    expect(sql).toMatch(/care_intake_rate_limits/);
    expect(sql).toMatch(/requester_key/);
    expect(sql).toMatch(/care_intake_rate_limit_consume/);
    const createMatch = sql.match(
      /create table if not exists public\.care_intake_rate_limits \(([\s\S]*?)\);/,
    );
    expect(createMatch?.[1]).toBeTruthy();
    const columns = createMatch?.[1] ?? "";
    expect(columns).toMatch(/requester_key/);
    expect(columns).toMatch(/service_type/);
    expect(columns).toMatch(/window_started_at/);
    expect(columns).toMatch(/attempt_count/);
    expect(columns.toLowerCase()).not.toMatch(/\bemail\b/);
    expect(columns.toLowerCase()).not.toMatch(/\bphone\b/);
    expect(columns.toLowerCase()).not.toMatch(/\bnarrative\b/);
    expect(columns.toLowerCase()).not.toMatch(/\buser_agent\b/);
    expect(sql.toLowerCase()).not.toMatch(/grant .+ to anon/);
  });
});

describe("Care P4 logging privacy", () => {
  it("rejects sensitive metadata keys", () => {
    expect(() =>
      assertSafeCareIntakeMetadata({ narrative: "secret" }),
    ).toThrow();
    expect(() => assertSafeCareIntakeMetadata({ phone: "1" })).toThrow();
    expect(() =>
      assertSafeCareIntakeMetadata({ service: "prayer", outcome: "accepted" }),
    ).not.toThrow();
  });

  it("log helper emits no sensitive fields", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logCareIntakeEvent({
      service: "prayer",
      outcome: "accepted",
      referenceCode: "KCMI-CARE-ABCDEF",
    });
    const payload = String(spy.mock.calls[0]?.[0] ?? "");
    expect(payload).toContain("care_intake");
    expect(payload).toContain("KCMI-CARE-ABCDEF");
    expect(payload.toLowerCase()).not.toMatch(/narrative|phone|email|display/);
    spy.mockRestore();
  });
});

describe("Care P4 submit wiring (mocked)", () => {
  beforeEach(() => {
    process.env.KCMI_PRAYER_INTAKE_ENABLED = "1";
    process.env.KCMI_PASTORAL_INTAKE_ENABLED = "1";
    process.env.KCMI_WELFARE_INTAKE_ENABLED = "1";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.SUPABASE_SECRET_KEY = "unit-test-secret-key";
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.KCMI_PRAYER_INTAKE_ENABLED;
    delete process.env.KCMI_PASTORAL_INTAKE_ENABLED;
    delete process.env.KCMI_WELFARE_INTAKE_ENABLED;
    vi.doUnmock("@/lib/supabase/admin");
    vi.doUnmock("next/headers");
    vi.resetModules();
  });

  function mockClients(args: {
    rateAllowed: boolean;
    insertRef?: string;
  }) {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        allowed: args.rateAllowed,
        attempt_count: args.rateAllowed ? 1 : 99,
        limit: 8,
      },
      error: null,
    });
    const insert = vi.fn().mockReturnValue({
      select: () => ({
        single: async () => ({
          data: {
            id: "44444444-4444-4444-8444-444444444444",
            reference_code: args.insertRef ?? "KCMI-CARE-RATE01",
          },
          error: null,
        }),
      }),
    });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    vi.doMock("next/headers", () => ({
      headers: async () =>
        new Headers({ "x-forwarded-for": "198.51.100.20" }),
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createSecretKeyClient: () => ({
        rpc,
        from: (table: string) => {
          if (table === "pastoral_requests") return { insert };
          if (table === "audit_events") return { insert: auditInsert };
          throw new Error(`unexpected ${table}`);
        },
      }),
    }));
    return { rpc, insert, auditInsert };
  }

  it("rejects when intake OFF for all three domains", async () => {
    delete process.env.KCMI_PRAYER_INTAKE_ENABLED;
    delete process.env.KCMI_PASTORAL_INTAKE_ENABLED;
    delete process.env.KCMI_WELFARE_INTAKE_ENABLED;
    const { submitPrayerRequest } = await import("@/lib/care/prayer-submit");
    const { submitPastoralRequest } = await import(
      "@/lib/care/pastoral-submit"
    );
    const { submitWelfareRequest } = await import("@/lib/care/welfare-submit");
    expect(
      (
        await submitPrayerRequest({
          narrative: "Please pray.",
          contactRequested: "no",
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await submitPastoralRequest({
          displayName: "Ada",
          phone: "+2348000000000",
          reason: "Need pastoral support",
          preferredMethod: "phone",
          preferredTime: "Morning",
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await submitWelfareRequest({
          displayName: "Ada",
          phone: "+2348000000000",
          category: "food",
          description: "Need food support",
        })
      ).ok,
    ).toBe(false);
  });

  it("honeypot rejects all three without insert", async () => {
    const { insert } = mockClients({ rateAllowed: true });
    const { submitPrayerRequest } = await import("@/lib/care/prayer-submit");
    const prayer = await submitPrayerRequest({
      narrative: "Please pray.",
      contactRequested: "no",
      company: "BotCo",
    });
    expect(prayer.ok).toBe(false);
    if (!prayer.ok) {
      expect(prayer.message).toBe(CARE_INTAKE_GENERIC_REJECT_MESSAGE);
    }
    expect(insert).not.toHaveBeenCalled();

    vi.resetModules();
    const again = mockClients({ rateAllowed: true });
    const { submitPastoralRequest } = await import(
      "@/lib/care/pastoral-submit"
    );
    const pastoral = await submitPastoralRequest({
      displayName: "Ada",
      phone: "+2348000000000",
      reason: "Need pastoral support",
      preferredMethod: "phone",
      preferredTime: "Morning",
      company: "BotCo",
    });
    expect(pastoral.ok).toBe(false);
    expect(again.insert).not.toHaveBeenCalled();

    vi.resetModules();
    const third = mockClients({ rateAllowed: true });
    const { submitWelfareRequest } = await import("@/lib/care/welfare-submit");
    const welfare = await submitWelfareRequest({
      displayName: "Ada",
      phone: "+2348000000000",
      category: "food",
      description: "Need food support",
      company: "BotCo",
    });
    expect(welfare.ok).toBe(false);
    expect(third.insert).not.toHaveBeenCalled();
  });

  it("rate limit applies server-side before insert", async () => {
    const { insert, rpc } = mockClients({ rateAllowed: false });
    const { submitPrayerRequest } = await import("@/lib/care/prayer-submit");
    const result = await submitPrayerRequest({
      narrative: "Please pray.",
      contactRequested: "no",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(CARE_INTAKE_RATE_LIMITED_MESSAGE);
    }
    expect(rpc).toHaveBeenCalled();
    const rpcArgs = rpc.mock.calls[0]?.[1];
    expect(JSON.stringify(rpcArgs)).not.toMatch(/198\.51\.100\.20/);
    expect(rpcArgs.p_requester_key).toMatch(/^[a-f0-9]{64}$/);
    expect(insert).not.toHaveBeenCalled();
  });

  it("legitimate submission within limit succeeds", async () => {
    const { insert, rpc } = mockClients({
      rateAllowed: true,
      insertRef: "KCMI-CARE-OK0001",
    });
    const { submitPrayerRequest } = await import("@/lib/care/prayer-submit");
    const result = await submitPrayerRequest({
      narrative: "STAGING QA — Please pray. Synthetic only.",
      contactRequested: "no",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.referenceCode).toBe("KCMI-CARE-OK0001");
      expect(JSON.stringify(result)).not.toMatch(/Please pray/);
    }
    expect(rpc).toHaveBeenCalled();
    expect(insert).toHaveBeenCalled();
  });
});

describe("Care P4 cutover surface invariants", () => {
  it("keeps Google CTAs unchanged before cutover", () => {
    const pages = readFileSync(
      resolve(process.cwd(), "src/content/seed/pages.ts"),
      "utf8",
    );
    const defaults = readFileSync(
      resolve(process.cwd(), "src/content/website/defaults.ts"),
      "utf8",
    );
    const engagement = readFileSync(
      resolve(process.cwd(), "src/content/seed/engagement.ts"),
      "utf8",
    );
    expect(pages).toContain(LEGACY_PRAYER_GOOGLE_FORM_URL);
    expect(pages).toContain(LEGACY_PASTORAL_GOOGLE_FORM_URL);
    expect(pages).toContain(LEGACY_WELFARE_GOOGLE_FORM_URL);
    expect(defaults).toContain(LEGACY_PRAYER_GOOGLE_FORM_URL);
    expect(engagement).toContain(LEGACY_PRAYER_GOOGLE_FORM_URL);
    expect(pages).not.toMatch(
      /Prayer request form[\s\S]*href:\s*"\/prayer"/,
    );
    expect(pages).not.toMatch(
      /Counselling request form[\s\S]*href:\s*"\/pastoral-care"/,
    );
    expect(pages).not.toMatch(
      /Welfare request form[\s\S]*href:\s*"\/welfare"/,
    );
  });

  it("keeps Search exclusion of submissions and role boundaries", () => {
    for (const url of ["/prayer", "/pastoral-care", "/welfare"]) {
      const page = PUBLIC_SEARCH_PAGE_CATALOG.find((p) => p.url === url);
      expect(page).toBeTruthy();
      expect(page?.body.toLowerCase()).not.toMatch(/pastoral_requests|narrative/);
    }
    expect(
      canReadCareDomain(permissionsForRoles(["media_admin"]), "prayer"),
    ).toBe(false);
    expect(
      canReadCareDomain(permissionsForRoles(["super_admin"]), "welfare"),
    ).toBe(false);
    const queries = readFileSync(
      resolve(process.cwd(), "src/lib/care/queries.ts"),
      "utf8",
    );
    expect(queries).toMatch(/assertAal2/);
  });

  it("documents cutover runbook and Turnstile decision", () => {
    const doc = readFileSync(
      resolve(process.cwd(), "../docs/CARE_P4_CUTOVER.md"),
      "utf8",
    );
    expect(doc).toMatch(/FIRST_PARTY_ABUSE_CONTROLS_SUFFICIENT_FOR_INITIAL_LAUNCH/);
    expect(doc).toMatch(/HUMAN_PRIVACY_COPY_APPROVAL_REQUIRED/);
    expect(doc).toMatch(/Cutover runbook/);
    expect(doc).toMatch(/Celebration/);
  });
});
