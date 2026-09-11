import { LocationsFinder } from "@/components/content/locations-finder";
import { PageShell } from "@/components/layout/page-shell";
import { getBranches } from "@/content";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Locations",
  description:
    "Find Kingdom Covenant Ministries International branches across Nigeria, Ghana, and Togo.",
  path: "/locations",
});

export default async function LocationsPage() {
  const branches = await getBranches();

  return (
    <PageShell
      eyebrow="Visit us"
      title="Our Locations"
      description="Find a KCMI branch near you."
    >
      <LocationsFinder branches={branches} />
    </PageShell>
  );
}
