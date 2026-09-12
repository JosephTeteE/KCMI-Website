/**
 * First-class workflow / lifecycle registry for KCMI QA1.
 */

import type { QaWorkflow } from "./types";

export const QA_WORKFLOWS: QaWorkflow[] = [
  {
    id: "program-lifecycle",
    title: "Program create → draft → reopen → edit → review schedule → save",
    surface: "HUB",
    required: true,
    hostedDraftOnly: true,
    variants: [
      "one-day",
      "multi-day",
      "two-sessions-same-day",
      "blank-end",
      "registration",
      "youtube",
      "facebook",
      "other-url",
      "no-visitor-link",
      "branch",
      "online",
      "poster",
      "legacy-starts-at",
      "named-session",
      "published-safety",
    ],
    steps: [
      { id: "about", title: "About", mutation: "LOCAL_STATE" },
      { id: "when", title: "When", mutation: "LOCAL_STATE" },
      { id: "where", title: "Where", mutation: "LOCAL_STATE" },
      { id: "visitor-link", title: "Visitor link", mutation: "LOCAL_STATE" },
      { id: "review-schedule", title: "Review exact schedule", mutation: "SAFE" },
      { id: "save-draft", title: "Save draft", mutation: "DRAFT_WRITE" },
      { id: "reopen", title: "Reopen reconstruct day/sessions", mutation: "SAFE" },
      { id: "edit", title: "Edit draft field/session", mutation: "LOCAL_STATE" },
      { id: "review-again", title: "Review complete schedule", mutation: "SAFE" },
      { id: "save-again", title: "Save draft changes", mutation: "DRAFT_WRITE" },
      { id: "reopen-verify", title: "Reopen verify persisted semantics", mutation: "SAFE" },
      {
        id: "published-safety",
        title: "Published Current → Change → Preview → Make live (classified)",
        mutation: "PUBLIC_WRITE",
      },
    ],
  },
  {
    id: "media-lifecycle",
    title: "Current → Replace → Upload/Existing → Preview → Cancel (live unchanged)",
    surface: "HUB",
    required: true,
    steps: [
      { id: "current", title: "Current image", mutation: "SAFE" },
      { id: "replace", title: "Replace", mutation: "LOCAL_STATE" },
      { id: "choose", title: "Upload new or choose existing", mutation: "LOCAL_STATE" },
      { id: "preview", title: "Preview", mutation: "LOCAL_STATE" },
      { id: "cancel", title: "Cancel — live unchanged", mutation: "LOCAL_STATE" },
      {
        id: "make-live-isolated",
        title: "Isolated Make Live + restore (not generic hosted)",
        mutation: "PUBLIC_WRITE",
      },
    ],
  },
  {
    id: "public-navigation",
    title: "Homepage → visitor pathways → mobile menu",
    surface: "PUBLIC",
    required: true,
    steps: [
      { id: "home", title: "Homepage", mutation: "SAFE" },
      { id: "pathways", title: "Key visitor pathways", mutation: "NAVIGATION" },
      { id: "mobile-menu", title: "Mobile menu", mutation: "LOCAL_STATE" },
    ],
  },
  {
    id: "location-finder",
    title: "Locations query → filter → branch → maps",
    surface: "PUBLIC",
    required: true,
    steps: [
      { id: "query", title: "Query", mutation: "LOCAL_STATE" },
      { id: "country", title: "Country filter", mutation: "LOCAL_STATE" },
      { id: "result", title: "Result", mutation: "NAVIGATION" },
      { id: "detail", title: "Branch detail", mutation: "SAFE" },
      { id: "maps", title: "Maps action", mutation: "EXTERNAL" },
    ],
  },
  {
    id: "tutorial",
    title: "Dashboard + contextual tours",
    surface: "HUB",
    required: true,
    steps: [
      { id: "dashboard", title: "Dashboard orientation", mutation: "LOCAL_STATE" },
      { id: "home-contextual", title: "Homepage contextual", mutation: "LOCAL_STATE" },
      { id: "program-contextual", title: "Program contextual", mutation: "LOCAL_STATE" },
      { id: "livestream-contextual", title: "Livestream contextual", mutation: "LOCAL_STATE" },
      { id: "mobile-help", title: "Mobile Help target", mutation: "LOCAL_STATE" },
      { id: "escape", title: "Escape restores focus", mutation: "LOCAL_STATE" },
    ],
  },
  {
    id: "livestream",
    title: "Livestream editor safe states",
    surface: "HUB",
    required: true,
    steps: [
      { id: "not-live", title: "Not live", mutation: "SAFE" },
      { id: "invalid", title: "Invalid Facebook → error", mutation: "LOCAL_STATE" },
      { id: "valid-preview", title: "Valid Facebook → preview", mutation: "LOCAL_STATE" },
      {
        id: "make-live-gate",
        title: "Make live classified — not generic hosted execute",
        mutation: "PUBLIC_WRITE",
      },
    ],
  },
];

export function requiredWorkflows(): QaWorkflow[] {
  return QA_WORKFLOWS.filter((w) => w.required);
}
