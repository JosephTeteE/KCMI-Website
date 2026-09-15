import { CareTabs } from "@/components/hub/care-tabs";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { requireCareSession } from "@/lib/care/queries";
import { careDomainsForPermissions } from "@/lib/care/access";
import { humanAal2Required } from "@/lib/hub/humanize";

export default async function CareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await requireCareSession();
  if (!gate.ok) {
    return (
      <div>
        <HubPageHeader title="Care" />
        <p className="text-base text-[var(--color-text-muted)]">
          {gate.reason === "aal2_required"
            ? humanAal2Required()
            : "Your account cannot open Care requests. Ask a Pastoral Admin if you need access."}
        </p>
      </div>
    );
  }

  const domains = careDomainsForPermissions(gate.session.profile.permissions);

  return (
    <div>
      <CareTabs available={domains} />
      {children}
    </div>
  );
}
