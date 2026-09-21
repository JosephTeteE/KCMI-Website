"use client";

import { HubCopyProposeForm } from "@/components/hub/hub-copy-propose-form";
import { HubHelpDetails } from "@/components/hub/hub-help-details";
import { HubPreviewFrame } from "@/components/hub/hub-preview-frame";
import { saveSermonsPageDocument } from "@/app/admin/website/actions";
import type { SermonsPageDocument } from "@/content/website/schemas";

export function SermonsPageWebsiteEditor({
  page,
}: {
  page: SermonsPageDocument;
}) {
  const platforms = [...page.platforms];
  while (platforms.length < 4) {
    platforms.push({
      id: "",
      name: "",
      description: "",
      href: "",
      external: false,
    });
  }

  const hidden: Record<string, string> = {};
  const platformFields = platforms.flatMap((platform, index) => {
    hidden[`platformId${index}`] = platform.id;
    return [
      { id: `platformName${index}`, label: `Watch option ${index + 1} name`, kind: "text" as const, current: platform.name },
      { id: `platformDescription${index}`, label: `Watch option ${index + 1} description`, kind: "textarea" as const, current: platform.description },
      { id: `platformHref${index}`, label: `Watch option ${index + 1} link (optional — leave blank for plain text)`, kind: "text" as const, current: platform.href },
    ];
  });

  return (
    <HubCopyProposeForm
      action={saveSermonsPageDocument}
      what="Sermons page wording"
      where="The Sermons page headline and the watch-on-YouTube / Facebook cards. Individual sermon rows are edited under Sermons."
      hidden={hidden}
      extraHelp={
        <HubHelpDetails summary="What is this?">
          Do not publish a service time unless a person has confirmed it.
        </HubHelpDetails>
      }
      fields={[
        { id: "headline", label: "Page title", kind: "text", current: page.headline },
        { id: "sub", label: "Supporting message", kind: "textarea", current: page.sub },
        { id: "sectionTitle", label: "Watch options heading", kind: "text", current: page.sectionTitle },
        { id: "emptyState", label: "Message when no sermons are listed yet", kind: "textarea", current: page.emptyState },
        ...platformFields,
      ]}
      preview={(values, mode) => (
        <HubPreviewFrame title="Sermons page" live={mode === "live"}>
          <div className="space-y-3 p-6">
            <h3 className="font-display text-2xl font-semibold">{values.headline}</h3>
            <p className="text-sm">{values.sub}</p>
            <h4 className="font-semibold">{values.sectionTitle}</h4>
            <p className="text-sm text-[var(--color-text-muted)]">{values.emptyState}</p>
          </div>
        </HubPreviewFrame>
      )}
    />
  );
}
