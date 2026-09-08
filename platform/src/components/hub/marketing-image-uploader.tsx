"use client";

import { useMemo, useState, useTransition, type MouseEvent, type ReactNode } from "react";
import {
  CROP_ASPECTS,
  clampFocal,
  parseCropAspect,
  type CropAspectId,
} from "@/lib/cms/image-crop";
import {
  MAX_MARKETING_IMAGE_BYTES,
  looksLikeSvgUpload,
  looksLikeVideoUpload,
} from "@/lib/cms/media-validate";
import { prepareMarketingImagePreview } from "@/app/admin/media/actions";
import { HubSubmitButton, HubTextAreaField, HubTextField } from "@/components/hub/hub-form-fields";

type SourceInfo = {
  name: string;
  bytes: number;
  width: number;
  height: number;
  previewUrl: string;
};

type PreparedPreview = {
  previewDataUrl: string;
  sourceWidth: number;
  sourceHeight: number;
  sourceBytes: number;
  width: number;
  height: number;
  byteSize: number;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function clientFileError(file: File): string | null {
  if (looksLikeSvgUpload(file)) return "SVG images are not allowed.";
  if (looksLikeVideoUpload(file)) {
    return "Video files cannot be uploaded. Use a YouTube or Facebook URL instead.";
  }
  if (file.size > MAX_MARKETING_IMAGE_BYTES) {
    return "Image must be 15MB or smaller.";
  }
  const type = file.type.toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) {
    return "Only JPEG, PNG, and WebP images are allowed.";
  }
  return null;
}

export function MarketingImageUploader({
  action,
  extraFields,
  submitLabel,
  defaultCropAspect = "original",
  showCaption = false,
}: {
  action: (formData: FormData) => Promise<void>;
  extraFields?: ReactNode;
  submitLabel: string;
  defaultCropAspect?: CropAspectId;
  showCaption?: boolean;
}) {
  const [cropAspect, setCropAspect] = useState<CropAspectId>(defaultCropAspect);
  const [focal, setFocal] = useState({ x: 0.5, y: 0.5 });
  const [source, setSource] = useState<SourceInfo | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedPreview | null>(null);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [isPreparing, startPrepare] = useTransition();

  const selectedCrop = useMemo(
    () => CROP_ASPECTS.find((item) => item.id === cropAspect) ?? CROP_ASPECTS[3],
    [cropAspect],
  );

  async function onFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    setPrepared(null);
    setPrepareError(null);
    setLocalError(null);
    if (source) URL.revokeObjectURL(source.previewUrl);
    setSource(null);
    if (!file) return;

    const blocked = clientFileError(file);
    if (blocked) {
      setLocalError(blocked);
      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const previewUrl = URL.createObjectURL(file);
      setSource({
        name: file.name,
        bytes: file.size,
        width: bitmap.width,
        height: bitmap.height,
        previewUrl,
      });
      bitmap.close();
    } catch {
      setLocalError("Could not read that file as an image.");
    }
  }

  function onFocalClick(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    setPrepared(null);
    setFocal({
      x: clampFocal((event.clientX - rect.left) / rect.width),
      y: clampFocal((event.clientY - rect.top) / rect.height),
    });
  }

  function onPrepare(form: HTMLFormElement) {
    setPrepareError(null);
    startPrepare(async () => {
      const result = await prepareMarketingImagePreview(new FormData(form));
      if (!result.ok) {
        setPrepared(null);
        setPrepareError(result.error);
        return;
      }
      setPrepared(result);
    });
  }

  return (
    <form action={action} className="space-y-6" encType="multipart/form-data">
      {extraFields}
      <input type="hidden" name="crop_aspect" value={cropAspect} />
      <input type="hidden" name="focal_x" value={String(focal.x)} />
      <input type="hidden" name="focal_y" value={String(focal.y)} />

      <div>
        <label htmlFor="file" className="block text-sm font-medium">
          Image file
          <span className="text-[var(--color-destructive)]"> *</span>
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp"
          className="mt-2 block w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-base file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-surface-tint)] file:px-3 file:py-1.5 file:text-sm file:font-medium"
          onChange={(event) => {
            void onFileChange(event.currentTarget.files);
          }}
        />
        <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
          JPEG, PNG, or WebP up to 15MB. Videos and SVG are not accepted.
        </p>
      </div>

      {localError ? (
        <p role="alert" className="text-sm text-[var(--color-destructive)]">
          {localError}
        </p>
      ) : null}

      {source ? (
        <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-page)] px-4 py-3 text-sm text-[var(--color-text-body)]">
          <p className="font-medium">{source.name}</p>
          <p className="mt-1 text-[var(--color-text-muted)]">
            Source: {source.width}×{source.height}px · {formatBytes(source.bytes)}
          </p>
        </div>
      ) : null}

      <fieldset>
        <legend className="text-sm font-medium">Website crop</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {CROP_ASPECTS.map((option) => (
            <label
              key={option.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 text-sm"
            >
              <input
                type="radio"
                name="crop_aspect_ui"
                value={option.id}
                checked={cropAspect === option.id}
                onChange={() => {
                  setCropAspect(parseCropAspect(option.id));
                  setPrepared(null);
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {source && selectedCrop.ratio ? (
        <div>
          <p className="text-sm font-medium">Focal point</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Click the photo to choose what stays in view after cropping.
          </p>
          <button
            type="button"
            onClick={onFocalClick}
            className="relative mt-3 block w-full max-w-md overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface-tint)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            aria-label="Set image focal point"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={source.previewUrl}
              alt=""
              className="block h-auto w-full"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--color-action-primary)] shadow"
              style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%` }}
            />
          </button>
          <div
            className="relative mt-4 max-w-md overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface-tint)]"
            style={{ aspectRatio: String(selectedCrop.ratio) }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={source.previewUrl}
              alt=""
              className="absolute inset-0 size-full object-cover"
              style={{
                objectPosition: `${focal.x * 100}% ${focal.y * 100}%`,
              }}
            />
          </div>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Crop preview (approximate until you prepare the website version).
          </p>
        </div>
      ) : null}

      <HubTextField
        id="alt_text"
        label="Alt text"
        required
        hint="Required. Describe the photo for visitors using a screen reader."
      />
      {showCaption ? (
        <HubTextAreaField id="caption" label="Caption (optional)" rows={2} />
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!source || isPreparing}
          onClick={(event) => {
            const form = event.currentTarget.form;
            if (form) onPrepare(form);
          }}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 text-sm font-semibold text-[var(--color-text-body)] disabled:opacity-60"
        >
          {isPreparing ? "Preparing…" : "Prepare website version"}
        </button>
        <HubSubmitButton>{submitLabel}</HubSubmitButton>
      </div>

      {prepareError ? (
        <p role="alert" className="text-sm text-[var(--color-destructive)]">
          {prepareError}
        </p>
      ) : null}

      {prepared ? (
        <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
          <p className="text-sm font-medium">Website version preview</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Source {prepared.sourceWidth}×{prepared.sourceHeight}px (
            {formatBytes(prepared.sourceBytes)}) → {prepared.width}×
            {prepared.height}px WebP ({formatBytes(prepared.byteSize)}). EXIF and
            GPS metadata are removed.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={prepared.previewDataUrl}
            alt="Prepared website image preview"
            className="max-h-80 w-full max-w-md rounded-[var(--radius-md)] object-contain bg-[var(--color-surface-page)]"
          />
        </div>
      ) : null}
    </form>
  );
}
