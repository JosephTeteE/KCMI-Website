"use client";

import { useState } from "react";
import { HubSubmitButton } from "@/components/hub/hub-form-fields";
import { MarketingImageUploader } from "@/components/hub/marketing-image-uploader";
import {
  MediaChooser,
  type MediaChooserItem,
} from "@/components/hub/media-chooser";
import { ratioForCrop, type CropAspectId } from "@/lib/cms/image-crop";
import { HUB_ACTION_LABELS } from "@/lib/hub/action-labels";
import { canMakePhotoAssignmentLive } from "@/lib/hub/media-label";

/** A photo already on the public surface. Library ids are not needed to show it. */
export type ContextualPhotoRef = {
  src: string;
  alt: string;
};

/** A photo the operator has chosen or uploaded but not yet made live. */
export type ContextualPhotoSelection = MediaChooserItem;

export type ContextualPhotoSource = "upload" | "library";

type Props = {
  title: string;
  where: string;
  recommended: string;
  cropAspect: CropAspectId;
  current: ContextualPhotoRef | null;
  /** Library id of the live photo, when the surface knows it. Blocks re-publishing the same photo. */
  currentMediaId?: string | null;
  library: MediaChooserItem[];
  /** Photo uploaded on the previous request and waiting for preview + make live. */
  staged?: ContextualPhotoSelection | null;
  /** Uploads to the photo library only. Must not change the public page. */
  uploadAction: (formData: FormData) => Promise<void>;
  /** Publishes the chosen photo. Reached only after Preview my changes. */
  assignAction: (formData: FormData) => Promise<void>;
  /** Context carried by both forms (document key, program id, branch id…). */
  hiddenFields: Record<string, string>;
  sources?: readonly ContextualPhotoSource[];
  currentHeading?: string;
  currentNote?: string;
  emptyCurrentLabel?: string;
  changeLabel?: string;
  makeLiveLabel?: string;
};

function PhotoFrame({
  src,
  alt,
  ratio,
}: {
  src: string;
  alt: string;
  ratio: number | null;
}) {
  if (ratio === null) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="w-full rounded-[var(--radius-md)] bg-[var(--color-surface-tint)] object-contain"
      />
    );
  }
  return (
    <div
      className="relative w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface-tint)]"
      style={{ aspectRatio: String(ratio) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 size-full object-cover"
      />
    </div>
  );
}

/**
 * Current → Change → Preview → Make live for one photo placement.
 * Uploading only stages the photo in the library; the public page changes on Make live.
 */
export function ContextualPhotoEditor({
  title,
  where,
  recommended,
  cropAspect,
  current,
  currentMediaId = null,
  library,
  staged = null,
  uploadAction,
  assignAction,
  hiddenFields,
  sources = ["upload", "library"],
  currentHeading = "Currently on the website",
  currentNote,
  emptyCurrentLabel = "No photo here yet.",
  changeLabel = HUB_ACTION_LABELS.replacePhoto,
  makeLiveLabel = HUB_ACTION_LABELS.makePhotoLive,
}: Props) {
  const canUpload = sources.includes("upload");
  const canChooseSaved = sources.includes("library");
  const initialSource: ContextualPhotoSource | null = staged
    ? "upload"
    : sources.length === 1
      ? sources[0]
      : null;

  const [editing, setEditing] = useState(Boolean(staged));
  const [source, setSource] = useState<ContextualPhotoSource | null>(
    initialSource,
  );
  const [proposed, setProposed] = useState<ContextualPhotoSelection | null>(
    staged,
  );
  const [previewed, setPreviewed] = useState(false);

  const ratio = ratioForCrop(cropAspect);
  const hidden = Object.entries(hiddenFields);
  const canMakeLive = canMakePhotoAssignmentLive({
    editing,
    previewed,
    proposedMediaId: proposed?.id,
    currentMediaId,
  });

  function startChange() {
    setEditing(true);
    setSource(initialSource);
    setProposed(null);
    setPreviewed(false);
  }

  function cancel() {
    setEditing(false);
    setSource(initialSource);
    setProposed(null);
    setPreviewed(false);
  }

  function chooseSource(next: ContextualPhotoSource) {
    setSource(next);
    setProposed(null);
    setPreviewed(false);
  }

  return (
    <section className="space-y-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="hub-help text-[var(--color-text-muted)]">{where}</p>
        <p className="hub-help text-[var(--color-text-muted)]">{recommended}</p>
      </div>

      <div
        data-hub-role="current"
        className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-page)] p-4"
      >
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          {currentHeading}
        </h3>
        {currentNote ? (
          <p className="hub-help text-[var(--color-text-muted)]">{currentNote}</p>
        ) : null}
        {current ? (
          <div className="max-w-md">
            <PhotoFrame
              src={current.src}
              alt={current.alt || `${title} — photo on the website now`}
              ratio={ratio}
            />
          </div>
        ) : (
          <p className="hub-help text-[var(--color-text-muted)]">
            {emptyCurrentLabel}
          </p>
        )}
      </div>

      {!editing ? (
        <button
          type="button"
          onClick={startChange}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-base font-semibold"
        >
          {changeLabel}
        </button>
      ) : (
        <div className="space-y-6">
          {canUpload && canChooseSaved ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                aria-pressed={source === "upload"}
                onClick={() => chooseSource("upload")}
                className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] px-5 text-base font-semibold ${
                  source === "upload"
                    ? "bg-[var(--color-action-primary)] text-[var(--color-text-on-brand)]"
                    : "border border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
                }`}
              >
                {HUB_ACTION_LABELS.uploadNewPhoto}
              </button>
              <button
                type="button"
                aria-pressed={source === "library"}
                onClick={() => chooseSource("library")}
                className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] px-5 text-base font-semibold ${
                  source === "library"
                    ? "bg-[var(--color-action-primary)] text-[var(--color-text-on-brand)]"
                    : "border border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
                }`}
              >
                {HUB_ACTION_LABELS.useSavedPhoto}
              </button>
            </div>
          ) : null}

          {source === "upload" && canUpload ? (
            <div className="space-y-3">
              <p className="hub-help text-[var(--color-text-muted)]">
                Uploading saves the photo to the photo library. The website only
                changes after you preview it and make it live.
              </p>
              <MarketingImageUploader
                action={uploadAction}
                submitLabel={HUB_ACTION_LABELS.uploadPhotoForPreview}
                defaultCropAspect={cropAspect}
                lockCropAspect
                placementTitle={title}
                extraFields={hidden.map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))}
              />
            </div>
          ) : null}

          {source === "library" && canChooseSaved ? (
            <MediaChooser
              items={library}
              selectedId={proposed?.id ?? null}
              onSelect={(item) => {
                setProposed(item);
                setPreviewed(false);
              }}
            />
          ) : null}

          {proposed ? (
            <div
              data-hub-role="proposed"
              className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-action-primary)] p-4"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Photo you chose — not on the website yet
              </h3>
              <p className="hub-help text-[var(--color-text-muted)]">
                {proposed.alt || "Photo without a description"}
              </p>
              {previewed ? (
                <div className="max-w-md space-y-2">
                  <PhotoFrame
                    src={proposed.previewUrl}
                    alt={proposed.alt || "Photo you chose"}
                    ratio={ratio}
                  />
                  <p className="hub-help text-[var(--color-text-muted)]">
                    This is how the photo will be fitted to “{title}”.
                  </p>
                </div>
              ) : (
                <div className="max-w-[12rem]">
                  <PhotoFrame
                    src={proposed.previewUrl}
                    alt={proposed.alt || "Photo you chose"}
                    ratio={ratio}
                  />
                </div>
              )}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!proposed}
              onClick={() => setPreviewed(true)}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {HUB_ACTION_LABELS.previewChanges}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] px-5 text-base font-semibold text-[var(--color-text-muted)] underline-offset-2 hover:underline"
            >
              {HUB_ACTION_LABELS.cancelChanges}
            </button>
          </div>

          <form
            action={assignAction}
            onSubmit={(event) => {
              if (!canMakeLive) event.preventDefault();
            }}
            className="space-y-3"
          >
            {hidden.map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <input
              type="hidden"
              name="media_asset_id"
              value={proposed?.id ?? ""}
            />
            <HubSubmitButton
              variant={canMakeLive ? "secondary" : "quiet"}
              disabled={!canMakeLive}
            >
              {makeLiveLabel}
            </HubSubmitButton>
            {!canMakeLive ? (
              <p className="hub-help text-[var(--color-text-muted)]">
                {proposed && currentMediaId && proposed.id === currentMediaId
                  ? "That is already the photo on the website. Choose a different one to make a change."
                  : `Choose or upload a photo, click ${HUB_ACTION_LABELS.previewChanges}, then you can make it live.`}
              </p>
            ) : (
              <p className="hub-help text-[var(--color-text-muted)]">
                Visitors will see this photo as soon as you make it live.
              </p>
            )}
          </form>
        </div>
      )}
    </section>
  );
}
