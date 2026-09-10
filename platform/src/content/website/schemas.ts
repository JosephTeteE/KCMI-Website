import { z } from "zod";

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

export const homeDocumentSchema = z.object({
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
});

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
