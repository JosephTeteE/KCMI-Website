import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("Visual robustness — Program flyers", () => {
  it("uses contain (not cover) for public Program flyer frames", () => {
    const flyer = readSrc("src/components/content/program-flyer-media.tsx");
    expect(flyer).toContain("object-contain");
    expect(flyer).not.toContain("object-cover");
    expect(flyer).toContain('data-program-flyer');

    const upcoming = readSrc("src/components/home/upcoming-programs-section.tsx");
    expect(upcoming).toContain("ProgramFlyerMedia");
    expect(upcoming).toContain('data-testid="upcoming-program-card"');
    expect(upcoming).toContain("View Program");
    expect(upcoming).toContain("href={program.href}");
    // Whole card is the link (not only a nested button).
    expect(upcoming).toMatch(/<Link[\s\S]*data-testid="upcoming-program-card"/);

    const detail = readSrc("src/app/(site)/programs/[slug]/page.tsx");
    expect(detail).toContain("ProgramFlyerMedia");
    expect(detail).toContain('variant="detail"');
    expect(detail).not.toMatch(/object-cover/);

    const featured = readSrc("src/components/home/featured-program-section.tsx");
    expect(featured).toContain("ProgramFlyerMedia");
    expect(featured).not.toMatch(/object-cover/);

    const spotlight = readSrc(
      "src/components/home/program-spotlight-takeover.tsx",
    );
    expect(spotlight).toContain("ProgramFlyerMedia");
    expect(spotlight).not.toMatch(/object-cover/);
  });

  it("homepage Upcoming Programs caps at 3 and omits when empty", () => {
    const home = readSrc("src/app/(site)/page.tsx");
    expect(home).toContain("fetchUpcomingProgramsForHomepage(3)");
    expect(home).toContain("maxItems={3}");

    const upcoming = readSrc("src/components/home/upcoming-programs-section.tsx");
    expect(upcoming).toContain("if (visible.length === 0)");
    expect(upcoming).toContain("return null");
  });
});

describe("Visual robustness — light theme lock", () => {
  it("locks light color-scheme on document and form controls", () => {
    const globals = readSrc("src/app/globals.css");
    expect(globals).toContain("color-scheme: light");
    expect(globals).toContain("prefers-color-scheme: dark");
    expect(globals).toContain("input::placeholder");

    const layout = readSrc("src/app/layout.tsx");
    expect(layout).toContain('colorScheme: "light"');
    expect(layout).toContain('"color-scheme": "light"');
    expect(layout).toContain("bg-[var(--color-surface-page)]");

    expect(globals).not.toMatch(/prefers-color-scheme:\s*dark[\s\S]*color-scheme:\s*dark/);
  });
});

describe("Visual robustness — desktop page shell", () => {
  it("constrains sparse pages while keeping locations/services full-width", () => {
    const shell = readSrc("src/components/layout/page-shell.tsx");
    expect(shell).toContain('contentWidth = "readable"');
    expect(shell).toContain("page-shell-readable");
    expect(shell).toContain('contentWidth === "full"');

    const tokens = readSrc("src/styles/tokens.css");
    expect(tokens).toContain(".page-shell-readable");

    expect(readSrc("src/app/(site)/locations/page.tsx")).toContain(
      'contentWidth="full"',
    );
    expect(readSrc("src/app/(site)/services/page.tsx")).toContain(
      'contentWidth="full"',
    );
    expect(readSrc("src/app/(site)/sermons/page.tsx")).toContain(
      'contentWidth="full"',
    );
    expect(readSrc("src/app/(site)/prayer/page.tsx")).not.toContain(
      'contentWidth="full"',
    );
  });
});
