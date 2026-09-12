/**
 * Semantic control identity + honest workflow aggregation (QA1.2).
 */

import type { MutationClass } from "./types";

export type WorkflowScenarioStatus =
  | "PASS"
  | "PASS_WITH_POLICY_BLOCK"
  | "PARTIAL"
  | "FAIL"
  | "BLOCKED"
  | "NOT_RUN";

export type WorkflowAggregateStatus =
  | "PASS"
  | "PASS_WITH_POLICY_BLOCK"
  | "PARTIAL"
  | "FAIL"
  | "BLOCKED";

/** Required safe scenarios cannot be PARTIAL/FAIL/NOT_RUN for fullyExercised. */
export function aggregateWorkflowStatus(
  scenarios: Array<{ status: string; required?: boolean; policyBlock?: boolean }>,
  opts: { makeLivePolicyBlocked?: boolean } = {},
): WorkflowAggregateStatus {
  const required = scenarios.filter((s) => s.required !== false);
  const hasFail = required.some((s) => s.status === "FAIL");
  const hasPartial = required.some(
    (s) => s.status === "PARTIAL" || s.status === "NOT_RUN" || s.status === "BLOCKED",
  );
  if (hasFail) return "FAIL";
  if (hasPartial) return "PARTIAL";
  if (opts.makeLivePolicyBlocked) return "PASS_WITH_POLICY_BLOCK";
  if (required.every((s) => s.status === "PASS" || s.status === "PASS_WITH_POLICY_BLOCK")) {
    return opts.makeLivePolicyBlocked ? "PASS_WITH_POLICY_BLOCK" : "PASS";
  }
  return "PARTIAL";
}

export function isFullyExercised(status: WorkflowAggregateStatus): boolean {
  return status === "PASS" || status === "PASS_WITH_POLICY_BLOCK";
}

export function semanticControlKey(input: {
  surface?: string;
  route: string;
  role: string;
  name: string;
  href?: string | null;
  mutation?: MutationClass | "UNCLASSIFIED" | string;
}): string {
  const route = normalizeRoute(input.route);
  const surface =
    input.surface ||
    (route.startsWith("/admin")
      ? "hub"
      : route.startsWith("/auth")
        ? "auth"
        : "public");
  const name = slugName(input.name);
  const role = (input.role || "control").toLowerCase();

  if (input.href && /^https?:/i.test(input.href)) {
    try {
      const host = new URL(input.href).hostname.replace(/^www\./, "");
      return `${surface}.external.${host}.${name || role}`;
    } catch {
      /* fall through */
    }
  }

  // Global chrome collapses across routes
  if (/^(menu|open hub menu|close|close menu|open menu)$/i.test(input.name)) {
    return `${surface}.chrome.menu`;
  }
  if (/sign out/i.test(input.name)) return `hub.chrome.signOut`;
  if (/help|replay hub tour|show me around/i.test(input.name)) {
    return `hub.chrome.helpTutorial`;
  }
  // Collapse repeated public chrome across routes (meaningful denominator).
  if (surface === "public") {
    const nav = slugName(input.name);
    if (
      /^(home|about|locations|services|sermons|contact|watch_live|giving|faqs|privacy|terms|skip_to_main_content|plan_a_visit|kingdom_covenant_ministries_international_home)$/.test(
        nav,
      )
    ) {
      return `public.chrome.${role === "button" ? "button" : "link"}.${nav}`;
    }
  }
  if (surface === "hub") {
    const nav = slugName(input.name);
    if (
      /^(dashboard|website_pages|programs_announcements|sermons|photos|branches|livestream)$/.test(
        nav,
      )
    ) {
      return `hub.nav.${nav}`;
    }
  }
  if (/^dashboard$/i.test(input.name) || /programs & announcements/i.test(input.name)) {
    return `hub.nav.${slugName(input.name)}`;
  }

  if (route.includes("/admin/programs")) {
    if (/next step/i.test(input.name)) return `hub.program.wizard.next`;
    if (/previous step/i.test(input.name)) return `hub.program.wizard.back`;
    if (/save draft|save as a draft/i.test(input.name)) {
      return `hub.program.review.saveDraft`;
    }
    if (/add (another )?day|add day/i.test(input.name)) return `hub.program.when.addDay`;
    if (/add (another )?session|add session/i.test(input.name)) {
      return `hub.program.when.addSession`;
    }
  }

  if (route.includes("/admin/website/home") || route.includes("/admin/website/about")) {
    if (/replace photo/i.test(input.name)) return `hub.media.replacePhoto`;
    if (/upload a new photo/i.test(input.name)) return `hub.media.uploadNew`;
    if (/use a photo already saved|choose existing/i.test(input.name)) {
      return `hub.media.chooseExisting`;
    }
    if (/cancel changes/i.test(input.name)) return `hub.media.cancel`;
    if (/preview my changes/i.test(input.name)) return `hub.media.preview`;
    if (/view full preview/i.test(input.name)) return `hub.preview.viewFull`;
  }

  if (route.includes("/admin/livestream")) {
    if (/check and preview/i.test(input.name)) return `hub.livestream.preview`;
    if (/start a facebook/i.test(input.name)) return `hub.livestream.start`;
    if (/cancel changes/i.test(input.name)) return `hub.livestream.cancel`;
  }

  if (route === "/locations" || route.startsWith("/locations")) {
    if (/search/i.test(input.name)) return `public.locations.search`;
    if (/ghana|nigeria|all|filter/i.test(input.name)) {
      return `public.locations.countryFilter`;
    }
  }

  if (route === "/" || route === "") {
    if (/plan a visit/i.test(input.name)) return `public.hero.planVisit`;
    if (/locations/i.test(input.name) && role === "link") {
      return `public.header.locations`;
    }
  }

  return `${surface}.${routeKey(route)}.${role}.${name || "unnamed"}`;
}

function normalizeRoute(route: string): string {
  return route
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, "[id]")
    .replace(/\/$/, "") || "/";
}

function routeKey(route: string): string {
  return normalizeRoute(route)
    .replace(/^\//, "")
    .replace(/\//g, ".")
    .replace(/\[|\]/g, "")
    .replace(/^\.+|\.+$/g, "") || "root";
}

function slugName(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function summarizeSemanticControls(
  instances: Array<{
    route: string;
    role: string;
    name: string;
    href?: string | null;
    mutation?: string;
    exercisedBy?: string | null;
    exerciseKind?: "ui" | "href-validated" | "policy-blocked" | "guard-verified" | null;
  }>,
) {
  const map = new Map<
    string,
    {
      key: string;
      mutation: string;
      instanceCount: number;
      exercised: boolean;
      /** True only when a real UI interaction exercised the control (not href/policy). */
      uiExercised: boolean;
      hrefValidated: boolean;
      policyBlockedCounted: boolean;
      sampleName: string;
      sampleRoute: string;
    }
  >();
  for (const c of instances) {
    const key = semanticControlKey(c);
    const mutation = c.mutation || "UNCLASSIFIED";
    const kind = c.exerciseKind || (c.exercisedBy ? "ui" : null);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, {
        key,
        mutation,
        instanceCount: 1,
        exercised: Boolean(c.exercisedBy) && kind === "ui",
        uiExercised: kind === "ui",
        hrefValidated: kind === "href-validated",
        policyBlockedCounted: kind === "policy-blocked" || kind === "guard-verified",
        sampleName: c.name,
        sampleRoute: c.route,
      });
    } else {
      prev.instanceCount += 1;
      if (kind === "ui") {
        prev.exercised = true;
        prev.uiExercised = true;
      }
      if (kind === "href-validated") prev.hrefValidated = true;
      if (kind === "policy-blocked" || kind === "guard-verified") {
        prev.policyBlockedCounted = true;
      }
      // Prefer first non-UNCLASSIFIED mutation
      if (prev.mutation === "UNCLASSIFIED" && mutation !== "UNCLASSIFIED") {
        prev.mutation = mutation;
      }
    }
  }
  const unique = [...map.values()];
  const meaningful = unique.filter(
    (u) =>
      u.sampleName &&
      u.sampleName !== "(unnamed)" &&
      !/cookie|consent/i.test(u.sampleName),
  );

  const byCat = (cats: string[]) => unique.filter((u) => cats.includes(u.mutation));
  const safeNavLocal = byCat(["SAFE", "NAVIGATION", "LOCAL_STATE"]);
  const draftWrite = byCat(["DRAFT_WRITE"]);
  const publicWrite = byCat(["PUBLIC_WRITE"]);
  const destructive = byCat(["DESTRUCTIVE"]);
  const external = byCat(["EXTERNAL"]);
  const unclassified = unique.filter((u) => u.mutation === "UNCLASSIFIED");

  const categoryTotals = {
    SAFE_NAV_LOCAL: {
      total: safeNavLocal.length,
      exercised: safeNavLocal.filter((u) => u.uiExercised).length,
      unexercised: safeNavLocal
        .filter((u) => !u.uiExercised)
        .map((u) => ({ key: u.key, name: u.sampleName, route: u.sampleRoute })),
    },
    DRAFT_WRITE: {
      total: draftWrite.length,
      exercisedSafely: draftWrite.filter((u) => u.uiExercised).length,
      intentionallyUnexercised: draftWrite.filter((u) => !u.uiExercised).length,
    },
    PUBLIC_WRITE: {
      total: publicWrite.length,
      guardVerified: publicWrite.filter((u) => u.policyBlockedCounted || u.uiExercised)
        .length,
      executed: publicWrite.filter((u) => u.uiExercised).length,
      policyBlocked: publicWrite.filter((u) => !u.uiExercised).length,
    },
    DESTRUCTIVE: {
      total: destructive.length,
      guardVerified: destructive.filter((u) => u.policyBlockedCounted || u.uiExercised)
        .length,
      policyBlocked: destructive.filter((u) => !u.uiExercised).length,
    },
    EXTERNAL: {
      total: external.length,
      hrefValidated: external.filter((u) => u.hrefValidated || u.uiExercised).length,
    },
  };

  return {
    rawInstances: instances.length,
    uniqueSemantic: unique.length,
    uniqueMeaningful: meaningful.length,
    classified: unique.filter((u) => u.mutation !== "UNCLASSIFIED").length,
    unclassified: unclassified.length,
    exercised: unique.filter((u) => u.uiExercised).length,
    policyBlocked: unique.filter((u) =>
      ["PUBLIC_WRITE", "DESTRUCTIVE"].includes(u.mutation),
    ).length,
    external: external.length,
    unexercisedMeaningfulSafe: categoryTotals.SAFE_NAV_LOCAL.unexercised.length,
    duplicateInstanceOnly: unique.filter((u) => u.instanceCount > 1).length,
    categoryTotals,
    sample: unique.slice(0, 40),
    unique,
  };
}

export type SemanticCoverageInvariantFailure = string;

/** Fail report generation when coverage math is inconsistent. */
export function assertSemanticCoverageInvariants(
  summary: ReturnType<typeof summarizeSemanticControls>,
): SemanticCoverageInvariantFailure[] {
  const failures: string[] = [];
  const cats = summary.categoryTotals;
  const safe = cats.SAFE_NAV_LOCAL;
  if (safe.exercised > safe.total) {
    failures.push(
      `safeSemanticExercised (${safe.exercised}) > safeSemanticTotal (${safe.total})`,
    );
  }
  const sumCats =
    cats.SAFE_NAV_LOCAL.total +
    cats.DRAFT_WRITE.total +
    cats.PUBLIC_WRITE.total +
    cats.DESTRUCTIVE.total +
    cats.EXTERNAL.total +
    summary.unclassified;
  if (summary.uniqueSemantic !== sumCats) {
    failures.push(
      `classified category sum (${sumCats}) != uniqueSemantic (${summary.uniqueSemantic})`,
    );
  }
  if (summary.unclassified !== 0) {
    failures.push(`unclassified != 0 (${summary.unclassified})`);
  }
  // External href validation must not inflate UI exercise count
  if (cats.EXTERNAL.hrefValidated > cats.EXTERNAL.total) {
    failures.push("external hrefValidated > external total");
  }
  return failures;
}
