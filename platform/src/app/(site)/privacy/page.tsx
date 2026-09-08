import { LegalDocumentView } from "@/components/content/legal-document-view";
import { PageShell } from "@/components/layout/page-shell";
import { getPrivacyPolicy } from "@/content";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Privacy Policy",
  description:
    "Privacy Policy for Kingdom Covenant Ministries International websites and related services.",
  path: "/privacy",
});

export default function PrivacyPage() {
  const doc = getPrivacyPolicy();
  return (
    <PageShell title={doc.title}>
      <LegalDocumentView doc={doc} />
    </PageShell>
  );
}
