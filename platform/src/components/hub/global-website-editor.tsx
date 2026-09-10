"use client";

import { HubCopyProposeForm } from "@/components/hub/hub-copy-propose-form";
import { HubHelpDetails } from "@/components/hub/hub-help-details";
import { HubPreviewFrame } from "@/components/hub/hub-preview-frame";
import { saveGlobalDocument } from "@/app/admin/website/actions";
import type { GlobalDocument } from "@/content/website/schemas";

export function GlobalWebsiteEditor({ global }: { global: GlobalDocument }) {
  const socialRows = [...global.socialLinks];
  while (socialRows.length < 6) socialRows.push({ label: "", href: "" });

  return (
    <HubCopyProposeForm
      action={saveGlobalDocument}
      what="Information shown across the website"
      where="Contact details, the bottom of every page, Daily Faith Recharge, and livestream visitor messages."
      extraHelp={
        <HubHelpDetails summary="What is this?">
          This is not a hidden settings page. It is the email, phone, social
          buttons, and livestream wording visitors see in more than one place.
        </HubHelpDetails>
      }
      fields={[
        { id: "contactEmail", label: "Public email", kind: "text", current: global.contactEmail },
        { id: "contactEmailLabel", label: "Email label", kind: "text", current: global.contactEmailLabel },
        { id: "contactPhoneDisplay", label: "Phone as visitors should read it", kind: "text", current: global.contactPhoneDisplay },
        { id: "contactPhoneTel", label: "Phone for tapping to call", kind: "text", current: global.contactPhoneTel },
        { id: "contactIntro", label: "Contact page introduction", kind: "textarea", current: global.contactIntro },
        { id: "dfrHeading", label: "Daily Faith Recharge heading", kind: "text", current: global.dfrHeading },
        { id: "dfrBody", label: "Daily Faith Recharge message", kind: "textarea", current: global.dfrBody },
        { id: "dfrSpotifyLabel", label: "Spotify button label", kind: "text", current: global.dfrSpotifyLabel },
        { id: "dfrSpotifyHref", label: "Spotify link", kind: "text", current: global.dfrSpotifyHref },
        { id: "livestreamHeading", label: "Livestream page heading", kind: "text", current: global.livestreamHeading },
        { id: "livestreamNotLiveMessage", label: "Message when we are not live", kind: "textarea", current: global.livestreamNotLiveMessage },
        { id: "livestreamLiveMessage", label: "Message when we are live", kind: "textarea", current: global.livestreamLiveMessage },
        ...socialRows.flatMap((item, index) => [
          { id: `socialLabel${index}`, label: `Social button ${index + 1} name`, kind: "text" as const, current: item.label },
          { id: `socialHref${index}`, label: `Social button ${index + 1} link`, kind: "text" as const, current: item.href },
        ]),
      ]}
      preview={(values, mode) => (
        <HubPreviewFrame title="Bottom of every page / contact" live={mode === "live"}>
          <div className="space-y-3 p-6 text-sm">
            <p>{values.contactIntro}</p>
            <p>{values.contactEmailLabel}: {values.contactEmail}</p>
            <p>{values.contactPhoneDisplay}</p>
            <p className="font-semibold">{values.dfrHeading}</p>
            <p>{values.dfrBody}</p>
          </div>
        </HubPreviewFrame>
      )}
    />
  );
}
