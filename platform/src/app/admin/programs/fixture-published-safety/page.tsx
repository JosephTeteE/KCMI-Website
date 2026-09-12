import { notFound } from "next/navigation";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { ProgramWizard } from "@/components/hub/program-create-wizard";
import { wizardScheduleFromDays } from "@/lib/programs/wizard-state";

/**
 * Local-only synthetic fixture for D1.8.1 published edit safety evidence.
 * Enabled only when KCMI_ALLOW_QA_FIXTURES=1. Never used in production deploy.
 */
export default function PublishedProgramSafetyFixturePage() {
  if (process.env.KCMI_ALLOW_QA_FIXTURES !== "1") {
    notFound();
  }

  const schedule = wizardScheduleFromDays([
    {
      sessionDate: "2026-12-01",
      sessions: [{ startTime: "09:00", endTime: "11:00", label: "" }],
    },
  ]);

  return (
    <div>
      <HubPageHeader
        title="Published safety fixture"
        description="Synthetic published Program for Change → Preview → Make live evidence."
        backHref="/admin/programs"
        backLabel="Programs"
      />
      <ProgramWizard
        mode="edit"
        branches={[]}
        media={[]}
        canPublish
        initial={{
          id: "00000000-0000-4000-8000-000000000099",
          title: "Published safety fixture",
          shortDescription: "Local fixture — not a real Program.",
          featuredMediaId: null,
          posterPreviewUrl: null,
          posterAlt: null,
          schedule,
          locationKind: "online",
          locationBranchId: "",
          locationLabel: "Online",
          actionKind: "none",
          ctaUrl: "",
          placement: "none",
          status: "published",
          timezone: "Africa/Lagos",
        }}
      />
    </div>
  );
}
