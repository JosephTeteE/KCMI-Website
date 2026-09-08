import type { LegalDocument } from "@/content/types";

/**
 * Faithful migration from public/privacy-policy.html (Effective Date: June 30, 2025).
 * Formatting cleaned; legal meaning not rewritten.
 * staleNotes are for pre-production counsel review only — not rendered on the public page.
 */
export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  metaLine: "Effective Date: June 30, 2025",
  staleNotes: [
    "PRE-PRODUCTION LEGAL REVIEW REQUIRED before KCMI V2 production. Do not treat this seed as an accurate description of the V2 stack.",
    "Contact email in this policy is contact@kcmi-rcc.org, which differs from the public contact Gmail on the Contact page.",
    "Section 'Information for Camp and Event Registrations' describes Google Sheet capture and Google Drive receipt storage (legacy). V2 target is Hub + private storage (ADR-0004); runtime camp receipts also historically used Cloudinary (Phase 0 inventory).",
    "Section 3 (Google API Services) describes Drive, Sheets, Calendar, and Gmail APIs used by the legacy site.",
    "Sections 3–5 describe JWT admin console access, 1-minute JWT expiry, and livestream embed-code management from the legacy admin. V2 Hub uses Supabase Auth with MFA (AAL2) (ADR-0003).",
    "Section 5 names reCAPTCHA v2/v3 on forms. V2 public-bot protection is Turnstile (ADR-0005) where forms exist.",
    "Youth camp / events platform wording still refers to the legacy camp stack that V2 events hosting is intended to replace (ADR-0002) — not yet in production.",
  ],
  sections: [
    {
      paragraphs: [
        "At Kingdom Covenant Ministries International (KCMI), we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website https://kcmi-rcc.org and any of its subdomains, including our youth camp platform and other services.",
      ],
    },
    {
      heading: "1. Information We Collect",
      paragraphs: [
        "We may collect personal information that you voluntarily provide to us when you:",
      ],
      bullets: [
        "Register for events or camps",
        "Submit forms or contact us",
        "Make donations or payments",
        "Subscribe to our communications",
      ],
    },
    {
      heading: "Information for Camp and Event Registrations",
      paragraphs: [
        "When you register for an event such as our Youth Camp, we collect information necessary for the registration, including your name, contact details, number of attendees, and payment receipt. This data is processed as follows:",
      ],
      bullets: [
        "Registration details (name, email, phone number) are automatically recorded in a secure Google Sheet owned by the ministry for administrative purposes.",
        "Uploaded payment receipts are stored securely in a restricted Google Drive folder accessible only to authorized ministry administrators.",
        "We retain this registration data for up to 12 months after the event for record-keeping purposes.",
      ],
    },
    {
      paragraphs: [
        "We also automatically collect certain technical information when you visit our website:",
      ],
      bullets: [
        "Log data (IP address, browser type, pages visited)",
        "Cookies and similar tracking technologies",
        "Google reCAPTCHA responses (to prevent spam and abuse)",
      ],
    },
    {
      heading: "2. How We Use Your Information",
      paragraphs: [
        "We use the information we collect for various purposes, including:",
      ],
      bullets: [
        "To provide and maintain our services",
        "To process event registrations and donations",
        "To communicate with you (confirmations, updates, newsletters)",
        "To improve our website and services",
        "To prevent fraud and ensure security",
        "To comply with legal obligations",
      ],
    },
    {
      heading: "3. Google API Services",
      paragraphs: [
        "We use Google APIs with restricted service accounts for ministry operations:",
      ],
      bullets: [
        "Drive API: Securely store payment receipts (admin access only)",
        "Sheets API: Manage registration data in spreadsheets",
        "Calendar API: Display public event schedules (read-only)",
        "Gmail API: Send automated email confirmations",
      ],
    },
    {
      paragraphs: ["Access is controlled through:"],
      bullets: [
        "JWT authentication for admin console",
        "Limited API scopes (no full account access)",
        "Service accounts instead of user OAuth",
      ],
    },
    {
      heading: "4. Admin Controls",
      paragraphs: ["Administrative access features:"],
      bullets: [
        "JWT-secured admin console",
        "Livestream embed code management",
        "Registration data viewing (no editing of financial records)",
        "Automatic session expiration",
      ],
    },
    {
      heading: "5. Data Security",
      paragraphs: [
        "We implement multiple security layers:",
      ],
      bullets: [
        "JWT authentication with 1-minute expiry for admin access",
        "reCAPTCHA v2/v3 on all forms",
        "Payment receipts encrypted in Google Drive",
        "HTTPS for all data transfers",
        "Regular security audits",
      ],
    },
    {
      paragraphs: [
        "Uploaded files are stored securely in our Google Drive, accessible only to authorized administrators.",
      ],
    },
    {
      heading: "6. Data Retention",
      paragraphs: ["We retain data based on operational needs:"],
      bullets: [
        "Active use: Camp data kept for 1 year post-event",
        "Financial records: Payment receipts retained for 2 years",
        "Contact forms: Deleted after 6 months",
      ],
    },
    {
      paragraphs: [
        "You may request deletion of your data at any time by contacting us.",
      ],
    },
    {
      heading: "7. Your Rights and Choices",
      paragraphs: [
        "You have certain rights regarding your personal information:",
      ],
      bullets: [
        "Access: Request a copy of your data",
        "Correction: Update or correct inaccurate information",
        "Deletion: Request deletion of your data",
        "Opt-out: Unsubscribe from communications",
        "Restriction: Limit how we use your information",
      ],
    },
    {
      paragraphs: [
        "To exercise these rights, please contact us using the information below.",
      ],
    },
    {
      heading: "8. Children's Privacy",
      paragraphs: [
        "Our services are not directed to children under 13. We do not knowingly collect personal information from children under 13 without parental consent. If we become aware that we have collected personal information from a child without verification of parental consent, we will take steps to remove that information.",
      ],
    },
    {
      heading: "9. Links to Other Websites",
      paragraphs: [
        "Our Service may contain links to other websites that are not operated by us, such as YouTube, TikTok, and Google Forms for various requests. If you click on a third-party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.",
      ],
    },
    {
      heading: "10. Changes to This Policy",
      paragraphs: [
        "We may update this Privacy Policy periodically. We will notify you of any changes by posting the new policy on this page and updating the effective date. We encourage you to review this policy regularly.",
      ],
    },
    {
      heading: "11. Contact Us",
      paragraphs: [
        "If you have questions about this Privacy Policy or your personal information, please contact us:",
        "Kingdom Covenant Ministries International (KCMI)",
        "Email: contact@kcmi-rcc.org",
        "Website: https://kcmi-rcc.org",
      ],
    },
  ],
};
