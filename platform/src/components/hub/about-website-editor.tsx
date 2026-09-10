"use client";

import { HubCopyProposeForm } from "@/components/hub/hub-copy-propose-form";
import { HubHelpDetails } from "@/components/hub/hub-help-details";
import { HubPreviewFrame } from "@/components/hub/hub-preview-frame";
import { MarketingImageUploader } from "@/components/hub/marketing-image-uploader";
import { saveAboutDocument } from "@/app/admin/website/actions";
import { uploadWebsiteContextImage } from "@/app/admin/website/media-actions";
import type { PublicMediaRef } from "@/content/types";
import type { AboutDocument } from "@/content/website/schemas";
import { HUB_MEDIA_PLACEMENTS } from "@/lib/hub/placement-copy";

export function AboutWebsiteEditor({
  about,
  portrait,
}: {
  about: AboutDocument;
  portrait: PublicMediaRef;
}) {
  const hidden = {
    portraitMediaId: about.portraitMediaId ?? "",
  };

  return (
    <div className="space-y-12">
      <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
        <h2 className="text-lg font-semibold">
          {HUB_MEDIA_PLACEMENTS.aboutPortrait.title}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          {HUB_MEDIA_PLACEMENTS.aboutPortrait.where}
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          {HUB_MEDIA_PLACEMENTS.aboutPortrait.recommended}
        </p>
        <div className="grid gap-6 xl:grid-cols-2">
          <div data-hub-role="current">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Current photo
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={portrait.src}
              alt={portrait.alt || "Current Lead Pastor photo"}
              className="max-w-xs rounded-[var(--radius-md)] object-cover"
            />
          </div>
          <MarketingImageUploader
            action={uploadWebsiteContextImage}
            submitLabel="Replace Photo"
            defaultCropAspect="square"
            lockCropAspect
            placementTitle={HUB_MEDIA_PLACEMENTS.aboutPortrait.title}
            extraFields={
              <>
                <input type="hidden" name="document_key" value="about" />
                <input type="hidden" name="media_field" value="portraitMediaId" />
              </>
            }
          />
        </div>
      </section>

      <HubCopyProposeForm
        action={saveAboutDocument}
        what="About KCMI"
        where="The About KCMI page, including Who We Are, Vision, Mission, and the Lead Pastor story."
        hidden={hidden}
        extraHelp={
          <HubHelpDetails summary="What is this?">
            Keep vision and mission faithful to KCMI wording. Do not invent church
            history.
          </HubHelpDetails>
        }
        fields={[
          { id: "whoWeAre", label: "Who we are (one paragraph per line)", kind: "textarea", current: about.whoWeAre.join("\n"), rows: 6 },
          { id: "vision", label: "Vision", kind: "text", current: about.vision },
          { id: "missionParagraphs", label: "Mission (one paragraph per line)", kind: "textarea", current: about.missionParagraphs.join("\n"), rows: 6 },
          { id: "leadershipName", label: "Lead pastor name", kind: "text", current: about.leadershipName },
          { id: "leadershipRole", label: "Role", kind: "text", current: about.leadershipRole },
          { id: "leadershipOrgLine", label: "Organisation line", kind: "text", current: about.leadershipOrgLine },
          { id: "leadershipHeadquarters", label: "Headquarters", kind: "text", current: about.leadershipHeadquarters },
          { id: "leadershipPreview", label: "Short leadership introduction", kind: "textarea", current: about.leadershipPreview },
          { id: "portraitAlt", label: "Photo description for people who cannot see it", kind: "text", current: about.portraitAlt },
          { id: "bioParagraphs", label: "Full biography (one paragraph per line)", kind: "textarea", current: about.bioParagraphs.join("\n"), rows: 10 },
        ]}
        preview={(values, mode) => (
          <HubPreviewFrame title="About KCMI" live={mode === "live"}>
            <div className="space-y-4 p-6">
              <h3 className="font-display text-2xl font-semibold">Who we are</h3>
              <p className="whitespace-pre-wrap text-sm">{values.whoWeAre}</p>
              <h3 className="font-display text-xl font-semibold">Vision</h3>
              <p className="text-sm">{values.vision}</p>
              <h3 className="font-display text-xl font-semibold">Mission</h3>
              <p className="whitespace-pre-wrap text-sm">{values.missionParagraphs}</p>
              <p className="text-sm font-semibold">{values.leadershipName}</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {values.leadershipRole}
              </p>
            </div>
          </HubPreviewFrame>
        )}
      />
    </div>
  );
}
