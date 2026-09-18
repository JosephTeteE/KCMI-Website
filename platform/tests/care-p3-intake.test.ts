import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildPastoralNarrative,
  isPastoralIntakeEnabled,
  validatePastoralSubmission,
} from "@/lib/care/pastoral-intake";
import {
  buildWelfareNarrative,
  isWelfareIntakeEnabled,
  validateWelfareSubmission,
} from "@/lib/care/welfare-intake";
import { permissionsForRoles } from "@/lib/authorization/rbac";
import {
  canReadCareDomain,
  canViewCareRequestRow,
} from "@/lib/care/access";
import { CARE_AUDIT_ACTIONS, CARE_RETENTION } from "@/lib/care/types";
import { PUBLIC_SEARCH_PAGE_CATALOG } from "@/lib/search/page-catalog";

const validPastoral = {
  displayName: "Ada",
  phone: "+234 800 000 0000",
  reason: "I would like Pastoral Care support this month.",
  preferredMethod: "phone",
  preferredTime: "Weekday mornings",
};

const validWelfare = {
  displayName: "Ada",
  phone: "+234 800 000 0000",
  category: "food",
  description: "Need short-term food support for my household.",
};

describe("Care P3 Pastoral validation", () => {
  it("requires name", () => {
    const result = validatePastoralSubmission({
      ...validPastoral,
      displayName: "  ",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.displayName).toBeTruthy();
  });

  it("requires phone", () => {
    const result = validatePastoralSubmission({
      ...validPastoral,
      phone: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.phone).toBeTruthy();
  });

  it("allows optional email and rejects invalid email", () => {
    const ok = validatePastoralSubmission({
      ...validPastoral,
      email: "friend@example.com",
    });
    expect(ok.ok).toBe(true);

    const bad = validatePastoralSubmission({
      ...validPastoral,
      email: "not-an-email",
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.fieldErrors?.email).toBeTruthy();
  });

  it("requires reason", () => {
    const result = validatePastoralSubmission({
      ...validPastoral,
      reason: " ",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.reason).toBeTruthy();
  });

  it("requires valid preferred method", () => {
    const result = validatePastoralSubmission({
      ...validPastoral,
      preferredMethod: "zoom",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.preferredMethod).toBeTruthy();
  });

  it("requires preferred time", () => {
    const result = validatePastoralSubmission({
      ...validPastoral,
      preferredTime: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.preferredTime).toBeTruthy();
  });

  it("combines optional additional into a single narrative", () => {
    const result = validatePastoralSubmission({
      ...validPastoral,
      preferredMethod: "in_person",
      additional: "Prefer quiet office if possible.",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.narrative).toContain(validPastoral.reason);
    expect(result.data.narrative).toContain("Additional information:");
    expect(result.data.narrative).toContain("Prefer quiet office");
    expect(result.data.preferredContactMethod).toBe("in_person");
    expect(result.data.contactRequested).toBe(true);
  });

  it("buildPastoralNarrative keeps reason alone when no additional", () => {
    expect(buildPastoralNarrative("Reason only", null)).toBe("Reason only");
  });
});

describe("Care P3 Pastoral intake gate", () => {
  const original = process.env.KCMI_PASTORAL_INTAKE_ENABLED;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.KCMI_PASTORAL_INTAKE_ENABLED;
    } else {
      process.env.KCMI_PASTORAL_INTAKE_ENABLED = original;
    }
  });

  it("fails closed by default", () => {
    delete process.env.KCMI_PASTORAL_INTAKE_ENABLED;
    expect(isPastoralIntakeEnabled()).toBe(false);
  });

  it("enables when set to 1", () => {
    process.env.KCMI_PASTORAL_INTAKE_ENABLED = "1";
    expect(isPastoralIntakeEnabled()).toBe(true);
  });

  it("blocks submit path when intake disabled", async () => {
    delete process.env.KCMI_PASTORAL_INTAKE_ENABLED;
    const { submitPastoralRequest } = await import("@/lib/care/pastoral-submit");
    const result = await submitPastoralRequest(validPastoral);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message.toLowerCase()).toMatch(/not enabled/);
    }
  });
});

describe("Care P3 Welfare validation", () => {
  it("requires name and phone", () => {
    expect(
      validateWelfareSubmission({ ...validWelfare, displayName: "" }).ok,
    ).toBe(false);
    expect(validateWelfareSubmission({ ...validWelfare, phone: "" }).ok).toBe(
      false,
    );
  });

  it("allows optional email and rejects invalid email", () => {
    expect(
      validateWelfareSubmission({
        ...validWelfare,
        email: "ok@example.com",
      }).ok,
    ).toBe(true);
    const bad = validateWelfareSubmission({
      ...validWelfare,
      email: "bad",
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.fieldErrors?.email).toBeTruthy();
  });

  it("requires category and allows only listed categories", () => {
    expect(
      validateWelfareSubmission({ ...validWelfare, category: "" }).ok,
    ).toBe(false);
    expect(
      validateWelfareSubmission({ ...validWelfare, category: "cash" }).ok,
    ).toBe(false);
    for (const category of [
      "financial",
      "food",
      "clothing",
      "shelter",
      "medical",
      "other",
    ]) {
      expect(
        validateWelfareSubmission({ ...validWelfare, category }).ok,
      ).toBe(true);
    }
  });

  it("requires description", () => {
    const result = validateWelfareSubmission({
      ...validWelfare,
      description: " ",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.description).toBeTruthy();
  });

  it("maps additional into single narrative", () => {
    const result = validateWelfareSubmission({
      ...validWelfare,
      additional: "Can collect evenings.",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.requestCategory).toBe("food");
    expect(result.data.narrative).toContain("Additional information:");
    expect(buildWelfareNarrative("Need", null)).toBe("Need");
  });

  it("rejects honeypot", () => {
    expect(
      validateWelfareSubmission({
        ...validWelfare,
        company: "Bot Corp",
      }).ok,
    ).toBe(false);
  });
});

describe("Care P3 Welfare intake gate", () => {
  const original = process.env.KCMI_WELFARE_INTAKE_ENABLED;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.KCMI_WELFARE_INTAKE_ENABLED;
    } else {
      process.env.KCMI_WELFARE_INTAKE_ENABLED = original;
    }
  });

  it("fails closed by default and when submit disabled", async () => {
    delete process.env.KCMI_WELFARE_INTAKE_ENABLED;
    expect(isWelfareIntakeEnabled()).toBe(false);
    const { submitWelfareRequest } = await import("@/lib/care/welfare-submit");
    const result = await submitWelfareRequest(validWelfare);
    expect(result.ok).toBe(false);
  });

  it("enables when set to 1", () => {
    process.env.KCMI_WELFARE_INTAKE_ENABLED = "1";
    expect(isWelfareIntakeEnabled()).toBe(true);
  });
});

describe("Care P3 insert mapping (unit)", () => {
  it("pastoral maps to pastoral service_type fields", () => {
    const result = validatePastoralSubmission(validPastoral);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const row = {
      service_type: "pastoral" as const,
      status: "new" as const,
      narrative: result.data.narrative,
      display_name: result.data.displayName,
      phone: result.data.phone,
      email: result.data.email,
      preferred_contact_method: result.data.preferredContactMethod,
      preferred_contact_timing: result.data.preferredContactTiming,
      request_category: null,
      contact_requested: true,
    };
    expect(row.service_type).toBe("pastoral");
    expect(row.status).toBe("new");
    expect(row.request_category).toBeNull();
  });

  it("welfare maps to welfare service_type and category", () => {
    const result = validateWelfareSubmission({
      ...validWelfare,
      category: "shelter",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const row = {
      service_type: "welfare" as const,
      status: "new" as const,
      request_category: result.data.requestCategory,
      narrative: result.data.narrative,
    };
    expect(row.service_type).toBe("welfare");
    expect(row.request_category).toBe("shelter");
  });
});

describe("Care P3 authorization boundaries", () => {
  it("pastoral assignment isolation works", () => {
    const perms = permissionsForRoles(["pastor"], ["counselling.read"]);
    expect(
      canViewCareRequestRow({
        permissions: perms,
        service: "pastoral",
        assignedTo: null,
        viewerId: "u1",
      }),
    ).toBe(false);
    expect(
      canViewCareRequestRow({
        permissions: perms,
        service: "pastoral",
        assignedTo: "u1",
        viewerId: "u1",
      }),
    ).toBe(true);
  });

  it("welfare shared queue works without assignee", () => {
    const perms = permissionsForRoles(["pastor"], ["welfare.read"]);
    expect(
      canViewCareRequestRow({
        permissions: perms,
        service: "welfare",
        assignedTo: null,
        viewerId: "u1",
      }),
    ).toBe(true);
  });

  it("denies media_admin, super_admin without Care grants, finance_reviewer", () => {
    expect(
      canReadCareDomain(permissionsForRoles(["media_admin"]), "pastoral"),
    ).toBe(false);
    expect(
      canReadCareDomain(permissionsForRoles(["media_admin"]), "welfare"),
    ).toBe(false);
    expect(
      canReadCareDomain(permissionsForRoles(["super_admin"]), "pastoral"),
    ).toBe(false);
    expect(
      canReadCareDomain(permissionsForRoles(["super_admin"]), "welfare"),
    ).toBe(false);
    expect(
      canReadCareDomain(permissionsForRoles(["finance_reviewer"]), "pastoral"),
    ).toBe(false);
    expect(
      canReadCareDomain(permissionsForRoles(["finance_reviewer"]), "welfare"),
    ).toBe(false);
  });

  it("blocks cross-domain reads", () => {
    const pastoralOnly = permissionsForRoles(["pastor"], ["counselling.read"]);
    const welfareOnly = permissionsForRoles(["pastor"], ["welfare.read"]);
    expect(canReadCareDomain(pastoralOnly, "welfare")).toBe(false);
    expect(canReadCareDomain(welfareOnly, "pastoral")).toBe(false);
    expect(canReadCareDomain(pastoralOnly, "prayer")).toBe(false);
  });

  it("documents pastoral and welfare retention", () => {
    expect(CARE_RETENTION.pastoralMonthsAfterClose).toBe(12);
    expect(CARE_RETENTION.welfareMonthsAfterClose).toBe(12);
  });

  it("audit action names do not encode PII fields", () => {
    expect(CARE_AUDIT_ACTIONS.received).toBe("care.request.received");
  });
});

describe("Care P3 public surface", () => {
  it("points Pastoral/Welfare Care links to native routes", () => {
    const pages = readFileSync(
      resolve(process.cwd(), "src/content/seed/pages.ts"),
      "utf8",
    );
    expect(pages).not.toMatch(/forms\.gle/);
    expect(pages).toMatch(/Pastoral Care[\s\S]*href:\s*"\/pastoral-care"/);
    expect(pages).toMatch(/Welfare support[\s\S]*href:\s*"\/welfare"/);
  });

  it("indexes informational pages but not pastoral_requests content", () => {
    const pastoral = PUBLIC_SEARCH_PAGE_CATALOG.find(
      (p) => p.url === "/pastoral-care",
    );
    const welfare = PUBLIC_SEARCH_PAGE_CATALOG.find((p) => p.url === "/welfare");
    expect(pastoral).toBeTruthy();
    expect(welfare).toBeTruthy();
    expect(pastoral?.body.toLowerCase()).not.toMatch(
      /narrative|pastoral_requests/,
    );
    expect(welfare?.body.toLowerCase()).not.toMatch(
      /narrative|pastoral_requests/,
    );
  });

  it("submit paths use secret-key insert and AAL2 remains on Hub queries", () => {
    const pastoralSubmit = readFileSync(
      resolve(process.cwd(), "src/lib/care/pastoral-submit.ts"),
      "utf8",
    );
    const welfareSubmit = readFileSync(
      resolve(process.cwd(), "src/lib/care/welfare-submit.ts"),
      "utf8",
    );
    const queries = readFileSync(
      resolve(process.cwd(), "src/lib/care/queries.ts"),
      "utf8",
    );
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260917120000_care_p3_pastoral_welfare_intake.sql",
      ),
      "utf8",
    );
    expect(pastoralSubmit).toMatch(/createSecretKeyClient/);
    expect(welfareSubmit).toMatch(/createSecretKeyClient/);
    expect(pastoralSubmit).not.toMatch(
      /from\("pastoral_requests"\)\.select\(\s*"\*"/,
    );
    expect(welfareSubmit).not.toMatch(
      /from\("pastoral_requests"\)\.select\(\s*"\*"/,
    );
    expect(queries).toMatch(/assertAal2/);
    expect(migration).toMatch(/request_category/);
    expect(migration).toMatch(/in_person/);
    expect(migration.toLowerCase()).not.toMatch(
      /grant\s+insert\s+on\s+table\s+public\.pastoral_requests\s+to\s+anon/,
    );
  });
});

describe("Care P3 submit with mocked admin client", () => {
  beforeEach(() => {
    process.env.KCMI_PASTORAL_INTAKE_ENABLED = "1";
    process.env.KCMI_WELFARE_INTAKE_ENABLED = "1";
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.KCMI_PASTORAL_INTAKE_ENABLED;
    delete process.env.KCMI_WELFARE_INTAKE_ENABLED;
    vi.doUnmock("@/lib/supabase/admin");
    vi.resetModules();
  });

  it("creates pastoral row and returns reference without echoing narrative", async () => {
    const insert = vi.fn().mockReturnValue({
      select: () => ({
        single: async () => ({
          data: {
            id: "22222222-2222-4222-8222-222222222222",
            reference_code: "KCMI-CARE-PAST01",
          },
          error: null,
        }),
      }),
    });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    vi.doMock("@/lib/supabase/admin", () => ({
      createSecretKeyClient: () => ({
        from: (table: string) => {
          if (table === "pastoral_requests") return { insert };
          if (table === "audit_events") return { insert: auditInsert };
          throw new Error(`unexpected table ${table}`);
        },
      }),
    }));

    const { submitPastoralRequest } = await import("@/lib/care/pastoral-submit");
    const result = await submitPastoralRequest({
      ...validPastoral,
      reason: "STAGING QA — Pastoral synthetic narrative.",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.referenceCode).toBe("KCMI-CARE-PAST01");
      expect(JSON.stringify(result)).not.toMatch(/Pastoral synthetic/);
    }
    const payload = insert.mock.calls[0]?.[0];
    expect(payload.service_type).toBe("pastoral");
    expect(payload.status).toBe("new");
    expect(payload.request_category).toBeNull();
    const audit = auditInsert.mock.calls[0]?.[0];
    expect(audit.action).toBe("care.request.received");
    expect(audit.metadata).not.toHaveProperty("narrative");
    expect(audit.metadata).not.toHaveProperty("phone");
    expect(audit.metadata).not.toHaveProperty("email");
    expect(audit.metadata).not.toHaveProperty("display_name");
  });

  it("creates welfare row with category and safe audit metadata", async () => {
    const insert = vi.fn().mockReturnValue({
      select: () => ({
        single: async () => ({
          data: {
            id: "33333333-3333-4333-8333-333333333333",
            reference_code: "KCMI-CARE-WELF01",
          },
          error: null,
        }),
      }),
    });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    vi.doMock("@/lib/supabase/admin", () => ({
      createSecretKeyClient: () => ({
        from: (table: string) => {
          if (table === "pastoral_requests") return { insert };
          if (table === "audit_events") return { insert: auditInsert };
          throw new Error(`unexpected table ${table}`);
        },
      }),
    }));

    const { submitWelfareRequest } = await import("@/lib/care/welfare-submit");
    const result = await submitWelfareRequest({
      ...validWelfare,
      description: "STAGING QA — Welfare synthetic narrative.",
      category: "clothing",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.referenceCode).toBe("KCMI-CARE-WELF01");
      expect(JSON.stringify(result)).not.toMatch(/Welfare synthetic/);
    }
    const payload = insert.mock.calls[0]?.[0];
    expect(payload.service_type).toBe("welfare");
    expect(payload.status).toBe("new");
    expect(payload.request_category).toBe("clothing");
    const audit = auditInsert.mock.calls[0]?.[0];
    expect(audit.metadata.request_category).toBe("clothing");
    expect(audit.metadata).not.toHaveProperty("narrative");
    expect(audit.metadata).not.toHaveProperty("phone");
  });
});
