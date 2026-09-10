import type { LegalDocument } from "@/content/types";

/**
 * Faithful migration from public/terms-of-service.html (Last Updated: July 16, 2025).
 * Legal meaning not rewritten. staleNotes are for pre-production counsel review only.
 */
export const termsOfService: LegalDocument = {
  title: "Terms of Service",
  metaLine: "Last Updated: July 16, 2025",
  staleNotes: [
    "PRE-PRODUCTION LEGAL REVIEW REQUIRED before KCMI V2 production. Public wording is the July 16, 2025 legacy Terms, formatted only.",
    "Section 9 contact email is contact@kcmi-rcc.org, matching the current public Contact identity. Confirm before production cutover.",
    "Section 1 website URL is https://kcmi-rcc.org. Confirm whether V2 public canonical host (www vs apex) should be named after cutover.",
    "Section 4 third-party examples (YouTube, TikTok, Google Forms) still match current public outbound links; counsel should confirm this remains accurate at cutover.",
  ],
  sections: [
    {
      heading: "1. Introduction",
      paragraphs: [
        'Welcome to Kingdom Covenant Ministries International ("KCMI", "we", "our", "us"). These Terms of Service ("Terms") govern your use of our website located at https://kcmi-rcc.org (the "Service"). By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.',
      ],
    },
    {
      heading: "2. Use of Our Service",
      paragraphs: [
        "You agree to use our Service only for lawful purposes. You must not use our Service in any way that is unlawful, fraudulent, or harmful, or in connection with any unlawful, fraudulent, or harmful purpose or activity. This includes refraining from submitting spam or malicious content through our forms.",
      ],
    },
    {
      heading: "3. Intellectual Property",
      paragraphs: [
        "The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of KCMI and its licensors. Our content is protected by copyright and other laws. Our trademarks may not be used in connection with any product or service without the prior written consent of KCMI.",
      ],
    },
    {
      heading: "4. Links To Other Web Sites",
      paragraphs: [
        "Our Service may contain links to third-party web sites or services that are not owned or controlled by KCMI, such as YouTube, TikTok, and Google Forms. KCMI has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third-party web sites or services. You further acknowledge and agree that KCMI shall not be responsible or liable, directly or indirectly, for any damage or loss caused or alleged to be caused by or in connection with use of or reliance on any such content, goods or services available on or through any such web sites or services.",
      ],
    },
    {
      heading: "5. Disclaimer",
      paragraphs: [
        'Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement or course of performance.',
      ],
    },
    {
      heading: "6. Limitation Of Liability",
      paragraphs: [
        "In no event shall KCMI, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.",
      ],
    },
    {
      heading: "7. Governing Law",
      paragraphs: [
        "These Terms shall be governed and construed in accordance with the laws of Nigeria, without regard to its conflict of law provisions.",
      ],
    },
    {
      heading: "8. Changes",
      paragraphs: [
        "We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms of Service on this page.",
      ],
    },
    {
      heading: "9. Contact Us",
      paragraphs: [
        "If you have any questions about these Terms, please contact us at contact@kcmi-rcc.org.",
      ],
    },
  ],
};
