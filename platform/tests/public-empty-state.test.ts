import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  shouldShowSpotlightTakeover,
  spotlightStorageKey,
  withinSpotlightWindow,
} from "@/lib/home/spotlight-takeover";
import {
  HUB_HOME_CONTEXT_TOUR_STEPS,
  HUB_LIVESTREAM_CONTEXT_TOUR_STEPS,
  HUB_PROGRAMS_CONTEXT_TOUR_STEPS,
  HUB_TOUR_STEPS,
  hubTourTargetSelector,
  readHubTourStepIndex,
  resolveHubTourKind,
  resolveReplayTourKind,
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
  it("keeps the first-run tour on the Dashboard only", () => {
    expect(HUB_TOUR_STEPS.length).toBe(6);
    expect(HUB_TOUR_STEPS.map((step) => step.id)).toEqual([
      "dashboard-homepage",
      "dashboard-programs",
      "dashboard-branches",
      "dashboard-sermons",
      "dashboard-livestream",
      "help-tutorial",
    ]);
    expect(HUB_TOUR_STEPS.every((step) => step.href === "/admin")).toBe(true);
    for (const step of HUB_TOUR_STEPS) {
      expect(hubTourTargetSelector(step)).toMatch(/data-tour=/);
      expect(step.body).not.toMatch(/localStorage|modal_frequency|program_id/i);
    }
  });

  it("keeps Homepage contextual tour route-local", () => {
    expect(
      HUB_HOME_CONTEXT_TOUR_STEPS.every(
        (step) => step.href === "/admin/website/home",
      ),
    ).toBe(true);
    expect(HUB_HOME_CONTEXT_TOUR_STEPS.map((s) => s.id)).toEqual([
      "home-choose-section",
      "home-edit-section",
      "home-words-photo",
      "home-preview",
      "home-make-live",
    ]);
    expect(HUB_HOME_CONTEXT_TOUR_STEPS.every((s) => s.title !== "Homepage")).toBe(
      true,
    );
  });

  it("keeps Program contextual tour on New Program only", () => {
    expect(
      HUB_PROGRAMS_CONTEXT_TOUR_STEPS.every(
        (step) => step.href === "/admin/programs/new",
      ),
    ).toBe(true);
    expect(HUB_PROGRAMS_CONTEXT_TOUR_STEPS.map((s) => s.title)).toEqual([
      "Program name",
      "When",
      "Where",
      "Visitor link",
      "Review / Save draft",
    ]);
    expect(
      HUB_PROGRAMS_CONTEXT_TOUR_STEPS.some((s) => s.title === "Homepage"),
    ).toBe(false);
  });

  it("keeps Livestream contextual tour route-local", () => {
    expect(
      HUB_LIVESTREAM_CONTEXT_TOUR_STEPS.every(
        (step) => step.href === "/admin/livestream",
      ),
    ).toBe(true);
    expect(HUB_LIVESTREAM_CONTEXT_TOUR_STEPS[0]?.title).toMatch(/live status/i);
    expect(
      HUB_LIVESTREAM_CONTEXT_TOUR_STEPS.some((s) => s.title === "Homepage"),
    ).toBe(false);
  });

  it("resolves tour kind from pathname", () => {
    expect(resolveHubTourKind("/admin")).toBe("dashboard");
    expect(resolveHubTourKind("/admin/website/home")).toBe("home");
    expect(resolveHubTourKind("/admin/programs/new")).toBe("programs");
    expect(resolveHubTourKind("/admin/livestream")).toBe("livestream");
    expect(resolveReplayTourKind("/admin/programs")).toBe("programs");
  });

  it("persists tour step index", () => {
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
