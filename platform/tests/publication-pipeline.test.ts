import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isScheduledUpcomingForHomepage,
  normalizeSessionCalendarDate,
  programHasUpcomingOrCurrentSession,
} from "@/lib/programs/expiry";
import { safeProgramViewHref } from "@/components/hub/hub-flash";
import { limitProgramCards } from "@/lib/programs/upcoming-homepage";

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const REHOBOTH_SESSIONS = [
  { sessionDate: "2026-09-23", startTime: "17:00", endTime: "20:00" },
  { sessionDate: "2026-09-24", startTime: "17:00", endTime: "20:00" },
  { sessionDate: "2026-09-26", startTime: "09:00", endTime: null },
  { sessionDate: "2026-09-27", startTime: "09:00", endTime: "12:00" },
];

describe("publication pipeline — multi-session visibility", () => {
  const during = new Date("2026-09-26T10:00:00.000Z");

  it("keeps a program visible on Sep 26 Africa/Lagos while a later session remains", () => {
    expect(
      isScheduledUpcomingForHomepage(REHOBOTH_SESSIONS, {
        timeZone: "Africa/Lagos",
        now: during,
      }),
    ).toBe(true);
  });

  it("accepts datetime-prefixed session dates so a real date is not treated as missing", () => {
    expect(normalizeSessionCalendarDate("2026-09-26T00:00:00+00:00")).toBe(
      "2026-09-26",
    );
    expect(
      programHasUpcomingOrCurrentSession(
        [
          {
            sessionDate: "2026-09-26T00:00:00+00:00",
            startTime: "09:00:00",
            endTime: null,
          },
          {
            sessionDate: "2026-09-27T00:00:00+00:00",
            startTime: "09:00:00",
            endTime: "12:00:00",
          },
        ],
        { timeZone: "Africa/Lagos", now: during },
      ),
    ).toBe(true);
  });

  it("hides the program once the final session has ended", () => {
    expect(
      isScheduledUpcomingForHomepage(REHOBOTH_SESSIONS, {
        timeZone: "Africa/Lagos",
        now: new Date("2026-09-28T08:00:00.000Z"),
      }),
    ).toBe(false);
  });
});

describe("publication pipeline — public listing and cache contract", () => {
  it("keeps the homepage at 3 and lets /programs return more than 3", () => {
    const five = ["a", "b", "c", "d", "e"];
    expect(limitProgramCards(five, 3)).toEqual(["a", "b", "c"]);
    expect(limitProgramCards(five, 24)).toEqual(five);
    expect(limitProgramCards(five, 24).length).toBeGreaterThan(3);

    const listing = readSrc("src/lib/programs/upcoming-homepage.ts");
    expect(listing).not.toContain("Math.min(limit, 3)");
    expect(listing).toContain("return limitProgramCards(scored, limit)");
    const home = readSrc("src/app/(site)/page.tsx");
    expect(home).toContain("fetchUpcomingProgramsForHomepage(3)");
    const page = readSrc("src/app/(site)/programs/page.tsx");
    expect(page).toContain("fetchUpcomingProgramsForHomepage(24)");
    expect(page).not.toMatch(/UpcomingProgramsSection[^>]*maxItems=\{3\}/);
    expect(page).toContain("fetchUnscheduledPublishedPrograms");
  });

  it("revalidates public program routes after publish and poster assignment", () => {
    const actions = readSrc("src/app/admin/programs/actions.ts");
    expect(actions).toContain("revalidatePublishedProgram");
    expect(actions).toContain('message: "Program published."');
    expect(actions).toContain("featured_media_id: loaded.asset.id");
    const contract = readSrc("src/lib/cms/revalidate-public.ts");
    expect(contract).toContain('revalidatePath("/")');
    expect(contract).toContain('revalidatePath("/programs")');
    expect(contract).toContain('revalidatePath(`/programs/${slug}`)');
    expect(contract).toContain('revalidatePath("/search")');
  });

  it("revalidates the public page after a website image is made live", () => {
    const media = readSrc("src/app/admin/website/media-actions.ts");
    const stage = media.slice(
      media.indexOf("export async function stageWebsiteContextImage"),
      media.indexOf("export async function assignWebsiteContextImage"),
    );
    const assign = media.slice(
      media.indexOf("export async function assignWebsiteContextImage"),
    );
    expect(stage).not.toContain("revalidatePublishedWebsite");
    expect(assign).toContain("revalidatePublishedWebsite(target.key)");
    const contract = readSrc("src/lib/cms/revalidate-public.ts");
    expect(contract).toContain('case "home"');
    expect(contract).toContain('return ["/about", "/about/apostle-frank-aikins"]');
    expect(contract).toContain('return ["/services"]');
  });

  it("keeps public program pages cacheable and refreshes them on publish", () => {
    for (const path of [
      "src/app/(site)/page.tsx",
      "src/app/(site)/programs/page.tsx",
      "src/app/(site)/programs/[slug]/page.tsx",
      "src/app/(site)/search/page.tsx",
    ]) {
      const src = readSrc(path);
      expect(src).not.toContain('dynamic = "force-dynamic"');
      expect(src).not.toContain("revalidate = 0");
      expect(src).not.toContain('cache: "no-store"');
    }
    const reader = readSrc("src/lib/supabase/server.ts");
    const publicFn = reader.slice(reader.indexOf("createPublicContentClient"));
    expect(publicFn).not.toContain("cookies(");
    const slugPage = readSrc("src/app/(site)/programs/[slug]/page.tsx");
    expect(slugPage).toContain("export function generateStaticParams");
    const contract = readSrc("src/lib/cms/revalidate-public.ts");
    expect(contract).toContain('revalidatePath("/")');
    expect(contract).toContain('revalidatePath("/programs")');
    expect(contract).toContain('revalidatePath(`/programs/${slug}`)');
    expect(contract).toContain('revalidatePath("/search")');
  });

  it("only links View on website to a public program path", () => {
    expect(safeProgramViewHref("/programs/rehoboth-encounter-2026")).toBe(
      "/programs/rehoboth-encounter-2026",
    );
    expect(safeProgramViewHref("https://evil.example/programs/x")).toBeUndefined();
  });
});
