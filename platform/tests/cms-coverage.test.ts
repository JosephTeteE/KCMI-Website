import { describe, expect, it } from "vitest";
import { resolveHomeDocument } from "@/content/website/resolve";
import { mapHomePublic } from "@/content/website/public-map";
import { featuredProgramCoverSrc, isPublicFeaturedProgram } from "@/content/featured-program";
import { defaultHomeDocument } from "@/content/website/defaults";
import {
  getAboutChurch,
  getDailyFaithRecharge,
  getHomeContent,
  getPrivacyPolicy,
  getPublicContactDetails,
  getServiceOfferings,
  getSermonPlatforms,
} from "@/content";
import { resolvePublicEventSlug } from "@/lib/events/public-event";
import { validateSocialUrl } from "@/lib/cms/social-url";
import type { FeaturedProgram } from "@/content/types";

describe("Home CMS overlay", () => {
  it("lets Hub data change the public hero without a code deploy", () => {
    const doc = resolveHomeDocument({
      heroHeadline: "Hub headline for testing",
      heroSupporting: "Hub supporting copy",
    });
    const home = mapHomePublic(doc, null, null);
    expect(home.heroHeadline).toBe("Hub headline for testing");
    expect(home.heroSupporting).toBe("Hub supporting copy");
    expect(defaultHomeDocument.heroHeadline).not.toBe("Hub headline for testing");
  });

  it("keeps verified fallbacks when Hub payload is empty", async () => {
    const home = await getHomeContent();
    expect(home.heroHeadline).toBe("Raising Kings To Build The Kingdom");
    expect(home.heroSupporting).toContain("creative biblical means");
    expect(home.welcomeHeading).toContain("Kingdom Covenant Ministries International");
  });
});

describe("program cover public rendering", () => {
  it("exposes the assigned cover URL for public rendering", () => {
    const program: FeaturedProgram = {
      id: "11111111-1111-4111-8111-111111111111",
      title: "Published program",
      shortDescription: "A published gathering.",
      datesLabel: null,
      imageSrc: "https://example.supabase.co/storage/v1/object/public/marketing-public/cover.webp",
      imageAlt: "Program cover",
      ctaLabel: "Learn more",
      ctaHref: "/events",
      placement: "featured",
      status: "published",
    };
    expect(isPublicFeaturedProgram(program)).toBe(true);
    expect(featuredProgramCoverSrc(program)).toContain("cover.webp");
  });

  it("hides the Home featured block when no published program exists", () => {
    expect(isPublicFeaturedProgram(null)).toBe(false);
  });

  it("does not render draft placeholder programs", () => {
    expect(
      isPublicFeaturedProgram({
        id: "dev",
        title: "Hidden",
        shortDescription: "",
        datesLabel: null,
        imageSrc: "/secret.webp",
        imageAlt: "",
        ctaLabel: "x",
        ctaHref: "/",
        placement: "featured",
        status: "draft_placeholder",
      }),
    ).toBe(false);
  });
});

describe("unpublished content remains hidden", () => {
  const published: FeaturedProgram = {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Published program",
    shortDescription: "A published gathering.",
    datesLabel: null,
    imageSrc: "https://example.supabase.co/storage/v1/object/public/marketing-public/cover.webp",
    imageAlt: "Program cover",
    ctaLabel: "Learn more",
    ctaHref: "/events",
    placement: "featured",
    status: "published",
  };

  it("hides draft, preview, and archived programs from Home", () => {
    expect(isPublicFeaturedProgram({ ...published, status: "draft" })).toBe(false);
    expect(isPublicFeaturedProgram({ ...published, status: "preview" })).toBe(false);
    expect(isPublicFeaturedProgram({ ...published, status: "archived" })).toBe(false);
    expect(isPublicFeaturedProgram(published)).toBe(true);
  });

  it("does not invent unpublished branch or event pages", async () => {
    const { getBranchBySlug } = await import("@/content");
    expect(await getBranchBySlug("not-a-published-branch")).toBeNull();
    expect(resolvePublicEventSlug("draft-camp")).toBeNull();
  });
});

describe("contact and DFR hygiene", () => {
  it("uses the configured public contact identity", async () => {
    const contact = await getPublicContactDetails();
    expect(contact.primaryEmail).toBe("contact@kcmi-rcc.org");
    expect(contact.primaryEmail).not.toMatch(/gmail\.com/i);
  });

  it("does not include the stale DFR Subscribe instruction", async () => {
    const faith = await getDailyFaithRecharge();
    const blob = JSON.stringify(faith);
    expect(blob).not.toMatch(/Subscribe/i);
    expect(blob).not.toMatch(/WhatsApp/i);
  });
});

describe("About church page content", () => {
  it("leads with church and mission rather than biography", async () => {
    const about = await getAboutChurch();
    expect(about.whoWeAre[0]).toMatch(/Kingdom Covenant Ministries International/);
    expect(about.vision).toBe("Raising Kings To Build The Kingdom");
    expect(about.leadershipPreview.length).toBeLessThan(about.bioParagraphs.join(" ").length);
  });
});

describe("services and sermons cleanup", () => {
  it("does not mix care forms into a generic Access Resources block", async () => {
    const offerings = await getServiceOfferings();
    expect(offerings.some((item) => item.id === "resources")).toBe(false);
    expect(offerings.some((item) => item.kind === "care")).toBe(true);
    expect(offerings.some((item) => item.kind === "media")).toBe(true);
    expect(JSON.stringify(offerings)).not.toMatch(/spiritual journey/i);
  });

  it("does not assert an unverified Silverbird Friday schedule", async () => {
    const platforms = await getSermonPlatforms();
    const blob = JSON.stringify(platforms);
    expect(blob).not.toMatch(/8:00/i);
    expect(blob).not.toMatch(/Friday/i);
    expect(platforms.some((item) => /Apostle Frank/i.test(item.name))).toBe(true);
  });
});

describe("events scaffold", () => {
  it("does not resolve unknown or camp-meeting slugs as published events", () => {
    expect(resolvePublicEventSlug("camp-meeting")).toBeNull();
    expect(resolvePublicEventSlug("unknown-event")).toBeNull();
  });
});

describe("privacy factual draft", () => {
  it("contains no known legacy-architecture strings", () => {
    const text = getPrivacyPolicy()
      .sections.flatMap((section) => [
        section.heading ?? "",
        ...section.paragraphs,
        ...(section.bullets ?? []),
      ])
      .join("\n");
    expect(text).not.toMatch(/Google Drive/i);
    expect(text).not.toMatch(/Google Sheet/i);
    expect(text).not.toMatch(/JWT/i);
    expect(text).not.toMatch(/reCAPTCHA/i);
    expect(text).not.toMatch(/1-minute/i);
    expect(text).not.toMatch(/embed code/i);
    expect(text).toMatch(/Supabase/i);
  });
});

describe("branch detail media", () => {
  it("selects published hero and gallery items without inventing images", () => {
    const media = [
      {
        id: "h1",
        branchSlug: "accra",
        placement: "hero" as const,
        sortOrder: 0,
        imageSrc: "https://example.supabase.co/storage/v1/object/public/marketing-public/hero.webp",
        altText: "Accra hero",
        caption: null,
      },
      {
        id: "g1",
        branchSlug: "accra",
        placement: "gallery" as const,
        sortOrder: 1,
        imageSrc: "https://example.supabase.co/storage/v1/object/public/marketing-public/gallery.webp",
        altText: "Accra gallery",
        caption: null,
      },
    ];
    const hero = media.find((item) => item.placement === "hero");
    const gallery = media.filter((item) => item.placement === "gallery");
    expect(hero?.imageSrc).toContain("hero.webp");
    expect(gallery).toHaveLength(1);
  });
});

describe("social URL allowlist", () => {
  it("accepts verified platforms and rejects unknown hosts", () => {
    expect(validateSocialUrl("https://www.youtube.com/@rehoboth-tv").ok).toBe(true);
    expect(validateSocialUrl("https://www.tiktok.com/@frank.aikins").ok).toBe(true);
    expect(validateSocialUrl("https://evil.example/kcmi").ok).toBe(false);
    expect(validateSocialUrl("javascript:alert(1)").ok).toBe(false);
  });
});
