"use client";

import { HubCopyProposeForm } from "@/components/hub/hub-copy-propose-form";
import { HubHelpDetails } from "@/components/hub/hub-help-details";
import { HubPreviewFrame } from "@/components/hub/hub-preview-frame";
import { saveServicesDocument } from "@/app/admin/website/actions";
import type { ServicesDocument } from "@/content/website/schemas";

export function ServicesWebsiteEditor({ services }: { services: ServicesDocument }) {
  const care = [...services.careLinks];
  while (care.length < 3) care.push({ label: "", href: "", external: false });

  return (
    <HubCopyProposeForm
      action={saveServicesDocument}
      what="Ministries and care"
      where="The Services page — cell fellowships, service teams, sermons, care, and testimonies."
      extraHelp={
        <HubHelpDetails summary="What is this?">
          Care buttons should point to /prayer, /pastoral-care, and /welfare.
          Cell fellowships and service teams should point to /contact. Do not use
          Google Forms.
        </HubHelpDetails>
      }
      fields={[
        { id: "intro", label: "Page introduction", kind: "textarea", current: services.intro },
        { id: "cellTitle", label: "Cell fellowships heading", kind: "text", current: services.cellTitle },
        { id: "cellBody", label: "Cell fellowships message", kind: "textarea", current: services.cellBody },
        { id: "cellCtaLabel", label: "Cell fellowships button visitors can click", kind: "text", current: services.cellCta.label },
        { id: "cellCtaHref", label: "Cell fellowships button destination", kind: "text", current: services.cellCta.href },
        { id: "teamsTitle", label: "Service teams heading", kind: "text", current: services.teamsTitle },
        { id: "teamsBody", label: "Service teams message", kind: "textarea", current: services.teamsBody },
        { id: "teamsCtaLabel", label: "Service teams button visitors can click", kind: "text", current: services.teamsCta.label },
        { id: "teamsCtaHref", label: "Service teams button destination", kind: "text", current: services.teamsCta.href },
        { id: "mediaTitle", label: "Sermons section heading", kind: "text", current: services.mediaTitle },
        { id: "mediaBody", label: "Sermons section message", kind: "textarea", current: services.mediaBody },
        { id: "careTitle", label: "Care section heading", kind: "text", current: services.careTitle },
        { id: "careBody", label: "Care section message", kind: "textarea", current: services.careBody },
        ...care.slice(0, 3).flatMap((link, index) => [
          { id: `careLabel${index}`, label: `Care button ${index + 1} label`, kind: "text" as const, current: link.label },
          { id: `careHref${index}`, label: `Care button ${index + 1} destination`, kind: "text" as const, current: link.href },
        ]),
        { id: "testimoniesTitle", label: "Testimonies heading", kind: "text", current: services.testimoniesTitle },
        { id: "testimoniesBody", label: "Testimonies message", kind: "textarea", current: services.testimoniesBody },
        { id: "testimoniesCtaLabel", label: "Testimonies button label", kind: "text", current: services.testimoniesCta.label },
        { id: "testimoniesCtaHref", label: "Testimonies button destination", kind: "text", current: services.testimoniesCta.href },
      ]}
      preview={(values, mode) => (
        <HubPreviewFrame title="Services page" live={mode === "live"}>
          <div className="space-y-4 p-6">
            <p className="text-sm">{values.intro}</p>
            <h3 className="font-display text-xl font-semibold">{values.cellTitle}</h3>
            <p className="text-sm">{values.cellBody}</p>
            <h3 className="font-display text-xl font-semibold">{values.teamsTitle}</h3>
            <p className="text-sm">{values.teamsBody}</p>
            <h3 className="font-display text-xl font-semibold">{values.careTitle}</h3>
            <p className="text-sm">{values.careBody}</p>
            <h3 className="font-display text-xl font-semibold">{values.testimoniesTitle}</h3>
            <p className="text-sm">{values.testimoniesBody}</p>
          </div>
        </HubPreviewFrame>
      )}
    />
  );
}
