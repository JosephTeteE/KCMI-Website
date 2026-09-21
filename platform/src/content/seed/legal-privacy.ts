/**
 * Factual public notice for the KCMI V2 platform.
 * PRE-PRODUCTION HUMAN/LEGAL REVIEW REQUIRED — staleNotes are not rendered.
 * Do not reintroduce legacy JWT / Drive / Sheets / reCAPTCHA claims.
 */
import type { LegalDocument } from "@/content/types";

export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  metaLine:
    "This notice describes how the current Kingdom Covenant Ministries International digital platform handles information.",
  staleNotes: [
    "PRE-PRODUCTION HUMAN/LEGAL REVIEW REQUIRED. This is not a completed legal opinion.",
    "Do not invent statutory interpretations, consent language, or retention commitments.",
    "See docs/DATA_PROCESSING_INVENTORY.md and docs/PRIVACY_PREPRODUCTION_REVIEW.md.",
    "Automated Care retention enforcement remains a post-launch operations item after first-party Care launch.",
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
        "It does not describe the separate camp registration site.",
      ],
    },
    {
      heading: "2. Information the public website collects",
      paragraphs: [
        "Browsing public pages sends ordinary technical request data to the application host (for example, IP address and pages requested, as processed by the hosting provider).",
        "The Contact page may collect a name, email address, optional phone number, topic, and message for general church enquiries (for example Cell Fellowship interest, service/volunteer interest, testimonies, or other office questions). Those submissions are stored in KCMI’s protected application database for Hub staff follow-up and are not published on the website or included in public site search.",
        "Giving pages display published bank details; they do not collect card payments on this site.",
      ],
    },
    {
      heading: "3. Prayer, Pastoral Care, and Welfare requests",
      paragraphs: [
        "Prayer, Pastoral Care, and Welfare requests may be submitted through the KCMI website when those online request forms are available.",
        "Those requests are stored within KCMI’s protected application and database systems. Access is limited to authorized KCMI personnel according to assigned Hub roles. Care information is not publicly displayed on the website.",
        "Please submit only the information needed for your request. These online request forms are not an emergency service. If you are in immediate danger, contact local emergency services.",
      ],
    },
    {
      heading: "4. Other outbound links",
      paragraphs: [
        "The site also links to third-party platforms for media and directions, including YouTube, Facebook, Instagram, X (Twitter), TikTok, Spotify, and Google Maps. Those services have their own policies. Some pages may name other broadcast or venue brands as plain text without linking to their websites.",
      ],
    },
    {
      heading: "5. Staff Hub accounts",
      paragraphs: [
        "Church staff who use the KCMI Hub sign in with Supabase Auth. High-sensitivity Hub actions require multi-factor authentication. The Hub stores staff profile and role information needed to publish public content, review Care requests when authorized, and record audit events for privileged actions.",
        "The Hub is not a public membership login.",
      ],
    },
    {
      heading: "6. Public content and images",
      paragraphs: [
        "Published page copy, sermon titles and YouTube links, branch addresses and service times, livestream Facebook links, and public marketing photographs are stored in Supabase. Marketing images are converted for the web; embedded camera metadata is stripped on upload.",
        "Unpublished drafts are not shown on the public website.",
      ],
    },
    {
      heading: "7. What this platform does not currently do",
      paragraphs: [
        "This platform stores published church content, Care request records submitted through the website, general Contact messages for Hub follow-up, and staff Hub records in Supabase. It does not store camp or event payment receipts on this site, and it does not operate public registration or bot-challenge widgets on these pages.",
        "Event registration remains outside this website’s public forms. The camp registration site remains a distinct system.",
      ],
    },
    {
      heading: "8. Retention",
      paragraphs: [
        "This platform does not currently run automatic deletion jobs for published website content, marketing images, Hub audit records, Care request records, or general website Contact messages. Specific statutory retention periods are not stated in this notice.",
        "Operational expectation for general website enquiries: keep records while follow-up is reasonably needed (commonly up to about 24 months after a request is closed), then review for deletion under church data-handling practice. Automated Care retention enforcement remains a planned post-launch operations item after first-party Care is enabled.",
      ],
    },
    {
      heading: "9. Search indexing on staging",
      paragraphs: [
        "Staging deployments of this platform are configured so search engines are asked not to index the site.",
      ],
    },
    {
      heading: "10. Contact",
      paragraphs: [
        "Questions about this notice or about personal information related to this website can be sent to Kingdom Covenant Ministries International at contact@kcmi-rcc.org.",
      ],
    },
  ],
};
