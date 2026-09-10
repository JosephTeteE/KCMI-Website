"use client";

import { SermonCard } from "@/components/content/sermon-card";
import { HubCopyProposeForm } from "@/components/hub/hub-copy-propose-form";
import { HubHelpDetails } from "@/components/hub/hub-help-details";
import { HubPreviewFrame } from "@/components/hub/hub-preview-frame";
import { HubSubmitButton } from "@/components/hub/hub-form-fields";
import { setSermonStatus, updateSermon } from "@/app/admin/sermons/actions";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";
import {
  hubLifecycleActions,
  hubPreviewVariant,
  hubPublicationStateFromStatus,
} from "@/lib/hub/publication-copy";
import type { SermonPublic } from "@/content/types";

type SermonRecord = {
  id: string;
  title: string;
  speaker: string | null;
  sermon_date: string | null;
  scripture_reference: string | null;
  summary: string | null;
  youtube_url: string | null;
  thumbnail_media_id: string | null;
  home_featured: boolean;
  status: string;
};

type MediaOption = { id: string; label: string; publicUrl: string | null };

export function SermonEditor({
  sermon,
  media,
}: {
  sermon: SermonRecord;
  media: MediaOption[];
}) {
  const publicationState = hubPublicationStateFromStatus(sermon.status);
  const lifecycle = hubLifecycleActions(sermon.status);
  const liveLabel = lifecycle.makeLive
    ? "Save my sermon details"
    : HUB_ACTION_LABELS.makeChangesLive;

  return (
    <div className="space-y-12">
      <HubCopyProposeForm
        action={updateSermon}
        what="Sermon details"
        where="This listing appears on the Sermons page when the sermon is live."
        liveLabel={liveLabel}
        changeLabel={HUB_ACTION_LABELS.changeSermonDetails}
        publicationState={publicationState}
        hidden={{ id: sermon.id }}
        extraHelp={
          <HubHelpDetails summary="When does this become public?">
            {lifecycle.makeLive
              ? "Saving a draft does not show the sermon to visitors. Use Make this live on the website below when it is ready."
              : "This sermon is already on the Sermons page. Use Change these details to propose wording, then Make these changes live."}
          </HubHelpDetails>
        }
        fields={[
          { id: "title", label: "Title", kind: "text", current: sermon.title },
          { id: "speaker", label: "Speaker", kind: "text", current: sermon.speaker ?? "" },
          {
            id: "sermon_date",
            label: "Date",
            kind: "date",
            current: sermon.sermon_date ?? "",
          },
          {
            id: "scripture_reference",
            label: "Scripture reference",
            kind: "text",
            current: sermon.scripture_reference ?? "",
          },
          {
            id: "summary",
            label: "Summary",
            kind: "textarea",
            current: sermon.summary ?? "",
            rows: 4,
          },
          {
            id: "youtube_url",
            label: "YouTube link",
            kind: "text",
            current: sermon.youtube_url ?? "",
            hint: "Paste a youtube.com or youtu.be watch link. Do not paste embed code or upload a video file.",
          },
          {
            id: "thumbnail_media_id",
            label: "Thumbnail (optional)",
            kind: "select",
            current: sermon.thumbnail_media_id ?? "",
            options: media.map((item) => ({
              value: item.id,
              label: item.label,
            })),
          },
          {
            id: "home_featured",
            label: "Show this sermon on the homepage",
            kind: "checkbox",
            current: sermon.home_featured ? "on" : "",
          },
        ]}
        preview={(values, mode) => {
          const thumb = media.find((item) => item.id === values.thumbnail_media_id);
          const preview: SermonPublic = {
            id: sermon.id,
            title: values.title,
            speaker: values.speaker || null,
            sermonDate: values.sermon_date || null,
            scriptureReference: values.scripture_reference || null,
            summary: values.summary || null,
            youtubeUrl: values.youtube_url || null,
            thumbnailSrc: thumb?.publicUrl ?? null,
            thumbnailAlt: thumb?.label ?? "",
          };
          return (
            <HubPreviewFrame
              title="Sermons page listing"
              variant={hubPreviewVariant(publicationState, mode)}
            >
              <div className="p-4">
                <SermonCard sermon={preview} />
              </div>
            </HubPreviewFrame>
          );
        }}
      />

      <div className="max-w-2xl space-y-3 border-t border-[var(--color-border)] pt-8">
        <h2 className="text-lg font-semibold">
          {lifecycle.removeFromWebsite
            ? "This sermon is on the website"
            : "Publish this sermon"}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          {lifecycle.removeFromWebsite
            ? "Visitors can see it on the Sermons page. Change the details above, or remove it from the public website."
            : "This draft is not visible to website visitors yet. Making it live shows it on the Sermons page."}
        </p>
        <div className="flex flex-wrap gap-3">
          {lifecycle.saveDraft ? (
            <form action={setSermonStatus}>
              <input type="hidden" name="id" value={sermon.id} />
              <input type="hidden" name="status" value="draft" />
              <HubSubmitButton variant="quiet">{HUB_ACTION_LABELS.saveDraft}</HubSubmitButton>
            </form>
          ) : null}
          {lifecycle.markReadyForPreview ? (
            <form action={setSermonStatus}>
              <input type="hidden" name="id" value={sermon.id} />
              <input type="hidden" name="status" value="preview" />
              <HubSubmitButton variant="quiet">
                {HUB_ACTION_LABELS.markReadyForPreview}
              </HubSubmitButton>
            </form>
          ) : null}
          {lifecycle.makeLive ? (
            <form action={setSermonStatus}>
              <input type="hidden" name="id" value={sermon.id} />
              <input type="hidden" name="status" value="published" />
              <HubSubmitButton variant="secondary">
                {HUB_ACTION_LABELS.makeLive}
              </HubSubmitButton>
            </form>
          ) : null}
          {lifecycle.removeFromWebsite ? (
            <form action={setSermonStatus}>
              <input type="hidden" name="id" value={sermon.id} />
              <input type="hidden" name="status" value="archived" />
              <HubSubmitButton variant="danger">
                {HUB_ACTION_LABELS.removeFromWebsite}
              </HubSubmitButton>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
