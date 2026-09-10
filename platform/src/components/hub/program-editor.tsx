"use client";

import Link from "next/link";
import { FeaturedProgramSection } from "@/components/home/featured-program-section";
import { HubCopyProposeForm } from "@/components/hub/hub-copy-propose-form";
import { HubHelpDetails } from "@/components/hub/hub-help-details";
import { HubPreviewFrame } from "@/components/hub/hub-preview-frame";
import { HubSelectField, HubSubmitButton } from "@/components/hub/hub-form-fields";
import { MarketingImageUploader } from "@/components/hub/marketing-image-uploader";
import {
  setProgramStatus,
  updateProgram,
  uploadProgramCover,
} from "@/app/admin/programs/actions";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";
import { HUB_MEDIA_PLACEMENTS } from "@/lib/hub/placement-copy";
import {
  hubLifecycleActions,
  hubPreviewVariant,
  hubPublicationStateFromStatus,
} from "@/lib/hub/publication-copy";
import type { FeaturedProgram } from "@/content/types";

type ProgramRecord = {
  id: string;
  title: string;
  short_description: string;
  body_text: string;
  starts_at: string;
  ends_at: string;
  cta_label: string;
  cta_url: string;
  placement: string;
  featured_media_id: string;
  status: string;
};

type MediaOption = { id: string; label: string };

export function ProgramEditor({
  program,
  media,
  canPublish,
  coverPreview,
}: {
  program: ProgramRecord;
  media: MediaOption[];
  canPublish: boolean;
  coverPreview: FeaturedProgram | null;
}) {
  const publicationState = hubPublicationStateFromStatus(program.status);
  const lifecycle = hubLifecycleActions(program.status);
  const liveLabel = lifecycle.makeLive
    ? "Save my program details"
    : HUB_ACTION_LABELS.makeChangesLive;

  return (
    <div className="space-y-12">
      <p>
        <Link
          href={`/admin/programs/${program.id}/preview`}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
        >
          Preview this program
        </Link>
      </p>

      <HubCopyProposeForm
        action={updateProgram}
        what="Program details"
        where="Programs appear on the website when they are live. The homepage featured card only shows if this program is featured and live."
        liveLabel={liveLabel}
        changeLabel={HUB_ACTION_LABELS.changeSermonDetails}
        publicationState={publicationState}
        hidden={{
          id: program.id,
          placement: program.placement,
          featured_media_id: program.featured_media_id,
        }}
        extraHelp={
          <HubHelpDetails summary="When does this become public?">
            {lifecycle.makeLive
              ? "Saving details does not by itself put a draft on the website. Use Make this live on the website below when it is ready."
              : "This program is already on the website. Use Change these details to propose wording, then Make these changes live."}
          </HubHelpDetails>
        }
        fields={[
          { id: "title", label: "Title", kind: "text", current: program.title },
          { id: "short_description", label: "Short description", kind: "textarea", current: program.short_description, rows: 3 },
          { id: "body_text", label: "Full details", kind: "textarea", current: program.body_text, rows: 6 },
          { id: "starts_at", label: "Starts", kind: "text", current: program.starts_at },
          { id: "ends_at", label: "Ends", kind: "text", current: program.ends_at },
          { id: "cta_label", label: "Button visitors can click", kind: "text", current: program.cta_label },
          { id: "cta_url", label: "Button destination", kind: "text", current: program.cta_url },
        ]}
        preview={(values, mode) => (
          <HubPreviewFrame
            title="Program card"
            variant={hubPreviewVariant(publicationState, mode)}
          >
            <FeaturedProgramSection
              program={{
                id: program.id,
                title: values.title,
                shortDescription: values.short_description,
                datesLabel: values.starts_at || null,
                imageSrc: coverPreview?.imageSrc ?? null,
                imageAlt: coverPreview?.imageAlt ?? "",
                ctaLabel: values.cta_label || "Learn more",
                ctaHref: values.cta_url || "#",
                placement: "featured",
                status: "published",
              }}
            />
          </HubPreviewFrame>
        )}
      />

      <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
        <h2 className="text-lg font-semibold">{HUB_MEDIA_PLACEMENTS.programPoster.title}</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          {HUB_MEDIA_PLACEMENTS.programPoster.where}
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          {HUB_MEDIA_PLACEMENTS.programPoster.recommended}
        </p>
        <div className="grid gap-6 xl:grid-cols-2">
          <div data-hub-role="current">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Current photo
            </p>
            {coverPreview?.imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverPreview.imageSrc}
                alt={coverPreview.imageAlt || "Current program poster"}
                className="w-full rounded-[var(--radius-md)] object-cover"
              />
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                No poster photo yet.
              </p>
            )}
          </div>
          <MarketingImageUploader
            action={uploadProgramCover}
            submitLabel="Replace Photo"
            defaultCropAspect="card"
            lockCropAspect
            placementTitle={HUB_MEDIA_PLACEMENTS.programPoster.title}
            extraFields={
              <input type="hidden" name="program_id" value={program.id} />
            }
          />
        </div>
        {media.length > 0 ? (
          <form action={updateProgram} className="space-y-3">
            <input type="hidden" name="id" value={program.id} />
            <input type="hidden" name="title" value={program.title} />
            <input type="hidden" name="short_description" value={program.short_description} />
            <input type="hidden" name="body_text" value={program.body_text} />
            <input type="hidden" name="starts_at" value={program.starts_at} />
            <input type="hidden" name="ends_at" value={program.ends_at} />
            <input type="hidden" name="cta_label" value={program.cta_label} />
            <input type="hidden" name="cta_url" value={program.cta_url} />
            <input type="hidden" name="placement" value={program.placement} />
            <HubSelectField
              id="featured_media_id"
              label="Or choose a photo already in the library"
              defaultValue={program.featured_media_id}
            >
              <option value="">No photo</option>
              {media.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </HubSelectField>
            <HubSubmitButton variant="quiet">Use this library photo</HubSubmitButton>
          </form>
        ) : null}
      </section>

      <div className="max-w-2xl space-y-3 border-t border-[var(--color-border)] pt-8">
        <h2 className="text-lg font-semibold">
          {lifecycle.removeFromWebsite
            ? "This program is on the website"
            : lifecycle.restoreDraft
              ? "This program was removed"
              : "Publish this program"}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          {lifecycle.removeFromWebsite
            ? "Visitors can see it. Change the details above, or remove it from the public website."
            : lifecycle.restoreDraft
              ? "It is not visible to website visitors."
              : "This draft is not visible to website visitors yet. Making it live shows it to visitors."}
        </p>
        <div className="flex flex-wrap gap-3">
          {lifecycle.saveDraft ? (
            <form action={setProgramStatus}>
              <input type="hidden" name="id" value={program.id} />
              <input type="hidden" name="status" value="draft" />
              <HubSubmitButton variant="quiet">{HUB_ACTION_LABELS.saveDraft}</HubSubmitButton>
            </form>
          ) : null}
          {lifecycle.markReadyForPreview ? (
            <form action={setProgramStatus}>
              <input type="hidden" name="id" value={program.id} />
              <input type="hidden" name="status" value="preview" />
              <HubSubmitButton variant="quiet">
                {HUB_ACTION_LABELS.markReadyForPreview}
              </HubSubmitButton>
            </form>
          ) : null}
          {canPublish && lifecycle.makeLive ? (
            <form action={setProgramStatus}>
              <input type="hidden" name="id" value={program.id} />
              <input type="hidden" name="status" value="published" />
              <HubSubmitButton variant="secondary">
                {HUB_ACTION_LABELS.makeLive}
              </HubSubmitButton>
            </form>
          ) : null}
          {canPublish && lifecycle.removeFromWebsite ? (
            <form action={setProgramStatus}>
              <input type="hidden" name="id" value={program.id} />
              <input type="hidden" name="status" value="archived" />
              <HubSubmitButton variant="danger">
                {HUB_ACTION_LABELS.removeFromWebsite}
              </HubSubmitButton>
            </form>
          ) : null}
          {canPublish && lifecycle.restoreDraft ? (
            <form action={setProgramStatus}>
              <input type="hidden" name="id" value={program.id} />
              <input type="hidden" name="status" value="draft" />
              <HubSubmitButton variant="quiet">{HUB_ACTION_LABELS.restoreDraft}</HubSubmitButton>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
