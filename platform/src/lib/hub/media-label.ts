/** Volunteer-facing labels for media library items — never prefer URLs or raw IDs. */

export type MediaLabelSource = {
  altText?: string | null;
  caption?: string | null;
  originalFilename?: string | null;
  id?: string | null;
};

export function humanizeFilename(filename: string | null | undefined): string {
  if (!filename) return "";
  const base = filename.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/, "");
  const cleaned = base
    .replace(/[_+]+/g, " ")
    .replace(/-+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  return cleaned.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function mediaAssetPrimaryLabel(source: MediaLabelSource): string {
  const alt = source.altText?.trim();
  if (alt) return alt;
  const caption = source.caption?.trim();
  if (caption) return caption;
  const fromFile = humanizeFilename(source.originalFilename);
  if (fromFile) return fromFile;
  return "Untitled photo";
}

export function mediaAssetSecondaryLabel(source: MediaLabelSource): string | null {
  const primary = mediaAssetPrimaryLabel(source);
  const alt = source.altText?.trim();
  const caption = source.caption?.trim();
  const fromFile = humanizeFilename(source.originalFilename);

  if (alt && caption && caption !== alt) return caption;
  if ((alt || caption) && fromFile && fromFile !== primary) return fromFile;
  return null;
}

/** Pure gate shared with HubPhotoProposeForm — assignment alone must not publish. */
export function canMakePhotoAssignmentLive(input: {
  editing: boolean;
  previewed: boolean;
  proposedMediaId: string | null | undefined;
  currentMediaId: string | null | undefined;
}): boolean {
  const proposed = input.proposedMediaId?.trim() ?? "";
  if (!input.editing || !input.previewed || !proposed) return false;
  const current = input.currentMediaId?.trim() ?? "";
  return proposed !== current;
}
