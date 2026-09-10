import { LegalDocumentView } from "@/components/content/legal-document-view";
import { PageShell } from "@/components/layout/page-shell";
import { getPrivacyPolicy } from "@/content";
import { isStagingEnvironment } from "@/lib/env";
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
      {isStagingEnvironment() ? (
        <p className="mb-6 text-readable-sm text-[var(--color-text-muted)]">
          Staging website
        </p>
      ) : null}
      <LegalDocumentView doc={doc} />
    </PageShell>
  );
}
