/**
 * Mutation classification + known Hub mutating control registry (QA1.3.1).
 * Classification is semantic — do not require clicking to discover risk class.
 */

import type { MutationClass } from "./types";
import { classifyHref } from "./mutation-policy";

export type SurfaceKind = "USER_FACING" | "NON_USER_SURFACE";

/** Known mutating Hub actions that must appear in inventory even if deep in workflow. */
export const KNOWN_MUTATING_CONTROLS: Array<{
  key: string;
  name: string;
  mutation: MutationClass;
  surface: string;
}> = [
  { key: "hub.program.saveDraft", name: "Save as a draft (not public yet)", mutation: "DRAFT_WRITE", surface: "program" },
  { key: "hub.program.saveDraftAlt", name: "Save my draft", mutation: "DRAFT_WRITE", surface: "program" },
  { key: "hub.program.saveDraftChanges", name: "Save draft changes", mutation: "DRAFT_WRITE", surface: "program" },
  { key: "hub.sermon.saveDraft", name: "Save my sermon draft", mutation: "DRAFT_WRITE", surface: "sermon" },
  { key: "hub.sermon.saveDraftAlt", name: "Save as a draft (not public yet)", mutation: "DRAFT_WRITE", surface: "sermon" },
  { key: "hub.media.uploadPhoto", name: "Upload this photo", mutation: "DRAFT_WRITE", surface: "media" },
  { key: "hub.media.addToLibrary", name: "Add this photo to the library", mutation: "DRAFT_WRITE", surface: "media" },
  { key: "hub.media.preparePhoto", name: "Check how the photo will look", mutation: "LOCAL_STATE", surface: "media" },
  { key: "hub.website.makeLive", name: "Make this live on the website", mutation: "PUBLIC_WRITE", surface: "website" },
  { key: "hub.website.makeChangesLive", name: "Make these changes live", mutation: "PUBLIC_WRITE", surface: "website" },
  { key: "hub.media.makePhotoLive", name: "Make this photo live on the website", mutation: "PUBLIC_WRITE", surface: "media" },
  { key: "hub.program.makeFeaturedLive", name: "Make this program live on the homepage", mutation: "PUBLIC_WRITE", surface: "program" },
  { key: "hub.sermon.makeDetailsLive", name: "Make these sermon details live", mutation: "PUBLIC_WRITE", surface: "sermon" },
  { key: "hub.branch.makeDetailsLive", name: "Make these branch details live", mutation: "PUBLIC_WRITE", surface: "branch" },
  { key: "hub.livestream.makeLive", name: "Make Livestream Live", mutation: "PUBLIC_WRITE", surface: "livestream" },
  { key: "hub.livestream.updateLive", name: "Update the live video", mutation: "PUBLIC_WRITE", surface: "livestream" },
  { key: "hub.livestream.turnOff", name: "Turn off the livestream", mutation: "PUBLIC_WRITE", surface: "livestream" },
  { key: "hub.content.removePublic", name: "Remove from public website", mutation: "DESTRUCTIVE", surface: "content" },
  { key: "hub.branch.removePhoto", name: "Remove from this branch page", mutation: "DESTRUCTIVE", surface: "branch" },
];

export function classifyControlMutation(
  name: string,
  role: string,
  href?: string | null,
  appHostname?: string,
): MutationClass {
  const n = (name || "").toLowerCase().trim();

  // Mutation semantics win over link/href classification.
  if (
    /make (this |these )?(live|changes live)|make livestream live|update the live video|turn off the livestream|make this photo live|make this program live|make these sermon details live|make these branch details live|\bpublish\b/i.test(
      n,
    )
  ) {
    return "PUBLIC_WRITE";
  }
  if (
    /remove from (public )?website|remove from this branch|delete|archive|destroy/i.test(
      n,
    )
  ) {
    return "DESTRUCTIVE";
  }
  if (
    /save (as a )?draft|save draft|save my draft|save draft changes|save my sermon draft|upload this photo|add this photo to the library|add this photo to the branch/i.test(
      n,
    )
  ) {
    return "DRAFT_WRITE";
  }
  if (/sign out/i.test(n)) return "LOCAL_STATE";
  if (role === "link" || (href && /^https?:|^\/|^mailto:|^tel:/i.test(href))) {
    return classifyHref(href, appHostname);
  }
  if (
    /menu|close|next step|previous step|skip|cancel|preview|change |open|replay|replace photo|upload a new photo|use a photo already saved|check and preview|start a facebook|edit this section|view full preview/i.test(
      n,
    )
  ) {
    return "LOCAL_STATE";
  }
  return "SAFE";
}

export function classifySurfaceKind(input: {
  name: string;
  role: string;
  tagName?: string;
  type?: string | null;
  hidden?: boolean;
  insideScaledPreview?: boolean;
  nameAttr?: string | null;
}): SurfaceKind {
  const n = (input.name || "").toLowerCase();
  const nameAttr = (input.nameAttr || "").toLowerCase();
  if (input.insideScaledPreview) return "NON_USER_SURFACE";
  if (input.hidden) return "NON_USER_SURFACE";
  if (
    /poster_mode|crop_aspect|featured_media_id|document_key|media_field|branch_id|placement/i.test(
      nameAttr,
    )
  ) {
    return "NON_USER_SURFACE";
  }
  if (
    input.role === "radio" ||
    input.role === "checkbox" ||
    input.type === "radio" ||
    input.type === "checkbox" ||
    input.type === "hidden"
  ) {
    // Native radio glyph alone — volunteer surface is usually the label/card.
    if (!n || n === "(unnamed)" || /^(poster_mode|crop_aspect)/i.test(n)) {
      return "NON_USER_SURFACE";
    }
  }
  if (n === "⌂" || n === "(unnamed)") return "NON_USER_SURFACE";
  return "USER_FACING";
}

export function isPolicyBlockedMutation(mutation: MutationClass): boolean {
  return (
    mutation === "PUBLIC_WRITE" ||
    mutation === "DESTRUCTIVE" ||
    mutation === "DRAFT_WRITE"
  );
}
