/**
 * Named-state DOM assertions for QA scenario integrity (QA1.3.1).
 */

export type ScenarioAssertResult = {
  ok: boolean;
  reason: string;
  evidence?: Record<string, unknown>;
};

export function assertBranchMediaPresent(dom: {
  mediaAttr?: string | null;
  mediaCount: number;
}): ScenarioAssertResult {
  const present =
    dom.mediaAttr === "with-media" ||
    (dom.mediaCount > 0 && dom.mediaAttr !== "without-media");
  if (!present || dom.mediaCount <= 0) {
    return {
      ok: false,
      reason: `branch-media requires rendered media; mediaAttr=${dom.mediaAttr} count=${dom.mediaCount}`,
      evidence: dom,
    };
  }
  return { ok: true, reason: "branch media present", evidence: dom };
}

export function assertBranchMediaAbsent(dom: {
  mediaAttr?: string | null;
  mediaCount: number;
  dashedPlaceholderCount?: number;
}): ScenarioAssertResult {
  if (dom.mediaCount !== 0 || dom.mediaAttr === "with-media") {
    return {
      ok: false,
      reason: `branch-no-media requires mediaCount==0; got count=${dom.mediaCount} attr=${dom.mediaAttr}`,
      evidence: dom,
    };
  }
  if ((dom.dashedPlaceholderCount || 0) > 0) {
    return {
      ok: false,
      reason: "branch-no-media must not show dashed placeholder photograph",
      evidence: dom,
    };
  }
  return { ok: true, reason: "branch media absent", evidence: dom };
}

export function assertBranchMissingServiceTimes(dom: {
  serviceTimeCount: number;
  apologyPresent?: boolean;
  hasServiceTimeList?: boolean;
}): ScenarioAssertResult {
  if (dom.serviceTimeCount !== 0 || dom.hasServiceTimeList) {
    return {
      ok: false,
      reason: `branch-missing-time requires zero service times; count=${dom.serviceTimeCount}`,
      evidence: dom,
    };
  }
  if (dom.apologyPresent) {
    return {
      ok: false,
      reason: "branch-missing-time must not invent apology unavailable copy",
      evidence: dom,
    };
  }
  return { ok: true, reason: "service times absent", evidence: dom };
}

export function assertSpotlightPresent(dom: {
  spotlightPresent: boolean;
}): ScenarioAssertResult {
  return dom.spotlightPresent
    ? { ok: true, reason: "spotlight present" }
    : { ok: false, reason: "spotlight-present expected Spotlight content" };
}

export function assertSpotlightAbsent(dom: {
  spotlightPresent: boolean;
}): ScenarioAssertResult {
  return !dom.spotlightPresent
    ? { ok: true, reason: "spotlight absent" }
    : { ok: false, reason: "spotlight-absent but Spotlight content found" };
}

export function assertTakeoverOpen(dom: {
  dialogOpen: boolean;
}): ScenarioAssertResult {
  return dom.dialogOpen
    ? { ok: true, reason: "takeover dialog open" }
    : { ok: false, reason: "takeover-open expected open dialog" };
}

export function assertSermonFallback(dom: {
  fallbackLandmark: boolean;
}): ScenarioAssertResult {
  return dom.fallbackLandmark
    ? { ok: true, reason: "sermon fallback landmark" }
    : { ok: false, reason: "sermon-fallback landmark missing" };
}

export function assertLivestreamPreview(dom: {
  previewControlVisible: boolean;
}): ScenarioAssertResult {
  return dom.previewControlVisible
    ? { ok: true, reason: "livestream preview controls visible" }
    : { ok: false, reason: "livestream-preview controls missing" };
}

/** Fail if DRAFT/PUBLIC mutating labels are classified SAFE. */
export function assertMutationNotMisclassified(input: {
  name: string;
  mutation: string;
}): ScenarioAssertResult {
  const n = input.name.toLowerCase();
  if (
    /save (as a )?draft|save draft|save my draft/i.test(n) &&
    input.mutation === "SAFE"
  ) {
    return {
      ok: false,
      reason: `DRAFT_WRITE action classified SAFE: ${input.name}`,
    };
  }
  if (
    /make (this |these )?(live|changes live)|make livestream live|publish/i.test(
      n,
    ) &&
    input.mutation === "SAFE"
  ) {
    return {
      ok: false,
      reason: `PUBLIC_WRITE action classified SAFE: ${input.name}`,
    };
  }
  return { ok: true, reason: "mutation classification ok" };
}
