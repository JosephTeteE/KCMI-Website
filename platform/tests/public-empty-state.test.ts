import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  shouldShowSpotlightTakeover,
  spotlightStorageKey,
  withinSpotlightWindow,
} from "@/lib/home/spotlight-takeover";
import {
  HUB_TOUR_STEPS,
  hubTourTargetSelector,
  readHubTourStepIndex,
  writeHubTourStepIndex,
} from "@/lib/hub/tour";
import { defaultHomeDocument } from "@/content/website/defaults";
import { replacementForExactStoredValue } from "@/content/website/stale-seed-replacements";

  const APOLOGY_PATTERNS = [
  /service times will be listed/i,
  /service times (are )?unavailable/i,
  /times not available/i,
  /phone number (is )?missing/i,
];

describe("public empty-state rules", () => {
  it("does not apologize for missing service times on home or locations surfaces", () => {
    const files = [
      "src/components/home/home-hero.tsx",
      "src/components/home/find-family-section.tsx",
      "src/components/home/featured-program-section.tsx",
      "src/components/content/branch-card.tsx",
      "src/components/content/branch-public-details.tsx",
      "src/components/content/locations-finder.tsx",
      "src/app/(site)/locations/page.tsx",
      "src/app/(site)/locations/[slug]/page.tsx",
      "src/app/(site)/page.tsx",
    ];
    for (const relative of files) {
      const src = readFileSync(resolve(process.cwd(), relative), "utf8");
      for (const pattern of APOLOGY_PATTERNS) {
        expect(src, `${relative} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("hides FeaturedProgramSection and FindFamilySection when empty", () => {
    const featured = readFileSync(
      resolve(process.cwd(), "src/components/home/featured-program-section.tsx"),
      "utf8",
    );
    const family = readFileSync(
      resolve(process.cwd(), "src/components/home/find-family-section.tsx"),
      "utf8",
    );
    expect(featured).toMatch(/isPublicFeaturedProgram|return null/);
    expect(family).toMatch(/count === 0 && !allowEmpty/);
  });
});

describe("spotlight takeover frequency helpers", () => {
  it("caps display with storage and optional windows", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };
    const programId = "11111111-1111-4111-8111-111111111111";
    expect(
      shouldShowSpotlightTakeover({
        enabled: true,
        programId,
        frequency: "once_per_browser",
        storage,
      }),
    ).toBe(true);
    memory.set(spotlightStorageKey(programId, "once_per_browser"), "1");
    expect(
      shouldShowSpotlightTakeover({
        enabled: true,
        programId,
        frequency: "once_per_browser",
        storage,
      }),
    ).toBe(false);
    expect(
      withinSpotlightWindow(
        new Date("2026-06-01T12:00:00.000Z"),
        "2026-07-01T00:00:00.000Z",
        null,
      ),
    ).toBe(false);
    expect(
      shouldShowSpotlightTakeover({
        enabled: false,
        programId,
        frequency: "once_per_session",
        storage: null,
      }),
    ).toBe(false);
  });
});

describe("Hub coach-mark tour steps", () => {
  it("anchors steps to data-tour targets and persists step index", () => {
    expect(HUB_TOUR_STEPS.length).toBeGreaterThanOrEqual(11);
    expect(HUB_TOUR_STEPS.map((step) => step.id)).toEqual([
      "dashboard-homepage",
      "dashboard-programs",
      "dashboard-branches",
      "dashboard-livestream",
      "help-tutorial",
      "home-visual-overview",
      "home-visual-section-banner",
      "edit-category-words",
      "change-section",
      "preview-changes",
      "make-live",
    ]);
    const publishPath = HUB_TOUR_STEPS.filter((step) =>
      [
        "home-visual-overview",
        "home-visual-section-banner",
        "edit-category-words",
        "change-section",
        "preview-changes",
        "make-live",
      ].includes(step.id),
    );
    expect(publishPath.map((step) => step.target)).toEqual([
      '[data-tour="home-section-chooser"]',
      '[data-tour="home-visual-section-banner"]',
      '[data-tour="edit-category-words"]',
      '[data-tour="change-section"]',
      '[data-tour="preview-changes"]',
      '[data-tour="make-live"]',
    ]);
    expect(
      HUB_TOUR_STEPS.find((step) => step.id === "change-section")?.selectHomeCategory,
    ).toBe("words");
    expect(
      HUB_TOUR_STEPS.find((step) => step.id === "preview-changes")?.selectHomeCategory,
    ).toBe("words");
    for (const step of HUB_TOUR_STEPS) {
      expect(hubTourTargetSelector(step)).toMatch(/data-tour=/);
      expect(step.href.startsWith("/admin")).toBe(true);
      expect(step.body).not.toMatch(/localStorage|modal_frequency|program_id/i);
    }
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    };
    writeHubTourStepIndex(storage, 4);
    expect(readHubTourStepIndex(storage)).toBe(4);
  });
});

describe("D1.7 home voice exact-match seed repair", () => {
  it("repairs only exact original home seed strings", () => {
    expect(
      replacementForExactStoredValue(
        "home",
        ["heroHeadline"],
        "Kingdom Covenant Ministries International",
      ),
    ).toBe(defaultHomeDocument.heroHeadline);
    expect(
      replacementForExactStoredValue("home", ["heroPrimaryCtaLabel"], "Plan a visit"),
    ).toBe(defaultHomeDocument.heroPrimaryCtaLabel);
    expect(
      replacementForExactStoredValue("home", ["welcomeEyebrow"], "Welcome"),
    ).toBe(defaultHomeDocument.welcomeEyebrow);
    expect(
      replacementForExactStoredValue(
        "home",
        ["heroHeadline"],
        "Operator-edited homepage title",
      ),
    ).toBeNull();
  });
});
