import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getGivingAccountsSeed } from "@/content";
import {
  isPastoralIntakeEnabled,
  LEGACY_PASTORAL_GOOGLE_FORM_URL,
} from "@/lib/care/pastoral-intake";
import {
  isPrayerIntakeEnabled,
  LEGACY_PRAYER_GOOGLE_FORM_URL,
} from "@/lib/care/prayer-intake";
import {
  isWelfareIntakeEnabled,
  LEGACY_WELFARE_GOOGLE_FORM_URL,
} from "@/lib/care/welfare-intake";
import {
  CAMP_LEGACY_HOST,
  campBookmarkRedirects,
  legacyHtmlRedirects,
} from "@/lib/routing/legacy-redirects";

const FORBIDDEN_PUBLIC_PHRASES = [
  /Final wording/i,
  /human\/legal review/i,
  /first-party intake/i,
  /prepared but not enabled/i,
  /\bcutover\b/i,
  /feature gate/i,
  /Google Form/i,
  /legacy form/i,
  /\bstaging\b/i,
  /\bmigration\b/i,
];

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("prelaunch Care public copy", () => {
  const carePages = [
    "src/app/(site)/prayer/page.tsx",
    "src/app/(site)/pastoral-care/page.tsx",
    "src/app/(site)/welfare/page.tsx",
  ] as const;

  it("contains no visitor-facing implementation/meta jargon", () => {
    for (const path of carePages) {
      const source = readSrc(path);
      for (const phrase of FORBIDDEN_PUBLIC_PHRASES) {
        expect(source, `${path} must not match ${phrase}`).not.toMatch(phrase);
      }
    }
  });

  it("keeps verified Google Form destinations on gate-off CTAs", () => {
    expect(readSrc("src/app/(site)/prayer/page.tsx")).toContain(
      "LEGACY_PRAYER_GOOGLE_FORM_URL",
    );
    expect(readSrc("src/app/(site)/pastoral-care/page.tsx")).toContain(
      "LEGACY_PASTORAL_GOOGLE_FORM_URL",
    );
    expect(readSrc("src/app/(site)/welfare/page.tsx")).toContain(
      "LEGACY_WELFARE_GOOGLE_FORM_URL",
    );
    expect(LEGACY_PRAYER_GOOGLE_FORM_URL).toBe(
      "https://forms.gle/gKTwNc9gNiVCWWrJ6",
    );
    expect(LEGACY_PASTORAL_GOOGLE_FORM_URL).toMatch(/^https:\/\/forms\.gle\//);
    expect(LEGACY_WELFARE_GOOGLE_FORM_URL).toMatch(/^https:\/\/forms\.gle\//);
  });

  it("uses visitor-facing primary CTA labels", () => {
    expect(readSrc("src/app/(site)/prayer/page.tsx")).toContain(
      "Submit a Prayer Request",
    );
    expect(readSrc("src/app/(site)/pastoral-care/page.tsx")).toContain(
      "Request Pastoral Care",
    );
    expect(readSrc("src/app/(site)/welfare/page.tsx")).toContain(
      "Request Welfare Support",
    );
  });

  it("keeps Care intake gates off by default", () => {
    delete process.env.KCMI_PRAYER_INTAKE_ENABLED;
    delete process.env.KCMI_PASTORAL_INTAKE_ENABLED;
    delete process.env.KCMI_WELFARE_INTAKE_ENABLED;
    expect(isPrayerIntakeEnabled()).toBe(false);
    expect(isPastoralIntakeEnabled()).toBe(false);
    expect(isWelfareIntakeEnabled()).toBe(false);
  });
});

describe("prelaunch public recovery routes", () => {
  it("provides a branded 404 with Home, Locations, and Contact Us", () => {
    const notFound = readSrc("src/app/not-found.tsx");
    expect(notFound).toMatch(/Page not found/);
    expect(notFound).toMatch(/may have moved or the link may be incorrect/i);
    expect(notFound).toContain('href: "/"');
    expect(notFound).toContain('href: "/locations"');
    expect(notFound).toContain('href: "/contact"');
    expect(notFound).toContain("Home");
    expect(notFound).toContain("Locations");
    expect(notFound).toContain("Contact Us");
  });

  it("redirects legacy youth-camp bookmarks to the live Camp host", () => {
    const map = Object.fromEntries(
      campBookmarkRedirects.map((r) => [r.source, r.destination]),
    );
    expect(map["/youth-camp.html"]).toBe(CAMP_LEGACY_HOST);
    expect(map["/youth-camp"]).toBe(CAMP_LEGACY_HOST);
    expect(CAMP_LEGACY_HOST).toBe("https://camp.kcmi-rcc.org");

    const nextConfig = readSrc("next.config.ts");
    expect(nextConfig).toMatch(/campBookmarkRedirects/);
    expect(nextConfig).not.toMatch(
      /camp\.kcmi-rcc\.org.*events\.kcmi-rcc\.org/,
    );

    // Internal HTML redirects stay separate from Camp external bookmarks.
    const internalSources: string[] = legacyHtmlRedirects.map((r) => r.source);
    expect(internalSources.includes("/youth-camp.html")).toBe(false);
    expect(internalSources.includes("/youth-camp")).toBe(false);
  });
});

describe("prelaunch Giving values untouched", () => {
  it("keeps verified seed destinations unchanged", () => {
    const accounts = getGivingAccountsSeed();
    expect(accounts).toHaveLength(3);
    expect(accounts[0]).toMatchObject({
      id: "general-ecobank",
      purpose: "General Giving",
      bankName: "ECOBANK",
      accountNumber: "1602002211",
    });
    expect(accounts[1]).toMatchObject({
      id: "care-union",
      purpose: "Care Group Giving",
      bankName: "UNION BANK",
      accountNumber: "0055484937",
    });
    expect(accounts[2]?.purpose).toBe("International Giving");
    expect(accounts[2]?.bankName).toMatch(/ZENITH/);
    expect(accounts[2]?.swiftCode).toBe("ZEIBNGLA");
    expect(accounts[2]?.accountsByCurrency).toEqual([
      { currency: "USD", accountNumber: "5074346861" },
      { currency: "GBP", accountNumber: "5061372275" },
      { currency: "EUR", accountNumber: "5081098025" },
    ]);
  });

  it("keeps Giving page financial literals aligned with seed", () => {
    const page = readSrc("src/app/(site)/giving/page.tsx");
    expect(page).not.toMatch(/1602002211|0055484937|5074346861|5061372275|5081098025/);
    expect(page).toContain("getGivingAccounts");
    expect(page).toContain("CopyAccountNumber");
  });

  it("uses one max-w-4xl content column and responsive currency grid", () => {
    const page = readSrc("src/app/(site)/giving/page.tsx");
    expect(page).toContain('mx-auto max-w-4xl px-4 sm:px-6');
    expect(page).toContain("text-left");
    expect(page).toContain("grid grid-cols-1 gap-4 sm:grid-cols-2");
    expect(page).toContain("accountsByCurrency");
  });
});

describe("prelaunch visual polish", () => {
  it("serves the official KCMI favicon from the App Router location", () => {
    const faviconPath = resolve(process.cwd(), "src/app/favicon.ico");
    const bytes = readFileSync(faviconPath);
    expect(bytes.byteLength).toBeGreaterThan(1000);
    // ICO magic: reserved 0, type 1
    expect(bytes[0]).toBe(0);
    expect(bytes[1]).toBe(0);
    expect(bytes[2]).toBe(1);
    expect(bytes[3]).toBe(0);
    // Must match legacy official asset (not Next.js default triangle).
    const legacy = readFileSync(
      resolve(process.cwd(), "../public/favicon/favicon.ico"),
    );
    expect(Buffer.compare(bytes, legacy)).toBe(0);
  });

  it("locks the root color scheme to light", () => {
    const css = readSrc("src/app/globals.css");
    expect(css).toMatch(/color-scheme:\s*light/);
  });
});
