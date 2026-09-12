import { describe, expect, it } from "vitest";
import {
  assertCanonicalCoverageInvariants,
  assertScreenshotBundleInvariants,
  assertStatesConsistent,
  assertSummaryMatchesControls,
  buildCanonicalCoverage,
  flagPerformanceRoute,
  type CanonicalControl,
  type ScreenshotBundle,
} from "../e2e/qa/canonical-coverage";
import {
  assertBranchMediaAbsent,
  assertBranchMediaPresent,
  assertBranchMissingServiceTimes,
  assertMutationNotMisclassified,
} from "../e2e/qa/scenario-assert";
import { classifyControlMutation } from "../e2e/qa/mutation-classify";

function ctrl(
  partial: Partial<CanonicalControl> & Pick<CanonicalControl, "key" | "name" | "mutation">,
): CanonicalControl {
  return {
    surfaceKind: "USER_FACING",
    exercise: "NOT_EXERCISED",
    instanceCount: 1,
    ...partial,
  };
}

describe("QA1.3.1 report invariants", () => {
  it("A. fails when summary control count != controls.json", () => {
    const failures = assertSummaryMatchesControls(
      { total: 77, exercised: 71 },
      { total: 77, exercised: 54 },
    );
    expect(failures.length).toBeGreaterThan(0);
    expect(failures[0]).toMatch(/exercised/);
  });

  it("B. fails when screenshot expected != actual PNG/detail", () => {
    const bundle: ScreenshotBundle = {
      requiredExpected: 8,
      requiredSucceeded: 8,
      requiredFailed: 0,
      requiredPngCount: 8,
      requiredDetail: Array.from({ length: 10 }, (_, i) => ({
        id: `s${i}`,
        kind: "requiredEvidence" as const,
        status: "SUCCESS" as const,
      })),
      diagnosticDetail: [],
    };
    const failures = assertScreenshotBundleInvariants(bundle, 10);
    expect(failures.some((f) => /requiredExpected|PNG/i.test(f))).toBe(true);
  });

  it("C. fails named media-present when DOM media count=0", () => {
    const r = assertBranchMediaPresent({
      mediaAttr: "without-media",
      mediaCount: 0,
    });
    expect(r.ok).toBe(false);
  });

  it("D. fails named missing-time when service times present", () => {
    const r = assertBranchMissingServiceTimes({
      serviceTimeCount: 2,
      hasServiceTimeList: true,
    });
    expect(r.ok).toBe(false);
  });

  it("E. fails DRAFT_WRITE semantic actions classified SAFE", () => {
    const r = assertMutationNotMisclassified({
      name: "Save my draft",
      mutation: "SAFE",
    });
    expect(r.ok).toBe(false);
    expect(classifyControlMutation("Save my draft", "button")).toBe(
      "DRAFT_WRITE",
    );
  });

  it("F. fails PUBLIC_WRITE semantic actions classified SAFE", () => {
    const r = assertMutationNotMisclassified({
      name: "Make Livestream Live",
      mutation: "SAFE",
    });
    expect(r.ok).toBe(false);
    expect(classifyControlMutation("Make Livestream Live", "button")).toBe(
      "PUBLIC_WRITE",
    );
  });

  it("G. fails unclassified meaningful control", () => {
    const coverage = buildCanonicalCoverage(
      [
        ctrl({
          key: "hub.x",
          name: "Mystery",
          mutation: "UNCLASSIFIED",
          exercise: "NOT_EXERCISED",
        }),
      ],
      1,
    );
    const failures = assertCanonicalCoverageInvariants(coverage);
    expect(failures.some((f) => /unclassified/i.test(f))).toBe(true);
  });

  it("H. fails when policy-blocked is counted as exercised", () => {
    const coverage = buildCanonicalCoverage(
      [
        ctrl({
          key: "hub.makeLive",
          name: "Make these changes live",
          mutation: "PUBLIC_WRITE",
          exercise: "EXERCISED",
          justification: "POLICY_BLOCKED_AS_EXERCISED",
        }),
      ],
      1,
    );
    const failures = assertCanonicalCoverageInvariants(coverage);
    expect(failures.some((f) => /policy-blocked counted as exercised/i.test(f))).toBe(
      true,
    );
  });

  it("passes a consistent canonical coverage object", () => {
    const coverage = buildCanonicalCoverage(
      [
        ctrl({
          key: "public.chrome.link.home",
          name: "Home",
          mutation: "NAVIGATION",
          exercise: "EXERCISED",
        }),
        ctrl({
          key: "hub.program.saveDraft",
          name: "Save my draft",
          mutation: "DRAFT_WRITE",
          exercise: "JUSTIFIED_NOT_EXERCISED",
          justification: "inventory classified; not executed this pass",
        }),
        ctrl({
          key: "hub.website.makeLive",
          name: "Make these changes live",
          mutation: "PUBLIC_WRITE",
          exercise: "POLICY_BLOCKED",
        }),
        ctrl({
          key: "hub.content.remove",
          name: "Remove from public website",
          mutation: "DESTRUCTIVE",
          exercise: "POLICY_BLOCKED",
        }),
        ctrl({
          key: "public.external.youtube",
          name: "YouTube",
          mutation: "EXTERNAL",
          exercise: "HREF_VALIDATED",
        }),
      ],
      12,
    );
    expect(assertCanonicalCoverageInvariants(coverage)).toEqual([]);
    const views = {
      summary: coverage.categories.SAFE_NAV_LOCAL,
      controls: coverage.categories.SAFE_NAV_LOCAL,
    };
    expect(
      assertSummaryMatchesControls(
        { total: views.summary.total, exercised: views.summary.exercised },
        { total: views.controls.total, exercised: views.controls.exercised },
      ),
    ).toEqual([]);
  });

  it("flags About/Locations-style LCP for investigation", () => {
    expect(
      flagPerformanceRoute({ performance: 0.49, lcpMs: 5057 }),
    ).toBe("PERFORMANCE_INVESTIGATION_REQUIRED");
    expect(
      flagPerformanceRoute({ performance: 0.61, lcpMs: 2955 }),
    ).toBe("BASELINE_OK");
  });

  it("accepts valid branch fixtures", () => {
    expect(
      assertBranchMediaPresent({ mediaAttr: "with-media", mediaCount: 1 }).ok,
    ).toBe(true);
    expect(
      assertBranchMediaAbsent({
        mediaAttr: "without-media",
        mediaCount: 0,
        dashedPlaceholderCount: 0,
      }).ok,
    ).toBe(true);
    expect(
      assertBranchMissingServiceTimes({
        serviceTimeCount: 0,
        hasServiceTimeList: false,
        apologyPresent: false,
      }).ok,
    ).toBe(true);
  });

  it("state recount must match buckets", () => {
    const failures = assertStatesConsistent({
      registered: 2,
      exercised: 2,
      policyBlocked: 0,
      failed: 0,
      notExercised: 0,
      detail: {
        a: { id: "a", status: "exercised" },
        b: { id: "b", status: "not-exercised" },
      },
    });
    expect(failures.length).toBeGreaterThan(0);
  });
});
