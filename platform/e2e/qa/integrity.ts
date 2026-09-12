/**
 * Capture / page integrity checks (TypeScript port of capture-integrity patterns).
 */

const ERROR_PATTERNS = [
  /this page couldn.?t load/i,
  /a server error occurred/i,
  /application error/i,
  /internal server error/i,
  /uncaught exception/i,
];

export function assertNoErrorPage(bodyText: string, pathname: string): void {
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.test(bodyText)) {
      throw new Error(`Integrity failed on ${pathname}: matched ${pattern}`);
    }
  }
}

export function assertHubNotSignedOut(bodyText: string, pathname: string): void {
  if (/sign in to the kcmi hub/i.test(bodyText) || /\/auth\/sign-in/i.test(pathname)) {
    throw new Error(`Hub integrity: signed out on ${pathname}`);
  }
}

export function landmarkMatches(
  bodyText: string,
  landmark: RegExp | string | undefined,
): boolean {
  if (!landmark) return true;
  if (typeof landmark === "string") return bodyText.includes(landmark);
  return landmark.test(bodyText);
}

/** D1.8.1 Review schedule must list sessions — not date-range only. */
export function assertFullScheduleReview(whenText: string): void {
  if (/^\s*\d{1,2}\s+\w+\s+[–-]\s+\d{1,2}\s+\w+/i.test(whenText.trim()) &&
      !/\d{1,2}:\d{2}\s*(AM|PM)/i.test(whenText)) {
    throw new Error(
      "D1.8.1 FAIL: Program Review When is date-range-only without session times",
    );
  }
  if (/undefined/i.test(whenText)) {
    throw new Error("D1.8.1 FAIL: Review schedule contains undefined");
  }
  const hasTime = /\d{1,2}:\d{2}\s*(AM|PM)/i.test(whenText);
  if (!hasTime && whenText.trim() !== "—" && whenText.trim() !== "") {
    // Allow empty when no sessions yet during create mid-flow
    if (/november|october|january|february|march|april|may|june|july|august|september|december/i.test(whenText)) {
      throw new Error(
        `D1.8.1 FAIL: Review shows dates without session times: ${whenText.slice(0, 200)}`,
      );
    }
  }
}

export function assertStagingQaMultiDayReview(whenText: string): void {
  assertFullScheduleReview(whenText);
  if (!/Thursday/i.test(whenText) || !/Friday/i.test(whenText)) {
    throw new Error("Staging QA Review missing Thursday/Friday headings");
  }
  if (!/9:00\s*AM/i.test(whenText) || !/5:00\s*PM/i.test(whenText)) {
    throw new Error("Staging QA Review missing expected session times");
  }
  if (/12 November\s*[–-]\s*13 November/i.test(whenText) && !/9:00/i.test(whenText)) {
    throw new Error("Staging QA Review regressed to compact date range");
  }
}
