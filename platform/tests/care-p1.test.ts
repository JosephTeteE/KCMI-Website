import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertMediaCannotReadPastoral,
  permissionsForRoles,
} from "@/lib/authorization/rbac";
import {
  canAssignCareDomain,
  canReadCareDomain,
  canViewCareHub,
  canViewCareRequestRow,
  careAssignPermission,
  careDomainsForPermissions,
  careReadPermission,
} from "@/lib/care/access";
import {
  CARE_AUDIT_ACTIONS,
  CARE_RETENTION,
  CARE_SERVICE_TYPES,
} from "@/lib/care/types";
import { HUB_DASHBOARD_CARD_PERMISSIONS } from "@/lib/hub/dashboard-cards";
import { PUBLIC_SEARCH_PAGE_CATALOG } from "@/lib/search/page-catalog";

describe("Care P1 RBAC boundaries", () => {
  it("denies media_admin Care hub and all domains", () => {
    const perms = permissionsForRoles(["media_admin"]);
    expect(assertMediaCannotReadPastoral(["media_admin"])).toBe(true);
    expect(canViewCareHub(perms)).toBe(false);
    for (const service of CARE_SERVICE_TYPES) {
      expect(canReadCareDomain(perms, service)).toBe(false);
      expect(canAssignCareDomain(perms, service)).toBe(false);
    }
  });

  it("denies super_admin automatic Care narrative access", () => {
    const perms = permissionsForRoles(["super_admin"]);
    expect(canViewCareHub(perms)).toBe(false);
    expect(canReadCareDomain(perms, "prayer")).toBe(false);
    expect(canReadCareDomain(perms, "pastoral")).toBe(false);
    expect(canReadCareDomain(perms, "welfare")).toBe(false);
  });

  it("denies finance_reviewer and auditor Care narratives", () => {
    for (const role of ["finance_reviewer", "auditor"] as const) {
      const perms = permissionsForRoles([role]);
      expect(canViewCareHub(perms)).toBe(false);
    }
  });

  it("grants pastoral_admin all Care domains + assign", () => {
    const perms = permissionsForRoles(["pastoral_admin"]);
    expect(canViewCareHub(perms)).toBe(true);
    expect(careDomainsForPermissions(perms)).toEqual([
      "prayer",
      "pastoral",
      "welfare",
    ]);
    expect(canAssignCareDomain(perms, "pastoral")).toBe(true);
  });

  it("maps Pastoral Care hub label domain to counselling.* permissions", () => {
    expect(careReadPermission("pastoral")).toBe("counselling.read");
    expect(careAssignPermission("pastoral")).toBe("counselling.assign");
  });

  it("allows prayer.read shared queue without assignment", () => {
    const perms = permissionsForRoles(["pastor"], ["prayer.read"]);
    expect(
      canViewCareRequestRow({
        permissions: perms,
        service: "prayer",
        assignedTo: null,
        viewerId: "pastor-1",
      }),
    ).toBe(true);
    expect(canReadCareDomain(perms, "pastoral")).toBe(false);
    expect(canReadCareDomain(perms, "welfare")).toBe(false);
  });

  it("allows welfare.read team queue without assignment", () => {
    const perms = permissionsForRoles(["pastor"], ["welfare.read"]);
    expect(
      canViewCareRequestRow({
        permissions: perms,
        service: "welfare",
        assignedTo: null,
        viewerId: "pastor-1",
      }),
    ).toBe(true);
    expect(canReadCareDomain(perms, "prayer")).toBe(false);
  });

  it("blocks pastor with counselling.read from unassigned Pastoral rows", () => {
    const perms = permissionsForRoles(["pastor"], ["counselling.read"]);
    expect(
      canViewCareRequestRow({
        permissions: perms,
        service: "pastoral",
        assignedTo: null,
        viewerId: "pastor-1",
      }),
    ).toBe(false);
    expect(
      canViewCareRequestRow({
        permissions: perms,
        service: "pastoral",
        assignedTo: "other-pastor",
        viewerId: "pastor-1",
      }),
    ).toBe(false);
  });

  it("allows assigned pastor to open assigned Pastoral request", () => {
    const perms = permissionsForRoles(["pastor"], ["counselling.read"]);
    expect(
      canViewCareRequestRow({
        permissions: perms,
        service: "pastoral",
        assignedTo: "pastor-1",
        viewerId: "pastor-1",
      }),
    ).toBe(true);
  });

  it("allows counselling.assign domain-wide Pastoral visibility", () => {
    const perms = permissionsForRoles(["pastor"], [
      "counselling.read",
      "counselling.assign",
    ]);
    expect(
      canViewCareRequestRow({
        permissions: perms,
        service: "pastoral",
        assignedTo: null,
        viewerId: "pastor-1",
      }),
    ).toBe(true);
  });
});

describe("Care P1 Hub surface gating", () => {
  it("requires Care read permissions for dashboard card", () => {
    expect(HUB_DASHBOARD_CARD_PERMISSIONS["/admin/care"]).toEqual([
      "prayer.read",
      "counselling.read",
      "welfare.read",
    ]);
  });

  it("gates Care nav on canViewCareHub", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/layout/hub-nav.tsx"),
      "utf8",
    );
    expect(src).toMatch(/canViewCareHub/);
    expect(src).toMatch(/\/admin\/care/);
  });

  it("Care routes assert AAL2 / requireCareSession for reads", () => {
    const queries = readFileSync(
      resolve(process.cwd(), "src/lib/care/queries.ts"),
      "utf8",
    );
    expect(queries).toMatch(/assertAal2/);
    expect(queries).toMatch(/CARE_AUDIT_ACTIONS\.opened/);
    expect(queries).not.toMatch(/createServiceRole|service_role|SERVICE_ROLE/);
  });

  it("note audit metadata never includes body fields", () => {
    const actions = readFileSync(
      resolve(process.cwd(), "src/app/admin/care/actions.ts"),
      "utf8",
    );
    expect(actions).toMatch(/CARE_AUDIT_ACTIONS\.noteAdded/);
    expect(actions).toMatch(/NEVER include note body/);
    expect(actions).not.toMatch(/metadata:[\s\S]*body:/);
  });
});

describe("Care P1 Search / AI / sitemap exclusion", () => {
  it("does not catalog Hub Care or admin routes in public search pages", () => {
    const urls = PUBLIC_SEARCH_PAGE_CATALOG.map((p) => p.url);
    expect(urls.some((u) => u.includes("/admin"))).toBe(false);
    expect(urls.some((u) => u.includes("/admin/care"))).toBe(false);
    // Public /prayer informational page is allowed; submissions are not indexed.
  });

  it("sitemap omits Hub Care and admin paths", () => {
    const sitemap = readFileSync(
      resolve(process.cwd(), "src/app/sitemap.ts"),
      "utf8",
    );
    expect(sitemap).not.toMatch(/\/admin\/care/);
    expect(sitemap).not.toMatch(/pastoral_requests/);
  });

  it("public search RPC migration does not select pastoral tables", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260913120000_search_public_v2.sql",
      ),
      "utf8",
    );
    expect(sql.toLowerCase()).not.toMatch(/pastoral_requests/);
    expect(sql.toLowerCase()).not.toMatch(/pastoral_case_notes/);
  });

  it("Care migration enables RLS and revokes anon", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260916120000_care_p1_foundation.sql",
      ),
      "utf8",
    );
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(/revoke all on table public\.pastoral_requests from public, anon/);
    expect(sql).toMatch(/can_select_pastoral_request/);
    expect(sql).not.toMatch(/grant (select|insert|update|delete|all).*pastoral_requests.*\banon\b/);
    expect(sql).not.toMatch(/grant (select|insert|update|delete|all).*pastoral_case_notes.*\banon\b/);
  });
  it("Care follow-up migration fixes gen_random_bytes search_path", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260916123000_care_p1_reference_code_extensions.sql",
      ),
      "utf8",
    );
    expect(sql).toMatch(/set search_path = public, extensions/);
    expect(sql).toMatch(/care_generate_reference_code/);
  });
});

describe("Care P1 retention documentation", () => {
  it("encodes provisional retention constants", () => {
    expect(CARE_RETENTION.prayerMonthsAfterClose).toBe(6);
    expect(CARE_RETENTION.pastoralMonthsAfterClose).toBe(12);
    expect(CARE_RETENTION.welfareMonthsAfterClose).toBe(12);
    expect(CARE_RETENTION.auditMetadataMonths).toBe(24);
  });

  it("defines sensitive read audit actions without narrative keys", () => {
    expect(CARE_AUDIT_ACTIONS.opened).toBe("care.request.opened");
    expect(Object.values(CARE_AUDIT_ACTIONS).join(" ")).not.toMatch(
      /narrative|note_body/,
    );
  });
});

describe("Care P1 public Care entrypoints are native", () => {
  it("points seed Care links to native routes without Google Forms", () => {
    const services = readFileSync(
      resolve(process.cwd(), "src/content/seed/pages.ts"),
      "utf8",
    );
    expect(services).not.toMatch(/forms\.gle/);
    expect(services).toMatch(/href:\s*"\/prayer"/);
    expect(services).toMatch(/href:\s*"\/pastoral-care"/);
    expect(services).toMatch(/href:\s*"\/welfare"/);
  });
});
