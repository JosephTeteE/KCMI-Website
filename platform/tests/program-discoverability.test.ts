import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getFooterNavigation,
  getPrimaryNavigation,
} from "@/content";
import {
  isScheduledUpcomingForHomepage,
  nextUpcomingSessionStartIso,
} from "@/lib/programs/expiry";
import { limitProgramCards } from "@/lib/programs/upcoming-homepage";

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const NOW = new Date("2026-10-01T12:00:00.000Z");

describe("Program discoverability — homepage eligibility", () => {
  it("includes a published program whose next session is still ahead", () => {
    const sessions = [
      { sessionDate: "2026-10-18", startTime: "09:00", endTime: "12:00" },
    ];
    expect(
      isScheduledUpcomingForHomepage(sessions, {
        timeZone: "Africa/Lagos",
        now: NOW,
      }),
    ).toBe(true);
    expect(
      nextUpcomingSessionStartIso(sessions, {
        timeZone: "Africa/Lagos",
        now: NOW,
      }),
    ).toBeTruthy();
  });

  it("keeps an unscheduled program off the homepage list", () => {
    expect(
      isScheduledUpcomingForHomepage([], {
        timeZone: "Africa/Lagos",
        now: NOW,
      }),
    ).toBe(false);
    expect(
      nextUpcomingSessionStartIso([], { timeZone: "Africa/Lagos", now: NOW }),
    ).toBeNull();
  });

  it("caps the homepage at 3 and lets the Programs page return more", () => {
    const five = ["a", "b", "c", "d", "e"];
    expect(limitProgramCards(five, 3)).toHaveLength(3);
    expect(limitProgramCards(five, 24).length).toBeGreaterThan(3);

    const home = readSrc("src/app/(site)/page.tsx");
    const listing = readSrc("src/app/(site)/programs/page.tsx");
    expect(home).toContain("fetchUpcomingProgramsForHomepage(3)");
    expect(home).toContain("maxItems={3}");
    expect(home).not.toContain("fetchUnscheduledPublishedPrograms");
    expect(listing).toContain("fetchUpcomingProgramsForHomepage(24)");
    expect(listing).toContain("fetchUnscheduledPublishedPrograms");
    expect(listing).toContain("More programs");
  });

  it("links the homepage section to the full Programs page", () => {
    const section = readSrc(
      "src/components/home/upcoming-programs-section.tsx",
    );
    expect(section).toContain('href="/programs"');
    expect(section).toContain("View all programs");
    expect(section).toContain('data-testid="view-all-programs"');
    expect(section).toContain("showViewAll");
    expect(section).toContain("return null");
    expect(section).toContain("href={program.href}");
  });
});

describe("Program discoverability — navigation", () => {
  it("exposes Programs in desktop and mobile navigation", () => {
    const programs = getPrimaryNavigation().find(
      (item) => item.href === "/programs",
    );
    expect(programs).toEqual({ label: "Programs", href: "/programs" });
    expect(
      getFooterNavigation().some((item) => item.href === "/programs"),
    ).toBe(true);

    const header = readSrc("src/components/layout/site-header.tsx");
    const desktop = header.slice(
      header.indexOf('aria-label="Primary"'),
      header.indexOf('aria-label="Mobile primary"'),
    );
    const mobile = header.slice(header.indexOf('aria-label="Mobile primary"'));
    expect(desktop).toContain("lg:flex");
    expect(desktop).toContain("items.map");
    expect(header).toContain("lg:hidden");
    expect(mobile).toContain("items.map");
  });
});

describe("Program discoverability — Spotlight stays manual", () => {
  it("does not treat publish as Spotlight", () => {
    const home = readSrc("src/app/(site)/page.tsx");
    const listing = readSrc("src/lib/programs/upcoming-homepage.ts");
    const actions = readSrc("src/app/admin/programs/actions.ts");
    const chooser = readSrc(
      "src/components/hub/featured-program-chooser.tsx",
    );
    expect(home).toContain("getFeaturedProgram()");
    expect(home).toContain("fetchUpcomingProgramsForHomepage(3)");
    expect(listing).not.toContain('placement');
    expect(actions).toContain('placement: "none"');
    expect(chooser).toContain("setFeaturedProgramFromHome");
  });
});
