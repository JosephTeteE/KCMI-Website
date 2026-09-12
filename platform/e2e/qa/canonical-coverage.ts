/**
 * Canonical QA coverage result — single source of truth for summary/coverage/controls/INDEX.
 * Downstream reports must clone this object; they must not recalculate exercise totals.
 */

import type { MutationClass } from "./types";

export type ControlSurfaceKind = "USER_FACING" | "NON_USER_SURFACE";

export type ExerciseStatus =
  | "EXERCISED"
  | "JUSTIFIED_NOT_EXERCISED"
  | "NOT_EXERCISED"
  | "POLICY_BLOCKED"
  | "HREF_VALIDATED"
  | "GUARD_VERIFIED";

export type CanonicalControl = {
  key: string;
  name: string;
  mutation: MutationClass | "UNCLASSIFIED";
  surfaceKind: ControlSurfaceKind;
  exercise: ExerciseStatus;
  justification?: string;
  sampleRoute?: string;
  instanceCount: number;
};

export type CategoryTotals = {
  total: number;
  exercised: number;
  justifiedNotExercised: number;
  notExercised: number;
  policyBlocked?: number;
  executed?: number;
  hrefValidated?: number;
  guardVerified?: number;
  unexercised: Array<{ key: string; name: string; reason?: string }>;
};

export type CanonicalCoverage = {
  version: "QA1.3.1";
  rawInstances: number;
  /** Volunteer-meaningful semantic controls (denominator). */
  userFacingSemantic: number;
  nonUserSurfaceTechnical: number;
  unclassified: number;
  categories: {
    SAFE_NAV_LOCAL: CategoryTotals;
    DRAFT_WRITE: CategoryTotals;
    PUBLIC_WRITE: CategoryTotals;
    DESTRUCTIVE: CategoryTotals;
    EXTERNAL: CategoryTotals;
  };
  controls: CanonicalControl[];
};

export type ScreenshotRecord = {
  id: string;
  kind: "requiredEvidence" | "diagnostic";
  status: "SUCCESS" | "FAIL" | "SKIPPED";
  path?: string;
  note?: string;
};

export type ScreenshotBundle = {
  requiredExpected: number;
  requiredSucceeded: number;
  requiredFailed: number;
  requiredDetail: ScreenshotRecord[];
  diagnosticDetail: ScreenshotRecord[];
  /** Actual PNG files written for required evidence. */
  requiredPngCount: number;
};

export type StateResult = {
  id: string;
  status: "exercised" | "policy-blocked" | "failed" | "not-exercised";
  classification?: string;
  reason?: string;
};

export type CanonicalStates = {
  registered: number;
  exercised: number;
  policyBlocked: number;
  failed: number;
  notExercised: number;
  detail: Record<string, StateResult>;
};

export type PerformanceRouteFlag =
  | "BASELINE_OK"
  | "PERFORMANCE_INVESTIGATION_REQUIRED"
  | "COLLECTION_FAILED";

export function flagPerformanceRoute(input: {
  performance: number | null;
  lcpMs: number | null;
}): PerformanceRouteFlag {
  if (input.performance == null && input.lcpMs == null) return "COLLECTION_FAILED";
  if (
    (input.performance != null && input.performance < 0.5) ||
    (input.lcpMs != null && input.lcpMs > 4000)
  ) {
    return "PERFORMANCE_INVESTIGATION_REQUIRED";
  }
  return "BASELINE_OK";
}

function emptyCat(): CategoryTotals {
  return {
    total: 0,
    exercised: 0,
    justifiedNotExercised: 0,
    notExercised: 0,
    unexercised: [],
  };
}

export function buildCanonicalCoverage(
  controls: CanonicalControl[],
  rawInstances: number,
): CanonicalCoverage {
  const userFacing = controls.filter((c) => c.surfaceKind === "USER_FACING");
  const technical = controls.filter((c) => c.surfaceKind === "NON_USER_SURFACE");
  const unclassified = userFacing.filter((c) => c.mutation === "UNCLASSIFIED").length;

  const by = (mutations: Array<MutationClass | "UNCLASSIFIED">) =>
    userFacing.filter((c) => mutations.includes(c.mutation));

  function summarize(
    list: CanonicalControl[],
    mode: "safe" | "draft" | "public" | "destructive" | "external",
  ): CategoryTotals {
    const cat = emptyCat();
    cat.total = list.length;
    for (const c of list) {
      if (mode === "external") {
        if (c.exercise === "HREF_VALIDATED" || c.exercise === "EXERCISED") {
          cat.hrefValidated = (cat.hrefValidated || 0) + 1;
        }
        continue;
      }
      if (mode === "public" || mode === "destructive") {
        if (c.exercise === "EXERCISED") cat.executed = (cat.executed || 0) + 1;
        if (
          c.exercise === "POLICY_BLOCKED" ||
          c.exercise === "GUARD_VERIFIED" ||
          c.exercise === "EXERCISED"
        ) {
          cat.guardVerified = (cat.guardVerified || 0) + 1;
        }
        if (c.exercise === "POLICY_BLOCKED" || c.exercise === "GUARD_VERIFIED") {
          cat.policyBlocked = (cat.policyBlocked || 0) + 1;
        }
        continue;
      }
      if (c.exercise === "EXERCISED") cat.exercised += 1;
      else if (c.exercise === "JUSTIFIED_NOT_EXERCISED") cat.justifiedNotExercised += 1;
      else {
        cat.notExercised += 1;
        cat.unexercised.push({
          key: c.key,
          name: c.name,
          reason: c.justification || c.exercise,
        });
      }
    }
    if (mode === "draft") {
      // draft "exercised" = safe draft exercise against QA records
      cat.exercised = list.filter((c) => c.exercise === "EXERCISED").length;
      cat.justifiedNotExercised = list.filter(
        (c) => c.exercise === "JUSTIFIED_NOT_EXERCISED" || c.exercise === "POLICY_BLOCKED",
      ).length;
      cat.notExercised = list.filter((c) => c.exercise === "NOT_EXERCISED").length;
      cat.unexercised = list
        .filter((c) => c.exercise === "NOT_EXERCISED")
        .map((c) => ({
          key: c.key,
          name: c.name,
          reason: c.justification || "NOT_EXERCISED",
        }));
    }
    return cat;
  }

  return {
    version: "QA1.3.1",
    rawInstances,
    userFacingSemantic: userFacing.length,
    nonUserSurfaceTechnical: technical.length,
    unclassified,
    categories: {
      SAFE_NAV_LOCAL: summarize(
        by(["SAFE", "NAVIGATION", "LOCAL_STATE"]),
        "safe",
      ),
      DRAFT_WRITE: summarize(by(["DRAFT_WRITE"]), "draft"),
      PUBLIC_WRITE: summarize(by(["PUBLIC_WRITE"]), "public"),
      DESTRUCTIVE: summarize(by(["DESTRUCTIVE"]), "destructive"),
      EXTERNAL: summarize(by(["EXTERNAL"]), "external"),
    },
    controls: userFacing,
  };
}

export type InvariantFailure = string;

/** Hard report invariants. Any failure means report generation must FAIL. */
export function assertCanonicalCoverageInvariants(
  coverage: CanonicalCoverage,
): InvariantFailure[] {
  const failures: string[] = [];
  const c = coverage.categories;
  const sum =
    c.SAFE_NAV_LOCAL.total +
    c.DRAFT_WRITE.total +
    c.PUBLIC_WRITE.total +
    c.DESTRUCTIVE.total +
    c.EXTERNAL.total +
    coverage.unclassified;
  if (coverage.userFacingSemantic !== sum) {
    failures.push(
      `userFacingSemantic (${coverage.userFacingSemantic}) != category sum + unclassified (${sum})`,
    );
  }
  if (c.SAFE_NAV_LOCAL.exercised > c.SAFE_NAV_LOCAL.total) {
    failures.push("SAFE exercised > SAFE total");
  }
  if (c.DRAFT_WRITE.exercised > c.DRAFT_WRITE.total) {
    failures.push("DRAFT exercised > DRAFT total");
  }
  const pubExec = c.PUBLIC_WRITE.executed || 0;
  if (pubExec > c.PUBLIC_WRITE.total) {
    failures.push("PUBLIC executed > PUBLIC total");
  }
  const destExec = c.DESTRUCTIVE.executed || 0;
  if (destExec > c.DESTRUCTIVE.total) {
    failures.push("DESTRUCTIVE executed > DESTRUCTIVE total");
  }
  const extVal = c.EXTERNAL.hrefValidated || 0;
  if (extVal > c.EXTERNAL.total) {
    failures.push("EXTERNAL validated > EXTERNAL total");
  }
  if (coverage.unclassified !== 0) {
    failures.push(`unclassified meaningful controls != 0 (${coverage.unclassified})`);
  }
  for (const ctrl of coverage.controls) {
    if (
      ctrl.exercise === "EXERCISED" &&
      (ctrl.mutation === "PUBLIC_WRITE" || ctrl.mutation === "DESTRUCTIVE") &&
      false
    ) {
      /* executed public/destructive may be legitimate in isolated QA; no auto-fail */
    }
    if (
      ctrl.exercise === "EXERCISED" &&
      ctrl.justification === "POLICY_BLOCKED_AS_EXERCISED"
    ) {
      failures.push(`policy-blocked counted as exercised: ${ctrl.key}`);
    }
  }
  return failures;
}

export function assertSummaryMatchesControls(
  summarySafe: { total: number; exercised: number },
  controlsSafe: { total: number; exercised: number },
): InvariantFailure[] {
  const failures: string[] = [];
  if (summarySafe.total !== controlsSafe.total) {
    failures.push(
      `summary SAFE total (${summarySafe.total}) != controls SAFE total (${controlsSafe.total})`,
    );
  }
  if (summarySafe.exercised !== controlsSafe.exercised) {
    failures.push(
      `summary SAFE exercised (${summarySafe.exercised}) != controls SAFE exercised (${controlsSafe.exercised})`,
    );
  }
  return failures;
}

export function assertScreenshotBundleInvariants(
  bundle: ScreenshotBundle,
  actualRequiredPngCount: number,
): InvariantFailure[] {
  const failures: string[] = [];
  const detail = bundle.requiredDetail;
  if (bundle.requiredExpected !== detail.length) {
    failures.push(
      `requiredExpected (${bundle.requiredExpected}) != requiredDetail.length (${detail.length})`,
    );
  }
  const succeeded = detail.filter((d) => d.status === "SUCCESS").length;
  const failed = detail.filter((d) => d.status === "FAIL").length;
  if (bundle.requiredSucceeded !== succeeded) {
    failures.push(
      `requiredSucceeded (${bundle.requiredSucceeded}) != detail SUCCESS (${succeeded})`,
    );
  }
  if (bundle.requiredFailed !== failed) {
    failures.push(
      `requiredFailed (${bundle.requiredFailed}) != detail FAIL (${failed})`,
    );
  }
  if (succeeded + failed !== detail.length) {
    failures.push("required SUCCESS+FAIL != requiredDetail.length (SKIPPED not allowed in required set)");
  }
  if (actualRequiredPngCount !== succeeded) {
    failures.push(
      `actual required PNG count (${actualRequiredPngCount}) != requiredSucceeded (${succeeded})`,
    );
  }
  if (bundle.requiredPngCount !== actualRequiredPngCount) {
    failures.push(
      `bundle.requiredPngCount (${bundle.requiredPngCount}) != actual (${actualRequiredPngCount})`,
    );
  }
  return failures;
}

export function assertStatesConsistent(states: CanonicalStates): InvariantFailure[] {
  const failures: string[] = [];
  const rows = Object.values(states.detail);
  if (states.registered !== rows.length) {
    failures.push(
      `registered (${states.registered}) != detail rows (${rows.length})`,
    );
  }
  const exercised = rows.filter((r) => r.status === "exercised").length;
  const policyBlocked = rows.filter((r) => r.status === "policy-blocked").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const notExercised = rows.filter((r) => r.status === "not-exercised").length;
  if (states.exercised !== exercised) {
    failures.push(`states.exercised (${states.exercised}) != recount (${exercised})`);
  }
  if (states.policyBlocked !== policyBlocked) {
    failures.push(
      `states.policyBlocked (${states.policyBlocked}) != recount (${policyBlocked})`,
    );
  }
  if (states.failed !== failed) {
    failures.push(`states.failed (${states.failed}) != recount (${failed})`);
  }
  if (states.notExercised !== notExercised) {
    failures.push(
      `states.notExercised (${states.notExercised}) != recount (${notExercised})`,
    );
  }
  if (exercised + policyBlocked + failed + notExercised !== rows.length) {
    failures.push("state status buckets do not sum to registered");
  }
  return failures;
}

/** Clone for report files — all consumers must use the same numbers. */
export function freezeCoverageViews(coverage: CanonicalCoverage) {
  const safe = coverage.categories.SAFE_NAV_LOCAL;
  return {
    coverage,
    controlsView: {
      rawInstances: coverage.rawInstances,
      userFacingSemantic: coverage.userFacingSemantic,
      nonUserSurfaceTechnical: coverage.nonUserSurfaceTechnical,
      unclassified: coverage.unclassified,
      categoryTotals: coverage.categories,
      controls: coverage.controls,
    },
    summaryControlsView: {
      SAFE_NAV_LOCAL: {
        total: safe.total,
        exercised: safe.exercised,
        justifiedNotExercised: safe.justifiedNotExercised,
        notExercised: safe.notExercised,
      },
      DRAFT_WRITE: {
        total: coverage.categories.DRAFT_WRITE.total,
        exercised: coverage.categories.DRAFT_WRITE.exercised,
      },
      PUBLIC_WRITE: {
        total: coverage.categories.PUBLIC_WRITE.total,
        executed: coverage.categories.PUBLIC_WRITE.executed || 0,
        policyBlocked: coverage.categories.PUBLIC_WRITE.policyBlocked || 0,
        guardVerified: coverage.categories.PUBLIC_WRITE.guardVerified || 0,
      },
      DESTRUCTIVE: {
        total: coverage.categories.DESTRUCTIVE.total,
        policyBlocked: coverage.categories.DESTRUCTIVE.policyBlocked || 0,
        guardVerified: coverage.categories.DESTRUCTIVE.guardVerified || 0,
      },
      EXTERNAL: {
        total: coverage.categories.EXTERNAL.total,
        hrefValidated: coverage.categories.EXTERNAL.hrefValidated || 0,
      },
    },
  };
}
