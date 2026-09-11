import { z } from "zod";
import { validateOptionalSocialUrl } from "@/lib/cms/social-url";

const hrefSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      value.startsWith("/") ||
      value.startsWith("#") ||
      /^https:\/\//i.test(value),
    "Must be a site path, in-page hash, or https URL",
  );

const linkSchema = z.object({
  label: z.string().min(1).max(120),
  href: hrefSchema,
  external: z.boolean().optional(),
});

const optionalNullableString = z.preprocess((value) => {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}, z.string().nullable());

export const homeDocumentBaseSchema = z.object({
  heroKicker: z.string().min(1).max(160),
  heroHeadline: z.string().min(1).max(200),
  heroSupporting: z.string().min(1).max(800),
  heroPrimaryCtaLabel: z.string().min(1).max(80),
  heroPrimaryCtaHref: hrefSchema,
  heroSecondaryCtaLabel: z.string().min(1).max(80),
  heroSecondaryCtaHref: hrefSchema,
  heroMediaId: z.string().uuid().nullable(),
  welcomeEyebrow: z.string().min(1).max(80),
  welcomeHeading: z.string().min(1).max(200),
  welcomeBody: z.string().min(1).max(1200),
  welcomeMediaId: z.string().uuid().nullable(),
  prayerHeading: z.string().min(1).max(120),
  prayerVerse: z.string().min(1).max(400),
  prayerVerseReference: z.string().min(1).max(80),
  prayerBody: z.array(z.string().min(1).max(600)).min(1).max(6),
  prayerCtaLabel: z.string().min(1).max(80),
  prayerCtaHref: hrefSchema,
  givingHeading: z.string().min(1).max(120),
  givingVerse: z.string().min(1).max(400),
  givingVerseReference: z.string().min(1).max(80),
  givingCtaLabel: z.string().min(1).max(80),
  givingCtaHref: hrefSchema,
  sermonFallbackTitle: z.string().min(1).max(160),
  sermonFallbackDescription: z.string().min(1).max(600),
  sermonFallbackCtaLabel: z.string().min(1).max(80),
  sermonFallbackCtaHref: hrefSchema,
  sermonFallbackYoutubeUrl: z.string().min(1).max(400),
  sermonFallbackYoutubeLabel: z.string().min(1).max(120),
  featuredProgramId: z.string().uuid().nullable(),
  locationsHeading: z.string().min(1).max(160),
  locationsSupporting: z.string().min(1).max(400),
  spotlightTakeoverEnabled: z.boolean().default(false),
  spotlightTakeoverMode: z
    .enum(["once_per_browser", "once_per_session"])
    .default("once_per_browser"),
  spotlightPromoVideoUrl: optionalNullableString,
  spotlightWindowStart: optionalNullableString,
  spotlightWindowEnd: optionalNullableString,
});

export const homeDocumentSchema = homeDocumentBaseSchema.superRefine(
  (doc, ctx) => {
    if (doc.spotlightPromoVideoUrl) {
      const result = validateOptionalSocialUrl(doc.spotlightPromoVideoUrl);
      if (!result.ok || !result.url) {
        ctx.addIssue({
          code: "custom",
          path: ["spotlightPromoVideoUrl"],
          message: result.ok ? "Enter a full https:// URL." : result.error,
        });
        return;
      }
      try {
        const host = new URL(result.url).hostname.toLowerCase();
        const allowed =
          host.includes("youtube.") ||
          host === "youtu.be" ||
          host.includes("facebook.") ||
          host === "fb.watch" ||
          host === "www.fb.watch";
        if (!allowed) {
          ctx.addIssue({
            code: "custom",
            path: ["spotlightPromoVideoUrl"],
            message: "Promo video must be a YouTube or Facebook link.",
          });
        } else {
          doc.spotlightPromoVideoUrl = result.url;
        }
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["spotlightPromoVideoUrl"],
          message: "Enter a full https:// URL.",
        });
      }
    }
    for (const key of ["spotlightWindowStart", "spotlightWindowEnd"] as const) {
      const value = doc[key];
      if (value != null && Number.isNaN(Date.parse(value))) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Must be a valid date",
        });
      }
    }
  },
);

export const aboutDocumentSchema = z.object({
  whoWeAre: z.array(z.string().min(1).max(800)).min(1).max(6),
  vision: z.string().min(1).max(200),
  missionParagraphs: z.array(z.string().min(1).max(600)).min(1).max(8),
  leadershipName: z.string().min(1).max(160),
  leadershipRole: z.string().min(1).max(160),
  leadershipOrgLine: z.string().min(1).max(240),
  leadershipHeadquarters: z.string().min(1).max(160),
  leadershipPreview: z.string().min(1).max(600),
  portraitMediaId: z.string().uuid().nullable(),
  portraitAlt: z.string().min(1).max(200),
  bioParagraphs: z.array(z.string().min(1).max(1200)).min(1).max(12),
});

const offeringCtaSchema = z.object({
  label: z.string().min(1).max(80),
  href: hrefSchema,
});

export const servicesDocumentSchema = z.object({
  intro: z.string().min(1).max(800),
  cellTitle: z.string().min(1).max(120),
  cellBody: z.string().min(1).max(800),
  cellCta: offeringCtaSchema,
  teamsTitle: z.string().min(1).max(120),
  teamsBody: z.string().min(1).max(800),
  teamsCta: offeringCtaSchema,
  mediaTitle: z.string().min(1).max(120),
  mediaBody: z.string().min(1).max(800),
  careTitle: z.string().min(1).max(120),
  careBody: z.string().min(1).max(800),
  careLinks: z.array(linkSchema).min(1).max(12),
});

export const globalDocumentSchema = z.object({
  contactEmail: z.string().email().max(160),
  contactEmailLabel: z.string().min(1).max(80),
  contactPhoneDisplay: z.string().min(1).max(80),
  contactPhoneTel: z.string().min(1).max(40),
  contactIntro: z.string().min(1).max(600),
  dfrHeading: z.string().min(1).max(120),
  dfrBody: z.string().min(1).max(400),
  dfrSpotifyLabel: z.string().min(1).max(80),
  dfrSpotifyHref: z.string().url().max(400),
  livestreamHeading: z.string().min(1).max(120),
  livestreamNotLiveMessage: z.string().min(1).max(400),
  livestreamLiveMessage: z.string().min(1).max(400),
  socialLinks: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        href: z.string().url().max(400),
      }),
    )
    .max(12),
});

export const faqsDocumentSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        question: z.string().min(1).max(240),
        answerParagraphs: z.array(z.string().min(1).max(1200)).min(1).max(12),
        links: z.array(linkSchema).max(8).optional(),
      }),
    )
    .min(1)
    .max(20),
});

export const sermonsPageDocumentSchema = z.object({
  headline: z.string().min(1).max(240),
  sub: z.string().min(1).max(400),
  sectionTitle: z.string().min(1).max(120),
  emptyState: z.string().min(1).max(400),
  platforms: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        name: z.string().min(1).max(120),
        description: z.string().min(1).max(400),
        href: hrefSchema,
        external: z.boolean(),
      }),
    )
    .min(1)
    .max(12),
});

export type HomeDocument = z.infer<typeof homeDocumentSchema>;
export type AboutDocument = z.infer<typeof aboutDocumentSchema>;
export type ServicesDocument = z.infer<typeof servicesDocumentSchema>;
export type GlobalDocument = z.infer<typeof globalDocumentSchema>;
export type FaqsDocument = z.infer<typeof faqsDocumentSchema>;
export type SermonsPageDocument = z.infer<typeof sermonsPageDocumentSchema>;

export type WebsiteDocumentPayload =
  | HomeDocument
  | AboutDocument
  | ServicesDocument
  | GlobalDocument
  | FaqsDocument
  | SermonsPageDocument;
