/**
 * Names used in the `stagedField` query parameter after a photo upload.
 * A staged photo lives in the library only — the surface changes on Make live.
 */
export const PROGRAM_POSTER_STAGED_FIELD = "programPoster";
export const BRANCH_HERO_STAGED_FIELD = "branchTopPhoto";
export const BRANCH_GALLERY_STAGED_FIELD = "branchGalleryPhoto";

export function branchStagedFieldForPlacement(
  placement: string,
): typeof BRANCH_HERO_STAGED_FIELD | typeof BRANCH_GALLERY_STAGED_FIELD {
  return placement === "hero"
    ? BRANCH_HERO_STAGED_FIELD
    : BRANCH_GALLERY_STAGED_FIELD;
}
