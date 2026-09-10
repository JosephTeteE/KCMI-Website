/**
 * Public event pages are not implemented in this phase.
 * Unknown or unpublished slugs must not render a generic Event placeholder.
 */
export type PublicEventRecord = {
  slug: string;
  title: string;
  description: string;
};

export function resolvePublicEventSlug(
  slug: string,
): PublicEventRecord | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  // No published V2 event records exist yet — do not invent Camp Meeting content.
  return null;
}
