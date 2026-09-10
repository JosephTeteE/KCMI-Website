import {
  defaultSermonsPageDocument,
  defaultServicesDocument,
} from "@/content/website/defaults";

/**
 * Known original source-controlled seed/default strings that D1.6E replaced.
 * A stored website_documents field may be auto-corrected only when it still
 * equals one of these exact strings. Any other value is treated as possibly
 * human-edited and must be preserved.
 */
export const STALE_WEBSITE_DOCUMENT_REPLACEMENTS = [
  {
    documentKey: "sermons_page",
    path: ["headline"],
    oldValue: "Experience the Word of God Anytime, Anywhere.",
    newValue: defaultSermonsPageDocument.headline,
  },
  {
    documentKey: "sermons_page",
    path: ["sub"],
    oldValue:
      "Stay spiritually nourished with sermons from our church, available on multiple platforms.",
    newValue: defaultSermonsPageDocument.sub,
  },
  {
    documentKey: "sermons_page",
    path: ["sectionTitle"],
    oldValue: "Where to Watch & Listen",
    newValue: defaultSermonsPageDocument.sectionTitle,
  },
  {
    documentKey: "services",
    path: ["careBody"],
    oldValue:
      "Prayer, counselling, welfare, and celebration requests currently use the ministry’s existing Google Forms. Those forms are not the future Pastoral Hub.",
    newValue: defaultServicesDocument.careBody,
  },
  {
    documentKey: "services",
    path: ["careBody"],
    oldValue:
      "Prayer, counselling, welfare, and celebration requests currently use the ministry's existing Google Forms. Those forms are not the future Pastoral Hub.",
    newValue: defaultServicesDocument.careBody,
  },
] as const;

export function replacementForExactStoredValue(
  documentKey: string,
  path: readonly string[],
  stored: string | null | undefined,
): string | null {
  if (stored == null) return null;
  const match = STALE_WEBSITE_DOCUMENT_REPLACEMENTS.find(
    (item) =>
      item.documentKey === documentKey &&
      item.path.join(".") === path.join(".") &&
      item.oldValue === stored,
  );
  return match ? match.newValue : null;
}
