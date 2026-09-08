import { BranchCard } from "@/components/content/branch-card";
import { BranchCountryGroups } from "@/components/content/branch-country-groups";
import { PageShell } from "@/components/layout/page-shell";
import { getBranches } from "@/content";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Locations",
  description:
    "Find Kingdom Covenant Ministries International branches, addresses, phones, and service times.",
  path: "/locations",
});

export default async function LocationsPage() {
  const branches = await getBranches();

  return (
    <PageShell
      eyebrow="Visit us"
      title="Our Locations"
      description="Find a KCMI branch near you, with addresses, phone numbers, and service times where they are available."
    >
      <BranchCountryGroups branches={branches}>
        {(branch) => <BranchCard branch={branch} />}
      </BranchCountryGroups>
    </PageShell>
  );
}
