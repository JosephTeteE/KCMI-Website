/**
 * Public privacy notice.
 * Notes for reviewers are not shown on the website.
 * Do not reintroduce legacy JWT / Drive / Sheets / reCAPTCHA claims.
 */
import type { LegalDocument } from "@/content/types";

export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  metaLine:
    "This notice describes how Kingdom Covenant Ministries International handles information on this website.",
  staleNotes: [
    "PRE-PRODUCTION HUMAN/LEGAL REVIEW REQUIRED. This is not a completed legal opinion.",
    "Do not invent statutory interpretations, consent language, or retention commitments.",
    "See docs/DATA_PROCESSING_INVENTORY.md and docs/PRIVACY_PREPRODUCTION_REVIEW.md.",
    "Automated Care retention enforcement remains a post-launch operations item after first-party Care launch.",
  ],
  sections: [
    {
      paragraphs: [
        "This notice describes how Kingdom Covenant Ministries International (KCMI) handles information on this website.",
      ],
    },
    {
      heading: "1. The services this notice covers",
      paragraphs: [
        "This notice covers the public KCMI website and the protected staff area used to publish the site and review requests.",
        "Separate event registration, where KCMI offers it, is outside this notice.",
      ],
    },
    {
      heading: "2. Information the public website collects",
      paragraphs: [
        "Browsing public pages sends ordinary technical request data to the application host (for example, IP address and pages requested, as processed by the hosting provider).",
        "The Contact page may collect a name, email address, optional phone number, topic, and message for general church enquiries (for example Cell Fellowship interest, service or volunteer interest, testimonies, or other office questions). Those messages are kept so authorized church staff can follow up. They are not published on the website or included in public site search.",
        "Giving pages display published bank details; they do not collect card payments on this site.",
      ],
    },
    {
      heading: "3. Prayer, Pastoral Care, and Welfare requests",
      paragraphs: [
        "Prayer, Pastoral Care, and Welfare requests may be submitted through the KCMI website when those online request forms are available.",
        "Those requests are kept within KCMI so authorized Care staff can review them. Care information is not shown on the public website.",
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
      heading: "5. Staff accounts",
      paragraphs: [
        "Church staff who maintain the website sign in to a protected staff area. Sensitive actions require an extra sign-in step. Staff information is kept so authorized people can publish public content, review Care requests, and keep a record of important actions.",
        "That staff area is not a public membership login.",
      ],
    },
    {
      heading: "6. Public content and images",
      paragraphs: [
        "Published page wording, sermon titles and YouTube links, branch addresses and service times, livestream links, and public photographs are kept for the website. Public photos are prepared for the web, and camera details embedded in those photos are removed on upload.",
        "Unpublished drafts are not shown on the public website.",
      ],
    },
    {
      heading: "7. What this platform does not currently do",
      paragraphs: [
        "This website keeps published church content, Care requests submitted through the site, general Contact messages for staff follow-up, and staff account information. It does not keep camp or event payment receipts, and these pages do not include public registration forms for camps or gatherings.",
        "Event registration, where offered, is handled outside these public pages.",
      ],
    },
    {
      heading: "8. Retention",
      paragraphs: [
        "This notice does not set automatic deletion for published website content, public photographs, staff activity records, Care requests, or Contact messages. Specific legal retention periods are not stated here.",
        "For general website enquiries, information is kept while follow-up is reasonably needed (commonly up to about 24 months after a request is closed), then reviewed for deletion under church practice.",
      ],
    },
    {
      heading: "9. Search indexing for non-production websites",
      paragraphs: [
        "Non-production copies of this website may be configured so search engines are asked not to index them.",
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
