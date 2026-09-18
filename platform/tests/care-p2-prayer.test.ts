import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  isPrayerIntakeEnabled,
  validatePrayerSubmission,
} from "@/lib/care/prayer-intake";
import { permissionsForRoles } from "@/lib/authorization/rbac";
import {
  canReadCareDomain,
  canViewCareRequestRow,
} from "@/lib/care/access";
import { CARE_AUDIT_ACTIONS } from "@/lib/care/types";
import { PUBLIC_SEARCH_PAGE_CATALOG } from "@/lib/search/page-catalog";

describe("Care P2 Prayer validation", () => {
  it("requires Prayer narrative", () => {
    const result = validatePrayerSubmission({
      narrative: "   ",
      contactRequested: "no",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts anonymous when no contact requested", () => {
    const result = validatePrayerSubmission({
      narrative: "Please pray for wisdom this week.",
      contactRequested: "no",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.contactRequested).toBe(false);
      expect(result.data.displayName).toBeNull();
      expect(result.data.phone).toBeNull();
      expect(result.data.email).toBeNull();
    }
  });

  it("rejects contact requested without name", () => {
    const result = validatePrayerSubmission({
      narrative: "Please pray for my family.",
      contactRequested: "yes",
      phone: "+234 800 000 0000",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.displayName).toBeTruthy();
    }
  });

  it("rejects contact requested without phone", () => {
    const result = validatePrayerSubmission({
      narrative: "Please pray for my family.",
      contactRequested: "yes",
      displayName: "Ada",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.phone).toBeTruthy();
    }
  });

  it("accepts contact requested with name and phone", () => {
    const result = validatePrayerSubmission({
      narrative: "Please pray for my family.",
      contactRequested: "yes",
      displayName: "Ada",
      phone: "+234 800 000 0000",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.displayName).toBe("Ada");
      expect(result.data.phone).toBe("+234 800 000 0000");
      expect(result.data.email).toBeNull();
    }
  });

  it("allows optional email and rejects invalid email", () => {
    const ok = validatePrayerSubmission({
      narrative: "Please pray.",
      contactRequested: "no",
      email: "friend@example.com",
    });
    expect(ok.ok).toBe(true);

    const bad = validatePrayerSubmission({
      narrative: "Please pray.",
      contactRequested: "no",
      email: "not-an-email",
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.fieldErrors?.email).toBeTruthy();
    }
  });

  it("rejects honeypot when filled", () => {
    const result = validatePrayerSubmission({
      narrative: "Please pray.",
      contactRequested: "no",
      company: "Acme Bot Corp",
    });
    expect(result.ok).toBe(false);
  });
});

describe("Care P2 Prayer intake gate", () => {
  const original = process.env.KCMI_PRAYER_INTAKE_ENABLED;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.KCMI_PRAYER_INTAKE_ENABLED;
    } else {
      process.env.KCMI_PRAYER_INTAKE_ENABLED = original;
    }
  });

  it("fails closed by default", () => {
    delete process.env.KCMI_PRAYER_INTAKE_ENABLED;
    expect(isPrayerIntakeEnabled()).toBe(false);
  });

  it("enables when set to 1", () => {
    process.env.KCMI_PRAYER_INTAKE_ENABLED = "1";
    expect(isPrayerIntakeEnabled()).toBe(true);
  });

  it("blocks submit path when intake disabled", async () => {
    delete process.env.KCMI_PRAYER_INTAKE_ENABLED;
    const { submitPrayerRequest } = await import("@/lib/care/prayer-submit");
    const result = await submitPrayerRequest({
      narrative: "Please pray for peace.",
      contactRequested: "no",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message.toLowerCase()).toMatch(/not enabled/);
    }
  });
});

describe("Care P2 Prayer insert mapping (unit)", () => {
  it("validated payload maps to prayer service_type fields", () => {
    const result = validatePrayerSubmission({
      narrative: "STAGING QA — Prayer synthetic.",
      contactRequested: "yes",
      displayName: "STAGING QA",
      phone: "+234911111111",
      email: "staging.prayer@example.invalid",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Insert mapping contract (no DB in unit test)
    const row = {
      service_type: "prayer" as const,
      status: "new" as const,
      narrative: result.data.narrative,
      contact_requested: result.data.contactRequested,
      display_name: result.data.displayName,
      phone: result.data.phone,
      email: result.data.email,
      preferred_contact_method: result.data.contactRequested
        ? ("phone" as const)
        : null,
    };
    expect(row.service_type).toBe("prayer");
    expect(row.status).toBe("new");
    expect(row.contact_requested).toBe(true);
    expect(row.preferred_contact_method).toBe("phone");
  });
});

describe("Care P2 authorization boundaries", () => {
  it("prayer.read can access Prayer queue only", () => {
    const perms = permissionsForRoles(["pastor"], ["prayer.read"]);
    expect(canReadCareDomain(perms, "prayer")).toBe(true);
    expect(canReadCareDomain(perms, "pastoral")).toBe(false);
    expect(canReadCareDomain(perms, "welfare")).toBe(false);
    expect(
      canViewCareRequestRow({
        permissions: perms,
        service: "prayer",
        assignedTo: null,
        viewerId: "u1",
      }),
    ).toBe(true);
  });

  it("media_admin and super_admin cannot read Prayer without Care grants", () => {
    expect(canReadCareDomain(permissionsForRoles(["media_admin"]), "prayer")).toBe(
      false,
    );
    expect(canReadCareDomain(permissionsForRoles(["super_admin"]), "prayer")).toBe(
      false,
    );
  });

  it("received/opened audit action names do not encode PII fields", () => {
    expect(CARE_AUDIT_ACTIONS.received).toBe("care.request.received");
    expect(CARE_AUDIT_ACTIONS.opened).toBe("care.request.opened");
  });
});

describe("Care P2 public surface", () => {
  it("points Prayer CTAs to native /prayer", () => {
    const pages = readFileSync(
      resolve(process.cwd(), "src/content/seed/pages.ts"),
      "utf8",
    );
    const engagement = readFileSync(
      resolve(process.cwd(), "src/content/seed/engagement.ts"),
      "utf8",
    );
    expect(pages).not.toMatch(/forms\.gle/);
    expect(engagement).toMatch(/ctaHref:\s*"\/prayer"/);
    expect(pages).toMatch(/Prayer requests[\s\S]*href:\s*"\/prayer"/);
  });

  it("indexes the public /prayer page but not pastoral_requests content", () => {
    const prayerPage = PUBLIC_SEARCH_PAGE_CATALOG.find((p) => p.url === "/prayer");
    expect(prayerPage).toBeTruthy();
    expect(prayerPage?.body.toLowerCase()).not.toMatch(/narrative|pastoral_requests/);
  });

  it("submit path uses secret-key insert, not browser client", () => {
    const submit = readFileSync(
      resolve(process.cwd(), "src/lib/care/prayer-submit.ts"),
      "utf8",
    );
    expect(submit).toMatch(/createSecretKeyClient/);
    expect(submit).toMatch(/CARE_AUDIT_ACTIONS\.received/);
    expect(submit).not.toMatch(/from\("pastoral_requests"\)\.select\(\s*"\*"/);
  });

  it("Hub open still requires AAL2 via Care queries", () => {
    const queries = readFileSync(
      resolve(process.cwd(), "src/lib/care/queries.ts"),
      "utf8",
    );
    expect(queries).toMatch(/assertAal2/);
  });
});

describe("Care P2 submit with mocked admin client", () => {
  beforeEach(() => {
    process.env.KCMI_PRAYER_INTAKE_ENABLED = "1";
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.KCMI_PRAYER_INTAKE_ENABLED;
    vi.doUnmock("@/lib/supabase/admin");
    vi.resetModules();
  });

  it("creates prayer row and returns reference without echoing narrative", async () => {
    const insert = vi.fn().mockReturnValue({
      select: () => ({
        single: async () => ({
          data: {
            id: "11111111-1111-4111-8111-111111111111",
            reference_code: "KCMI-CARE-ABCDEF",
          },
          error: null,
        }),
      }),
    });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    vi.doMock("@/lib/supabase/admin", () => ({
      createSecretKeyClient: () => ({
        from: (table: string) => {
          if (table === "pastoral_requests") {
            return { insert };
          }
          if (table === "audit_events") {
            return { insert: auditInsert };
          }
          throw new Error(`unexpected table ${table}`);
        },
      }),
    }));

    const { submitPrayerRequest } = await import("@/lib/care/prayer-submit");
    const result = await submitPrayerRequest({
      narrative: "STAGING QA — Please pray. Synthetic only.",
      contactRequested: "no",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.referenceCode).toBe("KCMI-CARE-ABCDEF");
      expect(JSON.stringify(result)).not.toMatch(/Please pray/);
    }
    expect(insert).toHaveBeenCalled();
    const payload = insert.mock.calls[0]?.[0];
    expect(payload.service_type).toBe("prayer");
    expect(payload.status).toBe("new");
    expect(payload.display_name).toBeNull();
    expect(auditInsert).toHaveBeenCalled();
    const audit = auditInsert.mock.calls[0]?.[0];
    expect(audit.action).toBe("care.request.received");
    expect(audit.metadata).not.toHaveProperty("narrative");
    expect(audit.metadata).not.toHaveProperty("phone");
    expect(audit.metadata).not.toHaveProperty("email");
    expect(audit.metadata).not.toHaveProperty("display_name");
  });
});
