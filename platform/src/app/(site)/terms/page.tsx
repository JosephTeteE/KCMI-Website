import { LegalDocumentView } from "@/components/content/legal-document-view";
import { PageShell } from "@/components/layout/page-shell";
import { getTermsOfService } from "@/content";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Terms of Service",
  description:
    "Terms of Service for the Kingdom Covenant Ministries International website.",
  path: "/terms",
});

export default function TermsPage() {
  const doc = getTermsOfService();
  return (
    <PageShell title={doc.title}>
      <LegalDocumentView doc={doc} />
    </PageShell>
  );
}
