import type { LegalDocument } from "@/content/types";

/**
 * Factual public notice for the KCMI V2 platform.
 * PRE-PRODUCTION HUMAN/LEGAL REVIEW REQUIRED — staleNotes are not rendered.
 * Do not reintroduce legacy JWT / Drive / Sheets / reCAPTCHA claims.
 */
export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  metaLine:
    "This notice describes how the current Kingdom Covenant Ministries International digital platform handles information.",
  staleNotes: [
    "PRE-PRODUCTION HUMAN/LEGAL REVIEW REQUIRED. This is not a completed legal opinion.",
    "Do not invent statutory interpretations, consent language, or retention commitments.",
    "See docs/DATA_PROCESSING_INVENTORY.md and docs/PRIVACY_PREPRODUCTION_REVIEW.md.",
  ],
  sections: [
    {
      paragraphs: [
        "This notice describes how the current Kingdom Covenant Ministries International (KCMI) digital platform handles information. It replaces earlier website text that described a different, legacy technical system.",
      ],
    },
    {
      heading: "1. The services this notice covers",
      paragraphs: [
        "This notice covers the public KCMI website and the staff KCMI Hub operated as the V2 platform (a Next.js application hosted on Vercel, with Supabase used for authentication, database, and marketing-image storage).",
        "It does not describe the separate camp registration site, and it does not describe pastoral-care case files.",
      ],
    },
    {
      heading: "2. Information the public website collects",
      paragraphs: [
        "Browsing public pages sends ordinary technical request data to the application host (for example, IP address and pages requested, as processed by the hosting provider).",
        "This V2 website does not currently provide a first-party public contact form, newsletter signup, camp registration form, or payment-receipt upload. The Contact page uses email and telephone links. Giving pages display published bank details; they do not collect card payments on this site.",
      ],
    },
    {
      heading: "3. Google Forms and other outbound links",
      paragraphs: [
        "Some pages link to Google Forms that the ministry already uses for prayer, counselling, welfare, celebrations, cell fellowships, and service teams. If you submit those forms, Google and the ministry’s use of that form process the information — this website does not store those form responses.",
        "The site also links to third-party platforms for media and directions, including YouTube, Facebook, Instagram, X (Twitter), TikTok, Spotify, Silverbird Television’s website, and Google Maps. Those services have their own policies.",
      ],
    },
    {
      heading: "4. Staff Hub accounts",
      paragraphs: [
        "Church staff who use the KCMI Hub sign in with Supabase Auth. High-sensitivity Hub actions require multi-factor authentication. The Hub stores staff profile and role information needed to publish public content and to record audit events for privileged actions.",
        "The Hub is not a public membership login.",
      ],
    },
    {
      heading: "5. Public content and images",
      paragraphs: [
        "Published page copy, sermon titles and YouTube links, branch addresses and service times, livestream Facebook links, and public marketing photographs are stored in Supabase. Marketing images are converted for the web; embedded camera metadata is stripped on upload.",
        "Unpublished drafts are not shown on the public website.",
      ],
    },
    {
      heading: "6. What this platform does not currently do",
      paragraphs: [
        "This platform stores published church content and staff Hub records in Supabase. It does not store camp or event payment receipts on this site, and it does not operate first-party public registration or bot-challenge widgets on these pages.",
        "Event registration and pastoral-care case files are not part of this website. The camp registration site remains a distinct system.",
      ],
    },
    {
      heading: "7. Retention",
      paragraphs: [
        "This platform does not currently run automatic deletion jobs for published website content, marketing images, or Hub audit records. Specific retention periods are not stated in this notice.",
      ],
    },
    {
      heading: "8. Search indexing on staging",
      paragraphs: [
        "Staging deployments of this platform are configured so search engines are asked not to index the site.",
      ],
    },
    {
      heading: "9. Contact",
      paragraphs: [
        "Questions about this notice or about personal information related to this website can be sent to Kingdom Covenant Ministries International at contact@kcmi-rcc.org.",
      ],
    },
  ],
};
