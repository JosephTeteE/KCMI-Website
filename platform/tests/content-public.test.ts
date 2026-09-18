import { describe, expect, it } from "vitest";
import {
  getBranches,
  getChurchIdentity,
  getFaqs,
  getFeaturedProgram,
  getGivingAccounts,
  getLivestreamPublic,
  getPrayerCta,
  getPrimaryNavigation,
  getFooterNavigation,
  getFooterLegalNavigation,
  getServiceTimes,
  getSocialLinks,
  getAboutLeadPastor,
} from "@/content";
import { legacyHtmlRedirects } from "@/lib/routing/legacy-redirects";
import { brandPrimitives } from "@/lib/design/tokens";

const publicRoutes = [
  "/",
  "/about",
  "/about/apostle-frank-aikins",
  "/locations",
  "/services",
  "/sermons",
  "/contact",
  "/giving",
  "/livestream",
  "/faqs",
  "/privacy",
  "/terms",
  "/events",
];

describe("public content adapters", () => {
  it("returns verified church identity fields", () => {
    const id = getChurchIdentity();
    expect(id.legalName).toBe("Kingdom Covenant Ministries International");
    expect(id.alternateName).toBe("Rehoboth Christian Center");
    expect(id.shortName).toBe("KCMI");
    expect(id.siteUrl).toMatch(/^https:\/\//);
  });

  it("exposes HQ service times from verified legacy source", async () => {
    const times = await getServiceTimes();
    expect(times).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ day: "Sunday", time: "08:30 am" }),
        expect.objectContaining({ day: "Thursday", time: "05:30 pm" }),
      ]),
    );
  });

  it("lists branches without inventing Kasoa service times", async () => {
    const kasoa = (await getBranches()).find((b) => b.id === "kasoa");
    expect(kasoa).toBeTruthy();
    expect(kasoa?.serviceTimes).toEqual([]);
  });

  it("keeps prayer CTA on native /prayer", async () => {
    expect((await getPrayerCta()).ctaHref).toBe("/prayer");
  });

  it("does not embed pastoral narrative keys or receipt URLs in public seed JSON", async () => {
    const blob = JSON.stringify({
      identity: getChurchIdentity(),
      branches: await getBranches(),
      social: await getSocialLinks(),
      prayer: await getPrayerCta(),
      giving: await getGivingAccounts(),
      faqs: await getFaqs(),
      about: await getAboutLeadPastor(),
      live: await getLivestreamPublic(),
    });
    expect(blob.toLowerCase()).not.toMatch(/pastoral_note/);
    expect(blob.toLowerCase()).not.toMatch(/receipt_url/);
    expect(blob).not.toMatch(/cloudinary/i);
  });

  it("featured program is null outside development without published content", async () => {
    expect(process.env.CONTENT_SOURCE).toBe("seed");
    expect(process.env.NODE_ENV).not.toBe("development");
    expect(await getFeaturedProgram()).toBeNull();
  });

  it("centralizes giving accounts from a single seed (verified banks)", async () => {
    const accounts = await getGivingAccounts();
    expect(accounts).toHaveLength(3);
    expect(accounts.map((a) => a.bankName).sort()).toEqual([
      "ECOBANK",
      "UNION BANK",
      "ZENITH BANK",
    ]);
    const numbers = accounts.flatMap((a) => [
      a.accountNumber,
      ...(a.accountsByCurrency?.map((c) => c.accountNumber) ?? []),
    ]);
    expect(numbers).toContain("1602002211");
    expect(numbers).toContain("0055484937");
    expect(numbers).toContain("5074346861");
  });

  it("livestream seed is not live and uses Facebook page URL only", async () => {
    const live = await getLivestreamPublic();
    expect(live.isLive).toBe(false);
    expect(live.facebookPageUrl).toContain("facebook.com");
    expect(live.facebookPageUrl).not.toMatch(/\/videos\//);
  });

  it("faqs include seven verified questions", async () => {
    expect(await getFaqs()).toHaveLength(7);
  });
});

describe("navigation and redirects", () => {
  it("primary and footer nav only use planned public routes", () => {
    const hrefs = [
      ...getPrimaryNavigation().map((i) => i.href),
      ...getFooterNavigation().map((i) => i.href),
      ...getFooterLegalNavigation().map((i) => i.href),
      "/livestream",
    ];
    for (const href of hrefs) {
      expect(publicRoutes).toContain(href);
    }
  });

  it("maps known legacy HTML paths to clean routes", () => {
    const map = Object.fromEntries(
      legacyHtmlRedirects.map((r) => [r.source, r.destination]),
    );
    expect(map["/index.html"]).toBe("/");
    expect(map["/location.html"]).toBe("/locations");
    expect(map["/giving-kcmi.html"]).toBe("/giving");
    expect(map["/mission-kcmi.html"]).toBe("/about#mission");
    expect(map["/about-apostle-aikins.html"]).toBe(
      "/about/apostle-frank-aikins",
    );
    for (const dest of Object.values(map)) {
      expect(publicRoutes).toContain(dest.replace(/#.*$/, ""));
    }
  });
});

describe("brand primitives", () => {
  it("keeps authoritative KCMI hex values", () => {
    expect(brandPrimitives).toEqual({
      offWhite: "#eff5f5",
      red: "#b60b13",
      green: "#108c1d",
      lavender: "#c298b7",
      violet: "#7c1963",
    });
  });
});
