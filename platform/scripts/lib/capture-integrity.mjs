/**
 * Capture integrity helpers — pure checks for page body + URL + named scenarios.
 * Screenshot creation alone is not success.
 */

const ERROR_PATTERNS = [
  /this page couldn.?t load/i,
  /a server error occurred/i,
  /application error/i,
  /internal server error/i,
  /uncaught exception/i,
];

/**
 * @param {string} bodyText
 * @param {string} pathname
 */
export function assertNoPublicErrorPage(bodyText, pathname) {
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.test(bodyText)) {
      throw new Error(`Capture integrity failed on ${pathname}: matched ${pattern}`);
    }
  }
}

/**
 * @param {string} pathname
 * @param {string} bodyText
 * @param {'public' | 'hub'} surface
 */
export function assertRouteLandmarks(pathname, bodyText, surface) {
  assertNoPublicErrorPage(bodyText, pathname);

  if (surface === "hub") {
    if (/\/auth\/sign-in/i.test(pathname) || /sign in to the kcmi hub/i.test(bodyText)) {
      throw new Error(`Hub capture landed on sign-in for ${pathname}`);
    }
  }

  const checks = {
    "/": [/raising kings to build the kingdom/i, /kcmi/i],
    "/about": [/about kcmi/i],
    "/services": [/services/i],
    "/sermons": [/sermon/i],
    "/locations": [/location/i],
    "/contact": [/contact/i],
    "/livestream": [/live/i],
    "/faqs": [/faq|frequently/i],
    "/privacy": [/privacy/i],
    "/admin": [/what would you like to update/i],
    "/admin/website/home": [/homepage|top of homepage|edit this section/i],
    "/admin/branches": [/branch/i],
    "/admin/livestream": [/livestream|facebook|live/i],
    "/admin/programs": [/program/i],
    "/admin/media": [/media|photo/i],
  };

  const patterns = checks[pathname];
  if (!patterns) return;
  const ok = patterns.some((p) => p.test(bodyText));
  if (!ok) {
    throw new Error(
      `Capture integrity failed on ${pathname}: expected landmark missing (surface=${surface})`,
    );
  }
}

/**
 * @param {string} bodyText
 */
export function assertLocationsFinderCompact(bodyText) {
  if (/service times will be (listed|published)/i.test(bodyText)) {
    throw new Error("Locations listing exposed missing-service-time apology copy");
  }
}

/**
 * @param {string} bodyText
 */
export function assertHomeNoBranchDump(bodyText) {
  const mapsCount = (bodyText.match(/open in maps/gi) || []).length;
  if (mapsCount >= 4) {
    throw new Error("Homepage appears to dump multiple branch Maps links");
  }
  if (/service times will be listed here when they are available/i.test(bodyText)) {
    throw new Error("Homepage exposed missing-service-time apology copy");
  }
}

/**
 * @param {string} bodyText
 */
export function assertNoDuplicateCountryPlaceLine(bodyText) {
  if (/, nigeria\s*[·•]\s*nigeria/i.test(bodyText)) {
    throw new Error("Duplicate country in place line (Nigeria · Nigeria)");
  }
  if (/, ghana\s*[·•]\s*ghana/i.test(bodyText)) {
    throw new Error("Duplicate country in place line (Ghana · Ghana)");
  }
  if (/, togo\s*[·•]\s*togo/i.test(bodyText)) {
    throw new Error("Duplicate country in place line (Togo · Togo)");
  }
}

/**
 * Scenario integrity — named capture state must match rendered UI.
 * @param {string} scenario
 * @param {{
 *   bodyText?: string,
 *   html?: string,
 *   hasHeroMedia?: boolean,
 *   hasGalleryMedia?: boolean,
 *   fixtureId?: string | null,
 *   tourStepVisible?: boolean,
 *   tourTargetHighlighted?: boolean,
 * }} evidence
 */
export function assertScenarioState(scenario, evidence = {}) {
  const body = evidence.bodyText ?? "";
  const html = evidence.html ?? "";

  switch (scenario) {
    case "spotlight:on":
    case "spotlight":
      if (!/d1\.7 review spotlight program/i.test(body)) {
        throw new Error("Scenario spotlight:on — expected Spotlight program missing");
      }
      break;

    case "spotlight:off":
    case "no-spotlight":
      if (/d1\.7 review spotlight program/i.test(body)) {
        throw new Error("Scenario spotlight:off — Spotlight program unexpectedly present");
      }
      break;

    case "takeover:on":
    case "takeover":
      if (!/<dialog[\s>]|role=["']dialog["']/i.test(html) && !/dialog/i.test(body)) {
        throw new Error("Scenario takeover:on — takeover dialog not visible");
      }
      break;

    case "takeover:off":
    case "takeover-off":
      // Dialog may exist in DOM closed; prefer open attribute absence for open dialogs
      if (/<dialog[^>]*\sopen[\s>]/i.test(html)) {
        throw new Error("Scenario takeover:off — takeover dialog still open");
      }
      break;

    case "watch:sermon":
    case "watch-sermon":
      if (!/d1\.7 review message/i.test(body)) {
        throw new Error("Scenario watch:sermon — sermon feature missing");
      }
      break;

    case "watch:fallback":
    case "watch-fallback":
      if (/d1\.7 review message/i.test(body)) {
        throw new Error("Scenario watch:fallback — sermon feature unexpectedly present");
      }
      break;

    case "branch:with-media":
    case "with-media": {
      if (evidence.hasHeroMedia !== true && !/data-branch-media=["']hero["']/i.test(html)) {
        throw new Error("Scenario branch:with-media — hero/gallery media not rendered");
      }
      if (evidence.hasHeroMedia === false) {
        throw new Error("Scenario branch:with-media — hero media landmark absent");
      }
      const fixture = evidence.fixtureId;
      if (fixture != null && fixture !== "" && !html.includes(fixture) && !body.includes(fixture)) {
        throw new Error(`Scenario branch:with-media — expected fixture id ${fixture} missing`);
      }
      break;
    }

    case "branch:without-media":
    case "without-media":
      if (evidence.hasHeroMedia === true || /data-branch-media=["']hero["']/i.test(html)) {
        throw new Error("Scenario branch:without-media — hero media unexpectedly present");
      }
      if (/data-branch-media=["']gallery["']/i.test(html)) {
        throw new Error("Scenario branch:without-media — gallery media unexpectedly present");
      }
      break;

    case "tour:coachmark":
      if (evidence.tourStepVisible !== true && !/step \d+ of/i.test(body)) {
        throw new Error("Scenario tour — coach-mark step label missing");
      }
      if (evidence.tourTargetHighlighted === false) {
        throw new Error("Scenario tour — target highlight/cutout missing");
      }
      break;

    case "countries:ng-gh-tg":
      if (!/nigeria\s*[·•]\s*ghana\s*[·•]\s*togo/i.test(body) && !/Nigeria[\s\S]{0,40}Ghana[\s\S]{0,40}Togo/i.test(body)) {
        // Soft: when all three present, order must be NG→GH→TG in the countries list text
        const match = body.match(/across\s+([^\n.]+)/i);
        if (match) {
          const line = match[1];
          const ni = line.toLowerCase().indexOf("nigeria");
          const gi = line.toLowerCase().indexOf("ghana");
          const ti = line.toLowerCase().indexOf("togo");
          if (ni >= 0 && gi >= 0 && ti >= 0 && !(ni < gi && gi < ti)) {
            throw new Error("Scenario countries — expected Nigeria · Ghana · Togo order");
          }
        }
      }
      break;

    default:
      throw new Error(`Unknown scenario integrity key: ${scenario}`);
  }
}

export const CAPTURE_INTEGRITY = {
  ERROR_PATTERNS,
  assertNoPublicErrorPage,
  assertRouteLandmarks,
  assertLocationsFinderCompact,
  assertHomeNoBranchDump,
  assertNoDuplicateCountryPlaceLine,
  assertScenarioState,
};
